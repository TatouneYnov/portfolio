import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** false au rendu serveur et au premier rendu client (hydratation identique), true ensuite. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** Vrai quand l'élément est dans (ou proche de) la fenêtre. */
export function useInView<T extends Element>(ref: RefObject<T>, rootMargin = '0px', once = false): boolean {
  const [inView, setInView] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) {
          done.current = true;
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}

/** Visibilité de l'onglet : les scènes 3D se mettent en pause quand il est caché. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}
