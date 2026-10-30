// Avatar « figurine » d'Ethan, modélisé en code (aucun fichier 3D à charger).
// Squelette : Hips > Spine > Chest > Neck > Head (+ Eye.L/R), bras et jambes.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const COLORS = {
  skin: 0xE6B496, lip: 0xC07868, mouth: 0x4A221C,
  hair: 0x2A1C15, hairDark: 0x150D0A, streak: 0xEDE8E0, beard: 0x4A372C, brow: 0x2B1E18,
  eye: 0x1C120E,
  shirt: 0x16141B, collar: 0x221F29, placket: 0x221F29, button: 0x3A3542,
  pants: 0x2C2C33, shoe: 0xF2F0F5, sole: 0xE4E1EA, outsole: 0x9A96A3, lace: 0xC9C5D0,
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function std(color, roughness = 0.65, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function fabric(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.92, sheen: 0.45, sheenRoughness: 0.7, sheenColor: 0x5E5670, ...extra });
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
  // ovale doux : la mâchoire ne s'affine que tout en bas, menton arrondi
  let x = p.x * 0.325 * (1 - 0.21 * Math.pow(low, 1.7)) * (1 + 0.04 * Math.exp(-(((p.y + 0.3) / 0.3) ** 2)));
  let y = p.y * 0.335 * (1 + 0.06 * low);
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

// Pointes du dessus : irrégulières (tailles et positions variées, pas de couronne), plus grandes vers
// l'avant, avec de petites pointes intercalées. Repère : carte du crâne (projection azimutale : x vers
// la gauche du perso, z vers l'avant, 0 = sommet, ~0.74 = front). [x, z, rayon de la base, hauteur]
const HAIR_SPIKES = (() => {
  let seed = 41;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const spikes = [];
  for (let z = -0.42; z <= 0.6; z += 0.22) {
    const row = Math.round((z + 0.42) / 0.22);
    for (let x = -0.55 + (row % 2) * 0.15; x <= 0.58; x += 0.3) {
      const cx = x + (rnd() - 0.5) * 0.12, cz = z + (rnd() - 0.5) * 0.08;
      if (Math.hypot(cx, cz) > 0.7) continue;
      const front = smooth(-0.3, 0.55, cz);
      spikes.push([cx, cz, 0.25 + 0.06 * rnd(), (0.055 + 0.035 * rnd()) * mix(0.55, 1.15, front)]);
      // petite pointe intercalée, pour le détail
      if (rnd() < 0.3) spikes.push([cx + 0.13 + (rnd() - 0.5) * 0.05, cz + 0.06, 0.12 + 0.04 * rnd(), (0.02 + 0.02 * rnd()) * mix(0.6, 1.1, front)]);
    }
  }
  return spikes;
})();

