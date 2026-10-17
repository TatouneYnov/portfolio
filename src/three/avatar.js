// Avatar « figurine » d'Ethan, modélisé en code (aucun fichier 3D à charger).
// Squelette : Hips > Spine > Chest > Neck > Head (+ Eye.L/R), bras et jambes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const COLORS = {
  skin: 0xE6B496, skinShade: 0xD9A084, lip: 0x9A5648,
  hair: 0x2B1E18, hairFade: 0x4A3A33, streak: 0xE2D6C6, beard: 0x4A362B,
  shirt: 0x18161D, placket: 0x2B2732,
  pants: 0x26242E, shoe: 0xF2F0F5, sole: 0xCFCBD6, eye: 0x1C120E,
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function std(color, roughness = 0.65, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function mesh(geo, material, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(p[0], p[1], p[2]);
  m.rotation.set(r[0], r[1], r[2]);
  m.scale.set(s[0], s[1], s[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function joint(name, parent, p = [0, 0, 0]) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(p[0], p[1], p[2]);
  parent.add(g);
  return g;
}

const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20);
const sphere = (w = 24, h = 18) => new THREE.SphereGeometry(1, w, h);

// ---------- Tête : une seule surface lisse (crâne + menton affiné) ----------
const HEAD_C = new THREE.Vector3(0, 0.3, 0);

function headShape(p, out) {
  // p : point de la sphère unité. Renvoie la position déformée (relative au centre de la tête).
  const low = Math.max(0, -p.y);                  // 0 à l'équateur, 1 sous le menton
  let x = p.x * 0.33 * (1 - 0.3 * Math.pow(low, 1.4)) * (1 + 0.035 * Math.exp(-(((p.y + 0.25) / 0.22) ** 2)));
  let y = p.y * 0.335 * (1 + 0.1 * low);
  let z = p.z * 0.315 * (1 - 0.12 * Math.pow(low, 1.6));
  if (p.z > 0) z += 0.03 * low * p.z;             // menton légèrement en avant
  if (p.z < 0) z *= 1 + 0.06 * Math.max(0, p.y + 0.3); // arrière du crâne plus rond
  return out.set(x, y, z);
}

function buildHeadGeometry() {
  const g = new THREE.SphereGeometry(1, 72, 54);
  const pos = g.attributes.position;
  const p = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    headShape(p, o);
    pos.setXYZ(i, o.x, o.y, o.z);
  }
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const merged = mergeVertices(g);
  merged.computeVertexNormals();
  return merged;
}

// ---------- Bruit de valeur 3D (relief des boucles) ----------
function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}
const fbm = (p, f) => 0.65 * noise3(p.x * f, p.y * f, p.z * f) + 0.35 * noise3(p.x * f * 2.1 + 7, p.y * f * 2.1, p.z * f * 2.1);

// ---------- Cheveux : coque sur une grille qui suit la ligne d'implantation ----------
// Ligne d'implantation (en hauteur sur la sphère unité) selon la direction horizontale :
// haute devant (front dégagé), au-dessus des oreilles sur les côtés, basse à la nuque.
const hairlineAt = (az) => {
  const f = smooth(0.35, 0.95, Math.cos(az));
  return mix(-0.55, 0.46, smooth(-0.55, 0.9, Math.cos(az))) - f * (0.07 + 0.045 * Math.sin(az * 13 + 0.6));
};

