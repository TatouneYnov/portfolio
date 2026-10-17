import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, BallCollider, useRapier, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import type { Project } from '../lib/content';
import type { DockRequest } from '../sections/Projects';
import { markWebGLLost } from '../lib/capabilities';

type Props = {
  projects: Project[];
  docked: string | null;
  request: DockRequest;
  onDock: (id: string | null) => void;
  paused: boolean;
  maxBubbles: number;
  wrapper: RefObject<HTMLDivElement>;
  onLost: () => void;
};

/** Texture « nacre » avec le nom du projet, centrée sur la face avant de la sphère. */
function makeBubbleTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#FBF9FF');
  g.addColorStop(0.5, '#F1ECFA');
  g.addColorStop(1, '#E4DCF3');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  const lines = label.toUpperCase().split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(84, Math.floor(230 / Math.max(3, longest) / 0.68));
  ctx.font = `800 ${size}px "Archivo Variable", "Archivo", system-ui, sans-serif`;
  (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'expanded';
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
  tex.anisotropy = 4;
  return tex;
}

function makeLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.font = '400 34px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = '#B49CFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '6px';
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

function World({ projects, docked, request, onDock, wrapper }: Omit<Props, 'paused' | 'maxBubbles' | 'onLost'>) {
  const { camera, size, pointer } = useThree();
  const { rapier } = useRapier();
  const balls = useRef(new Map<string, BallState>());
  const pusher = useRef<RapierRigidBody>(null);
  const dockRing = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const drag = useRef<{ id: string; t: number; x: number; y: number; moved: boolean } | null>(null);
  const dockedRef = useRef<string | null>(null);
  const proxy = useRef({ x: 0, y: 0 });
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), dir: new THREE.Vector3(), pt: new THREE.Vector3(), raycaster: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) }), []);

  // Géométrie de la scène selon la taille de l'écran (unités monde au plan z = 0)
  const frame = useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
    const halfW = halfH * (size.width / size.height);
    const portrait = size.width < 720;
    const unit = Math.min(halfW, halfH) * (portrait ? 0.2 : 0.17);
    return {
      halfW,
      halfH,
      unit,
      attractor: portrait ? new THREE.Vector3(0, halfH * 0.32, 0) : new THREE.Vector3(-halfW * 0.28, 0, 0),
      dock: portrait ? new THREE.Vector3(0, -halfH * 0.62, 0) : new THREE.Vector3(halfW * 0.56, -halfH * 0.05, 0),
    };
  }, [camera, size]);

  const textures = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, makeBubbleTexture(p.bubbleLabel || p.name)])), [projects]);
  const dockLabel = useMemo(() => makeLabelTexture('DÉPOSER ICI'), []);
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

  useEffect(() => () => {
    Object.values(textures).forEach((t) => t.dispose());
    dockLabel.dispose();
    haloTex.dispose();
    sphere.dispose();
  }, [textures, dockLabel, haloTex, sphere]);

  const maxRadius = Math.max(...projects.map((p) => p.size)) * frame.unit;

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

  const dock = (id: string, duration = 0.5) => {
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
    gsap.killTweensOf(proxy.current);
    gsap.to(proxy.current, { x: frame.dock.x, y: frame.dock.y, duration, ease: 'power3.out' });
    onDock(id);
  };

  // Fermeture du panneau : la bulle retourne dans le nuage
  useEffect(() => {
    const current = dockedRef.current;
    if (current && docked === null) {
      dockedRef.current = null;
      gsap.killTweensOf(proxy.current);
      toDynamic(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked]);

  // Ouverture depuis la liste de boutons (clavier) : la bulle vole vers le socle
  useEffect(() => {
    if (request) dock(request.id, 0.7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Lâcher : dans le socle → on dépose ; ailleurs → la bulle repart avec son élan
  useEffect(() => {
    const onUp = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      if (wrapper.current) wrapper.current.dataset.cursor = 'grab';
      const b = balls.current.get(d.id)?.body;
      if (!b) return;
      const t = b.translation();
      const quick = performance.now() - d.t < 260 && !d.moved;
      const inDock = Math.hypot(t.x - frame.dock.x, t.y - frame.dock.y) < maxRadius * 1.6;
      if (quick || inDock) dock(d.id, quick ? 0.7 : 0.5);
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, maxRadius]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    // Pointeur projeté sur le plan z = 0
    tmp.raycaster.setFromCamera(pointer, camera);
    const hit = tmp.raycaster.ray.intersectPlane(tmp.plane, tmp.pt);

    balls.current.forEach((ball, id) => {
      const b = ball.body;
      if (!b) return;
      const t = b.translation();
      if (id === dockedRef.current) {
        b.setNextKinematicTranslation({ x: proxy.current.x, y: proxy.current.y, z: 0 });
        if (ball.mesh) ball.mesh.rotation.y += dt * 0.6;
        return;
      }
      if (ball.mesh) ball.mesh.rotation.y += (0 - ball.mesh.rotation.y) * Math.min(1, dt * 3);
      if (drag.current?.id === id && hit) {
        // Tenue par un ressort amorti : la vitesse suit le pointeur, l'inertie reste au lâcher
        tmp.v.set((tmp.pt.x - t.x) * 14, (tmp.pt.y - t.y) * 14, 0);
        b.setLinvel({ x: tmp.v.x, y: tmp.v.y, z: 0 }, true);
        if (Math.hypot(tmp.pt.x - drag.current.x, tmp.pt.y - drag.current.y) > 0.15) drag.current.moved = true;
        return;
      }
      // Attraction douce vers le nuage
      tmp.dir.set(frame.attractor.x - t.x, frame.attractor.y - t.y, 0).multiplyScalar(b.mass() * 0.9 * dt);
      b.applyImpulse({ x: tmp.dir.x, y: tmp.dir.y, z: 0 }, true);
    });

    // La sphère invisible collée au pointeur pousse les bulles au survol
    if (pusher.current) {
      const active = hit && !drag.current && state.pointer.x > -1 && state.pointer.x < 1;
      pusher.current.setNextKinematicTranslation(active ? { x: tmp.pt.x, y: tmp.pt.y, z: 0 } : { x: 0, y: 0, z: 50 });
    }
    if (halo.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06;
      halo.current.scale.setScalar(maxRadius * 3.4 * s);
    }
  });

  return (
    <>
      <Environment />
      <ambientLight intensity={0.5} color="#C9BBFF" />
      <directionalLight position={[3, 5, 6]} intensity={2.2} color="#FFF6EE" />
      <directionalLight position={[-6, -2, -4]} intensity={2.4} color="#7C3AED" />

      {/* Socle de dépôt */}
      <group ref={dockRing} position={frame.dock.toArray()}>
        <mesh ref={halo} position={[0, 0, -0.6]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={haloTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[maxRadius * 1.18, 0.035, 16, 96]} />
          <meshStandardMaterial color="#B49CFF" emissive="#8B5CF6" emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
        <mesh position={[0, -maxRadius * 1.18 - 0.38, 0]}>
          <planeGeometry args={[2.2, 0.41]} />
          <meshBasicMaterial map={dockLabel} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>

      <RigidBody ref={pusher} type="kinematicPosition" colliders={false} position={[0, 0, 50]}>
        <BallCollider args={[frame.unit * 0.7]} />
      </RigidBody>

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
            <BallCollider args={[radius]} restitution={0.45} friction={0.2} />
            <mesh
              geometry={sphere}
              scale={radius}
              ref={(m) => {
                const entry = balls.current.get(p.id);
                if (entry) entry.mesh = m;
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const target = e.target as unknown as Element | null;
                (target as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
                if (dockedRef.current === p.id) return;
                drag.current = { id: p.id, t: performance.now(), x: e.point.x, y: e.point.y, moved: false };
                if (wrapper.current) wrapper.current.dataset.cursor = 'grabbing';
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
    </>
  );
}

export default function BubblesScene(props: Props) {
  const { paused, maxBubbles, onLost, projects, ...rest } = props;
  const list = projects.slice(0, maxBubbles);
  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.75);
  return (
    <Canvas
      className="projects__canvas"
      dpr={dpr}
      gl={{ antialias: dpr < 2, alpha: true, powerPreference: 'high-performance' }}
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
