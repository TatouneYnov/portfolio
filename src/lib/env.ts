declare const __SITE_URL__: string;

export const SITE_URL: string = typeof __SITE_URL__ === 'string' ? __SITE_URL__ : 'https://ethanbacquier.fr';
export const BASE: string = import.meta.env.BASE_URL || '/';
export const isBrowser = typeof window !== 'undefined';

/** Chemin public (dossier public/) qui respecte la base Vite. */
export const asset = (path: string) => `${BASE}${path.replace(/^\//, '')}`;

export const FORM_KEY: string = (import.meta.env.VITE_FORM_KEY as string | undefined)?.trim() ?? '';
export const FORM_ENDPOINT: string =
  (import.meta.env.VITE_FORM_ENDPOINT as string | undefined)?.trim() || 'https://api.web3forms.com/submit';