function buildHairGeometry() {
  const ROWS = 60, COLS = 144;
  const positions = [], colors = [], index = [];
  const p = new THREE.Vector3(), o = new THREE.Vector3();
  const cHair = new THREE.Color(COLORS.hair), cFade = new THREE.Color(COLORS.hairFade);
  const cStreak = new THREE.Color(COLORS.streak), c = new THREE.Color();
  const streakA = new THREE.Vector3(-0.12, 0.62, 0.78).normalize();

  for (let i = 0; i <= ROWS; i++) {
    const t = i / ROWS;
    for (let j = 0; j <= COLS; j++) {
      const az = (j / COLS) * Math.PI * 2;
      const theta = t * Math.acos(hairlineAt(az));
      p.set(Math.sin(theta) * Math.sin(az), Math.cos(theta), Math.sin(theta) * Math.cos(az));
      const front = p.z;
      const frontEdge = smooth(0.35, 0.9, Math.cos(az));        // le bord avant garde de l'épaisseur
      const taper = smooth(1.0, 0.78, t);                        // 0 au bord : colle au crâne
      const keepThick = Math.max(taper, 0.85 * frontEdge);
      const top = smooth(0.2, 0.95, p.y);
      const quiff = smooth(0.1, 0.75, front) * smooth(0.35, 0.92, p.y);
      const n = fbm(p, 4.6);
      const curls = 0.042 * n * smooth(-0.1, 0.6, p.y);
      const sideTrim = 1 - 0.7 * (1 - top) * (1 - Math.abs(front)); // côtés plus ras
      const offset = 0.004 + (0.01 * sideTrim + 0.062 * top + 0.042 * quiff + curls) * keepThick;
      headShape(p, o);
      const len = o.length();
      o.multiplyScalar((len + offset) / len);
      o.z += 0.022 * quiff + 0.03 * frontEdge * smooth(0.6, 1, t); // la frange avance et retombe un peu
      o.y -= 0.015 * frontEdge * smooth(0.7, 1, t);
      positions.push(o.x, o.y, o.z);

      // Couleur : brun foncé, creux plus sombres, côtés fondus, petite mèche claire devant
      const fade = (1 - taper) * (1 - frontEdge) * 0.9 + (1 - top) * (1 - Math.abs(front)) * 0.3;
      c.copy(cHair).lerp(cFade, Math.min(1, fade));
      const strands = smooth(0.35, 0.7, noise3(p.x * 26, p.y * 4 + 3, p.z * 4));
      const s1 = smooth(0.955, 0.985, p.dot(streakA)) * (0.35 + 0.65 * strands);
      c.lerp(cStreak, Math.min(0.92, s1));
      c.multiplyScalar(0.72 + 0.28 * n + 0.2 * s1);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      const a = i * (COLS + 1) + j, b = a + COLS + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  const merged = mergeVertices(g);
  merged.computeVertexNormals();

  return merged;

}

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Trait posé sur une surface : chaque point (x, y) est projeté sur le visage, puis relié par un tube.
function strokeOn(target, pts, radius, material, lift, cy) {
  const pts3 = [];
  for (const [x, y] of pts) {
    _ray.set(new THREE.Vector3(x, cy + y, 1), new THREE.Vector3(0, 0, -1));
    const hit = _ray.intersectObject(target, false)[0];
    if (!hit) continue;
    const n = hit.face.normal.clone().transformDirection(target.matrixWorld);
    pts3.push(hit.point.clone().addScaledVector(n, lift));
  }
  const curve = new THREE.CatmullRomCurve3(pts3);
  const geo = new THREE.TubeGeometry(curve, 24, radius, 8, false);
  // bouts arrondis
  const g = new THREE.Group();
  g.add(mesh(geo, material));
  [pts3[0], pts3[pts3.length - 1]].forEach((pt) => g.add(mesh(new THREE.SphereGeometry(radius, 10, 8), material, { p: [pt.x, pt.y, pt.z] })));
  return g;
}
const curvePts = (x0, x1, fy, steps = 9) => Array.from({ length: steps }, (_, i) => {
  const x = x0 + ((x1 - x0) * i) / (steps - 1);
  return [x, fy(x)];
});

// Pose un élément sur une surface (lancer de rayon), orienté selon la normale.
const _ray = new THREE.Raycaster();
const _zAxis = new THREE.Vector3(0, 0, 1);
function placeOn(target, obj, origin, dir, lift = 0, spin = 0) {
  _ray.set(origin, dir.clone().normalize());
  const hit = _ray.intersectObject(target, false)[0];
  if (!hit) return false;
  const n = hit.face.normal.clone().transformDirection(target.matrixWorld);
  obj.position.copy(hit.point).addScaledVector(n, lift);
  obj.quaternion.setFromUnitVectors(_zAxis, n);
  if (spin) obj.rotateZ(spin);
  return true;
}

export function buildAvatar() {
  const M = {
    skin: std(COLORS.skin, 0.55), skinShade: std(COLORS.skinShade, 0.6), lip: std(COLORS.lip, 0.5),
    hair: std(0xffffff, 0.62, { vertexColors: true, side: THREE.DoubleSide }),
    brow: std(COLORS.hair, 0.7), beard: std(COLORS.beard, 0.85), mustache: std(0x6A4D3F, 0.85),
    shirt: std(COLORS.shirt, 0.85), placket: std(COLORS.placket, 0.7),
    pants: std(COLORS.pants, 0.9), shoe: std(COLORS.shoe, 0.5), sole: std(COLORS.sole, 0.7),
    eye: std(COLORS.eye, 0.15), shine: std(0xffffff, 0.2, { emissive: 0xffffff, emissiveIntensity: 0.6 }),
  };

  const root = new THREE.Group();
  root.name = 'Avatar';
  const hips = joint('Hips', root, [0, 0.667, 0]);

  // Bassin : profil de pantalon
  const pantsProfile = [[0, -0.12], [0.12, -0.115], [0.165, -0.07], [0.172, 0], [0.17, 0.07], [0, 0.07]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  hips.add(mesh(new THREE.LatheGeometry(pantsProfile, 40), M.pants, { s: [1, 1, 0.78] }));

  const spine = joint('Spine', hips, [0, 0.06, 0]);
  const chest = joint('Chest', spine, [0, 0.14, 0]);

  // Torse : chemise, bas légèrement évasé qui recouvre la ceinture
  const torsoProfile = [
    [0, -0.235], [0.183, -0.235], [0.186, -0.2], [0.183, -0.12], [0.19, 0], [0.198, 0.1],
    [0.192, 0.17], [0.155, 0.225], [0.085, 0.25], [0, 0.255],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = mesh(new THREE.LatheGeometry(torsoProfile, 48), M.shirt, { s: [1, 1, 0.74] });
  chest.add(torso);
  torso.updateMatrixWorld(true);
  const onTorso = (obj, x, y, lift = 0.002) => {
    placeOn(torso, obj, new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1), lift);
    chest.add(obj);
  };
  // Patte de boutonnage + boutons, posés à plat sur la chemise
  onTorso(mesh(new THREE.PlaneGeometry(0.016, 0.28), M.placket), 0, -0.02);
  [0.08, -0.02, -0.12].forEach((y) => onTorso(mesh(new THREE.CircleGeometry(0.008, 16), M.placket), 0, y, 0.004));
  // Encolure en V (peau, à plat) + col
  const vNeck = new THREE.Shape();
  vNeck.moveTo(-0.045, 0.0); vNeck.lineTo(0.045, 0.0); vNeck.lineTo(0, -0.075); vNeck.closePath();
  onTorso(mesh(new THREE.ShapeGeometry(vNeck), M.skin), 0, 0.225, 0.003);
  const collarGeo = new RoundedBoxGeometry(0.075, 0.012, 0.055, 2, 0.005);
  chest.add(mesh(collarGeo, M.shirt, { p: [0.045, 0.228, 0.1], r: [-0.55, 0.3, 0.6] }));
  chest.add(mesh(collarGeo, M.shirt, { p: [-0.045, 0.228, 0.1], r: [-0.55, -0.3, -0.6] }));

  // Cou
  const neck = joint('Neck', chest, [0, 0.245, 0]);
  neck.add(mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.13, 20), M.skin, { p: [0, 0.025, 0] }));

  // Tête
  const head = joint('Head', neck, [0, 0.08, 0]);
  head.scale.setScalar(0.92);
  // headMesh n'est rattaché qu'après le placement des détails : sans parent, son repère monde
  // est le repère local de la tête, ce qui permet de viser le visage par lancer de rayon.
  const headMesh = mesh(buildHeadGeometry(), M.skin, { p: [HEAD_C.x, HEAD_C.y, HEAD_C.z] });
  headMesh.updateMatrixWorld(true);
  // Placement sur le visage : coordonnées locales de la tête (x, y relatif au centre)
  const face = (obj, x, y, lift, spin = 0) => {
    placeOn(headMesh, obj, new THREE.Vector3(x, HEAD_C.y + y, 1), new THREE.Vector3(0, 0, -1), lift, spin);
    head.add(obj);
    return obj;
  };

  // Yeux
  const eyes = [];
  [1, -1].forEach((sx) => {
    const g = new THREE.Group();
    g.name = sx > 0 ? 'Eye.L' : 'Eye.R';
    face(g, sx * 0.112, -0.03, 0.004);
    g.add(mesh(sphere(24, 18), M.eye, { s: [0.036, 0.05, 0.018] }));
    const shine = mesh(sphere(10, 8), M.shine, { p: [0.011, 0.018, 0.014], s: [0.011, 0.011, 0.006] });
    shine.castShadow = false;
    g.add(shine);
    g.userData.base = g.position.clone();
    eyes.push(g);
  });
  // Sourcils : légèrement arqués, le gauche un peu relevé (air sûr de lui)
  head.add(strokeOn(headMesh, curvePts(0.07, 0.158, (x) => 0.068 + 0.012 * Math.sin(((x - 0.07) / 0.088) * Math.PI) - 0.01 * ((x - 0.07) / 0.088)), 0.0095, M.brow, 0.004, HEAD_C.y));
  head.add(strokeOn(headMesh, curvePts(-0.158, -0.07, (x) => 0.055 + 0.009 * Math.sin(((x + 0.158) / 0.088) * Math.PI) + 0.006 * ((x + 0.158) / 0.088)), 0.0095, M.brow, 0.004, HEAD_C.y));
  // Nez
  face(mesh(sphere(18, 14), M.skinShade, { s: [0.026, 0.022, 0.021] }), 0, -0.078, 0.01);
  // Moustache fine qui suit la lèvre
  head.add(strokeOn(headMesh, curvePts(-0.046, 0.046, (x) => -0.121 - 0.005 * (x / 0.046) ** 2), 0.0045, M.mustache, 0.003, HEAD_C.y));
  // Bouche : sourire en coin (côté gauche un peu plus haut)
  head.add(strokeOn(headMesh, curvePts(-0.036, 0.044, (x) => -0.168 + 0.014 * ((x - 0.004) / 0.04) ** 2 + 0.008 * (x / 0.044)), 0.005, M.lip, 0.002, HEAD_C.y));
  // Bouc court + mouche, posés à plat sur le menton
  face(mesh(sphere(20, 14), M.beard, { s: [0.05, 0.022, 0.008] }), 0, -0.3, 0.002);
  face(mesh(sphere(12, 10), M.beard, { s: [0.008, 0.016, 0.005] }), 0, -0.235, 0.002);

  // Oreilles : petites, à hauteur des yeux, à moitié dans la tête
  [1, -1].forEach((sx) => {
    const ear = mesh(sphere(18, 14), M.skin, { s: [0.042, 0.06, 0.022] });
    placeOn(headMesh, ear, new THREE.Vector3(sx, HEAD_C.y - 0.06, -0.01), new THREE.Vector3(-sx, 0, 0), 0.008);
    ear.rotateY(sx * -0.35);
    head.add(ear);
    const inner = mesh(sphere(14, 10), M.skinShade, { s: [0.022, 0.036, 0.01] });
    inner.position.copy(ear.position);
    inner.quaternion.copy(ear.quaternion);
    inner.translateZ(0.014);
    head.add(inner);
  });

  head.add(headMesh);
  const hairMesh = mesh(buildHairGeometry(), M.hair, { p: [HEAD_C.x, HEAD_C.y, HEAD_C.z] });
  head.add(hairMesh);

  // Bras
  const arms = {};
  [1, -1].forEach((sx) => {
    const side = sx > 0 ? 'L' : 'R';
    const ua = joint(`UpperArm.${side}`, chest, [sx * 0.205, 0.165, 0]);
    ua.add(mesh(sphere(20, 16), M.shirt, { s: [0.072, 0.072, 0.072] }));
    ua.add(mesh(new THREE.CylinderGeometry(0.074, 0.07, 0.14, 20), M.shirt, { p: [0, -0.065, 0] }));
    ua.add(mesh(capsule(0.054, 0.12), M.skin, { p: [0, -0.12, 0] }));
    const la = joint(`LowerArm.${side}`, ua, [0, -0.22, 0]);
    la.add(mesh(capsule(0.051, 0.15), M.skin, { p: [0, -0.085, 0] }));
    const hand = joint(`Hand.${side}`, la, [0, -0.19, 0]);
    hand.add(mesh(sphere(18, 14), M.skin, { p: [0, -0.025, 0], s: [0.05, 0.06, 0.036] }));
    hand.add(mesh(sphere(12, 10), M.skin, { p: [-sx * 0.035, -0.005, 0.015], s: [0.018, 0.03, 0.018], r: [0, 0, sx * 0.5] }));
    arms[side] = { ua, la, hand };
  });

  // Jambes
  const legs = {};
  [1, -1].forEach((sx) => {
    const side = sx > 0 ? 'L' : 'R';
    const ul = joint(`UpperLeg.${side}`, hips, [sx * 0.09, -0.04, 0]);
    ul.add(mesh(capsule(0.083, 0.2), M.pants, { p: [0, -0.13, 0] }));
    const ll = joint(`LowerLeg.${side}`, ul, [0, -0.27, 0]);
    ll.add(mesh(capsule(0.076, 0.19), M.pants, { p: [0, -0.12, 0] }));
    const foot = joint(`Foot.${side}`, ll, [0, -0.27, 0]);
    foot.add(mesh(new RoundedBoxGeometry(0.12, 0.085, 0.23, 3, 0.035), M.shoe, { p: [0, -0.04, 0.045] }));
    foot.add(mesh(new RoundedBoxGeometry(0.125, 0.025, 0.235, 2, 0.01), M.sole, { p: [0, -0.075, 0.045] }));
    legs[side] = { ul, ll, foot };
  });

  return { root, hips, spine, chest, neck, head, torso, eyes, arms, legs };
}

// ---------- Bureau, chaise, écran ----------
export function buildDesk() {
  const g = new THREE.Group();
  const top = std(0x1A1722, 0.6, { metalness: 0.1 });
  const frame = std(0x2B2733, 0.5, { metalness: 0.4 });
  g.add(mesh(new RoundedBoxGeometry(1.3, 0.04, 0.6, 2, 0.012), top, { p: [0, 0.58, 0.62] }));
  [[-0.6, 0.36], [0.6, 0.36], [-0.6, 0.88], [0.6, 0.88]].forEach(([x, z]) =>
    g.add(mesh(new THREE.BoxGeometry(0.035, 0.56, 0.035), frame, { p: [x, 0.28, z] })));
  g.add(mesh(new RoundedBoxGeometry(0.42, 0.025, 0.14, 2, 0.008), frame, { p: [0, 0.613, 0.43] }));
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.004, 0.006), std(0x7C3AED, 0.4, { emissive: 0x7C3AED, emissiveIntensity: 2 }), { p: [0, 0.6, 0.36] }));
  g.add(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.015, 24), frame, { p: [0, 0.607, 0.8] }));
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), frame, { p: [0, 0.7, 0.82] }));
  g.add(mesh(new RoundedBoxGeometry(0.64, 0.4, 0.03, 2, 0.01), frame, { p: [0, 0.9, 0.82] }));
  const screen = makeTerminal();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }));
  plane.position.set(0, 0.9, 0.803);
  plane.rotation.y = Math.PI;
  g.add(plane);
  const screenLight = new THREE.PointLight(0x9F7BFF, 2.2, 2.2, 1.5);
  screenLight.position.set(0, 0.95, 0.65);
  g.add(screenLight);
  const seat = std(0x221E2B, 0.8);
  g.add(mesh(new RoundedBoxGeometry(0.42, 0.06, 0.4, 3, 0.025), seat, { p: [0, 0.25, -0.02] }));
  g.add(mesh(new RoundedBoxGeometry(0.4, 0.42, 0.05, 3, 0.025), seat, { p: [0, 0.55, -0.25], r: [-0.12, 0, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 12), frame, { p: [0, 0.13, -0.02] }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.025, 0.22), frame, { p: [Math.sin(a) * 0.1, 0.03, -0.02 + Math.cos(a) * 0.1], r: [0, a, 0] }));
  }
  return { group: g, screen };
}

