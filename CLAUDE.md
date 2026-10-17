# CLAUDE.md — Portfolio d'Ethan Bacquier

Ce fichier est la référence du projet. Il reprend le brief initial **et** les décisions validées avec Ethan le 17 octobre 2026 (mis à jour après le premier build). En cas de conflit entre ce fichier et un ancien message, ce fichier gagne.

---

## 0. Règles de travail (à lire avant toute modification)

- **Environnement d'Ethan : Windows / PowerShell.** Jamais de chaînage `&&` dans les scripts npm, le README ou les instructions. Une commande par ligne.
- **Git** : on travaille sur la branche `v2` du repo `TatouneYnov/portfolio`. La branche `main` contient l'ancien portfolio (Vue) et ne doit pas être touchée tant qu'Ethan n'a pas validé la v2. Pas de force-push.
- **Skills à utiliser** : `build-awwwards-quality-sites` (système visuel et motion) et `frontend-design` (skill de design associé). Pour l'audit final : `seo-audit` (SEOmator) sur le site en ligne.
- **Honnêteté absolue sur le contenu** : ne jamais inventer d'expérience, de certification, de stat, de client, de rôle ou de stack. Une info manquante est masquée ou remplacée par un état propre (« bientôt »), jamais affichée en « TODO », « lorem » ou lien `#`.
- **Ethan n'a jamais fait l'École 42.** Ne pas le mentionner nulle part. Parcours = Ynov uniquement.
- **Aucun numéro de téléphone, aucune adresse postale**, nulle part.
- Langue du site : **français uniquement** (`lang="fr"`). Termes techniques en anglais quand c'est l'usage (DFIR, CTI, SOC, CTF, reverse proxy…). Pas de version anglaise.

---

## 1. Mission

Portfolio personnel d'**Ethan Bacquier** (pseudo **Tatoune**), étudiant en 2e année de cybersécurité (B2) à **Ynov Lyon**, qui cherche un **stage de 170 h**. Objectif : donner envie à un recruteur cyber/infra de le contacter en moins de 2 minutes.

Référence = adaptation inspirée, **pas une copie** : mise en scène d'un portfolio de « creative developer » (avatar 3D cartoon qui suit la souris, fond noir à lueur violette, perso qui finit assis à un bureau, timeline lumineuse) + section compétences en clavier 3D de keycaps (second portfolio). Identité, textes, assets et code 100 % originaux. Aucun nom, texte, logo ou asset des références. Les filigranes TikTok / « @lusi.uxui » de la vidéo source ne font pas partie du design.

### Ce qui a été abandonné (ne pas réintroduire sans demande explicite)
Ancien plan : bilingue FR/EN, hero en graphe réseau, write-ups CTF, terminal interactif, mini-CTF caché. **Tout est abandonné pour la V1.**

---

## 2. Stack technique

- **Vite 6 + React 18 + TypeScript** (Vite 6.4.4 : versions antérieures signalées par `npm audit`)
- **Three.js** via `@react-three/fiber` + `@react-three/drei`
- **Physique** : `@react-three/rapier` (bulles projets), chargé en lazy à l'approche de la section Projets
- **Animation** : GSAP + ScrollTrigger (système principal et unique pour le DOM)
- **Smooth scroll** : **Lenis uniquement** (jamais Locomotive). `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add`, `lagSmoothing(0)`. Désactivé sous `prefers-reduced-motion`. `destroy()` au démontage.
- **Icônes UI** : Solar via Iconify, **compilées au build** (`unplugin-icons` + `@svgr/core` + `@iconify-json/solar`). Logos de plateformes (GitHub, TryHackMe…) : `@iconify-json/simple-icons`. Aucun appel à l'API Iconify au runtime.
- **Logos d'outils (keycaps)** : `@iconify-json/logos` / `@iconify-json/simple-icons` + `@iconify/utils` pour récupérer le SVG au build et le rasteriser en texture canvas. Si le logo n'existe pas → monogramme typographique Archivo. Jamais de faux logo.
- **Polices auto-hébergées** (décision : pas de Google Fonts, pour une CSP plus stricte et zéro IP de visiteur envoyée à Google) : `@fontsource-variable/archivo` (avec l'axe `wdth`, vérifier l'import adéquat), `@fontsource-variable/inter`, `@fontsource/jetbrains-mono` (400). `font-display: swap`, preload du fichier display.
- **Formulaire** : Web3Forms (`https://api.web3forms.com/submit`). Clé dans `VITE_FORM_KEY` (la clé Web3Forms est publique par conception). **Si la clé est absente, le formulaire est remplacé proprement par un lien mailto.**
- **Avatar** : modélisé en code (`src/three/avatar.js`), aucun GLB. Si un GLB est ajouté un jour : compression meshopt, ou décodeur Draco auto-hébergé dans `public/draco/` (celui de drei vient de gstatic et casserait la CSP).
- **Pré-rendu au build** (obligatoire) : le site doit être lisible sans JavaScript. Build SSR de l'app (`renderToString`) injecté dans `dist/index.html`, puis `hydrateRoot` côté client. Les Canvas Three.js sont client-only (montés après hydratation). Tout le contenu textuel (compétences, projets, timeline, dispos, contact) est dans le HTML pré-rendu.
- **Build 100 % statique.**

### Variables d'environnement
| Variable | Rôle | Défaut |
|---|---|---|
| `VITE_SITE_URL` | URL absolue du site (canonical, OG, JSON-LD, sitemap) | `https://ethanbacquier.fr` |
| `VITE_BASE` | `base` Vite | `/` |
| `VITE_FORM_KEY` | Clé d'accès Web3Forms | vide → fallback mailto |

