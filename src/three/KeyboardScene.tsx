import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
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
const DIM = new THREE.Color('#2A2533');

// Toujours 4 rangées décalées (7-7-6-6), aussi sur mobile : en rangées de 5 le clavier devenait un carré
function rowsFor(count: number): number[] {
  const base = Math.floor(count / 4);
  const extra = count % 4;
  return [0, 1, 2, 3].map((i) => base + (i < extra ? 1 : 0));
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
    ctx.font = '500 68px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.textBaseline = 'top';
    ctx.fillText(skill.hotkey.toUpperCase(), 44, 36);
  };
  const drawMono = () => {
    const text = skill.mono;
    const fontSize = 2 * (text.length <= 2 ? 92 : text.length <= 3 ? 74 : text.length <= 4 ? 58 : 44);
    ctx.font = `800 ${fontSize}px "Archivo Variable", "Archivo", system-ui, sans-serif`;
    (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'expanded';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2 + 20);
    ctx.textAlign = 'left';
  };

  ctx.clearRect(0, 0, size, size);
  const svg = (icons as Record<string, string>)[skill.id];
  if (svg) {
    const img = new Image();
    img.onload = () => {
      const s = size * 0.5;
      ctx.drawImage(img, (size - s) / 2, (size - s) / 2 + 16, s, s);
      drawHotkey();
      texture.needsUpdate = true;
    };
    img.onerror = () => {
      drawMono();
      drawHotkey();
      texture.needsUpdate = true;
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } else {
    drawMono();
    drawHotkey();
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
  const capGeo = useMemo(() => new RoundedBoxGeometry(KEY, 0.4, KEY, 4, 0.12), []);
  const labelGeo = useMemo(() => new THREE.PlaneGeometry(KEY * 0.8, KEY * 0.8), []);
  const textures = useMemo(() => Object.fromEntries(skills.map((s) => [s.id, makeCapTexture(s)])), [skills]);

  // Disposition en rangées, décalées comme un vrai clavier
  const layout = useMemo(() => {
    const rows = rowsFor(skills.length);
    const width = Math.max(...rows.map((n, r) => n * PITCH + r * 0.25));
    const depth = rows.length * PITCH;
    const items: { skill: Skill; x: number; z: number }[] = [];
    let i = 0;
    rows.forEach((n, r) => {
      const offset = r * 0.25;
      for (let c = 0; c < n; c++) {
        const skill = skills[i++];
        items.push({ skill, x: -width / 2 + offset + c * PITCH + PITCH / 2, z: -depth / 2 + r * PITCH + PITCH / 2 });
      }
    });
    return { items, width, depth };
  }, [skills]);
  const turn = mobile ? TURN.mobile : TURN.desktop;

  const baseGeo = useMemo(() => new RoundedBoxGeometry(layout.width + 0.7, 0.32, layout.depth + 0.7, 4, 0.14), [layout]);
  const rimGeo = useMemo(() => new RoundedBoxGeometry(layout.width + 0.78, 0.05, layout.depth + 0.78, 3, 0.02), [layout]);
  useEffect(() => () => {
    baseGeo.dispose();
    rimGeo.dispose();
  }, [baseGeo, rimGeo]);

  // Cadrage : la caméra recule juste assez pour que le socle tienne entier à sa rotation maximale
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const a = Math.abs(turn.base) + turn.swing * 0.14;
    const w = layout.width + 0.78;
    const d = layout.depth + 0.78;
    const needW = w * Math.cos(a) + d * Math.sin(a) + 0.3;
    // Vu en plongée (~50°), la profondeur apparaît raccourcie d'environ 20 %
    const needH = (w * Math.sin(a) + d * Math.cos(a)) * 0.8 + 0.8;
    const half = THREE.MathUtils.degToRad(cam.fov / 2);
    const dist = Math.max(needH / 2 / Math.tan(half), needW / 2 / (Math.tan(half) * aspect)) * 1.03;
    const dir = new THREE.Vector3(0, 0.78, 0.62).normalize();
    cam.position.copy(dir.multiplyScalar(dist));
    cam.lookAt(0, -0.2, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, layout, turn]);

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
    mesh.position.set(x, -0.19, z);
    gsap.killTweensOf([mesh.scale, mat]);
    gsap.fromTo(mesh.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 2.6, y: 2.6, z: 2.6, duration: 0.7, ease: 'power2.out' });
    gsap.fromTo(mat, { opacity: 0.85 }, { opacity: 0, duration: 0.7, ease: 'power2.out' });
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
      {/* Socle mat + liseré de lumière violette */}
      <mesh position={[0, -0.36, 0]} geometry={baseGeo} receiveShadow>
        <meshStandardMaterial color="#0D0A14" roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.5, 0]} geometry={rimGeo}>
        <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={2.2} toneMapped={false} />
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
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0} roughness={0.42} metalness={0.05} />
            </mesh>
            <mesh geometry={labelGeo} position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <meshBasicMaterial map={textures[skill.id]} transparent toneMapped={false} opacity={active === skill.id ? 1 : 0.92} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function KeyboardScene(props: Props) {
  const { paused, onLost, ...rest } = props;
  // Petit canevas : on peut se permettre la pleine netteté (DPR 2) et l'anticrénelage, même sur mobile
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      <ambientLight intensity={0.35} color="#B9A6FF" />
      <directionalLight position={[3, 9, 6]} intensity={2.2} color="#FFF4EC" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 3, -6]} intensity={2.6} color="#8B5CF6" />
      <pointLight position={[0, 2.5, 4]} intensity={6} distance={14} color="#7C3AED" />
      <Keyboard {...rest} />
      <Warmup tick />
      <ContactShadows position={[0, -0.56, 0]} opacity={0.6} scale={18} blur={2.6} far={4} frames={1} color="#000000" />
    </Canvas>
  );
}