export function makeTerminal() {
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const lines = [
    '$ vol -f mem.raw windows.pslist',
    'PID    PPID   ImageFileName',
    '4      0      System',
    '612    4      smss.exe',
    '1984   1204   powershell.exe',
    '[*] windows.netscan : 3 connexions à vérifier',
    '$ grep -c "Failed password" auth.log',
    '1342',
    '[+] IOC : 203.0.113.42 (liste de blocage)',
    '$ tshark -r capture.pcap -Y dns',
    '[*] timeline : premier accès à 02:14',
    '$ yara rules/loader.yar dump/',
    '[ok] 0 correspondance sur 412 fichiers',
    '$ chainsaw hunt logs/ -s sigma/',
    '[*] 2 détections : règle « encoded cmd »',
  ];
  let offset = 0;
  function draw() {
    ctx.fillStyle = '#0B0714';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createRadialGradient(320, 192, 40, 320, 192, 420);
    grad.addColorStop(0, 'rgba(124,58,237,0.18)');
    grad.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '20px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    for (let i = 0; i < 13; i++) {
      const line = lines[(offset + i) % lines.length];
      ctx.fillStyle = line.startsWith('$') ? '#EEEAF6' : line.startsWith('[+]') ? '#7EE2B8' : '#B49CFF';
      ctx.fillText(line, 24, 20 + i * 27);
    }
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#EEEAF6';
      ctx.fillRect(24, 20 + 13 * 27 - 6, 11, 20);
    }
    texture.needsUpdate = true;
  }
  return { texture, draw, step() { offset = (offset + 1) % lines.length; } };
}

