import { gsap, isReducedMotion } from './motion';

/** « Réduire les animations » : pas de mouvement, seulement un fondu court (au lieu de tout figer). */
function fadeIn(targets: gsap.TweenTarget, trigger: Element, start: string) {
  gsap.from(targets, { opacity: 0, duration: 0.3, ease: 'out', scrollTrigger: { trigger, start, once: true } });
}

/** Révélation mot par mot d'un titre découpé par <SplitHeading>, au défilement. */
export function revealWords(el: Element | null, opts: { start?: string; delay?: number; stagger?: number } = {}) {
  if (!el) return;
  const start = opts.start ?? 'top 85%';
  if (isReducedMotion()) return fadeIn(el, el, start);
  const words = el.querySelectorAll('.split__wi');
  gsap.from(words, {
    yPercent: 110,
    duration: 0.8,
    stagger: opts.stagger ?? 0.06,
    delay: opts.delay ?? 0,
    ease: 'out',
    scrollTrigger: { trigger: el, start, once: true },
  });
}

/** Apparition simple (fondu + léger déplacement) d'éléments au défilement. */
export function revealFade(targets: gsap.TweenTarget, trigger: Element | null, opts: { start?: string; y?: number; stagger?: number; delay?: number } = {}) {
  if (!trigger) return;
  const start = opts.start ?? 'top 80%';
  if (isReducedMotion()) return fadeIn(targets, trigger, start);
  gsap.from(targets, {
    opacity: 0,
    y: opts.y ?? 16,
    duration: 0.6,
    stagger: Math.min(opts.stagger ?? 0.06, 0.08), // 30–80 ms entre éléments, jamais plus
    delay: opts.delay ?? 0,
    ease: 'out',
    scrollTrigger: { trigger, start, once: true },
  });
}
