// Avatar « figurine » d'Ethan, modélisé en code (aucun fichier 3D à charger).
// Squelette : Hips > Spine > Chest > Neck > Head (+ Eye.L/R), bras et jambes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const COLORS = {
  skin: 0xE6B496, lip: 0xC98B7A, mouth: 0x6B3A31,
  hair: 0x3B271C, hairDark: 0x22160F, beard: 0x4A372C, brow: 0x2B1E18,
  eye: 0x1C120E,
  shirt: 0x18161D, placket: 0x2B2732,
  pants: 0x26242E, shoe: 0xF2F0F5, sole: 0xCFCBD6,
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

const gauss = (d, w) => Math.exp(-((d / w) ** 2));

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
// ---------- Cheveux : base fine sur le crâne + mèches sculptées par-dessus ----------
// Ligne d'implantation (en hauteur sur la sphère unité) selon la direction horizontale :
// front haut, côtés au-dessus de l'oreille, pattes courtes, nuque.
const hairlineAt = (az) => {
  const c = Math.cos(az);
  return mix(-0.5, 0.4, smooth(-0.7, 0.85, c)) + 0.2 * gauss(c + 0.05, 0.22) - 0.08 * gauss(c - 0.26, 0.08);
};

// Pointes du dessus : [x, z] sur la carte du crâne (projection azimutale : x vers la gauche, z vers
// l'avant, 0 = sommet, ~0.74 = front), rayon de la base sur la carte, hauteur.
const HAIR_SPIKES = [
  [-0.33, 0.5, 0.27, 0.08], [0.0, 0.56, 0.29, 0.1], [0.34, 0.48, 0.27, 0.08],
  [-0.17, 0.25, 0.29, 0.095], [0.18, 0.24, 0.29, 0.095],
  [-0.45, 0.12, 0.25, 0.06], [0.46, 0.1, 0.25, 0.06],
  [0.0, -0.02, 0.29, 0.08], [-0.27, -0.2, 0.26, 0.055], [0.28, -0.21, 0.26, 0.055],
];

