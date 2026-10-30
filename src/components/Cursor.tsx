import { useEffect, useRef } from 'react';
import { gsap } from '../lib/motion';

const INTERACTIVE = 'a, button, summary, label, select, [role="button"], [data-cursor]';
/** Temps de rattrapage du halo (s) : il rejoint la souris en ~3 × TAU, soit ~0,15 s. */
const TAU = 0.05;

/**
 * Halo lumineux sous le curseur (pointeur précis uniquement). Le vrai curseur du système reste
 * affiché, sans aucun retard ; le halo vit sous le contenu (au-dessus du fond seulement).
 */
export function Cursor() {
  const halo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = halo.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let shown = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!shown) {
        pos.x = target.x;
        pos.y = target.y;
        shown = true;
        el.classList.add('is-visible');
      }
      const t = e.target as Element | null;
      el.classList.toggle('is-hover', !!t?.closest?.(INTERACTIVE));
    };
    const onLeave = () => {
      shown = false;
      el.classList.remove('is-visible');
    };
    const tick = (_time: number, deltaMs: number) => {
      if (!shown) return;
      const k = reduced.matches ? 1 : 1 - Math.exp(-deltaMs / 1000 / TAU);
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div ref={halo} className="cursor" aria-hidden="true">
      <span className="cursor__halo" />
    </div>
  );
}
