import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import icons from '../generated/keycap-icons.json';
import type { Category, PressSignal, Skill } from '../sections/Toolbox';
import { markWebGLLost } from '../lib/capabilities';
import { Warmup } from './Warmup';

type Props = {
  skills: Skill[];
  categories: Category[];
  active: string | null;
  press: PressSignal;
  highlight: string | null;
  onHover: (id: string | null) => void;
  paused: boolean;
  scroll: { rotation: number };
  onLost: () => void;
};

const KEY = 0.86;
const PITCH = 1.0;
const GAP = PITCH - KEY;
const DIM = new THREE.Color('#2A2533');
const INK = '#F1EADF'; // logos et monogrammes : blanc cassé mat
const MOD_COLOR = '#46424C'; // touches de modification : gris taupe, non interactives

// Boîtier en noyer moyen : penché (plus haut à l'arrière), rebord fin, touches dans un renfoncement sur plaque anthracite
const TILT = 0.1; // rad, ~6° : inclinaison du plan des touches
const RIM = 0.3; // rebord de bois (~1/3 de touche)
const CASE_TOP = -0.04; // dessus du cadre, au centre, sous le haut des touches
const FRONT = 0.26; // épaisseur du boîtier à l'avant

// Profil de touche : base plus large que le dessus, dessus creusé (cuvette cylindrique d'avant en arrière)
const KEY_H = 0.4;
const TAPER = 0.14;
const DISH = 0.035;
const SHRINK = (TAPER * KEY) / 2; // retrait de chaque bord entre la base et le dessus
const TOP_HALF = KEY / 2 - SHRINK; // demi-profondeur du dessus

/** Largeur réelle d'une touche de `units` unités (1 = touche de lettre, 6,25 = barre d'espace…). */
const keyWidth = (units: number) => units * PITCH - GAP;

function makeKeyGeometry(units = 1): THREE.BufferGeometry {
  // Boîte à grille régulière arrondie à la main (RoundedBoxGeometry n'a pas de sommets au centre des faces :
  // impossible d'y creuser la cuvette)
  const R = 0.08;
  const W = keyWidth(units);
  const g = new THREE.BoxGeometry(W, KEY_H, KEY, Math.round(14 * units), 6, 14);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nrm = g.attributes.normal as THREE.BufferAttribute;
  const half = new THREE.Vector3(W / 2 - R, KEY_H / 2 - R, KEY / 2 - R);
  const p = new THREE.Vector3();
  const inner = new THREE.Vector3();
  const slope = (TAPER * KEY) / 2 / KEY_H;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    inner.copy(p).clamp(half.clone().negate(), half);
    const dir = p.clone().sub(inner);
    let nx = nrm.getX(i);
    let ny = nrm.getY(i);
    let nz = nrm.getZ(i);
    if (dir.lengthSq() > 1e-10) {
      dir.normalize();
      p.copy(inner).addScaledVector(dir, R);
      nx = dir.x;
      ny = dir.y;
      nz = dir.z;
    }
    let { x, y, z } = p;
    // Conicité : chaque bord recule de SHRINK du bas vers le haut, quelle que soit la largeur
    const t = (y + KEY_H / 2) / KEY_H;
    x *= 1 - (SHRINK * t) / (W / 2);
    z *= 1 - (SHRINK * t) / (KEY / 2);
    // Cuvette : seulement sur le dessus, fondue dans l'arrondi des bords
    const w = THREE.MathUtils.smoothstep(y, KEY_H / 2 - 0.05, KEY_H / 2);
    const u = Math.min(1, Math.abs(z) / TOP_HALF);
    y -= DISH * (1 - u * u) * w;
    pos.setXYZ(i, x, y, z);
    // Normales ajustées à la conicité et à la cuvette
    ny += (Math.abs(nx) + Math.abs(nz)) * slope;
    nz += -((2 * DISH * z) / (TOP_HALF * TOP_HALF)) * w;
    const len = Math.hypot(nx, ny, nz) || 1;
    nrm.setXYZ(i, nx / len, ny / len, nz / len);
  }
  return g;
}

/** Étiquette du dessus de touche, courbée comme la cuvette (le y du plan correspond à la profondeur). */
function makeLabelGeometry(w: number, d: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, d, 1, 16);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = Math.min(1, Math.abs(pos.getY(i)) / TOP_HALF);
    pos.setZ(i, -DISH * (1 - u * u));
  }
  g.computeVertexNormals();
  return g;
}

