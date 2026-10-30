// Bulles projets : un clic ouvre la fiche (la bulle file dans le socle) ; le glisser-déposer
// fonctionne aussi. Pas de « pousseur » au survol : une bulle survolée grossit et reste immobile,
// pour qu'on puisse toujours cliquer dessus.
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, BallCollider, useRapier, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import type { Project } from '../lib/content';
import type { DockRequest } from '../sections/Projects';
import { markWebGLLost } from '../lib/capabilities';
import { useTheme } from '../lib/theme';
import { Warmup } from './Warmup';

type Props = {
  projects: Project[];
  docked: string | null;
  request: DockRequest;
  onDock: (id: string | null) => void;
  paused: boolean;
  maxBubbles: number;
  wrapper: RefObject<HTMLDivElement>;
  tip: RefObject<HTMLDivElement>;
  onLost: () => void;
};

const DRAG_THRESHOLD = 6; // px parcourus avant de considérer qu'on glisse (sinon : clic)
const TOUCH_DRAG_THRESHOLD = 10; // au doigt, un tap bouge toujours un peu

/** Texture « nacre » avec le nom du projet, centrée sur la face avant de la sphère. */
function makeBubbleTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(2, 2); // texture 2× : dessin dans le repère d'origine 1024 × 512
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#FBF9FF');
  g.addColorStop(0.5, '#F1ECFA');
  g.addColorStop(1, '#E4DCF3');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  const lines = label.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(84, Math.floor(230 / Math.max(3, longest) / 0.68));
  ctx.font = `800 ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", Roboto, system-ui, sans-serif`;
  ctx.fillStyle = '#1B1430';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = size * 1.02;
  lines.forEach((line, i) => {
    const y = 256 + (i - (lines.length - 1) / 2) * lh;
    ctx.fillText(line, 256, y); // u = 0.25 : face avant
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Thème clair : une lueur additive disparaît sur fond clair, on passe en mélange normal et en violet plus foncé
function makeLabelTexture(text: string, light: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.font = '600 34px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", Roboto, system-ui, sans-serif';
  ctx.fillStyle = light ? '#6025C9' : '#B49CFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

type BallState = { body: RapierRigidBody | null; mesh: THREE.Mesh | null; radius: number };
type Press = { id: string; x: number; y: number; touch: boolean; dragging: boolean };

function World({ projects, docked, request, onDock, wrapper, tip }: Omit<Props, 'paused' | 'maxBubbles' | 'onLost'>) {
  const { camera, size, gl } = useThree();
  const { rapier } = useRapier();
  const balls = useRef(new Map<string, BallState>());
  const ring = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  const press = useRef<Press | null>(null);
  const hovered = useRef<string | null>(null);
  const dockedRef = useRef<string | null>(null);
  const proxy = useRef({ x: 0, y: 0 });
  const pointer = useRef({ world: new THREE.Vector3(), valid: false });
  const glow = useRef(0);
  const throwVel = useRef(new THREE.Vector3());
  const tmp = useMemo(
    () => ({ v: new THREE.Vector3(), dir: new THREE.Vector3(), ndc: new THREE.Vector2(), raycaster: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) }),
    [],
  );

  // Géométrie de la scène selon la taille de l'écran (unités monde au plan z = 0)
  const frame = useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
    const halfW = halfH * (size.width / size.height);
    const portrait = size.width < 720;
    const unit = Math.min(halfW, halfH) * (portrait ? 0.2 : 0.23);
    return {
      halfW,
      halfH,
      unit,
      attractor: portrait ? new THREE.Vector3(0, halfH * 0.32, 0) : new THREE.Vector3(-halfW * 0.28, 0, 0),
      dock: portrait ? new THREE.Vector3(0, -halfH * 0.58, 0) : new THREE.Vector3(halfW * 0.5, -halfH * 0.04, 0),
    };
  }, [camera, size]);

  const textures = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, makeBubbleTexture(p.bubbleLabel || p.name)])), [projects]);
  const light = useTheme() === 'light';
  const dockLabel = useMemo(() => makeLabelTexture('Déposer ici', light), [light]);
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 48, 32), []);
  const haloTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    g.addColorStop(0, 'rgba(124,58,237,0.55)');
    g.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);

  useEffect(
    () => () => {
      Object.values(textures).forEach((t) => t.dispose());
      haloTex.dispose();
      sphere.dispose();
    },
    [textures, haloTex, sphere],
  );
  // Libellé du socle refait à chaque changement de thème
  useEffect(() => () => dockLabel.dispose(), [dockLabel]);

  const maxRadius = Math.max(...projects.map((p) => p.size)) * frame.unit;
  const dockRadius = maxRadius * 1.18;

  const clientToWorld = (cx: number, cy: number, out: THREE.Vector3) => {
    const rect = gl.domElement.getBoundingClientRect();
    tmp.ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    tmp.raycaster.setFromCamera(tmp.ndc, camera);
    return tmp.raycaster.ray.intersectPlane(tmp.plane, out);
  };

  const setCursor = (mode: 'pointer' | 'grabbing' | null) => {
    const el = wrapper.current;
    if (!el) return;
    if (mode) el.dataset.cursor = mode;
    else delete el.dataset.cursor;
  };

  const showTip = (text: string | null, x = 0, y = 0) => {
    const el = tip.current;
    if (!el) return;
    if (!text) {
      el.classList.remove('is-visible');
      return;
    }
    if (el.textContent !== text) el.textContent = text;
    const rect = el.parentElement?.getBoundingClientRect();
    el.style.transform = `translate3d(${x - (rect?.left ?? 0) + 18}px, ${y - (rect?.top ?? 0) + 18}px, 0)`;
    el.classList.add('is-visible');
  };

  const nameOf = (id: string) => projects.find((p) => p.id === id)?.name ?? '';

  const toDynamic = (id: string, push = true) => {
    const b = balls.current.get(id)?.body;
    if (!b) return;
    b.setBodyType(rapier.RigidBodyType.Dynamic, true);
    if (push) {
      const t = b.translation();
      tmp.dir.set(frame.attractor.x - t.x, frame.attractor.y - t.y, 0).normalize().multiplyScalar(b.mass() * 6);
      b.applyImpulse({ x: tmp.dir.x, y: tmp.dir.y, z: 0 }, true);
    }
  };

  const dock = (id: string, duration = 0.6) => {
    const prev = dockedRef.current;
    if (prev && prev !== id) toDynamic(prev);
    const b = balls.current.get(id)?.body;
    if (!b) return;
    const t = b.translation();
    proxy.current.x = t.x;
    proxy.current.y = t.y;
    b.setLinvel({ x: 0, y: 0, z: 0 }, false);
    b.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
    dockedRef.current = id;
    showTip(null);
    gsap.killTweensOf(proxy.current);
    gsap.to(proxy.current, { x: frame.dock.x, y: frame.dock.y, duration, ease: 'power3.out' });
    glow.current = 1;
    onDock(id);
  };

  // Fermeture de la fiche : la bulle retourne dans le nuage
  useEffect(() => {
    const current = dockedRef.current;
    if (current && docked === null) {
      dockedRef.current = null;
      gsap.killTweensOf(proxy.current);
      toDynamic(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked]);

  // Ouverture depuis les boutons sous la scène : la bulle vole vers le socle
  useEffect(() => {
    if (request) dock(request.id, 0.75);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Suivi du pointeur pendant l'appui, puis clic ou dépôt au relâchement
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (!p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) > (p.touch ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD)) {
        p.dragging = true;
        setCursor('grabbing');
        showTip(null);
        throwVel.current.set(0, 0, 0);
        balls.current.get(p.id)?.body?.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
      }
      if (p.dragging) pointer.current.valid = !!clientToWorld(e.clientX, e.clientY, pointer.current.world);
    };
    const onUp = (e: PointerEvent) => {
      const p = press.current;
      if (!p) return;
      press.current = null;
      setCursor(hovered.current ? 'pointer' : null);
      if (!p.dragging) {
        dock(p.id); // simple clic (ou tap) : ouvrir
        return;
      }
      const b = balls.current.get(p.id)?.body;
      const t = b?.translation();
      const pt = clientToWorld(e.clientX, e.clientY, tmp.v);
      const near = (x: number, y: number) => Math.hypot(x - frame.dock.x, y - frame.dock.y) < dockRadius * 1.5;
      if ((pt && near(pt.x, pt.y)) || (t && near(t.x, t.y))) {
        dock(p.id, 0.4);
        return;
      }
      // Sinon : la bulle repart avec l'élan du geste
      if (b) {
        b.setBodyType(rapier.RigidBodyType.Dynamic, true);
        const v = throwVel.current.clampLength(0, 25);
        b.setLinvel({ x: v.x, y: v.y, z: 0 }, true);
      }
    };
    const onCancel = () => {
      const p = press.current;
      press.current = null;
      setCursor(null);
      if (p?.dragging) balls.current.get(p.id)?.body?.setBodyType(rapier.RigidBodyType.Dynamic, true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, dockRadius]);

  // Au doigt : un toucher qui commence sur une bulle l'attrape (la page ne défile pas) ;
  // ailleurs sur la scène, le défilement vertical reste natif (touch-action: pan-y)
  useEffect(() => {
    const el = gl.domElement;
    const hits: THREE.Object3D[] = [];
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const rect = el.getBoundingClientRect();
      tmp.ndc.set(((t.clientX - rect.left) / rect.width) * 2 - 1, -((t.clientY - rect.top) / rect.height) * 2 + 1);
      tmp.raycaster.setFromCamera(tmp.ndc, camera);
      hits.length = 0;
      balls.current.forEach((b, id) => {
        if (b.mesh && id !== dockedRef.current) hits.push(b.mesh);
      });
      if (tmp.raycaster.intersectObjects(hits, false).length) e.preventDefault();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    return () => el.removeEventListener('touchstart', onTouchStart);
  }, [gl, camera, tmp]);

  // ?debug : positions écran des bulles et du socle (tests automatisés)
  useEffect(() => {
    if (!window.location.search.includes('debug')) return;
    const v = new THREE.Vector3();
    (window as Window & { __bubbles?: () => unknown }).__bubbles = () => {
      const rect = gl.domElement.getBoundingClientRect();
      const toScreen = (x: number, y: number) => {
        v.set(x, y, 0).project(camera);
        return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
      };
      const out: Record<string, unknown> = { dock: toScreen(frame.dock.x, frame.dock.y), docked: dockedRef.current };
      balls.current.forEach((ball, id) => {
        const t = ball.body?.translation();
        if (t) out[id] = toScreen(t.x, t.y);
      });
      return out;
    };
  }, [camera, frame, gl]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = press.current;
    const dragging = p?.dragging ? p.id : null;
    let overDock = false;

    balls.current.forEach((ball, id) => {
      const b = ball.body;
      if (!b) return;
      const t = b.translation();
      const target = ball.radius * (hovered.current === id && !dragging ? 1.08 : 1);
      if (ball.mesh) ball.mesh.scale.setScalar(THREE.MathUtils.damp(ball.mesh.scale.x, target, 14, dt));

      if (id === dockedRef.current) {
        b.setNextKinematicTranslation({ x: proxy.current.x, y: proxy.current.y, z: 0 });
        if (ball.mesh) ball.mesh.rotation.y += dt * 0.6;
        return;
      }
      if (ball.mesh) ball.mesh.rotation.y = THREE.MathUtils.damp(ball.mesh.rotation.y, 0, 3, dt);

      if (id === dragging && pointer.current.valid) {
        // La bulle tenue suit le pointeur quel que soit le débit d'images (léger lissage)
        const w = pointer.current.world;
        const a = 1 - Math.exp(-30 * dt);
        const nx = t.x + (w.x - t.x) * a;
        const ny = t.y + (w.y - t.y) * a;
        if (dt > 0) throwVel.current.lerp(tmp.v.set((nx - t.x) / dt, (ny - t.y) / dt, 0), 0.35);
        b.setNextKinematicTranslation({ x: nx, y: ny, z: 0 });
        overDock = Math.hypot(t.x - frame.dock.x, t.y - frame.dock.y) < dockRadius * 1.5 || Math.hypot(w.x - frame.dock.x, w.y - frame.dock.y) < dockRadius * 1.5;
        return;
      }
      // Une bulle survolée reste immobile pour qu'on puisse cliquer dessus
      if (id === hovered.current || id === p?.id) {
        const lv = b.linvel();
        b.setLinvel({ x: lv.x * 0.85, y: lv.y * 0.85, z: 0 }, true);
        return;
      }
      // Attraction douce vers le nuage
      tmp.dir.set(frame.attractor.x - t.x, frame.attractor.y - t.y, 0).multiplyScalar(b.mass() * 0.9 * dt);
      b.applyImpulse({ x: tmp.dir.x, y: tmp.dir.y, z: 0 }, true);
    });

    // Le socle s'illumine quand une bulle glissée passe au-dessus, et brièvement au dépôt
    glow.current = THREE.MathUtils.damp(glow.current, overDock ? 1 : 0, overDock ? 10 : 3, dt);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06;
    if (ring.current) ring.current.scale.setScalar(1 + glow.current * 0.14);
    if (ringMat.current) ringMat.current.emissiveIntensity = 2.4 + glow.current * 3;
    if (halo.current) halo.current.scale.setScalar(maxRadius * 3.4 * pulse * (1 + glow.current * 0.35));
  });

  return (
    <>
      <Environment />
      <ambientLight intensity={0.5} color="#C9BBFF" />
      <directionalLight position={[3, 5, 6]} intensity={2.2} color="#FFF6EE" />
      <directionalLight position={[-6, -2, -4]} intensity={2.4} color="#7C3AED" />

      {/* Socle de dépôt */}
      <group position={frame.dock.toArray()}>
        <mesh ref={halo} position={[0, 0, -0.6]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={haloTex} transparent depthWrite={false} blending={light ? THREE.NormalBlending : THREE.AdditiveBlending} opacity={light ? 0.5 : 1} toneMapped={false} />
        </mesh>
        <group ref={ring}>
          <mesh>
            <torusGeometry args={[dockRadius, 0.035, 16, 96]} />
            <meshStandardMaterial ref={ringMat} color={light ? '#7C3AED' : '#B49CFF'} emissive={light ? '#6D28D9' : '#8B5CF6'} emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        </group>
        <mesh position={[0, -dockRadius - 0.38, 0]}>
          <planeGeometry args={[2.2, 0.41]} />
          <meshBasicMaterial map={dockLabel} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>

      {projects.map((p, i) => {
        const radius = p.size * frame.unit;
        const angle = (i / projects.length) * Math.PI * 2;
        const start: [number, number, number] = [
          frame.attractor.x + Math.cos(angle) * frame.unit * 2.4,
          frame.attractor.y + Math.sin(angle) * frame.unit * 2.4,
          0,
        ];
        return (
          <RigidBody
            key={p.id}
            ref={(b) => {
              const entry = balls.current.get(p.id) ?? { body: null, mesh: null, radius };
              entry.body = b;
              entry.radius = radius;
              balls.current.set(p.id, entry);
            }}
            colliders={false}
            position={start}
            linearDamping={1.6}
            angularDamping={1}
            enabledTranslations={[true, true, false]}
            enabledRotations={[false, false, false]}
            ccd
          >
            <BallCollider args={[radius]} restitution={0.35} friction={0.2} />
            <mesh
              geometry={sphere}
              scale={radius}
              ref={(m) => {
                const entry = balls.current.get(p.id);
                if (entry) entry.mesh = m;
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                hovered.current = p.id;
                if (!press.current) setCursor('pointer');
                if (dockedRef.current !== p.id && !press.current?.dragging) showTip(`Ouvrir · ${nameOf(p.id)}`, e.nativeEvent.clientX, e.nativeEvent.clientY);
              }}
              onPointerMove={(e) => {
                if (hovered.current === p.id && dockedRef.current !== p.id && !press.current?.dragging) showTip(`Ouvrir · ${nameOf(p.id)}`, e.nativeEvent.clientX, e.nativeEvent.clientY);
              }}
              onPointerOut={() => {
                if (hovered.current === p.id) hovered.current = null;
                if (!press.current) setCursor(null);
                showTip(null);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (dockedRef.current === p.id) return;
                press.current = { id: p.id, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, touch: e.nativeEvent.pointerType === 'touch', dragging: false };
                pointer.current.valid = !!clientToWorld(e.nativeEvent.clientX, e.nativeEvent.clientY, pointer.current.world);
              }}
            >
              <meshPhysicalMaterial
                map={textures[p.id]}
                color="#ffffff"
                roughness={0.25}
                metalness={0}
                clearcoat={1}
                clearcoatRoughness={0.15}
                iridescence={0.5}
                iridescenceIOR={1.35}
                iridescenceThicknessRange={[180, 420]}
                sheen={0.4}
                sheenColor="#B49CFF"
              />
            </mesh>
          </RigidBody>
        );
      })}
      <Warmup tick />
    </>
  );
}

export default function BubblesScene(props: Props) {
  const { paused, maxBubbles, onLost, projects, ...rest } = props;
  const list = projects.slice(0, maxBubbles);
  // Netteté pleine (DPR 2) : à 1,25 les noms des bulles étaient flous sur les écrans de téléphone (3×)
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return (
    <Canvas
      className="projects__canvas"
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 32, near: 0.1, far: 100, position: [0, 0, 12] }}
      frameloop={paused ? 'never' : 'always'}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          markWebGLLost();
          onLost();
        });
      }}
    >
      <Physics gravity={[0, 0, 0]} paused={paused} timeStep="vary">
        <World projects={list} {...rest} />
      </Physics>
    </Canvas>
  );
}
