// Génère src/generated/keycap-icons.json : le SVG (en blanc) de chaque logo d'outil
// listé dans src/data/skills.json. Un id d'icône introuvable est signalé et la touche
// affichera son monogramme : on n'invente jamais de logo.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from '@iconify/utils';

const require = createRequire(import.meta.url);
const root = new URL('..', import.meta.url);
const skills = JSON.parse(readFileSync(new URL('src/data/skills.json', root), 'utf8')).skills;
const sets = {};
const out = {};
let missing = 0;

for (const skill of skills) {
  if (!skill.icon) continue;
  const [prefix, name] = skill.icon.split(':');
  try {
    sets[prefix] ??= require(`@iconify-json/${prefix}/icons.json`);
  } catch {
    console.warn(`[icons] jeu d'icônes inconnu : ${prefix} (${skill.label})`);
    missing++;
    continue;
  }
  const data = getIconData(sets[prefix], name);
  if (!data) {
    console.warn(`[icons] icône introuvable : ${skill.icon} (${skill.label}) → monogramme`);
    missing++;
    continue;
  }
  const rendered = iconToSVG(data, { height: 256 });
  // Tout en blanc : currentColor et couleurs explicites
  const body = replaceIDs(rendered.body)
    .replace(/fill="(?!none)[^"]*"/g, 'fill="#ffffff"')
    .replace(/stroke="(?!none)[^"]*"/g, 'stroke="#ffffff"');
  out[skill.id] = iconToHTML(body, { ...rendered.attributes, fill: '#ffffff' });
}

mkdirSync(new URL('src/generated/', root), { recursive: true });
writeFileSync(new URL('src/generated/keycap-icons.json', root), JSON.stringify(out, null, 0) + '\n');
console.log(`[icons] ${Object.keys(out).length} logos générés, ${missing} manquant(s)`);
