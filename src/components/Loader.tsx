import { useEffect, useRef } from 'react';
import { gsap } from '../lib/motion';

const MAX_DURATION = 4000;
const MIN_DURATION = 700;

/**
 * Écran de chargement. Présent dans le HTML pré-rendu ; sans JavaScript, noscript.css le masque
 * et une animation CSS de secours le retire après 4 s si le script ne démarre jamais.
 * Progression réelle : polices, puis scène 3D prête (ou absente).
 */
export function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.classList.add('loader--js');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const progress = { value: 0 };
    let finished = false;

    const setCount = () => {
      if (count.current) count.current.textContent = String(Math.round(progress.value)).padStart(3, '0');
    };
    const goTo = (value: number, duration = 0.5) =>
      gsap.to(progress, { value: Math.max(progress.value, value), duration, ease: 'power2.out', onUpdate: setCount });

    const finish = () => {
      if (finished) return;
      finished = true;
      const wait = Math.max(0, MIN_DURATION - (performance.now() - t0));
      if (reduced) {
        el.hidden = true;
        onDone();
        return;
      }
      gsap
        .timeline({ delay: wait / 1000 })
        .to(progress, { value: 100, duration: 0.35, ease: 'power2.out', onUpdate: setCount })
        .to(el, { clipPath: 'inset(50% 0% 50% 0%)', duration: 0.8, ease: 'power3.inOut' })
        .add(() => {
          el.hidden = true;
          onDone();
        }, '-=0.35');
    };

    let stageReady = false;
    let fontsReady = false;
    const check = () => {
      if (fontsReady && stageReady) finish();
    };
    goTo(18, 0.4);
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      fontsReady = true;
      goTo(55);
      check();
    });
    const onStage = () => {
      stageReady = true;
      goTo(92, 0.4);
      check();
    };
    window.addEventListener('stage:ready', onStage, { once: true });
    if ((window as Window & { __stageReady?: boolean }).__stageReady) onStage();
    const timeout = window.setTimeout(finish, MAX_DURATION);

    return () => {
      window.removeEventListener('stage:ready', onStage);
      window.clearTimeout(timeout);
    };
  }, [onDone]);

  return (
    <div ref={root} className="loader" aria-hidden="true">
      <p className="loader__count">
        <span ref={count}>000</span>
      </p>
      <p className="loader__name">Ethan Bacquier</p>
    </div>
  );
}
