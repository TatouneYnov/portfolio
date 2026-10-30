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
import { makeWalnutTexture } from './walnut';

type Props = {
  projects: Project[];
  docked: string | null;
  request: DockRequest;
  onDock: (id: string | null) => void;
  paused: boolean;
  maxBubbles: number;
  wrapper: RefObject<HTMLDivElement>;
  tip: RefObject<HTMLDivElement>;
  /** Hauteur (px) du titre posé sur la scène : les bulles ne passent jamais dessous */
  topInset: number;
  onLost: () => void;
};

const DRAG_THRESHOLD = 6; // px parcourus avant de considérer qu'on glisse (sinon : clic)
const TOUCH_DRAG_THRESHOLD = 10; // au doigt, un tap bouge toujours un peu

/**
 * Nom du projet, sur fond transparent : il flotte à l'intérieur de la bulle de verre, toujours face à l'écran.
 * Taille calculée pour tenir dans le disque intérieur (jamais rogné).
 */
const LABEL_PX = 1024;
function makeNameTexture(label: string, light: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = LABEL_PX;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const lines = label.split('\n');
  const font = (px: number) => `800 ${px}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", Roboto, system-ui, sans-serif`;
  // Largeur utile : 72 % du disque ; hauteur du bloc : 60 %
  let size = 260;
  ctx.font = font(size);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  size = Math.floor(Math.min(size, (size * LABEL_PX * 0.72) / widest, (LABEL_PX * 0.6) / (lines.length * 1.05)));
  ctx.font = font(size);
  ctx.fillStyle = light ? '#21183A' : '#F3EFFB';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = size * 1.05;
  lines.forEach((line, i) => ctx.fillText(line, LABEL_PX / 2, LABEL_PX / 2 + (i - (lines.length - 1) / 2) * lh));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Reflets d'une bulle de verre : grande tache douce en haut à gauche, petit éclat en bas à droite. */
function makeGlintTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const spot = (x: number, y: number, rx: number, ry: number, rot: number, a: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.45, `rgba(255,255,255,${a * 0.45})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  spot(176, 150, 92, 48, -0.6, 0.85);
  spot(352, 380, 34, 16, -0.6, 0.45);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Liseré du verre : plus lumineux sur les bords de la sphère (effet de Fresnel). */
function makeRimMaterial(light: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(light ? '#7C5CE0' : '#C9B8FF') },
      uStrength: { value: light ? 0.75 : 0.9 },
    },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.6);
        gl_FragColor = vec4(uColor, f * uStrength);
      }`,
    transparent: true,
    depthWrite: false,
    blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
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

type BallState = { body: RapierRigidBody | null; mesh: THREE.Group | null; radius: number };
type Press = { id: string; x: number; y: number; touch: boolean; dragging: boolean };

function World({ projects, docked, request, onDock, wrapper, tip, topInset }: Omit<Props, 'paused' | 'maxBubbles' | 'onLost'>) {
  const { camera, size, gl } = useThree();
  const { rapier } = useRapier();
  const balls = useRef(new Map<string, BallState>());
  const ring = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
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

  // Géométrie de la scène selon la taille de l'écran (unités monde au plan z = 0) :
  // socle en bas au centre ; les bulles flottent entre le titre (en haut) et le socle, sans sortir des bords
  const frame = useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
    const halfW = halfH * (size.width / size.height);
    const portrait = size.width < 720;
    const unit = Math.min(halfW, halfH) * (portrait ? 0.27 : 0.2);
    const px = (2 * halfH) / Math.max(1, size.height); // 1 px CSS en unités monde
    const margin = unit * 0.3;
    // Centre du plateau : sa demi-hauteur apparente, son épaisseur et « Déposer ici » tiennent au-dessus du bas
    const plateY = -halfH + unit * 0.75 + unit * 0.32 + px * 60;
    const top = halfH - topInset * px - margin;
    const floor = plateY + unit * 0.75; // au-dessus du plateau (dont le bord arrière dépasse d'environ 0,5 unité)
    return {
      halfW,
      halfH,
      unit,
      px,
      dock: new THREE.Vector3(0, plateY, 0),
      bounds: { left: -halfW + margin, right: halfW - margin, top, floor },
      center: new THREE.Vector3(0, (top + floor) / 2, 0),
    };
  }, [camera, size, topInset]);

  const light = useTheme() === 'light';
  const textures = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, makeNameTexture(p.bubbleLabel || p.name, light)])),
    [projects, light],
  );
  const rim = useMemo(() => makeRimMaterial(light), [light]);
  const namePlane = useMemo(() => new THREE.PlaneGeometry(1.56, 1.56), []);
  const glint = useMemo(() => makeGlintTexture(), []);
  const glintPlane = useMemo(() => new THREE.PlaneGeometry(1.9, 1.9), []);
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

  const shadowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(40,20,90,0.35)');
    g.addColorStop(1, 'rgba(40,20,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);

  useEffect(
    () => () => {
      haloTex.dispose();
      shadowTex.dispose();
      sphere.dispose();
      namePlane.dispose();
      glint.dispose();
      glintPlane.dispose();
    },
    [haloTex, shadowTex, sphere, namePlane, glint, glintPlane],
  );
  // Noms et liseré refaits à chaque changement de thème
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);
  useEffect(() => () => rim.dispose(), [rim]);
  // Libellé du socle refait à chaque changement de thème
  useEffect(() => () => dockLabel.dispose(), [dockLabel]);

  const maxRadius = Math.max(...projects.map((p) => p.size)) * frame.unit;
  const dockRadius = maxRadius * 1.18;
  const FLAT = 0.26; // plateau vu légèrement de dessus : cercle aplati en ellipse
  const TILT = Math.asin(FLAT); // inclinaison du cylindre qui donne cet aplatissement
  const plateH = frame.unit * 0.32; // épaisseur du plateau
  const INSET = 0.7; // rayon de l'incrustation de verre (part du plateau)
  // Noyer : veinage le long de la tranche, et en lignes parallèles sur le dessus
  const walnutSide = useMemo(() => makeWalnutTexture(2.2, 0.14), []);
  const walnutTop = useMemo(() => {
    const t = makeWalnutTexture(0.5, 0.4);
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2; // veines dans le sens de la largeur, comme une planche
    return t;
  }, []);
  useEffect(() => () => {
    walnutSide.dispose();
    walnutTop.dispose();
  }, [walnutSide, walnutTop]);
  // Bulle déposée : posée sur le plateau (son centre dépend de sa taille)
  const restY = (id: string) => frame.dock.y + (balls.current.get(id)?.radius ?? maxRadius) * 1.02;
  // Zone de dépôt : au-dessus du plateau, là où repose la bulle
  const nearDock = (x: number, y: number) => Math.hypot(x - frame.dock.x, y - (frame.dock.y + maxRadius * 0.8)) < dockRadius * 1.4;
  // Phases propres à chaque bulle pour la dérive en apesanteur
  const phases = useMemo(() => projects.map((_, i) => i * 2.399), [projects]);

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
      tmp.dir.set(frame.center.x - t.x, frame.center.y - t.y, 0).normalize().multiplyScalar(b.mass() * 4);
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
    gsap.to(proxy.current, { x: frame.dock.x, y: restY(id), duration, ease: 'power3.out' });
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
      if ((pt && nearDock(pt.x, pt.y)) || (t && nearDock(t.x, t.y))) {
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
      if (tmp.raycaster.intersectObjects(hits, true).length) e.preventDefault();
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

  const index = useMemo(() => new Map(projects.map((p, i) => [p.id, i])), [projects]);

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
        // Posée sur le socle, elle flotte à peine
        const bob = Math.sin(state.clock.elapsedTime * 1.3) * frame.unit * 0.04;
        b.setNextKinematicTranslation({ x: proxy.current.x, y: proxy.current.y + bob, z: 0 });
        return;
      }

      if (id === dragging && pointer.current.valid) {
        // La bulle tenue suit le pointeur quel que soit le débit d'images (léger lissage)
        const w = pointer.current.world;
        const a = 1 - Math.exp(-30 * dt);
        const nx = t.x + (w.x - t.x) * a;
        const ny = t.y + (w.y - t.y) * a;
        if (dt > 0) throwVel.current.lerp(tmp.v.set((nx - t.x) / dt, (ny - t.y) / dt, 0), 0.35);
        b.setNextKinematicTranslation({ x: nx, y: ny, z: 0 });
        overDock = nearDock(t.x, t.y) || nearDock(w.x, w.y);
        return;
      }
      // Une bulle survolée reste immobile pour qu'on puisse cliquer dessus
      if (id === hovered.current || id === p?.id) {
        const lv = b.linvel();
        b.setLinvel({ x: lv.x * 0.85, y: lv.y * 0.85, z: 0 }, true);
        return;
      }
      // Apesanteur : dérive lente propre à chaque bulle, retenue par des bords souples
      // (côtés, dessous du titre, dessus du socle)
      const ph = phases[index.get(id) ?? 0];
      const time = state.clock.elapsedTime;
      const r = ball.radius;
      const { left, right, top, floor } = frame.bounds;
      let fx = Math.sin(time * 0.31 + ph) * 0.3;
      let fy = Math.cos(time * 0.23 + ph * 1.7) * 0.3;
      const ox = t.x - r < left ? left - (t.x - r) : t.x + r > right ? right - (t.x + r) : 0;
      const oy = t.y - r < floor ? floor - (t.y - r) : t.y + r > top ? top - (t.y + r) : 0;
      fx += ox * 40;
      fy += oy * 40;
      if (ox || oy) {
        // Dehors : on freine aussi la vitesse qui l'emmène plus loin (lancer, éjection du socle)
        const lv = b.linvel();
        b.setLinvel({ x: lv.x * ox < 0 ? lv.x * 0.8 : lv.x, y: lv.y * oy < 0 ? lv.y * 0.8 : lv.y, z: 0 }, true);
      }
      const m = b.mass() * dt;
      b.applyImpulse({ x: fx * m, y: fy * m, z: 0 }, true);
    });

    // Le socle s'illumine quand une bulle glissée passe au-dessus, et brièvement au dépôt
    glow.current = THREE.MathUtils.damp(glow.current, overDock ? 1 : 0, overDock ? 10 : 3, dt);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.04;
    if (ring.current) ring.current.scale.setScalar(1 + glow.current * 0.06);
    if (ringMat.current) ringMat.current.emissiveIntensity = (light ? 0.5 : 0.35) + glow.current * 2.2;
    if (halo.current) halo.current.scale.set(dockRadius * 3.2 * pulse, dockRadius * 3.2 * FLAT * 2.2 * pulse, 1);
    if (haloMat.current) haloMat.current.opacity = (light ? 0.25 : 0.4) + glow.current * 0.6;
  });

  return (
    <>
      <Environment />
      <ambientLight intensity={0.5} color="#C9BBFF" />
      <directionalLight position={[3, 5, 6]} intensity={2.2} color="#FFF6EE" />
      <directionalLight position={[-6, -2, -4]} intensity={2.4} color="#7C3AED" />

      {/* Socle de dépôt : plateau en noyer vu légèrement de dessus, incrustation de verre qui s'allume
          quand une bulle approche */}
      <group position={frame.dock.toArray()}>
        {/* Halo et ombre derrière tout le plateau incliné (sinon ils le coupent en deux) */}
        <mesh ref={halo} position={[0, 0, -dockRadius * 1.3]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial ref={haloMat} map={haloTex} transparent depthWrite={false} blending={light ? THREE.NormalBlending : THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh position={[0, -plateH - frame.unit * 0.12, -dockRadius * 1.2]} scale={[dockRadius * 1.35, dockRadius * FLAT * 1.6, 1]}>
          <circleGeometry args={[1, 64]} />
          <meshBasicMaterial map={shadowTex} transparent depthWrite={false} toneMapped={false} opacity={light ? 0.5 : 0.8} />
        </mesh>
        {/* Plateau en noyer (le bois du clavier), en volume : cylindre incliné vers la caméra (dessus et tranche
            visibles), avec au centre une incrustation de verre dépoli lavande où se pose la bulle */}
        <group rotation={[TILT, 0, 0]} position={[0, -plateH / 2, 0]}>
          <mesh renderOrder={0}>
            <cylinderGeometry args={[dockRadius, dockRadius * 1.02, plateH, 96, 1]} />
            {/* Tranche, dessus, dessous */}
            {/* Teinte et reflets réduits : sous l'éclairage des bulles, le noyer virait au chêne clair */}
            <meshPhysicalMaterial attach="material-0" map={walnutSide} color="#8E6A52" roughness={0.5} clearcoat={0.35} clearcoatRoughness={0.45} envMapIntensity={0.35} />
            <meshPhysicalMaterial attach="material-1" map={walnutTop} color="#8E6A52" roughness={0.5} clearcoat={0.35} clearcoatRoughness={0.45} envMapIntensity={0.35} />
            <meshBasicMaterial attach="material-2" visible={false} />
          </mesh>
          <group position={[0, plateH / 2 + 0.012, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
              <circleGeometry args={[dockRadius * INSET, 96]} />
              <meshPhysicalMaterial
                color={light ? '#9F86F2' : '#5A47B8'}
                emissive={light ? '#8B6CF0' : '#4B38A8'}
                emissiveIntensity={0.15}
                roughness={0.6}
                clearcoat={0.3}
                clearcoatRoughness={0.6}
                envMapIntensity={0.25}
              />
            </mesh>
            {/* Bord de l'incrustation : s'allume quand une bulle approche */}
            <group ref={ring}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[dockRadius * INSET, frame.unit * 0.018, 12, 128]} />
                <meshStandardMaterial ref={ringMat} color={light ? '#8B6CF0' : '#7C5CE0'} emissive={light ? '#7C5CE0' : '#9F86FF'} emissiveIntensity={0.6} toneMapped={false} />
              </mesh>
            </group>
          </group>
        </group>
        {/* « Déposer ici » à taille fixe à l'écran (texte d'environ 13 px) */}
        <mesh position={[0, -dockRadius * 1.03 * FLAT - plateH - frame.px * 24, dockRadius * Math.cos(TILT)]} scale={[frame.px * 200, frame.px * 37.5, 1]} renderOrder={5}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={dockLabel} transparent depthWrite={false} depthTest={false} toneMapped={false} />
        </mesh>
      </group>

      {projects.map((p, i) => {
        const radius = p.size * frame.unit;
        // Départ : réparties sur une ellipse dans la zone libre
        const angle = (i / projects.length) * Math.PI * 2 + 0.4;
        const { left, right, top, floor } = frame.bounds;
        const start: [number, number, number] = [
          frame.center.x + Math.cos(angle) * Math.max(0, (right - left) / 2 - radius) * 0.6,
          frame.center.y + Math.sin(angle) * Math.max(0, (top - floor) / 2 - radius) * 0.6,
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
            linearDamping={1.1}
            angularDamping={1}
            enabledTranslations={[true, true, false]}
            enabledRotations={[false, false, false]}
            ccd
          >
            <BallCollider args={[radius]} restitution={0.35} friction={0.2} />
            <group
              scale={radius}
              ref={(g) => {
                const entry = balls.current.get(p.id);
                if (entry) entry.mesh = g;
              }}
            >
              {/* Nom à l'intérieur : après la teinte du verre (reste net), avant le liseré et les reflets */}
              <mesh geometry={namePlane} renderOrder={2} position={[0, 0, 0.02]} raycast={() => null}>
                <meshBasicMaterial map={textures[p.id]} transparent depthWrite={false} toneMapped={false} />
              </mesh>
              <mesh
                geometry={sphere}
                renderOrder={1}
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
                {/* Verre lavande : coque transparente aux reflets nets (pas de transmission : le canevas est
                    transparent, le fond de la page n'existe pas pour la scène 3D) */}
                <meshPhysicalMaterial
                  color={light ? '#B9A4FF' : '#8F78E8'}
                  transparent
                  opacity={light ? 0.16 : 0.14}
                  depthWrite={false}
                  roughness={0.06}
                  metalness={0}
                  clearcoat={1}
                  clearcoatRoughness={0.04}
                  iridescence={0.35}
                  iridescenceIOR={1.3}
                  iridescenceThicknessRange={[200, 480]}
                  envMapIntensity={1.6}
                />
              </mesh>
              <mesh geometry={sphere} material={rim} renderOrder={3} raycast={() => null} />
              <mesh geometry={glintPlane} position={[0, 0, 1.02]} renderOrder={4} raycast={() => null}>
                <meshBasicMaterial map={glint} transparent depthWrite={false} toneMapped={false} opacity={light ? 0.9 : 0.6} />
              </mesh>
            </group>
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
