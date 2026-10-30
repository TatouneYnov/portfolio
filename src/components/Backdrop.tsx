import { useEffect, useRef } from 'react';
import { gsap, isReducedMotion } from '../lib/motion';
import { getCapabilities } from '../lib/capabilities';
import { startDotGrid } from '../lib/dotGrid';

/**
 * Fond de page : trois grandes lueurs floues fixes à l'écran, une grille de points (src/lib/dotGrid.ts)
 * et un grain très fin. Les lueurs dérivent au fil du défilement (scrub sur toute la page).
 * Sous « réduire les animations » : lueurs fixes, grille fixe (seule la lueur sous la souris reste, en fondu).
 * Appareil modeste : grille fixe aussi.
 */
export function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);

  const grid = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!grid.current) return;
    return startDotGrid(grid.current, isReducedMotion() || getCapabilities().lowEnd);
  }, []);

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
      <canvas className="backdrop__grid" ref={grid} />
      <span className="backdrop__grain" />
    </div>
  );
}