function roundedRect(shape: THREE.Shape | THREE.Path, w: number, d: number, r: number) {
  const x = -w / 2;
  const y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r);
  shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d);
  shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
}

/** Dimensions du boîtier pour une disposition de touches donnée (fond plat à `bottomY`, biseau compris jusqu’à -0,06). */
function caseBox(layoutW: number, layoutD: number) {
  const innerW = layoutW + 0.06;
  const innerD = layoutD + 0.06;
  const outerW = innerW + RIM * 2;
  const outerD = innerD + RIM * 2;
  const bottomY = CASE_TOP - (outerD / 2) * Math.tan(TILT) - FRONT;
  return { innerW, innerD, outerW, outerD, bottomY };
}

/** Cadre du boîtier : fond plat, dessus incliné qui suit le plan des touches, bords arrondis. */
function makeCaseGeometry(outerW: number, outerD: number, innerW: number, innerD: number, bottomY: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  roundedRect(shape, outerW, outerD, 0.26);
  const hole = new THREE.Path();
  roundedRect(hole, innerW, innerD, 0.1);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); // extrusion vers le haut ; y de la forme -> -z
  const pos = g.attributes.position as THREE.BufferAttribute;
  const tan = Math.tan(TILT);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0.5) pos.setY(i, y - 1 + CASE_TOP - z * tan);
    else pos.setY(i, y + bottomY);
  }
  g.computeVertexNormals();
  return g;
}

/** Noyer moyen : brun noisette chaud, veinage fin et ondulé (dessiné en code, reproductible). */
function makeWalnutTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let seed = 7;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  ctx.fillStyle = '#7A5236';
  ctx.fillRect(0, 0, w, h);
  // Larges bandes de teinte
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(168,121,82,0.18)' : 'rgba(64,40,24,0.16)';
    ctx.fillRect(0, rand() * h, w, 10 + rand() * 46);
  }
  // Veines fines et ondulées
  for (let i = 0; i < 150; i++) {
    const y0 = rand() * h;
    const amp = 2 + rand() * 7;
    const freq = 0.004 + rand() * 0.01;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = rand() > 0.35 ? `rgba(58,35,19,${0.12 + rand() * 0.22})` : `rgba(186,138,96,${0.08 + rand() * 0.14})`;
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase * 2) * amp * 0.25;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.22, 0.45);
  tex.anisotropy = 8;
  return tex;
}

// Disposition d'un clavier compact réel, 9,5 unités de large sur 5 rangées : les 26 outils occupent les
// touches de lettres (7-7-6-6), entourées des touches de modification à leurs largeurs habituelles.
// Le décalage des rangées vient, comme sur un vrai clavier, de la largeur de tab / verr maj / maj.
type Slot = { units: number; mod?: string };
const mod = (label: string, units: number): Slot => ({ units, mod: label });
const letters = (n: number): Slot[] => Array.from({ length: n }, () => ({ units: 1 }));
const ROWS: Slot[][] = [
  [mod('échap', 1), ...letters(7), mod('effacer', 1.5)],
  [mod('tab', 1.5), ...letters(7), mod('$', 1)],
  [mod('verr maj', 1.75), ...letters(6), mod('entrée', 1.75)],
  [mod('maj', 2.25), ...letters(6), mod('maj', 1.25)],
  [mod('ctrl', 1.25), mod('alt', 1.25), mod('', 4.75), mod('alt gr', 1.25), mod('fn', 1)],
];
const ROW_UNITS = 9.5;

