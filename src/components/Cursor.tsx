import { useEffect, useRef } from 'react';
import { gsap } from '../lib/motion';

const INTERACTIVE = 'a, button, summary, label, [role="button"], [data-cursor="hover"]';

/** Curseur personnalisé (pointeur précis uniquement). Le curseur natif reste sur les champs de saisie. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dot.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.documentElement.classList.add('has-cursor');
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
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
      const grab = t?.closest?.('[data-cursor="grab"], [data-cursor="grabbing"], [data-cursor="pointer"]');
      el.dataset.mode = grab ? (grab.getAttribute('data-cursor') as string) : t?.closest?.('input, textarea, select') ? 'native' : t?.closest?.(INTERACTIVE) ? 'hover' : 'default';
    };
    const onLeave = () => {
      shown = false;
      el.classList.remove('is-visible');
    };
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
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
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div ref={dot} className="cursor" aria-hidden="true">
      <span className="cursor__dot" />
    </div>
  );
}
