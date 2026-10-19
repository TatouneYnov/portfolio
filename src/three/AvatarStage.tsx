// Scène fixe de l'avatar : un seul Canvas plein écran, derrière le contenu.
// L'avatar est cadré dans des « emplacements » réservés dans le DOM (data-slot) : hero, À propos,
// bureau. Le texte ne peut donc jamais passer sous lui.
import { useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildAvatar, buildDesk, JOINT_KEYS, makePose, idlePose, sitPose } from './avatar.js';
import { stageState } from '../lib/stageState';
import { markWebGLLost } from '../lib/capabilities';
import { usePageVisible } from '../lib/hooks';
import { Warmup } from './Warmup';

type Rect = { x: number; y: number; w: number; h: number };
type Framing = { center: THREE.Vector3; height: number; width: number; dir: THREE.Vector3 };

const BUST: Framing = { center: new THREE.Vector3(0, 1.36, 0), height: 1.12, width: 0.86, dir: new THREE.Vector3(0.0, 0.08, 1).normalize() };
const ABOUT: Framing = { center: new THREE.Vector3(0, 1.3, 0), height: 1.2, width: 0.8, dir: new THREE.Vector3(0.18, 0.1, 1).normalize() };
const DESK: Framing = { center: new THREE.Vector3(0.05, 0.86, 0.3), height: 1.55, width: 1.6, dir: new THREE.Vector3(2.65, 0.8, -1.27).normalize() };

const debug = typeof window !== 'undefined' && window.location.search.includes('debug');
const debugInfo: Record<string, unknown> = {};
if (debug) (window as Window & { __stageDebug?: unknown }).__stageDebug = debugInfo;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = THREE.MathUtils.lerp;