/** Texture d'une touche de modification : libellé discret en bas à gauche, comme sur un vrai clavier. */
function makeModTexture(label: string, units: number): THREE.CanvasTexture {
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(h * units);
  canvas.height = h;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.font = '500 46px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", Roboto, system-ui, sans-serif';
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.72;
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, 30, h - 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Rotation du socle : position de base et amplitude au défilement (plus droite sur mobile, où la largeur manque)
const TURN = { desktop: { base: -0.26, swing: 0.6 }, mobile: { base: -0.08, swing: 0.35 } };

/** Texture du dessus de touche : logo blanc (ou monogramme) + lettre du raccourci. */
function makeCapTexture(skill: Skill): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const drawHotkey = () => {
    ctx.font = '600 68px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", Roboto, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.textBaseline = 'top';
    ctx.fillText(skill.hotkey.toUpperCase(), 44, 36);
  };
  const drawMono = () => {
    const text = skill.mono;
    let fontSize = 2 * (text.length <= 2 ? 104 : text.length <= 3 ? 84 : text.length <= 4 ? 66 : 50);
    const font = (px: number) =>
      `800 ${px}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", Roboto, system-ui, sans-serif`;
    ctx.font = font(fontSize);
    // Jamais plus large que 78 % du dessus de la touche
    const fit = (size * 0.78) / ctx.measureText(text).width;
    if (fit < 1) fontSize = Math.floor(fontSize * fit);
    ctx.font = font(fontSize);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2 + 20);
    ctx.textAlign = 'left';
  };

  // Les logos générés sont blancs : on repeint tout ce qui est dessiné en blanc cassé
  const ink = () => {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
  };

  ctx.clearRect(0, 0, size, size);
  const svg = (icons as Record<string, string>)[skill.id];
  if (svg) {
    const img = new Image();
    img.onload = () => {
      const s = size * 0.6;
      ctx.drawImage(img, (size - s) / 2, (size - s) / 2 + 16, s, s);
      drawHotkey();
      ink();
      texture.needsUpdate = true;
    };
    img.onerror = () => {
      drawMono();
      drawHotkey();
      ink();
      texture.needsUpdate = true;
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } else {
    drawMono();
    drawHotkey();
    ink();
  }
  texture.needsUpdate = true;
  return texture;
}

type KeyRef = { group: THREE.Group; mat: THREE.MeshStandardMaterial; base: THREE.Color; pressed: boolean };

