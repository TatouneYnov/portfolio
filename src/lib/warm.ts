// Préchauffage de la 3D : pendant l'écran de chargement, on télécharge et on analyse les scènes
// lourdes (clavier, bulles, moteur physique). Une fois le site affiché, on les monte hors écran
// quand le navigateur est au repos. Ainsi rien ne saccade quand on arrive sur ces sections.
import { useEffect, useState } from 'react';
import { canRun3D } from './capabilities';

let preloading: Promise<unknown> | null = null;
let idleReady = false;
const listeners = new Set<() => void>();

const idle = (cb: () => void, timeout = 2000) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout });
  else window.setTimeout(cb, 200);
};

/** Télécharge les modules 3D (appelé pendant l'écran de chargement). */
export function preload3D() {
  if (preloading || !canRun3D()) return;
  preloading = Promise.all([
    import('../three/KeyboardScene'),
    import('../three/BubblesScene'),
    // Initialise le WebAssembly de Rapier (sans effet si déjà fait plus tard)
    import('@dimforge/rapier3d-compat').then((r) => r.init()),
  ]).catch(() => undefined);
}

/** Déclenche le montage anticipé des scènes, une fois le site affiché et le navigateur au repos. */
export function scheduleIdleMount() {
  const start = () =>
    idle(() => {
      idleReady = true;
      listeners.forEach((l) => l());
    }, 2500);
  if (document.documentElement.classList.contains('is-loaded')) start();
  else window.addEventListener('app:loaded', start, { once: true });
}

/** Vrai quand les scènes 3D peuvent être montées (hors écran) sans gêner le défilement. */
export function useIdleMount(order = 0): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // Chaque scène attend son tour (un temps de repos du navigateur par scène)
    const go = () => {
      let n = order;
      const step = () => {
        if (cancelled) return;
        if (n-- <= 0) setReady(true);
        else idle(step, 1500);
      };
      step();
    };
    if (idleReady) {
      go();
      return () => {
        cancelled = true;
      };
    }
    const l = () => go();
    listeners.add(l);
    return () => {
      cancelled = true;
      listeners.delete(l);
    };
  }, []);
  return ready;
}
