// Échoue si le HTML pré-rendu contient un placeholder visible (TODO, lorem, lien vide, null…)
// ou des données interdites (numéro de téléphone).
import { readFileSync } from 'node:fs';

const file = new URL('../dist/index.html', import.meta.url);
let html;
try {
  html = readFileSync(file, 'utf8');
} catch {
  console.error('dist/index.html introuvable : lance d’abord npm run build');
  process.exit(1);
}

const body = html.slice(html.indexOf('<body'));
const text = body
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ');

const problems = [];
const check = (re, label, source = text) => {
  const m = source.match(re);
  if (m) problems.push(`${label} : « ${m[0].trim().slice(0, 60)} »`);
};
check(/\bTODO\b/i, 'Placeholder TODO');
check(/lorem ipsum/i, 'Faux texte');
check(/>\s*(undefined|null|NaN|\[object Object\])\s*</, 'Valeur technique affichée', body);
check(/href="#"/, 'Lien vide', body);
check(/(?:\+33|\b0)[1-9](?:[ .-]?\d{2}){4}\b/, 'Numéro de téléphone');
check(/École 42|Ecole 42/i, 'Mention interdite');

if (problems.length) {
  console.error('✗ Contenu à corriger :\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log('✓ Aucun placeholder visible, aucun numéro de téléphone');
