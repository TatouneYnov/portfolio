import { gsap, isReducedMotion } from './motion';

/** Révélation mot par mot d'un titre découpé par <SplitHeading>, au défilement. */
export function revealWords(el: Element | null, opts: { start?: string; delay?: number; stagger?: number } = {}) {
  if (!el || isReducedMotion()) return;
  const words = el.querySelectorAll('.split__wi');
  gsap.from(words, {
    yPercent: 110,
    duration: 0.9,
    stagger: opts.stagger ?? 0.06,
    delay: opts.delay ?? 0,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: opts.start ?? 'top 85%', once: true },
  });
}

/** Apparition simple (fondu + léger déplacement) d'éléments au défilement. */
export function revealFade(targets: gsap.TweenTarget, trigger: Element | null, opts: { start?: string; y?: number; stagger?: number; delay?: number } = {}) {
  if (!trigger || isReducedMotion()) return;
  gsap.from(targets, {
    opacity: 0,
    y: opts.y ?? 24,
    duration: 0.8,
    stagger: opts.stagger ?? 0.08,
    delay: opts.delay ?? 0,
    ease: 'power3.out',
    scrollTrigger: { trigger, start: opts.start ?? 'top 80%', once: true },
  });
}
