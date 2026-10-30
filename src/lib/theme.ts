import { useEffect, useState } from 'react';

/**
 * Thème du site : clair par défaut pour tout le monde, sombre si le visiteur l'a choisi (bouton de l'en-tête).
 * Le choix est gardé dans localStorage (une seule clé, « theme » = « dark ») et relu avant le premier affichage
 * par public/theme.js, aussi chargé par les pages annexes. Rien n'est envoyé nulle part.
 * Le thème actif est l'attribut data-theme="dark" sur <html> (absent = clair).
 */

export type Theme = 'light' | 'dark';

const KEY = 'theme';
const THEME_COLOR: Record<Theme, string> = { light: '#ECE8F6', dark: '#07050C' };
// Teinte de l'en-tête en verre une fois qu'on a défilé (--glass-strong posé sur --bg), pour la barre d'état
const THEME_COLOR_SCROLLED: Record<Theme, string> = { light: '#FAF9FD', dark: '#0D0915' };
let scrolled = false;

function applyThemeColor(theme: Theme) {
  const color = (scrolled ? THEME_COLOR_SCROLLED : THEME_COLOR)[theme];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

/**
 * Barre d'état du téléphone (sous l'heure) : même teinte que l'en-tête en verre dès qu'on a défilé.
 * Safari 26 prolonge le fond de l'en-tête fixe ; les versions plus anciennes et Chrome Android lisent theme-color.
 */
export function setHeaderScrolled(value: boolean) {
  scrolled = value;
  applyThemeColor(getTheme());
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  applyThemeColor(theme);
  try {
    if (theme === 'dark') localStorage.setItem(KEY, 'dark');
    else localStorage.removeItem(KEY);
  } catch {
    // Stockage bloqué (navigation privée stricte) : le thème vaut pour cette page seulement
  }
}

/** Appelle `cb` à chaque changement de thème. Renvoie la fonction de désabonnement. */
export function onThemeChange(cb: (theme: Theme) => void): () => void {
  const mo = new MutationObserver(() => cb(getTheme()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

/** Thème courant, côté client uniquement (vaut « light » au premier rendu, comme le HTML pré-rendu). */
export function useTheme(): Theme {
  const [theme, set] = useState<Theme>('light');
  useEffect(() => {
    set(getTheme());
    return onThemeChange(set);
  }, []);
  return theme;
}
