import { useCallback, useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { project, rubberband, springTo, velocityTracker, type Spring } from './spring';

type Options = {
  /** 1 : on tire vers le bas pour fermer (fiche) ; -1 : vers le haut (menu). */
  direction: 1 | -1;
  enabled: boolean;
  onDismiss: () => void;
};

/**
 * « Tirer pour fermer », façon feuille iOS : la surface suit le doigt 1:1, résiste à l'élastique dans
 * l'autre sens, puis selon l'endroit où le geste l'emmènerait (projection de la vitesse) elle part avec
 * la vitesse du lâcher ou revient en place avec un ressort. On peut la rattraper en plein mouvement.
 * Renvoie les gestionnaires à poser sur la zone de prise (qui doit avoir `touch-action: none`).
 */
export function useDragToDismiss(ref: RefObject<HTMLElement>, { direction, enabled, onDismiss }: Options) {
  const drag = useRef<{ id: number; y0: number; base: number; active: boolean } | null>(null);
  const offset = useRef(0); // décalage vers la fermeture, en px (positif = vers la fermeture)
  const spring = useRef<Spring | null>(null);
  const tracker = useRef(velocityTracker());

  const apply = useCallback(
    (y: number) => {
      offset.current = y;
      const el = ref.current;
      if (!el) return;
      el.style.transition = 'none';
      el.style.transform = `translate3d(0, ${y * direction}px, 0)`;
    },
    [ref, direction],
  );
  const release = useCallback(() => {
    offset.current = 0;
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    // Le style « transition: none » est retiré à l'image suivante, une fois la classe CSS en place
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.transition = '';
    });
  }, [ref]);

  useEffect(() => () => spring.current?.stop(), []);
  useEffect(() => {
    if (!enabled) {
      spring.current?.stop();
      drag.current = null;
    }
  }, [enabled]);

  const onPointerDown = (e: PointerEvent) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    spring.current?.stop(); // rattrapée en plein mouvement : on repart de la position affichée
    drag.current = { id: e.pointerId, y0: e.clientY, base: offset.current, active: false };
    tracker.current.reset();
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = (e.clientY - d.y0) * direction;
    if (!d.active) {
      if (Math.abs(dy) < 6) return; // petite marge : un simple tap reste un tap
      d.active = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const size = ref.current?.offsetHeight ?? window.innerHeight;
    const y = d.base + dy;
    apply(y >= 0 ? y : -rubberband(-y, size)); // dans le mauvais sens : résistance progressive
    tracker.current.add(e.clientY * direction);
  };

  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.active) return;
    const size = ref.current?.offsetHeight ?? window.innerHeight;
    const v = tracker.current.get();
    const landing = offset.current + project(v);
    spring.current?.stop();
    if (landing > size / 2) {
      spring.current = springTo(offset.current, size, {
        velocity: v,
        onUpdate: apply,
        onRest: () => {
          onDismiss();
          release();
        },
      });
    } else {
      spring.current = springTo(offset.current, 0, { velocity: v, damping: 1, response: 0.3, onUpdate: apply, onRest: release });
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