// Cheveux : une seule surface continue. Côtés et arrière ras en dégradé (jusqu'à la peau) ; sur le
// dessus, des pointes soudées et irrégulières (voir HAIR_SPIKES), inclinées vers l'avant et vers la
// gauche du perso (la droite de l'écran). Creux adoucis et un peu plus sombres.
function buildHairGeometry() {
  const ROWS = 130, COLS = 260;
  const N = (ROWS + 1) * (COLS + 1);
  const p = new THREE.Vector3(), o = new THREE.Vector3();
  const cHair = new THREE.Color(COLORS.hair), cDark = new THREE.Color(COLORS.hairDark), c = new THREE.Color();
  const cShort = new THREE.Color(COLORS.skin).lerp(cHair, 0.45);   // cheveux ras : la peau transparaît
  const cStreak = new THREE.Color(COLORS.streak);
  const dirs = new Float32Array(N * 3), tRow = new Float32Array(N);
  const height = new Float32Array(N), spikeH = new Float32Array(N), valley = new Float32Array(N), fade = new Float32Array(N), streak = new Float32Array(N);

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
      // calotte : du volume seulement sur le dessus ; côtés et arrière ras, collés au crâne
      const top = smooth(-0.3, 0.8, p.y);
      const crown = smooth(0.35, 0.85, p.y);
      let h = 0.003 + 0.012 * crown;
      // pointes : cônes soudés (union douce) ; là où deux pointes se rencontrent, un creux plus sombre
      let sum = 0, best = 0, second = 0;
      for (const [sx, sz, R, H] of HAIR_SPIKES) {
        const dx = X - sx, dz = Z - sz, d = Math.hypot(dx, dz);
        if (d >= R) continue;
        const v = H * (1 - d / R) ** 1.3;
        sum += v ** 5;
        if (v > best) { second = best; best = v; } else if (v > second) second = v;
      }
      spikeH[k] = Math.pow(sum, 1 / 5);
      valley[k] = best > 0 ? smooth(0.5, 1, second / best) : 0;
      // mèche blanche : sur l'avant, côté droit du perso (x négatif), qui suit les pointes vers l'avant
      streak[k] = smooth(0.17, 0.08, Math.hypot((X + 0.24) * 1.2, (Z - 0.5) * 0.7));
      // bord : bourrelet arrondi à l'avant seulement ; les pointes s'effacent avant le bord
      const front = smooth(0.2, 0.9, p.z);
      const t0 = mix(0.9, 0.94, front);
      fade[k] = smooth(0.62, 1, t) * (1 - smooth(0.35, 0.85, p.z)) * (1 - crown);
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
    o.z += 0.55 * sh;                       // les pointes s'inclinent vers l'avant et le côté, d'autant plus qu'elles sont hautes
    o.x += 0.35 * sh;
    positions.push(o.x, o.y, o.z);
    c.copy(cHair).lerp(cDark, 0.5 * smooth(0.2, 0.8, valley[k])).lerp(cStreak, 0.9 * streak[k] * (1 - 0.5 * valley[k])).lerp(cShort, 0.8 * fade[k]);
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
// Placement de la bouche et de la barbe (hauteurs y et demi-largeurs, repère du centre de la tête) :
// bouche plus étroite que la moustache et calée juste dessous, mouche sous la lèvre, bouc sur le menton.
const FACE = { musY: -0.152, musW: 0.048, soulY: -0.203, mouthY: -0.172, mouthW: 0.033, lipY: -0.182, lipW: 0.022 };
function facialHairMask(o, st = FACE) {
  if (o.z < 0.02) return { m: 0, h: 0 };
  const ax = Math.abs(o.x);
  const mus = gauss(o.y - st.musY + 0.004 * (ax / st.musW) ** 2, 0.006) * smooth(st.musW + 0.006, st.musW - 0.012, ax) * (1 - 0.4 * gauss(o.x, 0.005));
  const soul = gauss(o.y - st.soulY, 0.009) * gauss(o.x, 0.007);
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

// Torse : profil lissé (spline) tourné autour de l'axe, puis sculpté : épaules larges, taille marquée,
// poitrine un peu bombée devant, dos plus plat.
function buildTorsoGeometry() {
  const spline = new THREE.SplineCurve([
    [0.0, -0.235], [0.18, -0.235], [0.183, -0.2], [0.172, -0.12], [0.178, -0.02], [0.192, 0.07],
    [0.196, 0.13], [0.18, 0.18], [0.14, 0.218], [0.095, 0.24], [0.06, 0.25], [0.0, 0.253],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.LatheGeometry(spline.getPoints(64), 128);
  const pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z) || 1, front = v.z / r;
    let z = v.z * 0.7;
    if (front > 0) z *= 1 + 0.07 * front * front * Math.exp(-(((v.y - 0.1) / 0.09) ** 2));   // poitrine
    else z *= 0.94;                                                                        // dos plus plat
    pos.setXYZ(i, v.x, v.y, z);
  }
  g.computeVertexNormals();
  return g;
}

// Ouverture du col : triangle de peau finement maillé, dont chaque sommet est posé sur la surface du
// torse (lancer de rayon). Bord net ; le haut s'arrête sous le pied de col, qui couvre la jonction.
function buildVNeckGeometry(torso) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.05, 0.247);
  shape.lineTo(0.05, 0.247);
  shape.lineTo(0.0, 0.168);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape, 1);
  // subdivision pour épouser la courbure
  let geo = g.toNonIndexed();
  for (let k = 0; k < 4; k++) {
    const p = geo.attributes.position, out = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      const ab = a.clone().lerp(b, 0.5), bc = b.clone().lerp(c, 0.5), ca = c.clone().lerp(a, 0.5);
      for (const [x, y, z] of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]) out.push(...x.toArray(), ...y.toArray(), ...z.toArray());
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  }
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    _ray.set(_hitO.set(v.x, v.y, 1), _hitD);
    const hit = _ray.intersectObject(torso, false)[0];
    if (hit) p.setXYZ(i, v.x, Math.min(v.y, hit.point.y), hit.point.z + 0.0012);
    else p.setXYZ(i, v.x, v.y, 0);                         // hors du torse : caché dedans
  }
  const m = mergeVertices(geo, 1e-6);
  m.computeVertexNormals();
  return m;
}

// Main : paume, quatre doigts à deux phalanges articulées et pouce. Bras le long du corps, la paume
// regarde le corps (axe x local) ; les doigts sont répartis d'avant en arrière (axe z).
// Renvoie les articulations pour animer les frappes au clavier : [[base, phalange], …] + pouce.
function buildHand(hand, sx, material) {
  const palm = mesh(sphere(20, 16), material, { p: [0, -0.04, 0.004], s: [0.024, 0.048, 0.044] });
  hand.add(palm);
  const fingers = [];
  [[0.03, 0.03, 1.0], [0.01, 0.035, 1.08], [-0.01, 0.033, 1.02], [-0.029, 0.027, 0.88]].forEach(([z, len, k]) => {
    const base = joint('Finger', hand, [0, -0.076, z]);
    base.add(mesh(new THREE.CapsuleGeometry(0.0105 * k, len * 0.55, 4, 10), material, { p: [0, -len * 0.42, 0] }));
    const tip = joint('FingerTip', base, [0, -len * 0.82, 0]);
    tip.add(mesh(new THREE.CapsuleGeometry(0.0098 * k, len * 0.42, 4, 10), material, { p: [0, -len * 0.32, 0] }));
    // repos : doigts légèrement repliés vers la paume (côté du corps)
    base.rotation.z = -sx * 0.25; tip.rotation.z = -sx * 0.35;
    fingers.push([base, tip]);
  });
  const thumb = joint('Thumb', hand, [-sx * 0.012, -0.03, 0.035]);
  thumb.add(mesh(new THREE.CapsuleGeometry(0.0125, 0.022, 4, 10), material, { p: [0, -0.018, 0] }));
  const thumbTip = joint('ThumbTip', thumb, [0, -0.036, 0]);
  thumbTip.add(mesh(new THREE.CapsuleGeometry(0.0115, 0.016, 4, 10), material, { p: [0, -0.012, 0] }));
  thumb.rotation.set(0.35, 0, -sx * 0.45);
  thumbTip.rotation.z = -sx * 0.25;
  return { fingers, thumb: [thumb, thumbTip] };
}

