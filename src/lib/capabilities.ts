export type Capabilities = {
  reducedMotion: boolean;
  webgl: boolean;
  lowEnd: boolean;
  finePointer: boolean;
};

let cached: Capabilities | null = null;

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** À appeler côté client uniquement (après le montage). */
export function getCapabilities(): Capabilities {
  if (cached) return cached;
  const nav = navigator as Navigator & { deviceMemory?: number };
  cached = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    webgl: hasWebGL(),
    lowEnd: (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4,
    finePointer: window.matchMedia('(pointer: fine)').matches,
  };
  return cached;
}

/** La 3D tourne seulement si WebGL est disponible et que le visiteur n'a pas demandé moins d'animations. */
export function canRun3D(): boolean {
  const c = getCapabilities();
  return c.webgl && !c.reducedMotion;
}

/** Signale qu'une scène a perdu son contexte WebGL : on bascule sur les images fixes. */
export function markWebGLLost() {
  if (cached) cached.webgl = false;
  document.documentElement.classList.remove('has-stage');
  window.dispatchEvent(new CustomEvent('webgl:lost'));
}