Fournir un `.env.example`. Ne jamais committer de `.env`.

---

## 3. Hébergement et domaine

- Domaine visé : **ethanbacquier.fr** (pas encore acheté). Hébergeur **pas encore choisi** : tout doit rester configurable par `VITE_SITE_URL` / `VITE_BASE`.
- Livrer **les deux** options de déploiement :
  1. `.github/workflows/deploy.yml` : déploiement GitHub Pages (actions officielles `configure-pages`, `upload-pages-artifact`, `deploy-pages`) + `public/CNAME` généré si `VITE_SITE_URL` n'est pas un domaine github.io.
  2. `public/_headers` (compatible Cloudflare Pages et Netlify) avec les vrais en-têtes HTTP.
- README : expliquer les deux voies, et que GitHub Pages ne permet pas d'en-têtes HTTP (donc pas de HSTS ni `frame-ancestors`), d'où la recommandation Cloudflare Pages une fois le domaine acheté.

---

## 4. Contenu centralisé (`src/data/`)

Tout le texte modifiable sans toucher au code.

| Fichier | Contenu |
|---|---|
| `profile.json` | identité, liens, flags |
| `skills.json` | touches du clavier |
| `projects.json` | bulles projets |
| `timeline.json` | parcours |
| `training.json` | TryHackMe / Hack The Box / certif |
| `availability.json` | calendrier de stage |

**Règle des placeholders** : une valeur `"TODO"` ou `null` n'est **jamais** affichée. L'élément est masqué ou remplacé par un état propre. Une entrée `"draft": true` n'est pas rendue. Ajouter un test (ou un script `npm run check:content`) qui échoue si « TODO », « lorem » ou `href="#"` apparaissent dans le HTML pré-rendu.

