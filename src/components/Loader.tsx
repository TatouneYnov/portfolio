import { useEffect, useRef } from 'react';
import { gsap } from '../lib/motion';

/** Durée fixe de l'écran de chargement (ms). La barre est fictive : elle sert la mise en scène. */
const DURATION = 2000;

/**
 * Progression fictive, avec un rythme « naturel » : départ rapide, petit ralenti, accélération.
 * Les mêmes paliers pilotent la barre (animation CSS, fluide même si la page travaille)
 * et le compteur (JS).
 */
const STEPS: [number, number][] = [
  [0, 0],
  [0.18, 0.27],
  [0.42, 0.44],
  [0.62, 0.7],
  [0.84, 0.93],
  [1, 1],
];
function progressAt(t: number) {
  for (let i = 1; i < STEPS.length; i++) {
    const [t1, v1] = STEPS[i];
    const [t0, v0] = STEPS[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (k * k * (3 - 2 * k));
    }
  }
  return 1;
}

/**
 * Écran de chargement : 2 s à chaque visite, puis ouverture verticale.
 * Sans JavaScript, noscript.css le masque ; si le script ne démarre jamais, une animation CSS
 * de secours le retire après 4 s. Sous « réduire les animations », il est sauté.
 */
export function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.classList.add('loader--js');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.hidden = true;
      onDone();
      return;
    }

    el.classList.add('loader--run');
    // Le compteur lit l'horloge de l'animation CSS de la barre : les deux restent synchrones,
    // même si la première image s'affiche en retard.
    const fill = el.querySelector<HTMLElement>('.loader__fill');
    const anim = fill?.getAnimations?.()[0];
    const t0 = performance.now();
    const elapsed = () => (anim && typeof anim.currentTime === 'number' ? anim.currentTime : performance.now() - t0);
    let raf = 0;
    let last = -1;
    const tick = () => {
      const t = Math.min(1, elapsed() / DURATION);
      const value = Math.round(progressAt(t) * 100);
      if (value !== last && count.current) {
        count.current.textContent = String(value).padStart(3, '0');
        last = value;
      }
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let exit: gsap.core.Timeline | null = null;
    let done = false;
    const leave = () => {
      if (done) return;
      done = true;
      if (count.current) count.current.textContent = '100';
      exit = gsap
        .timeline({ delay: 0.15 })
        .to(el, { clipPath: 'inset(50% 0% 50% 0%)', duration: 0.8, ease: 'power3.inOut' })
        .add(onDone, '-=0.35')
        .add(() => {
          el.hidden = true;
        });
    };
    anim?.finished.then(leave, () => undefined);
    const timer = window.setTimeout(leave, DURATION + 600); // filet de sécurité

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      exit?.kill();
    };
  }, [onDone]);

  return (
    <div ref={root} className="loader" aria-hidden="true">
      <div className="loader__inner">
        <p className="loader__name">Ethan Bacquier</p>
        <div className="loader__bar">
          <span className="loader__fill" />
        </div>
        <div className="loader__meta">
          <span>Chargement</span>
          <span className="loader__count">
            <span ref={count}>000</span>
          </span>
        </div>
      </div>
    </div>
  );
}
