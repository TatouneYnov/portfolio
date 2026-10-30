// Système de mouvement : GSAP + ScrollTrigger, et Lenis comme unique moteur de défilement doux.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

let lenis: Lenis | null = null;
let started = false;
let tickerFn: ((time: number) => void) | null = null;

// Enregistré dès le chargement du module : les effets des sections s'exécutent avant celui de l'App.
const isClient = typeof window !== 'undefined';
if (isClient) {
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  // Mêmes courbes que les tokens --ease-out / --ease-in-out / --ease-drawer de main.css (plus franches que power3)
  CustomEase.create('out', '0.23, 1, 0.32, 1');
  CustomEase.create('inOut', '0.77, 0, 0.175, 1');
  CustomEase.create('drawer', '0.32, 0.72, 0, 1');
  gsap.defaults({ ease: 'out', duration: 0.7 });
}
let reduced = isClient ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

export { gsap, ScrollTrigger };

export function isReducedMotion() {
  return reduced;
}

export function getLenis() {
  return lenis;
}

/** Initialise GSAP, ScrollTrigger et Lenis (une seule fois, côté client). */
export function startMotion(): () => void {
  if (started) return () => {};
  started = true;
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    tickerFn = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);
  }

  // Les mesures changent quand les polices arrivent : on recalcule.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', refreshScroll);

  return () => {
    window.removeEventListener('load', refreshScroll);
    if (tickerFn) gsap.ticker.remove(tickerFn);
    lenis?.destroy();
    lenis = null;
    started = false;
  };
}

export function refreshScroll() {
  ScrollTrigger.refresh();
}

/** Défile vers une ancre (#id) en tenant compte de la barre de navigation, puis y place le focus. */
export function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, '');
  const target = id === 'top' ? document.body : document.getElementById(id);
  if (!target) return;
  const focusTarget = () => {
    if (target === document.body) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  if (lenis) {
    lenis.scrollTo(id === 'top' ? 0 : target, { offset: id === 'top' ? 0 : -72, duration: 1.2, onComplete: focusTarget });
  } else {
    if (id === 'top') window.scrollTo({ top: 0 });
    else target.scrollIntoView({ block: 'start' });
    focusTarget();
  }
  if (history.replaceState) history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
}

/** Intercepte les liens internes (#ancre) pour les faire passer par Lenis. */
export function bindAnchorLinks(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    if (!link) return;
    const hash = link.getAttribute('href') || '';
    if (hash.length < 2) return;
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: hash }));
    scrollToHash(hash);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