function Keyboard({ skills, categories, active, press, highlight, onHover, scroll }: Omit<Props, 'paused' | 'onLost'>) {
  const { size, camera } = useThree();
  const mobile = size.width < 640;
  const board = useRef<THREE.Group>(null);
  const keys = useRef<Map<string, KeyRef>>(new Map());
  const ripples = useRef<THREE.Mesh[]>([]);
  const rippleIndex = useRef(0);

  const colorOf = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.color])), [categories]);
  const capGeo = useMemo(() => makeKeyGeometry(1), []);
  const labelGeo = useMemo(() => makeLabelGeometry(TOP_HALF * 1.5, TOP_HALF * 1.5), []);
  const walnut = useMemo(makeWalnutTexture, []);
  const textures = useMemo(() => Object.fromEntries(skills.map((s) => [s.id, makeCapTexture(s)])), [skills]);

  // Placement des touches selon ROWS : outils dans l'ordre de skills.json, puis touches de modification
  const layout = useMemo(() => {
    const width = ROW_UNITS * PITCH;
    const depth = ROWS.length * PITCH;
    const items: { skill: Skill; x: number; z: number }[] = [];
    const mods: { key: string; label: string; units: number; x: number; z: number }[] = [];
    let i = 0;
    ROWS.forEach((row, r) => {
      let cursor = -width / 2;
      const z = -depth / 2 + r * PITCH + PITCH / 2;
      row.forEach((slot, c) => {
        const x = cursor + (slot.units * PITCH) / 2;
        cursor += slot.units * PITCH;
        const skill = slot.mod === undefined ? skills[i++] : undefined;
        if (skill) items.push({ skill, x, z });
        else mods.push({ key: `m${r}-${c}`, label: slot.mod ?? '', units: slot.units, x, z });
      });
    });
    return { items, mods, width, depth };
  }, [skills]);

  // Une géométrie et une texture par largeur / libellé de touche de modification
  const modParts = useMemo(() => {
    const geo = new Map<number, THREE.BufferGeometry>();
    const label = new Map<number, THREE.BufferGeometry>();
    const tex = new Map<string, THREE.CanvasTexture>();
    layout.mods.forEach(({ units, label: text }) => {
      if (!geo.has(units)) {
        geo.set(units, makeKeyGeometry(units));
        label.set(units, makeLabelGeometry(keyWidth(units) - 2 * SHRINK, TOP_HALF * 2));
      }
      const k = `${text}|${units}`;
      if (!tex.has(k)) tex.set(k, makeModTexture(text, units));
    });
    return { geo, label, tex };
  }, [layout]);
  useEffect(
    () => () => {
      modParts.geo.forEach((g) => g.dispose());
      modParts.label.forEach((g) => g.dispose());
      modParts.tex.forEach((t) => t.dispose());
    },
    [modParts],
  );
  const turn = mobile ? TURN.mobile : TURN.desktop;

  // Boîtier : renfoncement à peine plus grand que les touches, rebord fin tout autour
  const box = useMemo(() => {
    const b = caseBox(layout.width, layout.depth);
    return { ...b, geo: makeCaseGeometry(b.outerW, b.outerD, b.innerW, b.innerD, b.bottomY) };
  }, [layout]);
  useEffect(() => () => box.geo.dispose(), [box]);
  useEffect(() => () => walnut.dispose(), [walnut]);

  // Cadrage : la caméra recule juste assez pour que le socle tienne entier à sa rotation maximale
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const a = Math.abs(turn.base) + turn.swing * 0.14;
    const w = box.outerW;
    const d = box.outerD;
    const needW = w * Math.cos(a) + d * Math.sin(a) + 0.3;
    // Vu en plongée (~50°), la profondeur apparaît raccourcie d'environ 20 %
    const needH = (w * Math.sin(a) + d * Math.cos(a)) * 0.8 + 0.8;
    const half = THREE.MathUtils.degToRad(cam.fov / 2);
    const dist = Math.max(needH / 2 / Math.tan(half), needW / 2 / (Math.tan(half) * aspect)) * 1.03;
    const dir = new THREE.Vector3(0, 0.78, 0.62).normalize();
    cam.position.copy(dir.multiplyScalar(dist));
    cam.lookAt(0, -0.2, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, box, turn]);

  useEffect(() => () => {
    capGeo.dispose();
    labelGeo.dispose();
    Object.values(textures).forEach((t) => t.dispose());
  }, [capGeo, labelGeo, textures]);

  const setPressed = (id: string, down: boolean) => {
    const k = keys.current.get(id);
    if (!k || k.pressed === down) return;
    k.pressed = down;
    gsap.killTweensOf(k.group.position);
    if (down) {
      gsap.to(k.group.position, { y: -0.14, duration: 0.12, ease: 'power2.out' });
      gsap.to(k.mat, { emissiveIntensity: 0.9, duration: 0.15 });
      ripple(k.group.position.x, k.group.position.z);
    } else {
      gsap.to(k.group.position, { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      gsap.to(k.mat, { emissiveIntensity: highlightLevel(id), duration: 0.4 });
    }
  };

  const highlightLevel = (id: string) => {
    const skill = skills.find((s) => s.id === id);
    return highlight && skill?.category === highlight ? 0.35 : 0;
  };

  const ripple = (x: number, z: number) => {
    const mesh = ripples.current[rippleIndex.current++ % ripples.current.length];
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mesh.position.set(x, -0.19, z); // juste au-dessus de la plaque
    gsap.killTweensOf([mesh.scale, mat]);
    gsap.fromTo(mesh.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 2.6, y: 2.6, z: 2.6, duration: 0.7, ease: 'power2.out' });
    gsap.fromTo(mat, { opacity: 0.45 }, { opacity: 0, duration: 0.7, ease: 'power2.out' }); // onde discrète
  };

  // Touche pressée par le clavier physique : enfoncement puis relâchement
  useEffect(() => {
    if (!press) return;
    setPressed(press.id, true);
    const t = window.setTimeout(() => setPressed(press.id, false), 220);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [press]);

  // Surbrillance d'une catégorie
  useEffect(() => {
    keys.current.forEach((k, id) => {
      const skill = skills.find((s) => s.id === id);
      const dimmed = highlight && skill?.category !== highlight;
      gsap.to(k.mat.color, { r: dimmed ? DIM.r : k.base.r, g: dimmed ? DIM.g : k.base.g, b: dimmed ? DIM.b : k.base.b, duration: 0.35 });
      if (!k.pressed) gsap.to(k.mat, { emissiveIntensity: highlightLevel(id), duration: 0.35 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  useFrame(() => {
    if (board.current) board.current.rotation.y = turn.base + scroll.rotation * turn.swing;
  });

  return (
    <group ref={board} rotation={[0, turn.base, 0]}>
      {/* Cadre en noyer huilé (satiné) */}
      <mesh geometry={box.geo} castShadow receiveShadow>
        <meshPhysicalMaterial map={walnut} roughness={0.5} clearcoat={0.35} clearcoatRoughness={0.45} />
      </mesh>

      {/* Plan des touches, incliné : plaque anthracite mate au fond du renfoncement + touches */}
      <group rotation={[TILT, 0, 0]}>
        <mesh position={[0, -0.36, 0]} receiveShadow>
          <boxGeometry args={[box.innerW - 0.02, 0.32, box.innerD - 0.02]} />
          <meshStandardMaterial color="#2C2B2F" roughness={0.8} metalness={0.25} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={`r${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            ref={(m) => {
              if (m) ripples.current[i] = m;
            }}
          >
            <ringGeometry args={[0.36, 0.44, 48]} />
            <meshBasicMaterial color="#B49CFF" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}

        {layout.items.map(({ skill, x, z }) => {
          const color = new THREE.Color(colorOf[skill.category]);
          return (
            <group
              key={skill.id}
              position={[x, 0, z]}
              ref={(g) => {
                if (!g) return;
                const mesh = g.children[0] as THREE.Mesh;
                const existing = keys.current.get(skill.id);
                if (!existing || existing.group !== g) {
                  keys.current.set(skill.id, { group: g, mat: mesh.material as THREE.MeshStandardMaterial, base: color.clone(), pressed: false });
                }
              }}
            >
              <mesh
                geometry={capGeo}
                castShadow
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onHover(skill.id);
                  setPressed(skill.id, true);
                }}
                onPointerOut={() => {
                  setPressed(skill.id, false);
                }}
                onPointerDown={(e) => {
                  // Toucher (mobile) ou clic : pas de survol au doigt, on affiche l'outil et on enfonce la touche
                  e.stopPropagation();
                  onHover(skill.id);
                  setPressed(skill.id, true);
                  if (e.nativeEvent.pointerType !== 'mouse') window.setTimeout(() => setPressed(skill.id, false), 220);
                }}
              >
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0} roughness={0.72} metalness={0} />
              </mesh>
              <mesh geometry={labelGeo} position={[0, KEY_H / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
                <meshBasicMaterial map={textures[skill.id]} transparent toneMapped={false} opacity={active === skill.id ? 1 : 0.92} />
              </mesh>
            </group>
          );
        })}

        {layout.mods.map(({ key, label, units, x, z }) => (
          <group key={key} position={[x, 0, z]}>
            <mesh geometry={modParts.geo.get(units)} castShadow raycast={() => null}>
              <meshStandardMaterial color={MOD_COLOR} roughness={0.72} metalness={0} />
            </mesh>
            {label && (
              <mesh geometry={modParts.label.get(units)} position={[0, KEY_H / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
                <meshBasicMaterial map={modParts.tex.get(`${label}|${units}`)} transparent toneMapped={false} />
              </mesh>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}

export default function KeyboardScene(props: Props) {
  const { paused, onLost, ...rest } = props;
  // Petit canevas : rendu au moins en 2× (suréchantillonné sur les écrans 1×, sinon les logos sont flous)
  // et jusqu'en 3× sur les téléphones, avec anticrénelage
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
  return (
    <Canvas
      className="toolbox__canvas"
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 26, near: 0.1, far: 80, position: [0, 9, 8] }}
      frameloop={paused ? 'never' : 'always'}
      shadows
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          markWebGLLost();
          onLost();
        });
      }}
    >
      {/* Lumière chaude et neutre (le bois doit rester brun), violet seulement en contre-jour */}
      <ambientLight intensity={0.45} color="#F3ECE6" />
      <directionalLight position={[3, 9, 6]} intensity={2.4} color="#FFF4EC" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 4, 3]} intensity={0.6} color="#E8ECF6" />
      <directionalLight position={[-6, 3, -6]} intensity={1.4} color="#8B5CF6" />
      <Keyboard {...rest} />
      <Warmup tick />
      {/* Hors du groupe qui tourne : ombre calculée une fois, sous le fond plat du boîtier */}
      <ContactShadows position={[0, caseBox(0, ROWS.length * PITCH).bottomY - 0.07, 0]} opacity={0.55} scale={18} blur={2.6} far={4} frames={1} color="#000000" />
    </Canvas>
  );
}
