// Curseurs du site : flèche, main (lien), main ouverte (attraper), poing (glisser), en clair et en sombre.
// Écrit les sources SVG dans tools/cursors/ et les PNG 1× / 2× dans public/cursors/ (affichés par le système,
// donc sans aucun retard). À relancer seulement si on change une forme ou une couleur :
//   node scripts/gen-cursors.mjs
// Demande Playwright et son Chromium (non inclus dans les dépendances du projet).
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'tools/cursors');
const outDir = join(root, 'public/cursors');

// Couleurs : remplissage = --text de chaque thème (encre en clair, blanc cassé en sombre), liseré opposé.
const THEMES = {
  light: { fill: '#17121F', edge: '#FFFFFF' },
  dark: { fill: '#F4F1FA', edge: '#17121F' },
};

// Mains réduites à 86 % pour rester à la taille de la flèche.
const HAND = 'translate(2.4 1.6) scale(0.86)';
// Paume commune aux mains, pouce compris (le pouce part en biais vers la gauche).
const palm = (x, w, thumbX) =>
  `<path d="M${x} 15 H${x + w} V22 a6 6 0 0 1 -6 6 H${x + 4.8} a5 5 0 0 1 -4 -2 L${thumbX} 19.4 a2.3 2.3 0 0 1 3.3 -3.2 L${x} 18 Z"/>`;
const finger = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`;

const SHAPES = {
  arrow: {
    shape: '<path d="M6 3.5 L6 21.6 L10.6 17.4 L13.7 24.6 L16.7 23.3 L13.7 16.2 L19.9 16.2 Z"/>',
    hotspot: [6, 4],
  },
  pointer: {
    transform: HAND,
    shape:
      finger(11.2, 2.5, 4.2, 15) + finger(15.4, 10.2, 4.2, 9) + finger(19.6, 11, 4, 8) + finger(23.6, 12.4, 3.7, 7) + palm(11.2, 16.1, 6),
    lines: '<path d="M15.4 13.6v3M19.6 14.2v2.6M23.6 15.4v2"/>',
    hotspot: [14, 4], // bout de l'index
  },
  grab: {
    transform: HAND,
    shape:
      finger(9.6, 6, 4, 13) + finger(13.6, 3.6, 4, 15) + finger(17.6, 4.4, 4, 14) + finger(21.6, 7.4, 3.7, 11) + palm(9.6, 15.7, 4.4),
    lines: '<path d="M13.6 12.4v3.4M17.6 12.4v3.4M21.6 12.8v3"/>',
    hotspot: [16, 16],
  },
  grabbing: {
    transform: HAND,
    shape:
      finger(9.6, 10.4, 4, 8) + finger(13.6, 9.4, 4, 9) + finger(17.6, 9.8, 4, 8.5) + finger(21.6, 11.2, 3.7, 7) + palm(9.6, 15.7, 6.2),
    lines: '<path d="M13.6 12v2.8M17.6 11.6v3.2M21.6 12.6v2.4"/>',
    hotspot: [16, 16],
  },
};

// Chaque forme sert de masque deux fois : un contour épais (liseré) puis le remplissage. Le liseré suit ainsi
// l'union des doigts et de la paume, sans couture à l'intérieur.
const svg = ({ shape, lines = '', transform = '' }, { fill, edge }) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1" stdDeviation="0.9" flood-color="#000" flood-opacity="0.32"/>
    </filter>
    <g id="f" transform="${transform}">${shape}</g>
    <mask id="edge"><use href="#f" fill="#fff" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/></mask>
    <mask id="fill"><use href="#f" fill="#fff" stroke="#fff" stroke-width="0.5" stroke-linejoin="round"/></mask>
  </defs>
  <g filter="url(#s)">
    <rect width="32" height="32" fill="${edge}" mask="url(#edge)"/>
    <rect width="32" height="32" fill="${fill}" mask="url(#fill)"/>
  </g>
  <g transform="${transform}" fill="none" stroke="${edge}" stroke-width="1.1" stroke-linecap="round">${lines}</g>
</svg>
`;

const { chromium } = createRequire(import.meta.url)('playwright');
mkdirSync(srcDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const scale of [1, 2]) {
  const page = await browser.newPage({ viewport: { width: 32, height: 32 }, deviceScaleFactor: scale });
  for (const [name, def] of Object.entries(SHAPES)) {
    for (const [theme, colors] of Object.entries(THEMES)) {
      const file = `${name}-${theme}`;
      const markup = svg(def, colors);
      if (scale === 1) writeFileSync(join(srcDir, `${file}.svg`), markup);
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup}`);
      await page.screenshot({ path: join(outDir, `${file}${scale === 2 ? '@2x' : ''}.png`), omitBackground: true });
    }
  }
  await page.close();
}
await browser.close();
console.log('Curseurs écrits dans public/cursors/ (points chauds :', Object.entries(SHAPES).map(([n, d]) => `${n} ${d.hotspot.join(' ')}`).join(', '), ')');