// Sneaker blanche : semelle intermédiaire claire + semelle d'usure grise, tige arrondie, col de
// cheville, languette et lacets.
// Contour d'une semelle vu de dessus, angle a (0 → 2π) : [x (largeur), l (longueur, vers l'avant)].
// Talon arrondi plus étroit, cambrure, bout arrondi ; décalé de `inset` vers l'intérieur.
function soleOutline(a, inset = 0) {
  const c = Math.cos(a), sn = Math.sin(a);
  let w = 0.062 * (sn > 0 ? 1 : 0.86) * (1 - 0.14 * Math.exp(-(((sn + 0.05) / 0.35) ** 2)));
  w *= Math.pow(Math.abs(c), 0.75) * Math.sign(c);
  return [w - Math.sign(w) * inset, 0.128 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.9) - Math.sign(sn) * inset];
}
// Normales lissées (les extrusions sortent avec des facettes sur les côtés).
function smoothed(g) {
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const m = mergeVertices(g, 1e-5);
  m.computeVertexNormals();
  return m;
}
function soleShape(inset = 0) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const [x, l] = soleOutline((i / 96) * Math.PI * 2, inset);
    if (i === 0) shape.moveTo(x, l); else shape.lineTo(x, l);
  }
  return shape;
}

// Sneaker blanche : semelle épaisse aux bords arrondis qui suit la forme du pied, fine semelle d'usure
// grise ; tige d'une seule pièce qui monte en dôme depuis le contour de la semelle (haute au talon,
// basse au bout), lacets posés sur le dessus. Le bas du pantalon rentre dans la chaussure.
const SHOE_Z = 0.045;
const shoeHeight = (l) => mix(0.03, 0.082, smooth(0.12, -0.1, l));
function buildSneaker(foot, M) {
  const sole = smoothed(new THREE.ExtrudeGeometry(soleShape(0.006), { depth: 0.018, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.006, bevelSegments: 4, curveSegments: 4 }));
  foot.add(mesh(sole, M.sole, { p: [0, -0.055, SHOE_Z], r: [Math.PI / 2, 0, 0] }));
  const outsole = smoothed(new THREE.ExtrudeGeometry(soleShape(0.004), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 4 }));
  foot.add(mesh(outsole, M.outsole, { p: [0, -0.083, SHOE_Z], r: [Math.PI / 2, 0, 0] }));
  // tige : anneaux du contour de la semelle jusqu'au sommet du dôme
  const Y0 = -0.05, RINGS = 14, N = 64;
  const positions = [], index = [];
  for (let i = 0; i <= RINGS; i++) {
    const phi = (i / RINGS) * Math.PI / 2, sp = Math.sin(phi), cp = Math.cos(phi);
    for (let j = 0; j <= N; j++) {
      const [x, l] = soleOutline((j / N) * Math.PI * 2, 0.008);
      positions.push(x * Math.pow(cp, 0.55), Y0 + shoeHeight(l) * Math.pow(sp, 0.85), SHOE_Z + l * (1 - 0.08 * sp));
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < N; j++) {
      const a = i * (N + 1) + j, b = a + N + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const upper = finishGeometry(positions, index, (i, v) => v.set(v.x, v.y - Y0 + 0.01, (v.z - SHOE_Z) * 0.3));
  foot.add(mesh(upper, M.shoe));
  // lacets : barrettes en travers du coup-de-pied, inclinées selon la pente de la tige
  [-0.03, 0.0, 0.03, 0.06].forEach((l) => {
    const y = Y0 + shoeHeight(l) + 0.002, slope = (shoeHeight(l + 0.01) - shoeHeight(l - 0.01)) / 0.02;
    foot.add(mesh(new RoundedBoxGeometry(0.034, 0.005, 0.01, 1, 0.0025), M.lace, { p: [0, y, SHOE_Z + l * 0.95], r: [-Math.atan(slope), 0, 0] }));
  });
}

export function buildAvatar() {
  const st = FACE;
  const M = {
    // peau satinée : léger reflet doux et chaud sur les bords (sheen), sans brillance plastique
    skin: new THREE.MeshPhysicalMaterial({ color: COLORS.skin, roughness: 0.5, sheen: 0.45, sheenRoughness: 0.55, sheenColor: 0xFFC9B0, clearcoat: 0.08, clearcoatRoughness: 0.6 }),
    lip: std(COLORS.lip, 0.5),
    hair: std(0xffffff, 0.5, { vertexColors: true }),
    brow: std(COLORS.brow, 0.8),
    // tissu mat : très rugueux, avec un reflet de fibre rasant (sheen) qui dessine les volumes
    shirt: fabric(COLORS.shirt), placket: std(COLORS.placket, 0.8), collar: fabric(COLORS.collar, { side: THREE.DoubleSide }),
    button: std(COLORS.button, 0.35),
    pants: fabric(COLORS.pants), shoe: std(COLORS.shoe, 0.5), sole: std(COLORS.sole, 0.7), outsole: std(COLORS.outsole, 0.8),
    lace: std(COLORS.lace, 0.6),
    shine: std(0xffffff, 0.2, { emissive: 0xffffff, emissiveIntensity: 0.6 }),
    eye: std(COLORS.eye, 0.15),
    mouth: std(COLORS.mouth, 0.7),
    facialHair: std(0xffffff, 0.6, { vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  };

  const root = new THREE.Group();
  root.name = 'Avatar';
  const hips = joint('Hips', root, [0, 0.667, 0]);

  // Bassin : profil de pantalon
  const pantsProfile = [[0, -0.12], [0.12, -0.115], [0.16, -0.07], [0.165, 0], [0.163, 0.07], [0, 0.07]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  hips.add(mesh(new THREE.LatheGeometry(pantsProfile, 40), M.pants, { s: [1, 1, 0.66] }));

  const spine = joint('Spine', hips, [0, 0.06, 0]);
  const chest = joint('Chest', spine, [0, 0.14, 0]);

  // Torse : silhouette en V (épaules larges, taille plus fine), poitrine légèrement bombée, dos plus
  // plat. L'ouverture du col est une pièce de peau posée sur le torse (buildVNeckGeometry).
  const torso = mesh(buildTorsoGeometry(), M.shirt);
  chest.add(torso);
  torso.updateMatrixWorld(true);
  chest.add(mesh(buildVNeckGeometry(torso), M.skin));
  const onTorso = (obj, x, y, lift = 0.002, spin = 0) => {
    placeOn(torso, obj, new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1), lift, spin);
    chest.add(obj);
    return obj;
  };
  // Ourlet du bas de la chemise
  chest.add(mesh(new THREE.TorusGeometry(0.181, 0.006, 10, 64), M.shirt, { p: [0, -0.232, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.7 * 0.97, 1] }));
  // Patte de boutonnage en léger relief + boutons
  onTorso(mesh(new RoundedBoxGeometry(0.026, 0.3, 0.004, 2, 0.0018), M.placket), 0, -0.04, 0.001);
  const buttonGeo = new THREE.CylinderGeometry(0.0075, 0.0075, 0.004, 16);
  [0.07, -0.02, -0.11, -0.19].forEach((y) => {
    const b = new THREE.Group();                          // placeOn oriente le groupe ; le bouton y est couché
    b.add(mesh(buttonGeo, M.button, { r: [Math.PI / 2, 0, 0] }));
    onTorso(b, 0, y, 0.004);
  });
  // Col de chemise ouvert : pied de col autour du cou qui se rabat vers l'extérieur, ouvert devant,
  // prolongé par deux pointes couchées le long de l'ouverture en V.
  const COLLAR_GAP = 0.95;
  const collarProfile = [[0.104, 0.226], [0.098, 0.242], [0.088, 0.262], [0.078, 0.276], [0.07, 0.279], [0.066, 0.272], [0.066, 0.25]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  chest.add(mesh(new THREE.LatheGeometry(collarProfile, 48, COLLAR_GAP / 2, Math.PI * 2 - COLLAR_GAP), M.collar, { s: [1, 1, 0.82] }));
  const collarPoint = new THREE.Shape();
  collarPoint.moveTo(-0.004, 0.012);
  collarPoint.quadraticCurveTo(0.03, 0.016, 0.05, 0.004);
  collarPoint.quadraticCurveTo(0.042, -0.03, 0.012, -0.062);
  collarPoint.quadraticCurveTo(-0.006, -0.025, -0.004, 0.012);
  const collarGeo = new THREE.ExtrudeGeometry(collarPoint, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 10 });
  [1, -1].forEach((sx) => {
    const g = new THREE.Group();
    g.add(mesh(collarGeo, M.collar, { s: [sx, 1, 1] }));
    onTorso(g, sx * 0.03, 0.222, 0.004, 0);
  });

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
  // Bouche : sous la moustache et plus étroite qu'elle, lèvre inférieure au-dessus de la mouche.
  // Sourire : même trait, coins relevés, ajouté en cible de morphing (setSmile).
  const withSmile = (build) => {
    const g = build(0), smile = build(1);
    g.morphAttributes.position = [smile.attributes.position];
    g.morphAttributes.normal = [smile.attributes.normal];
    return g;
  };
  const bow = (y0, w, up) => (k) => (x) => y0 + (up + 0.01 * k) * (x / w) ** 2 - 0.002 * k;
  const mouthMesh = mesh(withSmile((k) => sculptStroke(headMesh, curvePts(-st.mouthW - 0.004 * k, st.mouthW + 0.004 * k, bow(st.mouthY, st.mouthW, 0.004)(k), 9), (t) => 0.0034 * Math.sin(Math.PI * t) ** 0.5 + 0.001, () => 0.0016, HEAD_C.y)), M.mouth);
  const lipMesh = mesh(withSmile((k) => sculptStroke(headMesh, curvePts(-st.lipW, st.lipW, (x) => bow(st.lipY, st.lipW, 0.004)(k)(x) - 0.002 * k, 9), (t) => 0.0068 * Math.sin(Math.PI * t) ** 0.7, () => 0.0038, HEAD_C.y)), M.lip);
  head.add(mouthMesh, lipMesh);
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

  // Bras : manche courte qui coiffe l'épaule (ourlet), bras et avant-bras sans raccord visible
  // profil décrit de bas en haut (sinon les faces regardent vers l'intérieur)
  // manche : simple tube (sans dôme) qui sort de l'épaule du torse ; le haut reste caché dans le torse
  const sleeveProfile = [
    [0.054, -0.1], [0.056, -0.124], [0.062, -0.13], [0.067, -0.124], [0.067, -0.11], [0.066, -0.05],
    [0.062, 0.0], [0.055, 0.03], [0.04, 0.045],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  // bras et avant-bras : profils anatomiques (de bas en haut), section un peu aplatie
  const limb = (pts) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 28);
  const upperArmGeo = limb([[0, -0.235], [0.026, -0.232], [0.036, -0.222], [0.039, -0.2], [0.042, -0.15], [0.045, -0.1], [0.046, -0.06], [0.044, -0.02], [0, 0]]);
  const foreArmGeo = limb([[0, -0.178], [0.022, -0.176], [0.029, -0.17], [0.031, -0.15], [0.036, -0.09], [0.042, -0.045], [0.041, -0.015], [0.034, 0.008], [0, 0.016]]);
  const sleeveGeo = new THREE.LatheGeometry(sleeveProfile, 40);
  const arms = {};
  [1, -1].forEach((sx) => {
    const side = sx > 0 ? 'L' : 'R';
    const ua = joint(`UpperArm.${side}`, chest, [sx * 0.19, 0.15, 0]);
    ua.add(mesh(sleeveGeo, M.shirt, { s: [1, 1, 0.92] }));
    ua.add(mesh(new THREE.TorusGeometry(0.064, 0.005, 8, 40), M.shirt, { p: [0, -0.127, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1] }));
    ua.add(mesh(upperArmGeo, M.skin, { s: [1, 1, 0.88] }));
    const la = joint(`LowerArm.${side}`, ua, [0, -0.22, 0]);
    la.add(mesh(sphere(16, 12), M.skin, { s: [0.036, 0.036, 0.032] }));   // coude : raccord quand le bras se plie
    la.add(mesh(foreArmGeo, M.skin, { s: [1, 1, 0.85] }));
    const hand = joint(`Hand.${side}`, la, [0, -0.17, 0]);
    const fingers = buildHand(hand, sx, M.skin);
    arms[side] = { ua, la, hand, fingers };
  });

  // Jambes : pantalon anthracite avec revers ; sneakers blanches (semelle en deux couches, col, lacets)
  const legs = {};
  // cuisse : s'affine de la hanche au genou (profil de bas en haut)
  const thighGeo = new THREE.LatheGeometry([[0, -0.29], [0.05, -0.285], [0.072, -0.27], [0.076, -0.22], [0.082, -0.12], [0.088, -0.03], [0.086, 0.02], [0.06, 0.05], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), 32);
  [1, -1].forEach((sx) => {
    const side = sx > 0 ? 'L' : 'R';
    const ul = joint(`UpperLeg.${side}`, hips, [sx * 0.09, -0.04, 0]);
    ul.add(mesh(thighGeo, M.pants, { s: [1, 1, 0.92] }));
    const ll = joint(`LowerLeg.${side}`, ul, [0, -0.27, 0]);
    ll.add(mesh(new THREE.CylinderGeometry(0.077, 0.072, 0.28, 24), M.pants, { p: [0, -0.13, 0] }));
    ll.add(mesh(new THREE.SphereGeometry(0.077, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.pants, { p: [0, 0.01, 0] }));
    ll.add(mesh(new THREE.TorusGeometry(0.072, 0.008, 8, 32), M.pants, { p: [0, -0.262, 0], r: [Math.PI / 2, 0, 0] }));
    const foot = joint(`Foot.${side}`, ll, [0, -0.27, 0]);
    buildSneaker(foot, M);
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
  // Sourire : 0 → 1, les yeux se plissent un peu
  let smile = 0, blinkOpen = 1;
  const setBlink = (open) => {
    blinkOpen = open;
    for (const e of eyes) e.scale.y = mix(0.12, 1, open) * (1 - 0.14 * smile);
  };
  const setSmile = (v) => {
    smile = v;
    mouthMesh.morphTargetInfluences[0] = v;
    lipMesh.morphTargetInfluences[0] = v;
    setBlink(blinkOpen);
  };

  return { root, hips, spine, chest, neck, head, torso, eyes, arms, legs, setGaze, setBlink, setSmile };
}

// ---------- Bureau, chaise, écran ----------
// ---------- Éclairage (partagé par la scène du site et l'outil d'images fixes) ----------
// Studio : lumière principale blanc chaud en hauteur devant à droite, remplissage neutre doux à gauche,
// ambiance neutre. Le violet n'éclaire jamais le visage de face : il vient de derrière, en deux
// liserés qui détachent la silhouette du fond noir.
export function buildLights() {
  const g = new THREE.Group();
  g.name = 'Lights';
  g.add(new THREE.HemisphereLight(0xF2F0F4, 0x18151C, 0.6));
  const key = new THREE.DirectionalLight(0xFFF1E4, 2.1);
  key.position.set(1.6, 2.8, 2.6);
  g.add(key);
  const fill = new THREE.DirectionalLight(0xE8ECF6, 0.55);
  fill.position.set(-2.2, 1.4, 1.8);
  g.add(fill);
  const rimL = new THREE.DirectionalLight(0xA58AE8, 2.0);
  rimL.position.set(-2.2, 2.2, -2.4);
  g.add(rimL);
  const rimR = new THREE.DirectionalLight(0x8E6CD8, 1.3);
  rimR.position.set(2.4, 1.6, -2.2);
  g.add(rimR);
  return g;
}

// Bureau : plateau épais aux bords arrondis sur deux pieds en cadre métal, tapis de bureau, clavier à
// vraies touches (une seule InstancedMesh), souris, mug, écran fin sur pied à plaque, chaise de bureau.
// Le clavier reste à l'endroit où tombent les mains de la pose assise (sitPose).
export function buildDesk() {
  const g = new THREE.Group();
  const wood = std(0x2A2328, 0.55);
  const metal = std(0x2E2B33, 0.35, { metalness: 0.7 });
  const plastic = std(0x1B1920, 0.45);
  const keyMat = std(0x26232C, 0.5);
  const fabricSeat = fabric(0x24212B);

  // Plateau et pieds (cadre en U inversé de chaque côté + traverse)
  const TOP_Y = 0.58;
  g.add(mesh(new RoundedBoxGeometry(1.3, 0.035, 0.62, 4, 0.014), wood, { p: [0, TOP_Y, 0.62] }));
  const tube = (len) => new RoundedBoxGeometry(0.035, len, 0.035, 2, 0.012);
  [-0.58, 0.58].forEach((x) => {
    g.add(mesh(tube(0.56), metal, { p: [x, 0.28, 0.4] }));
    g.add(mesh(tube(0.56), metal, { p: [x, 0.28, 0.84] }));
    g.add(mesh(new RoundedBoxGeometry(0.035, 0.035, 0.5, 2, 0.012), metal, { p: [x, 0.018, 0.62] }));   // patin au sol
    g.add(mesh(new RoundedBoxGeometry(0.035, 0.03, 0.5, 2, 0.012), metal, { p: [x, TOP_Y - 0.035, 0.62] }));
  });
  g.add(mesh(new RoundedBoxGeometry(1.16, 0.05, 0.02, 2, 0.008), metal, { p: [0, TOP_Y - 0.05, 0.86] }));

  // Tapis de bureau
  g.add(mesh(new RoundedBoxGeometry(0.82, 0.004, 0.3, 2, 0.002), fabric(0x1A1820), { p: [-0.08, TOP_Y + 0.019, 0.5] }));

  // Clavier : boîtier bas incliné + touches (5 rangées) + barre d'espace
  const kb = new THREE.Group();
  kb.position.set(0, TOP_Y + 0.024, 0.48);
  kb.rotation.x = -0.05;
  kb.add(mesh(new RoundedBoxGeometry(0.42, 0.018, 0.14, 3, 0.007), plastic));
  const KEY = 0.024, GAP = 0.0035, rows = [14, 14, 13, 12, 0];
  const keyGeo = new RoundedBoxGeometry(KEY, 0.01, KEY, 2, 0.003);
  const count = rows.reduce((n, r) => n + r, 0);
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, count);
  const m4 = new THREE.Matrix4();
  let k = 0;
  rows.forEach((n, r) => {
    const z = 0.052 - r * (KEY + GAP);                 // rangée 0 côté écran, barre d'espace côté utilisateur
    const x0 = -((n - 1) * (KEY + GAP)) / 2 + (r === 3 ? 0.012 : r === 2 ? 0.006 : 0);
    for (let i = 0; i < n; i++) keys.setMatrixAt(k++, m4.makeTranslation(x0 + i * (KEY + GAP), 0.013, z));
  });
  keys.castShadow = true;
  kb.add(keys);
  kb.add(mesh(new RoundedBoxGeometry(0.15, 0.01, KEY, 2, 0.003), keyMat, { p: [0, 0.013, 0.052 - 4 * (KEY + GAP)] }));
  g.add(kb);

  // Souris : demi-ovoïde, plus haute à l'arrière, molette
  const mouseGeo = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const mp = mouseGeo.attributes.position, mv = new THREE.Vector3();
  for (let i = 0; i < mp.count; i++) {
    mv.fromBufferAttribute(mp, i);
    mp.setXYZ(i, mv.x * 0.03, mv.y * (0.018 + 0.006 * smooth(0.4, -0.6, mv.z)), mv.z * 0.05);
  }
  mouseGeo.computeVertexNormals();
  g.add(mesh(mouseGeo, plastic, { p: [-0.33, TOP_Y + 0.021, 0.48] }));
  g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.005, 12), keyMat, { p: [-0.33, TOP_Y + 0.041, 0.502], r: [0, 0, Math.PI / 2] }));

  // Mug
  const mug = std(0xE9E5EE, 0.4);
  g.add(mesh(new THREE.CylinderGeometry(0.032, 0.03, 0.085, 24), mug, { p: [0.45, TOP_Y + 0.06, 0.55] }));
  g.add(mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.002, 24), std(0x2A1A12, 0.2), { p: [0.45, TOP_Y + 0.099, 0.55] }));
  g.add(mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 20), mug, { p: [0.482, TOP_Y + 0.06, 0.55], r: [0, 0, 0], s: [1, 1, 1] }));

  // Décor : lampe d'architecte (lumière chaude), petite plante en pot, carnet et stylo
  const lamp = new THREE.Group();
  lamp.position.set(0.52, TOP_Y + 0.018, 0.8);
  lamp.rotation.y = Math.PI - 0.5;               // le bras se penche vers le centre du bureau
  lamp.add(mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.014, 28), metal));
  const arm1 = new THREE.Group(); arm1.position.y = 0.01; arm1.rotation.z = 0.35; lamp.add(arm1);
  arm1.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 10), metal, { p: [0, 0.15, 0] }));
  const arm2 = new THREE.Group(); arm2.position.y = 0.3; arm2.rotation.z = -1.55; arm1.add(arm2);
  arm2.add(mesh(new THREE.SphereGeometry(0.014, 12, 10), metal));
  arm2.add(mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.26, 10), metal, { p: [0, 0.13, 0] }));
  const shade = new THREE.Group(); shade.position.y = 0.26; shade.rotation.z = -0.9; arm2.add(shade);
  shade.add(mesh(new THREE.CylinderGeometry(0.03, 0.065, 0.09, 28, 1, true), std(0x2E2B33, 0.4, { metalness: 0.5, side: THREE.DoubleSide }), { p: [0, 0.035, 0] }));
  shade.add(mesh(new THREE.SphereGeometry(0.024, 14, 10), std(0xFFE6C4, 0.3, { emissive: 0xFFD9A8, emissiveIntensity: 2 }), { p: [0, 0.055, 0] }));
  const lampLight = new THREE.SpotLight(0xFFD9A8, 2.2, 1.6, 0.9, 0.7, 1.5);
  lampLight.position.set(0, 0.06, 0);
  lampLight.target.position.set(0, 0.6, 0);
  shade.add(lampLight, lampLight.target);
  g.add(lamp);

  const pot = std(0xD9D3CB, 0.75);
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 24), pot, { p: [-0.52, TOP_Y + 0.058, 0.82] }));
  g.add(mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.004, 24), std(0x3A2A20, 0.95), { p: [-0.52, TOP_Y + 0.094, 0.82] }));
  const leaf = std(0x4F7A5A, 0.6);
  const leafGeo = new THREE.SphereGeometry(1, 14, 10);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3, tilt = 0.45 + (i % 3) * 0.2, len = 0.06 + (i % 3) * 0.015;
    const l = new THREE.Group();
    l.position.set(-0.52, TOP_Y + 0.098, 0.82);
    l.rotation.set(0, a, tilt);
    l.add(mesh(leafGeo, leaf, { p: [0, len, 0], s: [0.012, len, 0.022] }));
    g.add(l);
  }

  g.add(mesh(new RoundedBoxGeometry(0.15, 0.012, 0.21, 2, 0.004), std(0x3B3446, 0.8), { p: [0.33, TOP_Y + 0.024, 0.72], r: [0, 0.25, 0] }));
  g.add(mesh(new RoundedBoxGeometry(0.146, 0.004, 0.205, 1, 0.002), std(0xEDE8DF, 0.9), { p: [0.33, TOP_Y + 0.031, 0.72], r: [0, 0.25, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 10), std(0xB49CFF, 0.4), { p: [0.4, TOP_Y + 0.037, 0.71], r: [Math.PI / 2, 0, 0.6] }));

  // Écran : pied à plaque, colonne, dalle fine avec dos arrondi
  g.add(mesh(new RoundedBoxGeometry(0.22, 0.012, 0.15, 3, 0.005), metal, { p: [0, TOP_Y + 0.024, 0.8] }));
  g.add(mesh(new RoundedBoxGeometry(0.04, 0.24, 0.018, 2, 0.007), metal, { p: [0, TOP_Y + 0.14, 0.84], r: [0.12, 0, 0] }));
  g.add(mesh(new RoundedBoxGeometry(0.64, 0.39, 0.016, 3, 0.006), plastic, { p: [0, 0.9, 0.818] }));
  g.add(mesh(new RoundedBoxGeometry(0.4, 0.24, 0.03, 4, 0.012), plastic, { p: [0, 0.89, 0.83] }));   // bosse arrière
  const screen = makeTerminal();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.616, 0.366), new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }));
  plane.position.set(0, 0.902, 0.8095);
  plane.rotation.y = Math.PI;
  g.add(plane);
  const screenLight = new THREE.PointLight(0x9F7BFF, 1.6, 2.2, 1.5);
  screenLight.position.set(0, 0.95, 0.65);
  g.add(screenLight);

  // Chaise : assise et dossier galbés, accoudoirs, vérin, pied étoile à roulettes
  const seatShape = (w, d, h, bend) => {
    const geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(h, 0.03) * 0.45);
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      p.setY(i, v.y + bend * (v.x / (w / 2)) ** 2);   // bords relevés
    }
    geo.computeVertexNormals();
    return geo;
  };
  g.add(mesh(seatShape(0.44, 0.42, 0.065, 0.015), fabricSeat, { p: [0, 0.26, -0.02] }));
  g.add(mesh(seatShape(0.42, 0.46, 0.055, 0.02), fabricSeat, { p: [0, 0.58, -0.26], r: [Math.PI / 2 - 0.12, 0, 0] }));
  g.add(mesh(new RoundedBoxGeometry(0.05, 0.3, 0.02, 2, 0.008), metal, { p: [0, 0.38, -0.25], r: [-0.12, 0, 0] }));   // liaison dossier
  [-1, 1].forEach((sx) => {
    g.add(mesh(new RoundedBoxGeometry(0.025, 0.15, 0.025, 2, 0.01), metal, { p: [sx * 0.24, 0.34, -0.06] }));
    g.add(mesh(new RoundedBoxGeometry(0.05, 0.022, 0.22, 3, 0.01), plastic, { p: [sx * 0.24, 0.42, -0.02] }));
  });
  g.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.17, 16), metal, { p: [0, 0.14, -0.02] }));
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), plastic, { p: [0, 0.06, -0.02] }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.position.set(0, 0.05, -0.02);
    arm.rotation.y = a;
    arm.add(mesh(new RoundedBoxGeometry(0.035, 0.022, 0.24, 2, 0.008), metal, { p: [0, 0, 0.12], r: [0.08, 0, 0] }));
    arm.add(mesh(new THREE.SphereGeometry(0.022, 14, 10), plastic, { p: [0, -0.025, 0.235] }));
    g.add(arm);
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
    ctx.font = '20px ui-monospace, "SF Mono", Menlo, Consolas, monospace'; // écran de terminal : police à chasse fixe du système
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

