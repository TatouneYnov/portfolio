// Build complet (une seule commande, compatible PowerShell) :
// 1. logos des touches  2. build client  3. build SSR  4. pré-rendu dans index.html
// 5. fichiers générés (robots, sitemap, security.txt, _headers, CNAME)  6. contrôle du contenu
import { build, loadEnv } from 'vite';
import { readFileSync, writeFileSync, rmSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { buildCsp } from './csp.mjs';
import { frTypo } from './typo.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
const ssrOut = path.join(root, '.ssr');
const env = loadEnv('production', root, 'VITE_');
const siteUrl = (env.VITE_SITE_URL || 'https://ethanbacquier.github.io').replace(/\/$/, '');
const base = env.VITE_BASE || '/';

const step = (msg) => console.log(`\n▸ ${msg}`);

step('Logos des touches');
execFileSync(process.execPath, [path.join(root, 'scripts/gen-keycap-icons.mjs')], { stdio: 'inherit' });

step('Build client');
await build({ root, mode: 'production', logLevel: 'warn' });

step('Build SSR (pré-rendu)');
await build({
  root,
  mode: 'production',
  logLevel: 'warn',
  build: { ssr: 'src/entry-server.tsx', outDir: ssrOut, emptyOutDir: true, copyPublicDir: false },
});

step('Pré-rendu de la page');
const { render } = await import(pathToFileURL(path.join(ssrOut, 'entry-server.js')).href);
const appHtml = render();
let html = readFileSync(path.join(dist, 'index.html'), 'utf8');
html = html.replace('<!--app-->', appHtml);

// Plus de police à précharger : le site utilise les polices du système
html = html.replace('<!--preload-->', '');
writeFileSync(path.join(dist, 'index.html'), html);

step('Fichiers générés');
const today = new Date();
const expires = new Date(today.getTime() + 365 * 24 * 3600 * 1000);
mkdirSync(path.join(dist, '.well-known'), { recursive: true });
writeFileSync(
  path.join(dist, '.well-known/security.txt'),
  [
    'Contact: mailto:ethan.bacquier@gmail.com',
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    'Preferred-Languages: fr, en',
    `Canonical: ${siteUrl}/.well-known/security.txt`,
    '',
  ].join('\n'),
);
writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}/</loc>\n    <lastmod>${today.toISOString().slice(0, 10)}</lastmod>\n  </url>\n</urlset>\n`,
);
// llms.txt : résumé lisible par les assistants IA, généré depuis les données du site
const profile = JSON.parse(readFileSync(path.join(root, 'src/data/profile.json'), 'utf8'));
const projectList = JSON.parse(readFileSync(path.join(root, 'src/data/projects.json'), 'utf8')).projects.filter((p) => !p.draft);
const skills = JSON.parse(readFileSync(path.join(root, 'src/data/skills.json'), 'utf8')).skills.map((s) => s.label);
writeFileSync(
  path.join(dist, 'llms.txt'),
  [
    `# ${profile.name}`,
    '',
    `> ${profile.status}. Attiré par le DFIR et la CTI, ouvert à l'infra. ${profile.badge}.`,
    '',
    '## Liens',
    `- [Portfolio](${siteUrl}/)`,
    `- [GitHub](${profile.links.github})`,
    `- [LinkedIn](${profile.links.linkedin})`,
    `- [TryHackMe](${profile.links.tryhackme})`,
    `- [Hack The Box](${profile.links.hackthebox})`,
    `- Contact : ${profile.email}`,
    '',
    '## Projets',
    ...projectList.map((p) => `- ${p.name}${p.description ? ` : ${p.description}` : ''}`),
    '',
    '## Outils',
    skills.join(', '),
    '',
  ].join('\n'),
);

const headers = [
  '/*',
  `  Content-Security-Policy: ${buildCsp()}`,
  '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  '  Cross-Origin-Opener-Policy: same-origin',
  '  X-Frame-Options: DENY',
  '',
  `${base}assets/*`,
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
];
writeFileSync(path.join(dist, '_headers'), headers.join('\n'));
const host = new URL(siteUrl).hostname;
if (!host.endsWith('github.io')) writeFileSync(path.join(dist, 'CNAME'), `${host}\n`);
// Pages annexes (copiées telles quelles depuis public/) : même typographie française que le site, texte seulement
for (const page of readdirSync(dist).filter((f) => f.endsWith('.html') && f !== 'index.html')) {
  const file = path.join(dist, page);
  const src = readFileSync(file, 'utf8');
  const out = src.replace(/(<(script|style|title)\b[^>]*>[\s\S]*?<\/\2>)|>([^<]+)(?=<)/g, (m, raw, _tag, text) =>
    raw ? raw : `>${frTypo(text)}`,
  );
  writeFileSync(file, out);
}
rmSync(ssrOut, { recursive: true, force: true });

step('Contrôle du contenu');
execFileSync(process.execPath, [path.join(root, 'scripts/check-content.mjs')], { stdio: 'inherit' });
console.log(`\n✓ Build prêt dans dist/ (site : ${siteUrl}, base : ${base})`);
if (!existsSync(path.join(dist, 'assets/avatar/avatar-poster.webp'))) console.warn('! Image fixe de l’avatar absente (public/assets/avatar/avatar-poster.webp)');