### 4.1 profile.json
- Nom : **Ethan Bacquier** · pseudo **Tatoune**
- Statut : **Étudiant en B2 Cybersécurité · Ynov Campus Lyon (2026–2027)**
- Intérêts : DFIR et CTI en priorité, ouvert à l'infra
- Niveau (à respecter dans tous les textes) : bases solides en infra/cyber et plusieurs langages ; **pas encore de certification** ; ne jamais gonfler.
- Email : `ethan.bacquier@gmail.com` (bouton copier + mailto)
- Discord : `tatoune` (bouton « copier le pseudo », pas d'URL)
- GitHub : https://github.com/TatouneYnov
- LinkedIn : https://www.linkedin.com/in/ethan-bacquier
- TryHackMe : https://tryhackme.com/p/.Tatoune
- Hack The Box : https://app.hackthebox.com/users/2165775
- Instagram : https://www.instagram.com/ethan.bcqr/ → **uniquement** dans le bloc « Hors écran »
- Téléphone : **aucun**
- CV : `public/cv/ethan-bacquier-cv.pdf`, `cvAvailable: false` → bouton désactivé « CV · bientôt dispo » (`aria-disabled="true"`, pas de lien). Passer à `true` suffit à l'activer.

### 4.2 timeline.json (Ynov uniquement)
1. **Bachelor 1 Informatique** · Ynov Lyon · 2025–26 · « Bases du développement, des systèmes et des réseaux. Premiers projets en Go et en web. » *(wording à valider par Ethan)*
2. **Bachelor 2 Cybersécurité** · Ynov Lyon · 2026–27 · « Spécialisation cyber : sécurité des systèmes et réseaux, analyse, offensive en lab. En parallèle : TryHackMe, Hack The Box, certif THM en préparation. »
3. **Stage · 170 h** · « Et si c'était chez vous ? » · 2026–27 · « Je cherche un stage en DFIR, CTI, SOC ou infra, les matins (8h–12h) et à temps plein pendant les vacances. » + lien « Voir mes disponibilités ↓ ». Style « à venir » : année en contour (`-webkit-text-stroke`), perle qui pulse.
4. **Alternance · Bachelor 3** · « Prochaine étape » · 2027–28 · « Objectif : continuer en alternance en B3. » Style « à venir », plus discret.

### 4.3 training.json (stats relevées le 17 oct. 2026, mises à jour à la main)
Pas d'appel API depuis le navigateur. Afficher discrètement « Stats au <date> ».

```json
{
  "updatedAt": "2026-10-17",
  "tryhackme": {
    "username": ".Tatoune",
    "url": "https://tryhackme.com/p/.Tatoune",
    "memberSince": "2024-10",
    "topPercent": 7,
    "highestLeague": "Silver",
    "questionsAnswered": 254,
    "highestStreak": 8,
    "roomsCompleted": null,
    "badges": ["First Four", "cat linux.txt", "Blue", "OhSINT", "Hash Cracker"],
    "pathInProgress": "Cyber Security 101"
  },
  "hackthebox": {
    "username": "Tatoune",
    "url": "https://app.hackthebox.com/users/2165775",
    "memberSince": "2024-12",
    "level": 13,
    "machines": ["Cap", "Nexus"],
    "challenges": null,
    "sherlocks": null
  },
  "certification": { "status": "in-progress", "name": null }
}
```

- Ne **pas** afficher le libellé de rang HTB (« Noob »). Afficher les noms des machines plutôt qu'un simple chiffre.
- `roomsCompleted`, `challenges`, `sherlocks` à `null` → masqués.
- Certif : `name: null` → pastille « Certification TryHackMe : en préparation » sans nom.
- Count-up une seule fois à l'entrée dans le viewport ; valeur finale directe sous reduced-motion et sans JS.

### 4.4 projects.json
Champs : `id, name, size, status, role, context, description, stack[], learned, links{github,live,current}, image, draft`.
Statuts possibles : « En cours », « Livré », « Projet d'école ».

1. **Hera** — `size: 1.6`, mis en avant. Projet de groupe, application web. Liens : site https://hera-app.fr + organisation https://github.com/Hera-app (repos privés : pas de lien vers un repo). Ethan a fait les repos **`admin.hera-app`** et **`hera-connect`**. Description, stack, statut et détail du rôle : **à remplir à partir des zips des deux repos qu'Ethan enverra sur demande** (l'accès GitHub de Claude ne voit pas l'orga Hera-app). En attendant : panneau minimal honnête (« Projet de groupe, application web » + liens + « Fiche détaillée bientôt »). L'ancien portfolio parlait de « chat temps réel / WebSockets » : **ne pas reprendre sans vérification dans le code**.
2. **Site du cabinet infirmier de Jassans-Riottier** — vrai client. Site vitrine statique HTML/CSS/JS (fichiers séparés, sans framework) pour un cabinet d'infirmières libérales : infos pratiques et contact, aux couleurs de leur carte de visite, contenus validés par le cabinet. Statut **« En cours »**, pas de lien live.
3. **Refonte du site du VBVB** (Volley Ball Villefranche Beaujolais) — statut **« En cours »**. Ethan refait le site de son propre club (actuellement sous WordPress) : actus, équipes, inscriptions, formation, beach, partenaires. Stack = `null` (masquée). Lien https://vbvb.fr uniquement en « site actuel », jamais comme réalisation.
4. **Power 4 Web** — Projet d'école. Puissance 4 dans le navigateur, serveur Go (`net/http`), interface HTML/CSS, 3 difficultés (Normal 6×7, Difficile 6×9, Expert 7×8), noms de joueurs personnalisables. GitHub : https://github.com/TatouneYnov/-power4-web (ignorer le repo privé `-power4-webbbbb`).
5. **RedQuest** — Projet d'école. RPG jouable dans le terminal, en Go : création de perso (nom, classe, compétences, équipement), boutique, combats contre des gobelins et autres monstres, gestion du mana et des ressources. GitHub : https://github.com/TatouneYnov/Projet_Red
6. **Groupie Tracker** — repo `Lyon-Ynov-Campus/groupie-tracker-gp-armonik` (collaborateur). `draft: true`.
7. **EscapeQuizz** — repo `guiarthur7/EscapeQuizz` (collaborateur). `draft: true`.
8. **CineList** — repo `guiarthur7/CineList` (collaborateur). `draft: true`.
9. **YSentinelle** — repo `YSentinelle/app` (collaborateur). `draft: true`.

Pour 6 à 9 : avant de passer `draft` à `false`, lire le code et **les commits d'Ethan** (`git log --author`) et ne décrire que ce qu'il a réellement fait. Rôle en une phrase factuelle.

Ne **pas** utiliser : `biblio-groupe-15`, `togethapp`, `Scalingo`, `tp-template-golang`, `algo-projet`, `ynov_2025_bachelor_1`, `exam-git-avanc-*` (non retenus par Ethan).

### 4.5 skills.json (26 touches)
En tête : `"_note": "Ne garde que les outils que tu sais expliquer en entretien."`
Chaque entrée : `id, label, category, icon (id iconify ou null), hotkey (lettre unique), quip`. Ton complice, jamais vantard.

**Prog & web** (`prog`, violet `#7C3AED`)
- Python — « Le couteau suisse : un script et le problème est réglé. »
- Go — « Mon serveur de Puissance 4 tourne là-dessus. »
- Bash — « Une ligne. Qui fait tout. Presque. »
- C — « Les pointeurs et moi, on apprend à se faire confiance. »
- HTML/CSS — « Centrer une div : mission accomplie. »
- JavaScript — « undefined is not a function… et pourtant ça marche. »
- Vue — « Mon ancien portfolio, c'était lui. »
- Git — « git commit -m "ça marche (je crois)" »

**Système & infra** (`infra`, indigo `#4F46E5`)
- Linux — « Mon terrain de jeu préféré. »
- Windows — « Il faut connaître le terrain qu'on défend. »
- Docker — « Ça marche sur ma machine. Et sur la tienne aussi, maintenant. »
- VirtualBox / VMware — « Mes labs vivent ici. Et y cassent en paix. »
- Active Directory — « Le royaume des GPO. Et des chemins d'attaque. »
- Réseau (TCP/IP) — « Trois poignées de main avant de se parler. »

**Offensif / CTF** (`offensive`, magenta `#C026D3`)
- Kali Linux — « La caisse à outils, version dragon. »
- Nmap — « Toc toc. Qui est là ? 65 535 portes à tester. »
- Burp Suite — « Je m'interpose. Poliment. »
- Metasploit — « En lab uniquement. Promis. »
- Gobuster — « Il frappe à toutes les URL du site. »
- John / Hashcat — « Ton mot de passe ? Plus pour longtemps. »

**DFIR / CTI / Blue team** (`blue`, lavande `#A78BFA`)
- Wireshark — « Je lis des paquets comme d'autres lisent des romans. »
- Volatility — « La RAM se souvient de tout. »
- Autopsy — « On ouvre l'image disque, on remonte le temps. »
- Splunk — « Des logs, des logs… et soudain, l'anomalie. »
- CyberChef — « La recette : From Base64 → Gunzip → bingo. »
- MITRE ATT&CK — « La carte de toutes les ruses. »

### 4.6 availability.json (calendrier novembre 2026 → juin 2027)
- Période affichée : **2 nov. 2026 → 30 juin 2027** (fin d'année scolaire ; Ethan ajustera).
- Jours de semaine par défaut = **matin dispo (8h–12h)**.
- **Semaines pleines (journée complète, 7 h)** connues :
  - 2–6 nov. 2026
  - 21 déc. 2026 – 1er janv. 2027 (25 déc. et 1er janv. fériés)
  - 8–12 févr. 2027
- **Mars → juin 2027 : matinées uniquement** tant qu'Ethan n'a pas ajouté ses vacances Ynov (il les ajoutera dans le JSON).
- Jours fériés à griser : 11 nov. 2026, 25 déc. 2026, 1er janv. 2027, 29 mars 2027 (lundi de Pâques), 6 mai 2027 (Ascension), 17 mai 2027 (lundi de Pentecôte). Les 1er et 8 mai 2027 tombent un samedi.
- **Jours passés grisés automatiquement** (comparaison avec la date du visiteur) ; un mois entièrement passé disparaît de la vue.
- Mention : « Autres périodes : à définir ensemble ».
- Exemple de calcul (affiché tel quel) : « Exemple : les 4 semaines de vacances = 126 h (hors fériés) + 11 matinées de 4 h = 170 h ». (18 jours × 7 h = 126 h.)

Structure suggérée :
```json
{
  "start": "2026-11-02",
  "end": "2027-06-30",
  "morningHours": "8h–12h",
  "fullDayHours": 7,
  "fullWeeks": [
    { "from": "2026-11-02", "to": "2026-11-06" },
    { "from": "2026-12-21", "to": "2027-01-01" },
    { "from": "2027-02-08", "to": "2027-02-12" }
  ],
  "holidays": ["2026-11-11", "2026-12-25", "2027-01-01", "2027-03-29", "2027-05-06", "2027-05-17"],
  "location": "Lyon ou télétravail"
}
```

---

## 5. Direction artistique

**Thèse : « l'analyste dans le noir ».** Personnage 3D attachant éclairé par une lueur violette dans un espace noir. Calme, précision, une pointe d'humour dans les interactions. Premium et sobre. **Aucun cliché Matrix** (pluie de code, tête de mort, Anonymous, cadenas néon, glitch partout, vert fluo).

### Tokens (`:root`)
```css
--bg: #07050C;        /* noir violacé */
--bg-2: #0E0A18;      /* surfaces */
--line: #241C36;
--text: #EEEAF6;
--muted: #8C84A3;     /* vérifier 4.5:1 sur --bg, ajuster si besoin */
--accent: #B49CFF;    /* lavande : 2e ligne des titres, curseur */
--accent-strong: #7C3AED; /* lueurs, ligne de timeline */
--glow: radial-gradient(circle, rgb(109 40 217 / .35), transparent 70%);
```
Site **dark-only** (assumé).

### Typo
- Display : **Archivo** expanded (`wdth` 112–125), 600–800, UPPERCASE pour les gros titres
- Texte : **Inter** 400/500, 16–18 px, line-height 1.6
- Labels : **JetBrains Mono** 400, `letter-spacing: .2em`, uppercase (« À PROPOS »)
- Titres en 2 tons : 1re ligne `--text`, 2e ligne `--accent`

### Curseur custom (desktop, `pointer: fine` uniquement)
Disque lavande ~22 px, opacité 0.9, lerp 0.18. ×2.2 + `mix-blend-mode: difference` au survol des éléments interactifs. Main « attraper » au-dessus des bulles, main fermée pendant le drag. Curseur natif conservé sur les champs de formulaire.

---

## 6. Assets

| Fichier | Rôle | Statut |
|---|---|---|
| `assets-src/avatar/*.jpg` | Photos de référence d'Ethan | Hors `public/`, **gitignorées** (ne jamais les déployer) |
| `src/three/avatar.js` | **Avatar figurine modélisé en code** (validé par Ethan le 17/10) | Fait |
| `public/assets/avatar/avatar-poster.webp` (+ `-450`) | Image fixe du buste | Fait (rendu de l'avatar) |
| `public/assets/avatar/desk-poster.webp` (+ `-600`) | Image fixe au bureau | Fait |
| `public/assets/about/volley.webp` | Photo d'Ethan en match | Plus tard |
| `public/assets/projects/*.webp` | Captures 16:10 | Plus tard |
| `public/og-image.jpg` | 1200×630 | Fait (rendu de l'avatar + nom) |
| `public/cv/ethan-bacquier-cv.pdf` | CV | Plus tard (`cv.available`) |

**Repli de l'avatar** : scène 3D → images fixes `avatar-poster.webp` / `desk-poster.webp` (sans WebGL, « réduire les animations », appareil modeste, sans JS). Aucune photo d'Ethan n'est publiée dans le hero.

### Photos de référence fournies
- **Face, plein pied, debout** (théâtre, chemise noire manches courtes, short cargo crème) → **référence principale** pour l'image-to-3D et source du détourage du hero.
- **3/4 face, assis** (bateau) → détails du visage et de la coiffure. Contient les mains d'une autre personne au premier plan : **ne jamais publier**.
- **Profil, coucher de soleil** (port) → référence de profil uniquement ; lumière orange trop forte pour la texture.

Traits à respecter : cheveux brun foncé ondulés/bouclés, volumineux sur le dessus avec **mèches claires décolorées** à l'avant, côtés courts dégradés ; fine moustache et bouc court ; style vestimentaire sombre et simple.

### Avatar
Construction, réglages (couleurs, mèche, volume des cheveux) et régénération des images fixes : voir `docs/AVATAR.md`. Ethan a validé la version actuelle (mèche blanche accentuée, volume des cheveux réduit).

---

## 7. Structure et chorégraphie

**Architecture 3D** : un Canvas R3F **fixe** (plein écran, sous le contenu, `pointer-events: none`) porte l'avatar du Hero jusqu'à « Ce que je fais ». L'avatar est cadré dans des **emplacements DOM** (`data-slot="hero|about|desk"`) via `camera.setViewOffset`, et le rendu est découpé (scissor) à l'emplacement : aucun texte ne peut passer dessous. La progression vient de `src/lib/stageState.ts` (intro, about, travel, desk), écrite par des ScrollTriggers en scrub. Il passe en pause (`frameloop="demand"`) ou se démonte dès la section Parcours. Le clavier et les bulles ont chacun leur Canvas, montés à l'approche (IntersectionObserver, `rootMargin: 50%`) et en pause hors écran.

### 0. Loader (validé par Ethan le 17/10)
**Durée fixe de 2 s à chaque visite** (progression fictive, voulue pour la mise en scène), puis ouverture `clip-path: inset` verticale 0.8 s. Nom « ETHAN BACQUIER » en Archivo expanded, **barre violette** dessous (remplissage animé en CSS `transform`, fluide même si la page travaille, avec une tête lumineuse), « CHARGEMENT » + compteur 000 → 100 synchronisé sur l'horloge de l'animation CSS (`getAnimations()`). Paliers communs dans `Loader.tsx` (`STEPS`) et `main.css` (`@keyframes loader-progress`) : les modifier ensemble. Pendant ces 2 s : préchargement des modules 3D et préchauffage des shaders (`src/lib/warm.ts`, `src/three/Warmup.tsx`). Sous « réduire les animations » : sauté. Sans JS : masqué (`noscript.css`), et une animation CSS de secours le retire après 4 s si le script plante.

### 1. Navigation (fixe)
- Gauche : monogramme « EB » (Archivo 800) → haut de page
- Centre : `ethan.bacquier@gmail.com` en petit, clic = copie + toast « Copié ✓ »
- Droite : À propos · Projets · Contact (ancres via `lenis.scrollTo`)
- Bas droite fixe : « CV » vertical (rotation 90°, JetBrains Mono) → désactivé « CV · bientôt » tant que `cvAvailable: false`
- Mobile : burger plein écran, liens en grand

### 2. Hero (100vh)
3 colonnes desktop, avatar au centre (buste, épaules → haut du crâne), lueur radiale derrière.
- Gauche : « Salut, moi c'est » (Inter, `--accent`) puis « ETHAN / BACQUIER » (h1 unique, Archivo 700 expanded, `clamp(2rem, 4vw, 3.6rem)`)
- Droite : « Étudiant en » puis mot rotatif « CYBERSÉCURITÉ » ↔ « INFRA ». Sortant : monte de 100 % dans un masque en passant en `--accent` et en perdant l'opacité ; entrant : arrive du bas en `--text`. Cycle 2.6 s, `power3.inOut` 0.7 s. `aria-live="off"` + span sr-only « Étudiant en cybersécurité et infrastructure ».
- Badge : « ● Recherche stage 170 h · dès novembre 2026 » (point vert doux qui pulse) → scroll vers Disponibilités
- Avatar : idle qui respire. **Tête** suit le pointeur (os `Head` : yaw ±35°, pitch ±20°, lerp 0.08), yeux aussi si os disponibles. Tactile : balayage lent automatique.
- Intro GSAP : lueur (scale 0.6 → 1), avatar +40 px en fondu, nom mot par mot (stagger 0.08), colonne droite, badge. Nav et badge utilisables pendant l'intro.
- Indicateur de scroll : ligne verticale qui se remplit en boucle.
- **Aucun chevauchement texte/avatar à aucune largeur.**

### 3. À propos (l'avatar reste)
Le contenu du hero glisse vers l'extérieur en fondu (scrub). Avatar à gauche, tête qui suit toujours. À droite :
- Label « À PROPOS »
- Paragraphe (Inter 20 px, révélation ligne par ligne scrubbée `--muted` → `--text`) :
  > Je suis Ethan, étudiant en 2e année de cybersécurité à Ynov Lyon. Ce qui m'attire, c'est de comprendre ce qui s'est passé après une attaque et qui se cache derrière : la réponse à incident (DFIR) et la threat intelligence (CTI). J'aime aussi mettre les mains dans l'infra, parce qu'on défend mieux ce qu'on sait construire. Je m'entraîne sur TryHackMe et Hack The Box, je code (Go, Python, web) et je cherche un premier stage pour apprendre aux côtés d'une vraie équipe.
- Bloc « Hors écran » (carte `--bg-2`, bordure `--line`) : `volley.webp` (4:5, grayscale → couleur au survol) +
  > Hors clavier, je suis libéro en Nationale 3 au Volley Ball Villefranche Beaujolais (VBVB). Lire le jeu avant l'attaque, rester calme sous pression, jouer pour l'équipe : au fond, c'est le même métier.

  + lien Instagram discret (icône Solar + « @ethan.bcqr »). Sans photo : carte texte seule, sans bloc vide.
- Fin de section : l'écran du bureau monte du bas vers l'avatar (annonce la transition).

### 4. Ce que je fais (le perso s'assoit)
Pin ~150vh (desktop uniquement) : dolly-out + orbit 15°, bureau/chaise/écran se mettent en place, crossfade idle → « Sitting Typing » (0.5 s, déclenché à 40 % du pin, pas scrubbé). Écran émissif violet avec texture canvas de faux terminal (log crédible qui défile lentement, ex. `[*] volatility -f mem.raw windows.pslist`).
- Gauche : « CE QUE » / « JE FAIS » (Archivo 800 expanded, ~8vw)
- Droite : 2 cartes à coins pointillés (tirets + équerres), une seule ouverte à la fois, la 1re par défaut, `<button aria-expanded>` :
  1. **CYBERSÉCURITÉ** — « Analyser, comprendre, remonter la trace. Forensic, analyse de logs et de trafic, threat intel, et CTF pour garder la main. » · DFIR · CTI · Blue team · CTF
  2. **INFRA** — « Monter, configurer et sécuriser des environnements : Linux, Windows Server, Active Directory, réseau, virtualisation et conteneurs. » · Linux · AD · Réseau · Docker
- Sortie : avatar et bureau remontent et sortent par le haut ; le canvas fixe passe en pause.

### 5. Parcours (timeline lumineuse)
« Mon parcours & » / « mes objectifs » (Archivo 600, ~5vw, centré). Grille [Intitulé + établissement] | [Année, gros chiffres] | [Description], ligne verticale entre col. 2 et 3, remplie en `--accent-strong` (dégradé + lueur) au scroll, perle lumineuse en tête. Chaque ligne apparaît (fondu + y 30 px) quand la perle la dépasse. Données : `timeline.json`.

### 6. Ma boîte à outils (clavier 3D)
« MA BOÎTE » / « À OUTILS » + « (astuce : survole ou appuie sur une touche) ».
- Clavier isométrique (inclinaison ~35°, rotation ~-30°), socle noir mat arrondi avec rim light violet, `ContactShadows`. Keycaps `RoundedBox` (dessus légèrement conique) ou keycap instanciée, 4 rangées selon l'ordre de `skills.json`.
- Couleurs par catégorie + légende cliquable (surbrillance de la catégorie).
- Dessus de keycap : logo blanc (texture SVG → canvas) ou monogramme Archivo.
- Survol / focus / touche physique : enfoncement (y -0.04, `elastic.out` 0.4 s), émissif, petite onde de lumière sur le socle ; à gauche, gros texte incliné ~-20° : nom (Archivo 800) + quip (Inter).
- Hotkeys : seulement si la section est visible **et** qu'aucun champ n'a le focus ; jamais avec Ctrl/Alt/Meta.
- Rotation y ±8° au scroll (scrub).
- `<ul>` réelle des compétences dans le DOM (bouton « Voir en liste ») ; c'est la version affichée sous reduced-motion, sans WebGL et sans JS.
- **Rien d'autre que des keycaps sur le clavier** (aucun personnage, aucune mascotte).

### 7. Terrain d'entraînement
2 cartes (`--bg-2`, bordure `--line`, équerres pointillées) : TryHackMe et Hack The Box, données de `training.json` (voir §4.3), boutons « Voir le profil ↗ ». Pastille certif dessous. Mention « Stats au 17 oct. 2026 ».

### 8. Projets (bulles physiques)
« MES » / « PROJETS » + « Clique sur une bulle pour ouvrir le projet / ou glisse-la dans le socle → ».
**Interaction validée par Ethan le 17/10 (priorité : qu'un recruteur ouvre un projet sans effort)** :
- **Clic (ou tap) sur une bulle = la bulle file dans le socle et la fiche s'ouvre.** Seuil de 6 px avant de considérer un glisser.
- Survol : la bulle grossit légèrement, reste immobile, curseur main, info-bulle « Ouvrir · nom du projet ». **Pas de sphère « pousseur » au survol** (elle éjectait les bulles hors de portée).
- Glisser : la bulle tenue devient cinématique et suit exactement le pointeur (repousse les autres), le socle s'agrandit et s'illumine quand elle passe au-dessus ; lâcher dans le socle (pointeur ou bulle à moins de 1,5 × son rayon) = ouverture ; ailleurs = la bulle repart avec l'élan du geste. Sur tactile : tap uniquement (le glisser vertical fait défiler la page).
- **Rangée de boutons toujours visible sous la scène** (« Ou choisis directement : Hera · Cabinet infirmier · VBVB · Power 4 · RedQuest »), état actif sur le projet ouvert.
- Fiche : s'ouvre **à gauche** sur grand écran (la bulle déposée reste visible dans le socle à droite), bottom sheet sur mobile.
- Rapier, gravité faible vers un attracteur centre-gauche. Sphères nacrées (`MeshPhysicalMaterial` blanc cassé, clearcoat 1, roughness 0.25, iridescence violette légère) avec décal du nom/logo du projet. Taille = `size` (Hera ×1.6).
- Socle à droite : torus émissif `--accent`, halo pulsant, « Déposer ici ». Dépôt = la bulle glisse au centre (GSAP) et tourne lentement. Nouveau dépôt = éjection de la précédente.
- Fiche (DOM) : capture 16:10 si dispo, nom, statut, rôle, contexte, description, stack (chips), « Ce que j'ai appris », liens (icônes Solar). Fermer (bouton + Échap) renvoie la bulle dans le nuage. Champs `null` masqués.
- Accessibilité : les boutons visibles sous la scène ouvrent la fiche (animation bulle → socle) ; focus déplacé dans la fiche puis rendu au bouton à la fermeture.
- Reduced-motion / sans WebGL / sans JS : grille de cartes statiques (même contenu).

### 9. Disponibilités
« QUAND » / « JE SUIS DISPO ».
- Gauche : « Stage de 170 h » · « Les matins en semaine · 8h–12h » · « À temps plein pendant les vacances » · « Lyon ou télétravail »
- Droite : mini-calendrier lun → ven (week-ends grisés), données `availability.json` (§4.6). Matin dispo = hachures `--accent` 30 % ; journée complète = `--accent` plein ; férié et passé = grisé. Desktop : grille de petits mois avec navigation par blocs de 4 mois ; mobile : 1 mois à la fois (swipe + boutons).
- Tooltip au survol/focus (« Lun. 2 nov. · journée complète »). Remplissage en cascade (stagger diagonal 0.01 s).
- Vrai tableau accessible (`role="grid"`, libellés de jours complets pour lecteurs d'écran).
- Légende + exemple de calcul + « Autres périodes : à définir ensemble ».
- CTA « Me proposer un créneau → » : scroll vers Contact avec objet pré-rempli « Stage 170 h ».

### 10. Contact
« TRAVAILLONS » / « ENSEMBLE » (Archivo 800, ~9vw, mot par mot, letter-spacing qui se resserre au scroll).
- Gauche : formulaire Web3Forms : Nom*, Email*, Entreprise, Objet (Stage 170 h / Alternance B3 / Autre), Message*, honeypot caché. Validation native + messages en français. États : focus, erreur inline, envoi (spinner, bouton désactivé), succès « Message reçu, je te réponds vite ✓ », échec (message + mailto de secours). « Tes données servent uniquement à te répondre. » Sans JS : `action` HTTP vers Web3Forms avec redirection. Sans clé : mailto à la place du formulaire.
- Droite : liens rapides (icône Solar + libellé + ↗ qui glisse) : Email (copier), LinkedIn, GitHub, TryHackMe, Hack The Box, Discord « tatoune » (copier), CV (désactivé « bientôt »).

### 11. Footer
« © 2026 Ethan Bacquier · Fait à Lyon » · « Retour en haut ↑ » · « Crédits » (modale rendant `CREDITS.md` : modèles 3D CC0, polices, icônes Iconify/Solar, outil de génération de l'avatar).

---

## 8. Système de mouvement

- GSAP = seul moteur des propriétés DOM. `useFrame` seulement pour l'idle 3D, le suivi de tête et la physique. Jamais deux systèmes sur la même propriété.
- Lenis (`lerp: 0.1`, `smoothWheel: true`) ↔ ScrollTrigger. `ScrollTrigger.refresh()` après `document.fonts.ready` et après chargement des GLB.
- Titres : mot par mot (`yPercent` 110 → 0 dans un masque, stagger 0.06, `power3.out` 0.9 s). `aria-label` sur le titre, mots découpés `aria-hidden`. Texte complet visible sans JS (le découpage se fait au montage client).
- Un seul pin : « Ce que je fais ». Le reste en reveals simples.
- Easing par défaut `power3.out`, 0.6–0.9 s, rien au-delà de 1.2 s hors scrub.
- Hover/focus simples en CSS (200 ms).

---

## 9. Responsive

- Breakpoints : ≥ 1200 desktop · 768–1199 tablette · < 768 mobile
- Mobile : hero en colonne (avatar en haut, buste plus petit), pas de curseur custom, tête en balayage auto, pas de pin (transition simple), timeline 1 colonne ligne à gauche, clavier zoomé (3 rangées visibles, texte drôle au-dessus), bulles réduites + bottom sheet, calendrier 1 mois, formulaire pleine largeur.
- Aucun scroll horizontal de page, gouttière ≥ 16 px.
- Appareils faibles (`hardwareConcurrency ≤ 4` ou `deviceMemory ≤ 4`) : poster/photo à la place du GLB, 5 bulles max.

---

## 10. Accessibilité

- `header` / `nav` / `main` / `section[aria-labelledby]` / `footer`, un seul `h1` (le nom), h2/h3 propres.
- Lien d'évitement « Aller au contenu ».
- Focus visible partout : `outline: 2px solid var(--accent); outline-offset: 3px`.
- Tout le contenu 3D existe en DOM.
- `prefers-reduced-motion: reduce` → pas de Lenis, pas de scrub, pas de pin, états finaux immédiats, avatar en image statique, clavier en liste, bulles en grille.
- Contraste AA (4.5:1 minimum pour le texte courant).
- Lisible et complet sans JavaScript (pré-rendu).

---

## 11. Performance

- DPR max 1.75 (1.25 mobile), antialias seulement si DPR < 2.
- Canvases en pause hors écran et quand `document.hidden`. `frameloop="demand"` au repos.
- Lazy : Rapier (WASM) et scène clavier à l'approche de leur section. Preload de l’image fixe du hero seulement.
- Zéro allocation par frame (vecteurs réutilisés), `dispose()` de tout au démontage, gestion de `webglcontextlost` → bascule vers le fallback statique.
- Images responsives (`srcset`), `loading="lazy"` sous la ligne de flottaison, dimensions explicites (pas de CLS).
- Budget : LCP < 2.5 s en 4G avec le fallback photo ; JS initial < 250 Ko gzip (hors three/rapier à la demande).

---

## 12. Hygiène sécurité (c'est un portfolio cyber : les recruteurs regardent)

### CSP
Dans `public/_headers` (en-tête HTTP) **et** en `<meta>` dans `index.html` (pour GitHub Pages) :
```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self';
font-src 'self';
img-src 'self' data: blob:;
connect-src 'self' https://api.web3forms.com;
form-action 'self' https://api.web3forms.com;
worker-src 'self' blob:;
base-uri 'self';
object-src 'none';
```
+ dans `_headers` uniquement (non supportés en meta) : `frame-ancestors 'none'`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive.

- Aucun script inline exécutable (le JSON-LD `application/ld+json` est un bloc de données, autorisé). Vérifier qu'aucun polyfill Vite n'est injecté inline (`build.modulePreload.polyfill: false` si besoin).
- Aucun tracker, aucun CDN tiers au runtime.
- Liens externes : `rel="noopener noreferrer"`.
- `public/.well-known/security.txt` : `Contact: mailto:ethan.bacquier@gmail.com`, `Expires` dans 1 an, `Preferred-Languages: fr, en`, `Canonical` sur `VITE_SITE_URL`.
- Pas de source maps en production.

---

## 13. SEO

- `<title>` : « Ethan Bacquier · Étudiant en cybersécurité · Ynov Lyon » (raccourci à moins de 60 caractères après l'audit SEO)
- `meta description` : « Étudiant en B2 cybersécurité à Ynov Lyon, attiré par le DFIR, la CTI et l'infra : je cherche un stage de 170 h dès novembre. » (120 à 160 caractères, sans troncature)
- `llms.txt`, `404.html`, `confidentialite.html` (RGPD : formulaire de contact) générés ou présents dans `public/`.
- Open Graph + Twitter card (`og-image.jpg`), canonical, favicon « EB » (SVG + PNG 32/180), `robots.txt`, `sitemap.xml` (générés depuis `VITE_SITE_URL`).
- JSON-LD `@graph` : `Person` (`@id` …/#person, alternateName « Tatoune », affiliation Ynov, `sameAs` GitHub, LinkedIn, TryHackMe, HTB) + `WebSite`.
- Audit `seo-audit` du 17/10 sur le build local avec les en-têtes de `_headers` : 91/100 (A). À refaire une fois en ligne : `seomator audit <url> --crawl --format llm`, puis avec `--mobile`.

---

## 14. À ne pas faire

- Copier textes, noms, logos ou assets des portfolios de référence ou les filigranes de la vidéo.
- Clichés hacker.
- Inventer expérience, certif, stats, client, rôle ou témoignage. Afficher un placeholder brut.
- Afficher un téléphone ou une adresse.
- Blobs dégradés décoratifs, glassmorphism partout, bento grid générique, sections « services » de landing page.
- Deux moteurs de smooth scroll, ou une animation qui bloque la lecture du nom et du badge stage.
- Un personnage d'une licence connue, ou quoi que ce soit d'autre que des keycaps sur le clavier.
- Texte qui chevauche l'avatar.
- Publier les photos brutes d'Ethan (`assets-src/`) ou toute photo contenant d'autres personnes.
- Mentionner l'École 42.

---

## 15. Livrables et validation

1. Code complet + `README.md` (lancement local commande par commande, déploiement GitHub Pages et Cloudflare/Netlify, édition de chaque JSON, ajout de `volley.webp` / CV / un projet).
2. `docs/AVATAR.md` (pipeline §6) et `CREDITS.md`.
3. Le site fonctionne **tout de suite** sans `volley.webp`, captures ni CV.
4. Avant de rendre : `npm run build` sans erreur ; vérification 1440 px et 390 px ; navigation clavier complète ; reduced-motion ; WebGL désactivé ; JS désactivé ; un seul moteur de scroll ; recherche de tout « TODO » / placeholder visible ; aucun texte copié des références.
5. Rapport final : skill de design utilisé, sources des assets, stack d'animation, décisions Three.js, validations faites, limites restantes, liste exacte des TODO d'Ethan.

---

## 16. Décisions prises pendant le build (17 oct. 2026)

- **Ne jamais mettre `scroll-behavior: smooth` sur `html`** (même pour la version sans JS) : ScrollTrigger mémorise la valeur au chargement et la réapplique en style inline après chaque recalcul, ce qui bloque Lenis (la page se fige puis rattrape tout d'un coup). Les règles CSS recommandées par Lenis (`.lenis.lenis-smooth { scroll-behavior: auto !important }`) sont dans `main.css`.
- **Préchauffage 3D** : les scènes clavier et bulles sont montées hors écran dès que le navigateur est au repos après le chargement (`useIdleMount`, échelonné), avec compilation des shaders, envoi des textures et un rendu à blanc (`Warmup`). Sans ça, la compilation se terminait au premier affichage, en plein défilement.

- Appareil « modeste » (`hardwareConcurrency ≤ 4` ou `deviceMemory ≤ 4`, comme le brief) : images fixes à la place de l'avatar 3D. Seuil réglable dans `src/App.tsx` si trop de PC portables tombent dedans.
- Les apparitions au défilement utilisent `opacity` (pas `visibility`) : tout reste atteignable au clavier.
- Couleurs de catégorie en double (JSON pour la 3D, CSS `[data-cat]` pour le HTML) : la CSP interdit les attributs `style` dans le HTML pré-rendu.
- Onglet CV vertical masqué sur mobile ; le CV est dans le menu.
- Le formulaire Web3Forms n'apparaît qu'avec `VITE_FORM_KEY` ; sinon bloc « Écris-moi directement ».

## 17. TODO d'Ethan (état au 17 oct. 2026)

- [ ] Envoyer les zips de `admin.hera-app` et `hera-connect` pour la fiche Hera
- [ ] Projets collaborateurs (Groupie Tracker, EscapeQuizz, CineList, YSentinelle) : en `draft`, à rédiger depuis le code et les commits d'Ethan
- [ ] Valider le wording du Bachelor 1
- [ ] Ajouter ses vacances Ynov de mars à juin 2027 dans `availability.json`
- [ ] Photo de volley (`volley.webp`)
- [ ] Captures des projets (16:10)
- [ ] CV PDF puis `cv.available: true` (un ancien `CV_Bacquier_Ethan.pdf` existe sur la branche `main` : à vérifier avant de le réutiliser)
- [ ] Créer une clé Web3Forms (`VITE_FORM_KEY`)
- [ ] Acheter `ethanbacquier.fr` et choisir l'hébergeur (recommandé : Cloudflare Pages)
- [ ] Choisir la certification TryHackMe (puis renseigner `certification.name`)
- [ ] Mettre à jour `training.json` de temps en temps
- [ ] Stack du site VBVB ; lien live du cabinet quand il est en ligne