// Assis en train de taper : buste penché vers l'écran, poignets au-dessus des touches, paumes vers le
// bas, avant-bras au-dessus du bord du bureau. Angles des bras trouvés par optimisation numérique
// (position du poignet, orientation de la main, dégagement du bureau) sur ce squelette précis :
// si le bureau, le clavier ou les bras changent, il faut les recalculer.
const SIT_ARM = { ua: [-1.298, -1.185, 0.116], la: [-0.728, -0.201, 0], hand: [0.642, -0.222, 0.05] };
export function sitPose(t, P) {
  const b = Math.sin(t * 1.7);
  const tapL = Math.max(0, Math.sin(t * 12.3) * Math.sin(t * 3.7 + 1));
  const tapR = Math.max(0, Math.sin(t * 11.1 + 2) * Math.sin(t * 2.9));
  set(P, 'hips', 0, 0, 0);
  set(P, 'spine', 0.12, 0, 0);
  set(P, 'chest', 0.08 + 0.01 * b, 0, 0);
  set(P, 'neck', 0.05, 0, 0);
  set(P, 'head', 0.12 + 0.02 * Math.sin(t * 2.1), 0.05 * Math.sin(t * 0.4), 0);
  [['L', 1, tapL], ['R', -1, tapR]].forEach(([side, sx, tap]) => {
    const drift = 0.04 * Math.sin(t * 0.7 + sx);                 // les mains glissent un peu sur le clavier
    const { ua, la, hand } = SIT_ARM;
    set(P, 'ua' + side, ua[0], sx * ua[1] + drift, sx * ua[2]);
    set(P, 'la' + side, la[0] - 0.03 * tap, sx * la[1], 0);
    set(P, 'h' + side, hand[0] + 0.06 * tap, sx * hand[1], sx * hand[2]);
  });
  set(P, 'ulL', -1.5, 0, 0.06); set(P, 'ulR', -1.5, 0, -0.06);
  set(P, 'llL', 1.5, 0, 0); set(P, 'llR', 1.5, 0, 0);
  set(P, 'fL', 0, 0, 0); set(P, 'fR', 0, 0, 0);
  P.hipsY = 0.405;
  P.breath = b;
}

