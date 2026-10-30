import { useEffect, useRef } from 'react';
import { gsap, isReducedMotion } from '../lib/motion';

/**
 * Fond de page : trois grandes lueurs floues fixes à l'écran + un grain très fin.
 * Elles dérivent lentement et changent de place au fil du défilement (scrub sur toute la page).
 * Sous « réduire les animations » : fond fixe.
 */
export function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || isReducedMotion()) return;
    const [a, b, c] = root.querySelectorAll('.backdrop__orb');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 1.5 },
    });
    tl.to(a, { xPercent: 45, yPercent: 60, scale: 1.15 }, 0)
      .to(b, { xPercent: -55, yPercent: 35, scale: 0.85 }, 0)
      .to(c, { xPercent: 35, yPercent: -70, scale: 1.2 }, 0);
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <div className="backdrop" ref={ref} aria-hidden="true">
      <span className="backdrop__orb backdrop__orb--a" />
      <span className="backdrop__orb backdrop__orb--b" />
      <span className="backdrop__orb backdrop__orb--c" />
      <span className="backdrop__grain" />
    </div>
  );
}
