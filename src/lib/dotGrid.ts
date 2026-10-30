/**
 * Grille de points du fond (Backdrop.tsx), dessinée en canvas 2D.
 * - Au repos : points discrets, qui s'estompent vers les bords de l'écran.
 * - La zone sous la souris s'allume en --accent et se soulève.
 * - Un clic (ou un toucher) dans le vide lance une onde.
 * - La grille défile à mi-vitesse (profondeur).
 * `still` (réduire les animations, appareil modeste) : rien ne bouge, seule la lueur sous la souris apparaît en fondu.
 * Le dessin ne tourne que lorsqu'il y a quelque chose à animer ; sinon la dernière image reste affichée.
 */

const GAP = 26; // espacement des points (px CSS)
const DOT = 1.4; // taille d'un point au repos
const RADIUS = 95; // rayon de la lumière sous la souris
const LIFT = 5; // soulèvement maximum des points allumés
const RIPPLE_SPEED = 520; // px/s
const RIPPLE_LIFE = 1.4; // s
const PARALLAX = 0.5;

// Pas d'onde quand on clique sur un élément qui fait déjà quelque chose
const INTERACTIVE = 'a, button, input, textarea, select, label, summary, dialog, canvas, [role="button"], [tabindex]:not([tabindex="-1"])';

type Ripple = { x: number; y: number; t: number };

function toRgb(color: string): string {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return '180,156,255';
  c.fillStyle = color;
  c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
  return `${r},${g},${b}`;
}

export function startDotGrid(canvas: HTMLCanvasElement, still: boolean): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let W = 0;
  let H = 0;
  let accent = '#b49cff';
  let baseAlpha = 0.13;
  let blend: GlobalCompositeOperation = 'lighter';
  let sprite: HTMLCanvasElement | null = null;

  const ptr = { x: 0, y: 0, on: false };
  let glow = 0; // présence de la lumière sous la souris (0 → 1, en fondu)
  const ripples: Ripple[] = [];
  let t = 0;
  let last = 0;
  let raf = 0;

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    accent = cs.getPropertyValue('--accent').trim() || accent;
    baseAlpha = parseFloat(cs.getPropertyValue('--grid-alpha')) || baseAlpha;
    blend = (cs.getPropertyValue('--grid-blend').trim() || 'source-over') as GlobalCompositeOperation;
    // Halo pré-rendu, réutilisé pour tous les points allumés
    const rgb = toRgb(accent);
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const s = sprite.getContext('2d')!;
    const g = s.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, `rgba(${rgb},0.9)`);
    g.addColorStop(0.4, `rgba(${rgb},0.25)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    s.fillStyle = g;
    s.fillRect(0, 0, 32, 32);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    // Sous « réduire les animations », la grille reste fixe à l'écran (pas de parallaxe)
    const scroll = still ? 0 : window.scrollY;
    const offset = -((scroll * PARALLAX) % GAP);
    const cx = W / 2;
    const cy = H / 2;
    const r2 = 2 * RADIUS * RADIUS;
    ctx!.clearRect(0, 0, W, H);
    ctx!.globalCompositeOperation = blend;
    ctx!.fillStyle = accent;

    for (let y = offset - GAP; y < H + GAP; y += GAP) {
      const ey = (y - cy) / (H * 0.62);
      for (let x = ((W % GAP) + GAP) / 2; x < W; x += GAP) {
        // Fondu vers les bords : ellipse, plein au centre, nul au-delà
        const ex = (x - cx) / (W * 0.62);
        const e = Math.sqrt(ex * ex + ey * ey);
        const fade = e < 0.5 ? 1 : Math.max(0, 1 - (e - 0.5) / 0.55);

        let I = 0;
        if (glow > 0.001) {
          const dx = x - ptr.x;
          const dy = y - ptr.y;
          I = glow * Math.exp(-(dx * dx + dy * dy) / r2);
        }
        for (const r of ripples) {
          const age = t - r.t;
          const d = Math.hypot(x - r.x, y - r.y);
          I += Math.max(0, 1 - Math.abs(d - age * RIPPLE_SPEED) / 36) * Math.max(0, 1 - age / RIPPLE_LIFE);
        }
        I = Math.min(1, I);

        const a = baseAlpha * fade + 0.8 * I;
        if (a < 0.004) continue;
        const lift = still ? 0 : I * LIFT;
        const s = DOT + 1.6 * I;
        ctx!.globalAlpha = Math.min(1, a);
        ctx!.fillRect(x - s / 2, y - s / 2 - lift, s, s);
        if (I > 0.25 && sprite) {
          ctx!.globalAlpha = I * 0.35;
          ctx!.drawImage(sprite, x - 7, y - 7 - lift, 14, 14);
        }
      }
    }
    ctx!.globalAlpha = 1;
    ctx!.globalCompositeOperation = 'source-over';
  }

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    t += dt;

    const target = ptr.on ? 1 : 0;
    glow += (target - glow) * Math.min(1, dt * (still ? 6 : 10));
    if (Math.abs(target - glow) < 0.002) glow = target;
    for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t > RIPPLE_LIFE) ripples.splice(i, 1);

    draw();

    // On continue tant que quelque chose bouge ; sinon l'image reste telle quelle
    const busy = ripples.length > 0 || glow !== target;
    if (busy) request();
    else last = 0;
  }
  function request() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return; // sur téléphone, pas de lumière qui suit le doigt
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    ptr.on = true;
    request();
  };
  const onLeave = () => {
    ptr.on = false;
    request();
  };
  const onClick = (e: MouseEvent) => {
    if (still) return;
    const el = e.target as Element | null;
    if (el?.closest?.(INTERACTIVE)) return;
    ripples.push({ x: e.clientX, y: e.clientY, t });
    request();
  };
  const onScroll = () => {
    if (!still) request();
  };
  const onResize = () => {
    resize();
    request();
  };
  const onTheme = () => {
    readTheme();
    request();
  };
  const onVisible = () => {
    if (!document.hidden) request();
  };

  const light = window.matchMedia('(prefers-color-scheme: light)');
  readTheme();
  resize();
  request();

  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  window.addEventListener('click', onClick, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisible);
  light.addEventListener('change', onTheme);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    window.removeEventListener('click', onClick);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisible);
    light.removeEventListener('change', onTheme);
  };
}