// Cheveux : silhouette Animal Crossing, matière Funko. Une seule surface continue : une calotte
// épaisse (côtés et arrière lisses, bord arrondi) d'où sortent de larges pointes soudées entre elles,
// inclinées vers le haut et l'avant. Creux adoucis, bouts pointus mais doux, légères stries le long
// de chaque pointe.
function buildHairGeometry() {
  const ROWS = 220, COLS = 440;
  const N = (ROWS + 1) * (COLS + 1);
  const p = new THREE.Vector3(), o = new THREE.Vector3();
  const cHair = new THREE.Color(COLORS.hair), cDark = new THREE.Color(COLORS.hairDark), c = new THREE.Color();
  const dirs = new Float32Array(N * 3), tRow = new Float32Array(N);
  const height = new Float32Array(N), spikeH = new Float32Array(N), valley = new Float32Array(N);

  for (let i = 0; i <= ROWS; i++) {
    const t = i / ROWS;
    for (let j = 0; j <= COLS; j++) {
      const az = (j / COLS) * Math.PI * 2;
      const theta = t * Math.acos(hairlineAt(az));
      p.set(Math.sin(theta) * Math.sin(az), Math.cos(theta), Math.sin(theta) * Math.cos(az));
      const k = i * (COLS + 1) + j;
      dirs[k * 3] = p.x; dirs[k * 3 + 1] = p.y; dirs[k * 3 + 2] = p.z; tRow[k] = t;
      const rr = Math.acos(Math.max(-1, Math.min(1, p.y))) / (Math.PI / 2);
      const X = rr * Math.sin(az), Z = rr * Math.cos(az);
      // calotte façon Funko : épaisse, un peu plus sur le dessus
      const top = smooth(-0.3, 0.8, p.y);
      let h = 0.012 + 0.016 * top;
      // pointes : cônes soudés (union douce), stries le long de la pointe dominante
      let sum = 0, best = 0, bestAng = 0;
      for (const [sx, sz, R, H] of HAIR_SPIKES) {
        const dx = X - sx, dz = Z - sz, d = Math.hypot(dx, dz);
        if (d >= R) continue;
        const v = H * (1 - d / R) ** 1.25;
        sum += v ** 5;
        if (v > best) { best = v; bestAng = Math.atan2(dz, dx); }
      }
      const spikes = Math.pow(sum, 1 / 5);
      const grooves = 1 - 0.035 * (0.5 + 0.5 * Math.cos(bestAng * 7)) * smooth(0.15, 0.6, best / 0.08);
      spikeH[k] = spikes * grooves;
      valley[k] = spikes > 0 ? 1 - best / Math.max(spikes, 1e-6) : 0;
      // bord : bourrelet arrondi (quart de cercle) ; les pointes s'effacent avant le bord
      const front = smooth(0.2, 0.9, p.z);
      const t0 = mix(0.9, 0.94, front);
      const rim = t > t0 ? Math.sqrt(Math.max(0, 1 - ((t - t0) / (1 - t0)) ** 2)) : 1;
      height[k] = h * rim;
      spikeH[k] *= smooth(0.97, 0.8, t);
    }
  }
  // Adoucit les creux entre les pointes et le bout des pointes (lissage des hauteurs, colonnes bouclées)
  const tmp = new Float32Array(N);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i <= ROWS; i++) {
      for (let j = 0; j <= COLS; j++) {
        const k = i * (COLS + 1) + j;
        if (i === 0 || i === ROWS) { tmp[k] = spikeH[k]; continue; }
        const jl = j === 0 ? COLS - 1 : j - 1, jr = j === COLS ? 1 : j + 1;
        tmp[k] = (4 * spikeH[k] + spikeH[k - COLS - 1] + spikeH[k + COLS + 1] + spikeH[i * (COLS + 1) + jl] + spikeH[i * (COLS + 1) + jr]) / 8;
      }
    }
    spikeH.set(tmp);
  }

  const positions = [], colors = [], index = [];
  for (let k = 0; k < N; k++) {
    p.set(dirs[k * 3], dirs[k * 3 + 1], dirs[k * 3 + 2]);
    headShape(p, o);
    const len = o.length();
    const sh = spikeH[k];
    o.multiplyScalar((len + 0.0015 + height[k] + sh) / len);
    o.z += 0.5 * sh;                        // les pointes s'inclinent vers l'avant, d'autant plus qu'elles sont hautes
    o.y += 0.15 * sh;
    positions.push(o.x, o.y, o.z);
    c.copy(cHair).lerp(cDark, 0.5 * smooth(0.2, 0.8, valley[k]) + 0.15 * (1 - smooth(-0.3, 0.6, p.y)));
    colors.push(c.r, c.g, c.b);
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

// Point et normale (lissée) du visage sous le point (x, y), visé de face.
function surfaceHit(target, x, y) {
  _ray.set(_hitO.set(x, y, 1), _hitD);
  const hit = _ray.intersectObject(target, false)[0];
  if (!hit) return null;
  const n = (hit.normal || hit.face.normal).clone().transformDirection(target.matrixWorld);
  return { p: hit.point.clone(), n };
}
const _hitO = new THREE.Vector3(), _hitD = new THREE.Vector3(0, 0, -1);

// Trait sculpté posé sur le visage (sourcils, bouche) : section ovale aplatie,
// largeur et épaisseur variables le long du trait, bouts qui se referment en douceur.
function sculptStroke(target, pts, width, thick, cy, segs = 40, sides = 12) {
  const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const P = [], N = [];
  for (let i = 0; i <= segs; i++) {
    const v = curve.getPoint(i / segs);
    const hit = surfaceHit(target, v.x, cy + v.y);
    P.push(hit.p); N.push(hit.n);
  }
  const pos = [], index = [];
  const T = new THREE.Vector3(), B = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    T.subVectors(P[Math.min(segs, i + 1)], P[Math.max(0, i - 1)]).normalize();
    B.crossVectors(N[i], T).normalize();
    const t = i / segs, end = Math.sqrt(Math.min(1, Math.min(t, 1 - t) / 0.08));
    const w = width(t) * end, h = thick(t) * end;
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      v.copy(P[i]).addScaledVector(B, c * w).addScaledVector(N[i], sn > 0 ? sn * h : sn * h * 0.4);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < sides; k++) {
      const a = i * sides + k, b = i * sides + ((k + 1) % sides);
      index.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  return finishGeometry(pos, index, (i, v) => v.sub(P[Math.floor(i / sides)]));
}

// Normales calculées, et triangles retournés si elles pointent en moyenne vers l'intérieur.
// outward(i, v) : direction « extérieure » attendue pour le sommet i (position v).
function finishGeometry(pos, index, outward, colors) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  const pa = g.attributes.position, na = g.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
  let sum = 0;
  for (let i = 0; i < pa.count; i++) sum += n.fromBufferAttribute(na, i).dot(outward(i, v.fromBufferAttribute(pa, i)));
  if (sum < 0) {
    for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
    g.setIndex(index);
    g.computeVertexNormals();
  }
  return g;
}

