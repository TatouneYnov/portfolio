# Portfolio · Ethan Bacquier

Portfolio d'Ethan Bacquier, étudiant en B2 cybersécurité à Ynov Lyon, à la recherche d'un stage de 170 h.

Le site est construit avec Vite, React 18, TypeScript et Three.js (React Three Fiber). L'animation passe par GSAP + ScrollTrigger, le défilement doux par Lenis. Tout est statique : il se déploie sur GitHub Pages, Cloudflare Pages ou Netlify.

Il reste lisible sans JavaScript (pré-rendu au build) et sans WebGL, ainsi qu'avec le réglage « réduire les animations » : des images fixes remplacent alors la 3D.

---

## Lancer le site en local

Prérequis : [Node.js 20 ou plus](https://nodejs.org/). Dans PowerShell, une commande par ligne :

```powershell
npm install
```

```powershell
npm run dev
```

Le site s'ouvre sur http://localhost:5173.

Pour construire la version finale (dossier `dist/`) :

```powershell
npm run build
```

```powershell
npm run preview
```

`npm run build` enchaîne tout seul :

1. génère les logos des touches du clavier ;
2. construit le site ;
3. pré-rend la page ;
4. crée `robots.txt`, `sitemap.xml`, `llms.txt`, `.well-known/security.txt` (expire dans un an) et `_headers` ;
5. vérifie qu'aucun « TODO », aucun texte factice et aucun numéro de téléphone n'apparaît dans la page.

Si le contrôle échoue, le build s'arrête et indique le texte en cause.

---

## Modifier le contenu (sans toucher au code)

Tout le texte vit dans `src/data/`. Règle commune : une valeur à `null` est masquée sur le site, et `"draft": true` cache l'entrée. N'écris jamais « TODO » dans un champ : le build refuserait de passer.

| Fichier | Ce qu'il contient |
|---|---|
| `profile.json` | nom, statut, e-mail, Discord, liens, texte « À propos », bloc « Hors écran », cartes « Ce que je fais », CV |
| `skills.json` | les 26 touches du clavier : nom, catégorie, logo, lettre du raccourci, phrase |
| `projects.json` | les bulles projets |
| `timeline.json` | le parcours |
| `training.json` | stats TryHackMe et Hack The Box, certification |
| `availability.json` | le calendrier de stage |

### Exemples courants

- **Ajouter tes vacances Ynov** : dans `availability.json`, ajoute une ligne dans `fullWeeks`, par exemple `{ "from": "2027-04-12", "to": "2027-04-16" }`.
- **Mettre à jour tes stats** : modifie `training.json`, puis change `updatedAt` (la date s'affiche sur le site). Mets `null` pour masquer une stat.
- **Ajouter une compétence** : ajoute une entrée dans `skills.json` avec une lettre de raccourci encore libre. Pour le logo, mets un identifiant [Simple Icons](https://simpleicons.org/) (`"simple-icons:nom"`), ou `null` pour afficher le monogramme (`mono`). Le build signale un logo introuvable.
- **Changer une couleur de catégorie** : mets-la à jour dans `skills.json` (clavier 3D) **et** dans `src/styles/main.css`, section « Couleurs des catégories » (liste HTML).

### Ajouter un projet

1. Ajoute un objet dans `projects.json` en copiant un projet existant.
2. `bubbleLabel` est le texte affiché sur la bulle : `\n` coupe la ligne.
3. `size` règle la taille de la bulle (1 = normale ; Hera est à 1.6).
4. Capture d'écran (facultative) : dépose une image 16:10 dans `public/assets/projects/`, puis indique `"image": "assets/projects/mon-projet.webp"`.
5. Passe `draft` à `false` pour l'afficher.

### Ajouter les fichiers manquants

| Quoi | Où le mettre | Et ensuite |
|---|---|---|
| CV | `public/cv/ethan-bacquier-cv.pdf` | dans `profile.json`, `"cv": { "available": true, … }` |
| Photo de volley (4:5) | `public/assets/about/volley.webp` | dans `profile.json`, `"offscreen": { "photo": "assets/about/volley.webp", … }` |
| Capture d'un projet | `public/assets/projects/…` | champ `image` du projet |

---

## Formulaire de contact

Le formulaire utilise [Web3Forms](https://web3forms.com) (gratuit) :

1. Crée une clé avec ton adresse e-mail sur web3forms.com.
2. Copie `.env.example` en `.env`, puis renseigne `VITE_FORM_KEY=ta-clé`.
3. Pour le déploiement GitHub, ajoute la variable `FORM_KEY` (voir plus bas).

Sans clé, le site affiche à la place un bloc « Écris-moi directement » avec ton adresse e-mail. Rien n'est cassé.

La clé Web3Forms est publique par conception : elle permet seulement d'envoyer des messages vers ta boîte.

---

## Déployer

L'adresse du site se règle par deux variables. Par défaut, le site vise `https://ethanbacquier.fr` à la racine.

| Variable | Rôle | Exemple |
|---|---|---|
| `VITE_SITE_URL` | URL publique (canonical, Open Graph, sitemap) | `https://ethanbacquier.fr` |
| `VITE_BASE` | chemin de base | `/` (domaine perso) ou `/portfolio/` (`tatouneynov.github.io/portfolio`) |

### Option 1 : Cloudflare Pages (recommandé avec un domaine perso)

Cloudflare Pages applique le fichier `_headers` généré au build. Tu obtiens donc les vrais en-têtes de sécurité : CSP complète avec `frame-ancestors`, HSTS, `X-Content-Type-Options`, `Permissions-Policy`. Les recruteurs cyber regardent ce genre de détail.

1. Sur dash.cloudflare.com : Workers & Pages → Create → Pages → connecte le repo GitHub.
2. Commande de build : `npm run build`. Dossier de sortie : `dist`.
3. Variables d'environnement : `VITE_SITE_URL`, `VITE_FORM_KEY`.
4. Custom domains → ajoute `ethanbacquier.fr`.

Netlify fonctionne pareil et lit le même `_headers`.

### Option 2 : GitHub Pages

Le workflow `.github/workflows/deploy.yml` construit et publie le site à chaque push sur `main`.

1. Sur GitHub : Settings → Pages → Source : **GitHub Actions**.
2. Settings → Secrets and variables → Actions → onglet **Variables** : ajoute `SITE_URL`, `BASE` et `FORM_KEY`.
3. Avec un domaine perso, renseigne-le dans Settings → Pages. Le build crée aussi le fichier `CNAME`.

Limite : GitHub Pages n'envoie pas d'en-têtes HTTP personnalisés. La CSP est alors en `<meta>`, mais `frame-ancestors`, HSTS et `X-Frame-Options` manquent. C'est pour cette raison que Cloudflare Pages est recommandé une fois le domaine acheté.

---

## Sécurité

- CSP stricte : aucun script inline, aucun CDN tiers, polices et icônes hébergées sur le site. `'wasm-unsafe-eval'` sert uniquement au moteur physique (Rapier, en WebAssembly).
- Aucun cookie, aucun traceur. Une page `confidentialite.html` explique le traitement des données du formulaire.
- Liens externes en `rel="noopener noreferrer"`.
- `security.txt` régénéré à chaque build, avec une date d'expiration à un an.
- `npm audit` est lancé dans le workflow de déploiement (échec sur les vulnérabilités hautes).

---

## Structure

```
src/
  data/          contenu modifiable (JSON)
  sections/      une section de la page par fichier
  components/    en-tête, chargement, curseur, titres découpés…
  three/         avatar (avatar.js), scènes 3D : avatar, clavier, bulles
  lib/           mouvement (GSAP + Lenis), capacités de l'appareil, utilitaires
  styles/        feuille de style unique (tokens en tête de fichier)
scripts/         build, pré-rendu, CSP, contrôle du contenu, logos des touches
tools/           pages de rendu des images fixes et de l'image Open Graph
public/          fichiers servis tels quels (images, favicon, pages annexes)
docs/AVATAR.md   comment l'avatar est construit et comment le modifier
```

Pour les crédits (polices, icônes, bibliothèques), voir [CREDITS.md](CREDITS.md).