// ---------- Poses (debout / assis en train de taper) ----------
export const JOINT_KEYS = ['hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'uaR', 'laL', 'laR', 'hL', 'hR', 'ulL', 'ulR', 'llL', 'llR', 'fL', 'fR'];
export const makePose = () => Object.fromEntries(JOINT_KEYS.map((k) => [k, [0, 0, 0]]));
const set = (P, k, x, y, z) => { const a = P[k]; a[0] = x; a[1] = y; a[2] = z; };

export function idlePose(t, P) {
  const b = Math.sin(t * 1.7);
  set(P, 'hips', 0, 0, 0.015 * Math.sin(t * 0.35));
  set(P, 'spine', 0, 0, 0);
  set(P, 'chest', 0.015 * b, 0, 0);
  set(P, 'neck', -0.01 * b, 0, 0);
  set(P, 'head', 0.02 * Math.sin(t * 0.8), 0.06 * Math.sin(t * 0.45), 0.02 * Math.sin(t * 0.6));
  set(P, 'uaL', 0.03 * Math.sin(t * 0.9), 0, 0.1 + 0.015 * b);
  set(P, 'uaR', 0.03 * Math.sin(t * 0.9 + 1), 0, -0.1 - 0.015 * b);
  set(P, 'laL', -0.12, 0, 0); set(P, 'laR', -0.12, 0, 0);
  set(P, 'hL', 0, 0, 0); set(P, 'hR', 0, 0, 0);
  set(P, 'ulL', 0, 0, 0.02); set(P, 'ulR', 0, 0, -0.02);
  set(P, 'llL', 0, 0, 0); set(P, 'llR', 0, 0, 0);
  set(P, 'fL', 0, 0, 0); set(P, 'fR', 0, 0, 0);
  P.hipsY = 0.667;
  P.breath = b;
}

export function sitPose(t, P) {
  const b = Math.sin(t * 1.7);
  const tapL = Math.max(0, Math.sin(t * 12.3) * Math.sin(t * 3.7 + 1));
  const tapR = Math.max(0, Math.sin(t * 11.1 + 2) * Math.sin(t * 2.9));
  set(P, 'hips', 0, 0, 0);
  set(P, 'spine', 0.1, 0, 0);
  set(P, 'chest', 0.06 + 0.01 * b, 0, 0);
  set(P, 'neck', 0.05, 0, 0);
  set(P, 'head', 0.14 + 0.02 * Math.sin(t * 2.1), 0.05 * Math.sin(t * 0.4), 0);
  set(P, 'uaL', -0.75, 0, 0.18); set(P, 'uaR', -0.75, 0, -0.18);
  set(P, 'laL', -1.0 - 0.08 * tapL, 0, -0.35); set(P, 'laR', -1.0 - 0.08 * tapR, 0, 0.35);
  set(P, 'hL', 0.3 + 0.15 * tapL, 0, 0); set(P, 'hR', 0.3 + 0.15 * tapR, 0, 0);
  set(P, 'ulL', -1.5, 0, 0.06); set(P, 'ulR', -1.5, 0, -0.06);
  set(P, 'llL', 1.5, 0, 0); set(P, 'llR', 1.5, 0, 0);
  set(P, 'fL', 0, 0, 0); set(P, 'fR', 0, 0, 0);
  P.hipsY = 0.405;
  P.breath = b;
}
