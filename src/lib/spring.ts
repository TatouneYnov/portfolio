// Ressorts façon Apple (« Designing Fluid Interfaces ») : réglés par l'amortissement (1 = sans rebond,
// < 1 = léger dépassement) et la réponse (en secondes, plus petit = plus vif), pas par une durée.
// Un ressort part toujours de la valeur affichée et de la vitesse du geste : on peut le rattraper et
// l'inverser à tout instant, sans saut.
import { isReducedMotion } from './motion';

export type Spring = {
  /** Arrête le ressort là où il est (pour qu'un nouveau geste reprenne depuis la valeur affichée). */
  stop: () => void;
  value: () => number;
  velocity: () => number;
};

type Options = {
  /** Amortissement : 1 = critique (aucun rebond, par défaut) ; ~0,8 seulement après un geste lancé. */
  damping?: number;
  /** Réponse en secondes (0,3 à 0,4 pour l'interface). */
  response?: number;
  /** Vitesse de départ en unités par seconde (celle du doigt au lâcher). */
  velocity?: number;
  onUpdate: (value: number) => void;
  onRest?: () => void;
};

export function springTo(from: number, to: number, { damping = 1, response = 0.35, velocity = 0, onUpdate, onRest }: Options): Spring {
  let x = from;
  let v = velocity;
  let raf = 0;
  let stopped = false;

  if (isReducedMotion()) {
    // « Réduire les animations » : pas de mouvement, on pose directement l'état final
    onUpdate(to);
    onRest?.();
    return { stop: () => {}, value: () => to, velocity: () => 0 };
  }

  const stiffness = (2 * Math.PI / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  const step = 1 / 240; // pas fixe : même comportement quel que soit l'écran (60, 120 Hz…)
  let last = performance.now();
  let acc = 0;

  const tick = (now: number) => {
    if (stopped) return;
    acc += Math.min(0.064, (now - last) / 1000);
    last = now;
    while (acc >= step) {
      const a = -stiffness * (x - to) - friction * v;
      v += a * step;
      x += v * step;
      acc -= step;
    }
    if (Math.abs(x - to) < 0.3 && Math.abs(v) < 4) {
      x = to;
      v = 0;
      onUpdate(x);
      onRest?.();
      return;
    }
    onUpdate(x);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
    },
    value: () => x,
    velocity: () => v,
  };
}

/** Projette où un lancer s'arrêterait (décélération exponentielle d'Apple, comme le défilement). */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Résistance élastique au-delà d'une limite : plus on tire, moins ça suit. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Suivi de vitesse d'un geste : moyenne sur les ~100 dernières ms. */
export function velocityTracker() {
  const samples: { t: number; p: number }[] = [];
  return {
    reset() {
      samples.length = 0;
    },
    add(p: number) {
      const t = performance.now();
      samples.push({ t, p });
      while (samples.length > 2 && t - samples[0].t > 100) samples.shift();
    },
    /** Unités par seconde. */
    get() {
      if (samples.length < 2) return 0;
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = (b.t - a.t) / 1000;
      return dt > 0 ? (b.p - a.p) / dt : 0;
    },
  };
}
