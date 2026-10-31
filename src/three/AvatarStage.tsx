// Scène fixe de l'avatar : un seul Canvas plein écran, derrière le contenu.
// L'avatar est cadré dans des « emplacements » réservés dans le DOM (data-slot) : hero, À propos,
// bureau. Le texte ne peut donc jamais passer sous lui.
import { useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildAvatar, buildDesk, buildLights, JOINT_KEYS, makePose, idlePose, sitPose, wavePose, typeFingers } from './avatar.js';
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

const WAVE_TIME = 1.9;
const WAVE_KEYS = ['uaR', 'laR', 'hR', 'head'];
const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fondu au bas de l'emplacement (hero et À propos) : bande collée à la caméra, dessinée en dernier,
// qui rend l'avatar progressivement transparent (couleur et alpha multipliés par 1 - a, canevas en
// alpha prémultiplié). Remplace un dégradé CSS qui, sous le canevas, ne masquait plus la découpe.
const FADE_HEIGHT = 0.22;
function buildFade() {
  const material = new THREE.ShaderMaterial({
    uniforms: { strength: { value: 1 } },
    vertexShader: 'varying float vY; void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float strength; varying float vY; void main() { float a = strength * (1.0 - smoothstep(0.0, 1.0, vY)); gl_FragColor = vec4(0.0, 0.0, 0.0, a); }',
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const fade = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  fade.renderOrder = 999;
  fade.frustumCulled = false;
  return fade;
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
  const { camera, size, gl, scene } = useThree();
  const avatar = useMemo(() => buildAvatar(), []);
  const lights = useMemo(() => buildLights(), []);
  const desk = useMemo(() => buildDesk(), []);
  const fade = useMemo(() => buildFade(), []);
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
      poseWave: makePose(),
      hero: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      about: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      desk: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      rect: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      center: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      frame: { center: new THREE.Vector3(), height: 1, width: 1, dir: new THREE.Vector3() } as Framing,
      slots: { hero: null as Element | null, about: null as Element | null, desk: null as Element | null },
      title: null as Element | null,
      titleRect: { x: 0, y: 0, w: 0, h: 0 } as Rect,
      masked: '',
      look: { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, px: 0, py: 0, last: -10 },
      sitW: 0,
      waveT0: -1,
      smile: 0,
      sacc: { x: 0, y: 0, next: 1 },
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
    s.title = document.querySelector('.whatido__title');
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

  // La bande de fondu suit la caméra : elle doit faire partie de la scène pour être dessinée
  useEffect(() => {
    camera.add(fade);
    scene.add(camera);
    return () => {
      camera.remove(fade);
      scene.remove(camera);
      fade.geometry.dispose();
      (fade.material as THREE.Material).dispose();
    };
  }, [camera, scene, fade]);

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
      if (s.masked) {
        s.masked = '';
        gl.domElement.style.maskImage = '';
        (gl.domElement.style as CSSStyleDeclaration & { webkitMaskImage: string }).webkitMaskImage = '';
      }
      gl.setScissorTest(false);
      gl.clear();
      return;
    }

    // Découpe du rendu à l'emplacement (marge en haut et sur les côtés, aucune en bas)
    const padX = s.rect.w * 0.12;
    const padTop = s.rect.h * 0.12;

    // Pendant le trajet À propos → bureau, l'avatar croise forcément le titre « Ce que je fais » (au-dessus puis
    // en dessous). Un masque adouci découpe le canevas autour du titre : le texte reste toujours devant l'avatar.
    let mask = '';
    if (pTravel > 0 && pTravel < 1 && readRect(s.title, s.titleRect)) {
      const tr = s.titleRect;
      const overlaps =
        s.rect.x - padX < tr.x + tr.w && s.rect.x + s.rect.w + padX > tr.x &&
        s.rect.y - padTop < tr.y + tr.h && s.rect.y + s.rect.h > tr.y;
      if (overlaps) {
        const m = Math.round(Math.min(tr.h * 0.18, 28)); // fondu du bord
        const x0 = Math.round(tr.x - m), x1 = Math.round(tr.x + tr.w + m);
        const y0 = Math.round(tr.y - m), y1 = Math.round(tr.y + tr.h + m * 0.5);
        // Deux dégradés : la bande horizontale du titre est transparente, sauf hors de sa largeur
        mask =
          `linear-gradient(to bottom, #000 ${y0}px, transparent ${y0 + m}px, transparent ${y1 - m}px, #000 ${y1}px), ` +
          `linear-gradient(to right, transparent ${x1 - m}px, #000 ${x1}px), ` +
          `linear-gradient(to left, transparent ${size.width - x0 - m}px, #000 ${size.width - x0}px)`;
      }
    }
    if (mask !== s.masked) {
      s.masked = mask;
      const st = gl.domElement.style as CSSStyleDeclaration & { webkitMaskImage: string };
      st.maskImage = mask;
      st.webkitMaskImage = mask;
    }
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

    // Fondu : le cadre non décalé de la caméra correspond exactement à l'emplacement (setViewOffset).
    // Bande sur les 22 % du bas, débordant de 12 % sur les côtés comme la découpe ; s'efface vers le bureau.
    const fd = cam.near * 1.5;
    const halfH = fd * halfTan;
    const halfW = halfH * aspect;
    fade.position.set(0, -halfH * (1 - FADE_HEIGHT), -fd);
    fade.scale.set(halfW * 2 * 1.24 + 0.001, halfH * 2 * FADE_HEIGHT, 1);
    (fade.material as THREE.ShaderMaterial).uniforms.strength.value = 1 - pTravel;
    fade.visible = pTravel < 0.999;

    // 3. Entrée : l'avatar monte légèrement
    avatar.root.position.y = -0.08 * (1 - ease(clamp01(stageState.intro)));

    // 4. Pose : respiration debout ↔ assis en train de taper (fondu de 0,5 s, déclenché à 40 %)
    const sitTarget = pDesk > 0.4 ? 1 : 0;
    const step = dt / 0.5;
    s.sitW = sitTarget > s.sitW ? Math.min(sitTarget, s.sitW + step) : Math.max(sitTarget, s.sitW - step);
    const w = ease(s.sitW);
    idlePose(t, s.poseIdle);
    sitPose(t, s.poseSit);
    // Salut, une seule fois, juste après l'entrée du hero (bras droit, 1,9 s)
    if (s.waveT0 < 0 && stageState.intro >= 0.999 && pAbout < 0.05 && !reducedMotion) s.waveT0 = t + 0.15;
    const wt = s.waveT0 < 0 ? -1 : t - s.waveT0;
    const ww = wt < 0 || wt > WAVE_TIME ? 0 : ease(clamp01(wt / 0.35)) * ease(clamp01((WAVE_TIME - wt) / 0.45));
    if (ww > 0) {
      wavePose(t, s.poseWave);
      for (const k of WAVE_KEYS) {
        const a = s.poseIdle[k], b = s.poseWave[k];
        a[0] = lerp(a[0], b[0], ww); a[1] = lerp(a[1], b[1], ww); a[2] = lerp(a[2], b[2], ww);
      }
    }
    for (const k of JOINT_KEYS) {
      const a = s.poseIdle[k];
      const b = s.poseSit[k];
      J[k].rotation.set(lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w));
    }
    avatar.hips.position.y = lerp(s.poseIdle.hipsY, s.poseSit.hipsY, w);
    const br = (lerp(s.poseIdle.breath, s.poseSit.breath, w) * 0.5 + 0.5) * 0.012;
    avatar.torso.scale.set(1 + br * 0.6, 1 + br, 1 + br);   // l'aplatissement du torse est déjà dans sa géométrie
    typeFingers(avatar, t, w, ww);

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
    // Saccades : petits sauts du regard, instantanés comme de vrais mouvements d'yeux
    if (t > s.sacc.next) {
      s.sacc.x = (Math.random() - 0.5) * 0.16;
      s.sacc.y = (Math.random() - 0.5) * 0.08;
      s.sacc.next = t + 0.6 + Math.random() * 1.8;
    }
    avatar.setGaze(s.look.yaw * lw + s.sacc.x, s.look.pitch * lw + s.sacc.y);

    // Sourire : pointeur au-dessus de l'avatar dans le hero, et pendant le salut
    const r = s.hero;
    const over = now - s.look.last < 3000 && pAbout < 0.3 && w < 0.5 &&
      s.look.px > r.x && s.look.px < r.x + r.w && s.look.py > r.y && s.look.py < r.y + r.h;
    const smileTarget = Math.max(over ? 1 : 0, ww);
    s.smile += (smileTarget - s.smile) * (1 - Math.pow(1 - 0.12, dt * 60));
    avatar.setSmile(s.smile);

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

    if (debug) Object.assign(debugInfo, { sitW: s.sitW, pDesk, pTravel, rect: { ...s.rect }, visible, waveT0: s.waveT0, wave: ww, smile: s.smile });

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
      <primitive object={lights} />
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