function readRect(el: Element | null, out: Rect): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  out.x = r.left;
  out.y = r.top;
  out.w = r.width;
  out.h = r.height;
  return true;
}
function lerpRect(a: Rect, b: Rect, t: number, out: Rect) {
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.w = lerp(a.w, b.w, t);
  out.h = lerp(a.h, b.h, t);
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.35;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Scene() {
  const { camera, size, gl } = useThree();
  const avatar = useMemo(() => buildAvatar(), []);
  const desk = useMemo(() => buildDesk(), []);
  const J = useMemo(
    () => ({
      hips: avatar.hips, spine: avatar.spine, chest: avatar.chest, neck: avatar.neck, head: avatar.head,
      uaL: avatar.arms.L.ua, uaR: avatar.arms.R.ua, laL: avatar.arms.L.la, laR: avatar.arms.R.la,
      hL: avatar.arms.L.hand, hR: avatar.arms.R.hand,
      ulL: avatar.legs.L.ul, ulR: avatar.legs.R.ul, llL: avatar.legs.L.ll, llR: avatar.legs.R.ll,
      fL: avatar.legs.L.foot, fR: avatar.legs.R.foot,
    }) as Record<string, THREE.Object3D>,
    [avatar],
  );

  // Objets réutilisés à chaque image (aucune allocation dans la boucle)
  const s = useMemo(
    () => ({
      poseIdle: makePose(),
      poseSit: makePose(),
      hero: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      about: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      desk: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      rect: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      center: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      frame: { center: new THREE.Vector3(), height: 1, width: 1, dir: new THREE.Vector3() } as Framing,
      slots: { hero: null as Element | null, about: null as Element | null, desk: null as Element | null },
      look: { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, px: 0, py: 0, last: -10 },
      sitW: 0,
      nextBlink: 3,
      blinkUntil: 0,
      nextLine: 0,
      nextDraw: 0,
      ready: false,
    }),
    [],
  );

  useEffect(() => {
    s.slots.hero = document.querySelector('[data-slot="hero"]');
    s.slots.about = document.querySelector('[data-slot="about"]');
    s.slots.desk = document.querySelector('[data-slot="desk"]');
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      s.look.px = e.clientX;
      s.look.py = e.clientY;
      s.look.last = performance.now();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [s]);

  useEffect(() => {
    (camera as THREE.PerspectiveCamera & { manual?: boolean }).manual = true;
  }, [camera]);

  useFrame((state, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const now = performance.now();

    // 1. Emplacement courant à l'écran
    const hasHero = readRect(s.slots.hero, s.hero);
    const hasAbout = readRect(s.slots.about, s.about);
    const hasDesk = readRect(s.slots.desk, s.desk);
    const pAbout = ease(clamp01(stageState.about));
    const pTravel = ease(clamp01(stageState.travel));
    const pDesk = clamp01(stageState.desk);
    let visible = true;
    if (hasAbout && hasHero && hasDesk) {
      if (pTravel > 0) lerpRect(s.about, s.desk, pTravel, s.rect);
      else lerpRect(s.hero, s.about, pAbout, s.rect);
    } else if (hasDesk && pTravel > 0) {
      Object.assign(s.rect, s.desk);
    } else if (hasHero) {
      Object.assign(s.rect, s.hero);
    } else {
      visible = false;
    }
    avatar.root.visible = visible;
    if (!visible) {
      // Rien à l'écran : on efface tout le canevas (sinon une ancienne image peut rester affichée)
      desk.group.visible = false;
      gl.setScissorTest(false);
      gl.clear();
      return;
    }

    // Découpe du rendu à l'emplacement (marge en haut et sur les côtés, aucune en bas)
    const padX = s.rect.w * 0.12;
    const padTop = s.rect.h * 0.12;
    gl.setScissorTest(false);
    gl.clear();
    gl.setScissor(s.rect.x - padX, size.height - (s.rect.y + s.rect.h), s.rect.w + padX * 2, s.rect.h + padTop);
    gl.setScissorTest(true);

    // 2. Cadrage : buste → À propos → bureau
    const f = s.frame;
    const kDesk = ease(clamp01(pDesk * 1.4));
    f.center.copy(BUST.center).lerp(ABOUT.center, pAbout * (1 - pTravel)).lerp(DESK.center, kDesk);
    f.dir.copy(BUST.dir).lerp(ABOUT.dir, pAbout * (1 - pTravel)).lerp(DESK.dir, kDesk).normalize();
    f.height = lerp(lerp(BUST.height, ABOUT.height, pAbout * (1 - pTravel)), DESK.height, kDesk);
    f.width = lerp(lerp(BUST.width, ABOUT.width, pAbout * (1 - pTravel)), DESK.width, kDesk);
    const aspect = s.rect.w / s.rect.h;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(f.height / 2 / halfTan, f.width / 2 / (halfTan * aspect)) * 1.06;
    cam.position.copy(f.center).addScaledVector(f.dir, dist);
    cam.lookAt(f.center);
    cam.aspect = aspect;
    cam.setViewOffset(s.rect.w, s.rect.h, -s.rect.x, -s.rect.y, size.width, size.height);
    cam.updateProjectionMatrix();

    // 3. Entrée : l'avatar monte légèrement
    avatar.root.position.y = -0.08 * (1 - ease(clamp01(stageState.intro)));

    // 4. Pose : respiration debout ↔ assis en train de taper (fondu de 0,5 s, déclenché à 40 %)
    const sitTarget = pDesk > 0.4 ? 1 : 0;
    const step = dt / 0.5;
    s.sitW = sitTarget > s.sitW ? Math.min(sitTarget, s.sitW + step) : Math.max(sitTarget, s.sitW - step);
    const w = ease(s.sitW);
    idlePose(t, s.poseIdle);
    sitPose(t, s.poseSit);
    for (const k of JOINT_KEYS) {
      const a = s.poseIdle[k];
      const b = s.poseSit[k];
      J[k].rotation.set(lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w));
    }
    avatar.hips.position.y = lerp(s.poseIdle.hipsY, s.poseSit.hipsY, w);
    const br = (lerp(s.poseIdle.breath, s.poseSit.breath, w) * 0.5 + 0.5) * 0.012;
    avatar.torso.scale.set(1 + br * 0.6, 1 + br, 0.74 * (1 + br));

    // 5. La tête suit le pointeur (sinon balayage lent)
    if (now - s.look.last < 3000) {
      const nx = (s.look.px - (s.rect.x + s.rect.w / 2)) / (size.width / 2);
      const ny = (s.look.py - (s.rect.y + s.rect.h * 0.35)) / (size.height / 2);
      s.look.tYaw = THREE.MathUtils.clamp(nx, -1, 1) * THREE.MathUtils.degToRad(35);
      s.look.tPitch = THREE.MathUtils.clamp(ny, -1, 1) * THREE.MathUtils.degToRad(20);
    } else {
      s.look.tYaw = 0.4 * Math.sin(t * 0.5);
      s.look.tPitch = 0.08 * Math.sin(t * 0.31);
    }
    const k = 1 - Math.pow(1 - 0.08, dt * 60);
    s.look.yaw += (s.look.tYaw - s.look.yaw) * k;
    s.look.pitch += (s.look.tPitch - s.look.pitch) * k;
    const lw = 1 - 0.8 * w;
    avatar.head.rotation.y += s.look.yaw * lw * 0.75;
    avatar.head.rotation.x += s.look.pitch * lw * 0.75;
    avatar.neck.rotation.y += s.look.yaw * lw * 0.25;
    avatar.neck.rotation.x += s.look.pitch * lw * 0.25;
    avatar.setGaze(s.look.yaw * lw, s.look.pitch * lw);

    // 6. Clignement
    if (t > s.nextBlink) {
      s.blinkUntil = t + 0.12;
      s.nextBlink = t + 2.5 + Math.random() * 3;
    }
    avatar.setBlink(t < s.blinkUntil ? 0 : 1);

    // 7. Le bureau monte du sol pendant le recul de la caméra
    const rise = ease(clamp01(pDesk * 2.2));
    desk.group.visible = rise > 0.001;
    desk.group.position.y = (1 - rise) * -1.2;
    if (desk.group.visible) {
      if (t > s.nextLine) {
        desk.screen.step();
        s.nextLine = t + 0.9;
      }
      if (t > s.nextDraw) {
        desk.screen.draw();
        s.nextDraw = t + 0.25;
      }
    }

    if (debug) Object.assign(debugInfo, { sitW: s.sitW, pDesk, pTravel, rect: { ...s.rect }, visible });

    if (!s.ready) {
      s.ready = true;
      requestAnimationFrame(() => {
        (window as Window & { __stageReady?: boolean }).__stageReady = true;
        document.documentElement.classList.add('has-stage');
        window.dispatchEvent(new Event('stage:ready'));
      });
    }
  });

  useEffect(
    () => () => {
      avatar.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat.dispose());
        }
      });
      desk.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
            (mat as THREE.MeshBasicMaterial).map?.dispose();
            mat.dispose();
          });
        }
      });
    },
    [avatar, desk],
  );

  return (
    <>
      <Environment />
      <hemisphereLight args={['#B9A6FF', '#120C1E', 0.6]} />
      <directionalLight position={[1.5, 2.6, 2.6]} intensity={1.7} color="#FFF2E8" />
      <directionalLight position={[-2, 2.2, -2.6]} intensity={3.2} color="#8B5CF6" />
      <pointLight position={[-1.3, 1.3, 1]} intensity={4} distance={7} decay={1.6} color="#7C3AED" />
      <primitive object={avatar.root} />
      <primitive object={desk.group} />
      <Warmup reveal={[desk.group]} />
    </>
  );
}

/** Efface le canevas quand la scène se met en pause : après un défilement rapide, la dernière
 * image rendue pourrait sinon rester figée par-dessus une autre section. */
function ClearWhenPaused({ active }: { active: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    if (active) return;
    gl.setScissorTest(false);
    gl.clear();
  }, [active, gl]);
  return null;
}

export default function AvatarStage({ onLost }: { onLost: () => void }) {
  const pageVisible = usePageVisible();
  const [slotVisible, setSlotVisible] = useState(true);

  // Pause dès qu'aucun emplacement n'est à l'écran (après la section « Ce que je fais »)
  useEffect(() => {
    const slots = Array.from(document.querySelectorAll('[data-slot]'));
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
        setSlotVisible(seen.size > 0);
      },
      { rootMargin: '20% 0px' },
    );
    slots.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.75);
  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: dpr < 2, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 30, near: 0.05, far: 40, position: [0, 1.4, 3] }}
        frameloop={pageVisible && slotVisible ? 'always' : 'never'}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05;
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            markWebGLLost();
            onLost();
          });
        }}
      >
        <Scene />
        <ClearWhenPaused active={pageVisible && slotVisible} />
      </Canvas>
    </div>
  );
}