// Salut : debout, coude devant l'épaule, avant-bras vertical, main droite du perso à hauteur
// d'oreille, paume vers l'avant (reste dans l'emplacement de l'avatar, loin du texte). Le bras tourne
// sur son axe (il pointe vers l'avant) : l'avant-bras balance de gauche à droite.
// Mêmes remarques que pour la pose assise (angles optimisés sur ce squelette).
const WAVE_ARM = { ua: [-1.474, -0.037, -0.47], la: [-1.647, 1.099, 0], hand: [-0.052, 0.002, 0.021] };
export function wavePose(t, P) {
  idlePose(t, P);
  const swing = Math.sin(t * 9);
  const { ua, la, hand } = WAVE_ARM;
  set(P, 'uaR', ua[0], ua[1] + 0.32 * swing, ua[2]);
  set(P, 'laR', la[0], la[1], 0);
  set(P, 'hR', hand[0], hand[1], hand[2] + 0.15 * swing);
  set(P, 'head', P.head[0], P.head[1], P.head[2] - 0.05);      // petite inclinaison de tête complice
}

// Doigts : légèrement repliés debout ; assis (sit 0 → 1), arrondis au-dessus des touches et frappes
// rapides à motif irrégulier ; openR (0 → 1) ouvre la main droite pour le salut. Appelé après la pose,
// à chaque image.
export function typeFingers(avatar, t, sit, openR = 0) {
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const { fingers, thumb } = avatar.arms[side].fingers;
    fingers.forEach(([base, tip], i) => {
      const ph = i * 2.1 + (sx > 0 ? 0 : 1.3);
      const press = Math.pow(Math.max(0, Math.sin(t * (7.3 + i * 1.7) + ph)), 12) * (0.5 + 0.5 * Math.sin(t * 1.3 + ph));
      const open = sx < 0 ? 1 - openR : 1;                           // salut : main droite grande ouverte
      base.rotation.z = -sx * (0.25 * open + sit * (0.35 + 0.5 * press));
      tip.rotation.z = -sx * (0.35 * open + sit * (0.3 + 0.35 * press));
    });
    thumb[0].rotation.z = -sx * (0.45 + sit * 0.2 - (sx < 0 ? 0.75 * openR : 0));   // salut : pouce écarté
  }
}
