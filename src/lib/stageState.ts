// État partagé entre les déclencheurs de défilement (GSAP) et la scène de l'avatar (useFrame).
// GSAP écrit dans ces nombres, la boucle 3D les lit : aucun des deux ne touche la même propriété DOM.
export const stageState = {
  /** 0 → 1 : animation d'entrée après le chargement */
  intro: 0,
  /** 0 → 1 : passage du hero à « À propos » */
  about: 0,
  /** 0 → 1 : la section « Ce que je fais » arrive (l'avatar glisse vers son emplacement) */
  travel: 0,
  /** 0 → 1 : progression dans « Ce que je fais » (bureau qui monte, perso qui s'assoit) */
  desk: 0,
};

if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
  (window as Window & { __stage?: typeof stageState }).__stage = stageState;
}

export type SlotName = 'hero' | 'about' | 'desk';
