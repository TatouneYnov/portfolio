# Portfolio · Ethan Bacquier

Portfolio d'Ethan Bacquier, étudiant en B2 cybersécurité à Ynov Lyon, à la recherche d'un stage de 170 h.

Le site est construit avec Vite, React 18, TypeScript et Three.js (React Three Fiber). L'animation passe par GSAP + ScrollTrigger, le défilement doux par Lenis. Tout est statique : il est publié sur GitHub Pages (https://ethanbacquier.github.io) et peut aussi se déployer sur Cloudflare Pages ou Netlify.

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
| `skills.json` | les 21 touches du clavier (si tu en ajoutes une, ajoute aussi une place dans `ROWS` de `KeyboardScene.tsx`) : nom, catégorie, logo, lettre du raccourci, phrase, où tu t'en es servi (`usedIn`) |
| `projects.json` | les bulles projets |
| `timeline.json` | le parcours |
| `training.json` | stats TryHackMe et Hack The Box, certification |
| `availability.json` | le calendrier de stage et le bloc alternance |
| `testimonials.json` | les témoignages (section masquée tant que la liste est vide) |

### Exemples courants

- **Ajouter tes vacances Ynov** : dans `availability.json`, ajoute une ligne dans `fullWeeks`, par exemple `{ "from": "2027-04-12", "to": "2027-04-16" }`.
- **Mettre à jour tes stats** : modifie `training.json`, puis change `updatedAt` (la date s'affiche sur le site). Mets `null` pour masquer une stat.
- **Ajouter une compétence** : ajoute une entrée dans `skills.json` avec une lettre de raccourci encore libre. Pour le logo, mets un identifiant [Simple Icons](https://simpleicons.org/) (`"simple-icons:nom"`), ou `null` pour afficher le monogramme (`mono`). Le build signale un logo introuvable.
- **Ajouter un témoignage** : dans `testimonials.json`, ajoute `{ "quote": "…", "name": "Prénom Nom", "role": "…", "org": "…", "consent": true, "draft": false }`. Uniquement avec l'accord de la personne.
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

Le site est publié sur **GitHub Pages**, à l'adresse **https://ethanbacquier.github.io**. Le code vit dans le repo `ethanbacquier/ethanbacquier.github.io`, qui appartient à l'organisation GitHub gratuite `ethanbacquier`. Le workflow `.github/workflows/deploy.yml` construit et publie le site à chaque push sur `main`.

L'ancien portfolio reste dans `TatouneYnov/portfolio`, sans changement.

### Première mise en ligne (une seule fois)

1. Sur GitHub, clique sur ton avatar, puis **Your organizations → New organization** et choisis le plan **Free**. Nom de l'organisation : `ethanbacquier`.
2. Dans l'organisation, crée un repo **public** nommé exactement `ethanbacquier.github.io`, sans README ni licence (il doit être vide).
3. Dans ce repo : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
4. Facultatif : **Settings → Secrets and variables → Actions → onglet Variables**, ajoute `FORM_KEY` avec ta clé Web3Forms. Sans elle, le formulaire est remplacé par un lien e-mail.
5. Pousse le code depuis ton dossier du projet, dans PowerShell, une commande par ligne :

```powershell
git checkout v2
```

```powershell
git pull origin v2
```

```powershell
git remote add site https://github.com/ethanbacquier/ethanbacquier.github.io.git
```

```powershell
git push site v2:main
```

6. Dans l'onglet **Actions** du nouveau repo, attends que « Déployer sur GitHub Pages » passe au vert (2 à 3 minutes). Le site est alors en ligne.

Ensuite, pour publier une modification :

```powershell
git push site v2:main
```

### Variables (facultatives)

| Variable GitHub | Rôle | Par défaut |
|---|---|---|
| `SITE_URL` | URL publique (canonical, Open Graph, sitemap, `security.txt`) | `https://ethanbacquier.github.io` |
| `BASE` | chemin de base | `/` |
| `FORM_KEY` | clé Web3Forms | vide (lien e-mail) |

Pour passer plus tard à un domaine perso (par ex. `ethanbacquier.fr`) : saisis-le dans **Settings → Pages → Custom domain**, puis mets `SITE_URL` à `https://ethanbacquier.fr`.

### Limites de GitHub Pages

GitHub Pages n'envoie pas d'en-têtes HTTP personnalisés : le fichier `_headers` généré au build y est ignoré. La CSP est donc appliquée en `<meta>` dans la page, mais `frame-ancestors`, `X-Frame-Options` et HSTS personnalisé ne s'appliquent pas. GitHub force tout de même le HTTPS (case **Enforce HTTPS**). Le site n'annonce rien de ce qui n'est pas réellement en place.

Pour avoir les vrais en-têtes, il suffit de déployer le même dossier `dist` sur Cloudflare Pages ou Netlify : ils lisent `_headers` tels quels.

### Obligations légales

- **Mentions légales** (`public/mentions-legales.html`) : éditeur (publication non professionnelle, donc sans adresse personnelle, comme le permet la LCEN) et hébergeur (GitHub, Inc.). À mettre à jour si tu changes d'hébergeur.
- **Confidentialité** (`public/confidentialite.html`) : formulaire (Web3Forms, Gmail), journaux de GitHub Pages, durée de conservation, droits RGPD.
- **Aucun cookie** : pas de bandeau de consentement à prévoir.

---

## Sécurité

- CSP stricte : aucun script inline, aucun CDN tiers, polices du système (aucune à télécharger) et icônes hébergées sur le site. `'wasm-unsafe-eval'` sert uniquement au moteur physique (Rapier, en WebAssembly).
- Aucun cookie, aucun traceur. `confidentialite.html` explique le traitement des données, `mentions-legales.html` identifie l'éditeur et l'hébergeur.
- Liens externes en `rel="noopener noreferrer"`.
- `security.txt` régénéré à chaque build, avec une date d'expiration à un an.
- `npm audit` est lancé dans le workflow de déploiement (échec sur les vulnérabilités hautes).

---

## Structure

```
src/
  data/          contenu modifiable (JSON)
  sections/      une section de la page par fichier
  components/    en-tête, chargement, titres découpés…
  three/         avatar (avatar.js), scènes 3D : avatar, clavier, bulles
  lib/           mouvement (GSAP + Lenis), capacités de l'appareil, utilitaires
  styles/        feuille de style unique (tokens en tête de fichier)
scripts/         build, pré-rendu, CSP, contrôle du contenu, logos des touches, curseurs
tools/           pages de rendu des images fixes et de l'image Open Graph, sources SVG des curseurs
public/          fichiers servis tels quels (images, favicon, pages annexes)
docs/AVATAR.md   comment l'avatar est construit et comment le modifier
```

Pour les crédits (polices, icônes, bibliothèques), voir [CREDITS.md](CREDITS.md).