// ---------- Visage : yeux, nez, oreilles, pilosité ----------
// Nez : sphère déformée, base arrondie avec ailes discrètes, arête qui remonte et se fond dans le visage.
function buildNoseGeometry() {
  const g = new THREE.SphereGeometry(1, 32, 24);
  const pos = g.attributes.position, p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const up = Math.max(0, p.y);
    const x = p.x * 0.025 * (1 - 0.3 * up * up) * (1 + 0.28 * gauss(p.y + 0.3, 0.35) * (1 - Math.abs(p.z)));
    const y = p.y * (p.y > 0 ? 0.034 : 0.021);
    const z = p.z * 0.023 * (1 - 0.45 * up * up);
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// Oreille : coquille creusée sur la face extérieure (+z), lobe plus étroit.
function buildEarGeometry() {
  const g = new THREE.SphereGeometry(1, 28, 20);
  const pos = g.attributes.position, p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const bowl = p.z > 0 ? gauss(Math.hypot(p.x * 1.2, p.y + 0.05), 0.5) : 0;
    const x = p.x * 0.034 * (1 - 0.3 * Math.max(0, -p.y));
    const y = p.y * 0.056;
    const z = p.z * 0.02 * (1 - 0.95 * bowl);
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// Moustache fine, mouche et bouc court : intensité 0 → 1 selon la position sur le visage.
function facialHairMask(o) {
  if (o.z < 0.02) return { m: 0, h: 0 };
  const ax = Math.abs(o.x);
  const mus = gauss(o.y + 0.152 + 0.004 * (ax / 0.048) ** 2, 0.006) * smooth(0.054, 0.036, ax) * (1 - 0.4 * gauss(o.x, 0.005));
  const soul = gauss(o.y + 0.212, 0.011) * gauss(o.x, 0.007);
  // bouc : écusson aux coins arrondis sur le bout du menton, poils courts (moins dense que la moustache)
  const sq = ((ax / 0.04) ** 3 + (Math.abs(o.y + 0.292) / 0.034) ** 3) ** (1 / 3);
  const goat = 0.55 * smooth(1.15, 0.55, sq) * smooth(0.02, 0.12, o.z);
  return { m: Math.min(1, Math.max(mus, soul, goat)), h: 0.0022 * mus + 0.0022 * soul + 0.0055 * goat };
}

// Coque calée sur la tête (même déformation), ne garde que les zones de poils ; le bord a la couleur de la peau.
function buildFacialHairGeometry() {
  const ROWS = 130, COLS = 160;
  const T0 = 1.72, T1 = 3.08, A = 0.85;
  const p = new THREE.Vector3(), o = new THREE.Vector3();
  const cSkin = new THREE.Color(COLORS.skin), cBeard = new THREE.Color(COLORS.beard), c = new THREE.Color();
  const pos = [], colors = [], mask = [], index = [];
  for (let i = 0; i <= ROWS; i++) {
    const th = mix(T0, T1, i / ROWS);
    for (let j = 0; j <= COLS; j++) {
      const az = mix(-A, A, j / COLS);
      p.set(Math.sin(th) * Math.sin(az), Math.cos(th), Math.sin(th) * Math.cos(az));
      headShape(p, o);
      const { m, h } = facialHairMask(o);
      const len = o.length();
      o.multiplyScalar((len + 0.0006 + h) / len);
      pos.push(o.x, o.y, o.z);
      c.copy(cSkin).lerp(cBeard, 0.9 * smooth(0, 0.6, m));
      c.multiplyScalar(1 - 0.3 * m * noise3(p.x * 220, p.y * 220, p.z * 220));
      colors.push(c.r, c.g, c.b);
      mask.push(m);
    }
  }
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      const a = i * (COLS + 1) + j, b = a + COLS + 1;
      if (Math.max(mask[a], mask[a + 1], mask[b], mask[b + 1]) < 0.003) continue;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return finishGeometry(pos, index, (i, v) => v, colors);
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
    skin: std(COLORS.skin, 0.55), lip: std(COLORS.lip, 0.5),
    hair: std(0xffffff, 0.5, { vertexColors: true }),
    brow: std(COLORS.brow, 0.8),
    shirt: std(COLORS.shirt, 0.85), placket: std(COLORS.placket, 0.7),
    pants: std(COLORS.pants, 0.9), shoe: std(COLORS.shoe, 0.5), sole: std(COLORS.sole, 0.7),
    shine: std(0xffffff, 0.2, { emissive: 0xffffff, emissiveIntensity: 0.6 }),
    eye: std(COLORS.eye, 0.15),
    mouth: std(COLORS.mouth, 0.7),
    facialHair: std(0xffffff, 0.6, { vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
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
  // Sourcils sculptés : épais à l'intérieur, fins vers la tempe, le gauche un peu relevé (air sûr de lui)
  [1, -1].forEach((sx) => {
    const lift = sx > 0 ? 0.006 : 0;
    const pts = [[0.058, 0.052], [0.09, 0.066], [0.125, 0.07], [0.162, 0.054]].map(([x, y]) => [sx * x, y + lift]);
    const geo = sculptStroke(headMesh, pts, (t) => 0.0085 * (1 - 0.65 * t) * smooth(0, 0.12, t) + 0.0012, () => 0.0042, HEAD_C.y);
    head.add(mesh(geo, M.brow));
  });
  // Nez : petit volume doux qui remonte en arête, de la même matière que le visage
  face(mesh(buildNoseGeometry(), M.skin), 0, -0.075, -0.008);
  // Bouche : pli fin avec un coin relevé, lèvre inférieure en léger relief
  const mouthY = (x) => -0.168 + 0.009 * (x / 0.04) ** 2 + 0.003 * (x / 0.04);
  head.add(mesh(sculptStroke(headMesh, curvePts(-0.04, 0.042, mouthY, 7), (t) => 0.0021 * Math.sin(Math.PI * t) + 0.0006, () => 0.0012, HEAD_C.y), M.mouth));
  head.add(mesh(sculptStroke(headMesh, curvePts(-0.026, 0.028, (x) => mouthY(x) - 0.0095 + 0.004 * (x / 0.027) ** 2, 7), (t) => 0.0058 * Math.sin(Math.PI * t) ** 0.7, () => 0.0035, HEAD_C.y), M.lip));
  // Moustache fine, mouche et bouc court : relief posé sur la peau, bords fondus
  head.add(mesh(buildFacialHairGeometry(), M.facialHair, { p: [HEAD_C.x, HEAD_C.y, HEAD_C.z] }));

  // Oreilles : forme en coquille, à hauteur des yeux, légèrement inclinées vers l'arrière
  [1, -1].forEach((sx) => {
    const ear = mesh(buildEarGeometry(), M.skin);
    placeOn(headMesh, ear, new THREE.Vector3(sx, HEAD_C.y - 0.045, -0.025), new THREE.Vector3(-sx, 0, 0), 0.004);
    ear.rotateY(sx * 0.3);
    ear.rotateZ(sx * 0.12);
    head.add(ear);
  });

  head.add(headMesh);
  head.add(mesh(buildHairGeometry(), M.hair, { p: [HEAD_C.x, HEAD_C.y, HEAD_C.z] }));

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

  // Regard (radians, comme la tête) : les yeux glissent un peu sur le visage. Clignement : 1 ouvert, 0 fermé.
  const setGaze = (yaw, pitch) => {
    for (const e of eyes) {
      e.position.copy(e.userData.base);
      e.position.x += yaw * 0.012;
      e.position.y -= pitch * 0.012;
    }
  };
  const setBlink = (open) => {
    for (const e of eyes) e.scale.y = mix(0.12, 1, open);
  };

  return { root, hips, spine, chest, neck, head, torso, eyes, arms, legs, setGaze, setBlink };
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
