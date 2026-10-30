# CLAUDE.md — Portfolio d'Ethan Bacquier

Ce fichier est la référence du projet. Il reprend le brief initial **et** les décisions validées avec Ethan le 17 octobre 2026, mises à jour après le premier build et les corrections du soir (défilement, chargement, bulles). Il décrit **ce qui est réellement codé** sur la branche `v2`. En cas de conflit entre ce fichier et un ancien message, ce fichier gagne.

---

## 0. Règles de travail (à lire avant toute modification)

- **Environnement d'Ethan : Windows / PowerShell.** Jamais de chaînage `&&` dans les scripts npm, le README ou les instructions. Une commande par ligne.
- **Git** : on travaille sur la branche `v2` du repo `TatouneYnov/portfolio`. Depuis le 23/10 (demande d'Ethan), `main` porte la v2 (avance rapide depuis `v2`) ; l'ancien portfolio (Vue) est conservé sur la branche `v1`, à ne pas toucher. Pas de force-push.
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
- **Physique** : `@react-three/rapier` (bulles projets). Module et WebAssembly préchargés pendant l'écran de chargement (`src/lib/warm.ts`)
- **Animation** : GSAP + ScrollTrigger (système principal et unique pour le DOM)
- **Smooth scroll** : **Lenis uniquement** (jamais Locomotive). `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add`, `lagSmoothing(0)`. Désactivé sous `prefers-reduced-motion`. `destroy()` au démontage.
- **Icônes UI** : Solar via Iconify, **compilées au build** (`unplugin-icons` + `@svgr/core` + `@iconify-json/solar`). Logos de plateformes (GitHub, TryHackMe…) : `@iconify-json/simple-icons`. Aucun appel à l'API Iconify au runtime.
- **Logos d'outils (keycaps)** : `@iconify-json/logos` / `@iconify-json/simple-icons` + `@iconify/utils` pour récupérer le SVG au build et le rasteriser en texture canvas. Si le logo n'existe pas → monogramme typographique (police système, gras). Jamais de faux logo.
- **Polices du système** (refonte « Apple » du 30/10, demandée par Ethan) : SF Pro sur Apple, Segoe UI sur Windows, Roboto sur Android (`--font-display` / `--font-body` dans `main.css`), y compris dans les textures 3D (clavier, bulles). Plus aucune police téléchargée, plus de préchargement. Les paquets `@fontsource*` restent installés **uniquement** pour `tools/og.html` (l'image Open Graph a été dessinée avec Archivo, Inter et JetBrains Mono, voir `CREDITS.md`).
- **Formulaire** : Web3Forms (`https://api.web3forms.com/submit`). Clé dans `VITE_FORM_KEY` (la clé Web3Forms est publique par conception). **Si la clé est absente, le formulaire est remplacé proprement par un lien mailto.**
- **Avatar** : modélisé en code (`src/three/avatar.js`), aucun GLB. Si un GLB est ajouté un jour : compression meshopt, ou décodeur Draco auto-hébergé dans `public/draco/` (celui de drei vient de gstatic et casserait la CSP).
- **Pré-rendu au build** (obligatoire) : le site doit être lisible sans JavaScript. Build SSR de l'app (`renderToString`) injecté dans `dist/index.html`, puis `hydrateRoot` côté client. Les Canvas Three.js sont client-only (montés après hydratation). Tout le contenu textuel (compétences, projets, timeline, dispos, contact) est dans le HTML pré-rendu.
- **Build 100 % statique.**

### Variables d'environnement
| Variable | Rôle | Défaut |
|---|---|---|
| `VITE_SITE_URL` | URL absolue du site (canonical, OG, JSON-LD, sitemap) | `https://ethanbacquier.github.io` |
| `VITE_BASE` | `base` Vite | `/` |
| `VITE_FORM_KEY` | Clé d'accès Web3Forms | vide → fallback mailto |

Fournir un `.env.example`. Ne jamais committer de `.env`.

### Carte du code
| Fichier | Rôle |
|---|---|
| `src/App.tsx` | Assemble les sections, démarre le mouvement, monte la scène de l'avatar, lance le préchargement 3D |
| `src/data/*.json` | Tout le contenu (§4) |
| `src/sections/*.tsx` | Une section par fichier (Hero, About, WhatIDo, Journey, Toolbox, Training, Projects, Availability, Contact, Footer) |
| `src/components/` | Loader, Header, Cursor, Toast, SplitHeading (titres mot par mot), Frame (cadre à équerres), Backdrop (fond à lueurs) |
| `src/lib/motion.ts` | GSAP + ScrollTrigger + Lenis, ancres internes (`scrollToHash`) |
| `src/lib/stageState.ts` | Progression partagée scroll → scène de l'avatar (`intro`, `about`, `travel`, `desk`) |
| `src/lib/warm.ts` | Préchargement des modules 3D, montage anticipé des scènes (`useIdleMount`) |
| `src/lib/dotGrid.ts` | Grille de points du fond (lumière sous le curseur, onde au clic) |
| `src/lib/capabilities.ts` | Détection WebGL, « réduire les animations », appareil modeste, pointeur précis |
| `src/three/avatar.js` (+ `.d.ts`) | Avatar figurine, bureau, écran terminal, poses debout/assis |
| `src/three/AvatarStage.tsx` | Canvas fixe de l'avatar, cadrage dans les emplacements DOM |
| `src/three/KeyboardScene.tsx` | Clavier 3D |
| `src/three/BubblesScene.tsx` | Bulles projets (Rapier) |
| `src/three/Warmup.tsx` | Préchauffage : textures, compilation des shaders, rendu à blanc |
| `src/styles/main.css` | Feuille unique, tokens en tête |
| `scripts/build.mjs` | Build client + SSR, pré-rendu, fichiers générés, contrôle du contenu |
| `scripts/check-content.mjs` | Échoue si TODO, lorem, valeur technique, lien vide, téléphone ou École 42 dans la page |
| `scripts/gen-keycap-icons.mjs` | Logos blancs des touches (`src/generated/keycap-icons.json`) |
| `tools/poster.html`, `tools/og.html` | Rendus des images fixes de l'avatar et de l'image Open Graph (via `npm run dev`) |

---

## 3. Hébergement et domaine

**Décidé avec Ethan le 23/10 : GitHub Pages, à l'adresse `https://ethanbacquier.github.io`. En ligne depuis le 23/10** (mise en place faite par Ethan ; premier déploiement vérifié : workflow « Déployer sur GitHub Pages » réussi sur le commit `0fbea73`, `npm audit` 0 vulnérabilité, contrôle du contenu OK).
- Organisation GitHub gratuite **`ethanbacquier`** (créée par Ethan), repo public **`ethanbacquier/ethanbacquier.github.io`** : il reçoit le code de la v2 (`git push site v2:main`, voir README) et se déploie à chaque push sur `main` via `.github/workflows/deploy.yml` (actions officielles `configure-pages`, `upload-pages-artifact`, `deploy-pages`). Settings → Pages → Source : GitHub Actions.
- **`TatouneYnov/portfolio`** : depuis le 23/10, `main` = la v2 ; l'ancien portfolio (Vue) est gardé intact sur la branche **`v1`**. On développe toujours sur `v2`, puis `main` est avancée sur `v2`.
- Valeurs par défaut du build : `VITE_SITE_URL=https://ethanbacquier.github.io`, `VITE_BASE=/`. Pas de `CNAME` (adresse `github.io`). Variable de repo `FORM_KEY` pour Web3Forms : **pas encore créée** (build du 23/10 avec `VITE_FORM_KEY` vide → bloc mailto « Écris-moi directement » en ligne).
- **Mettre à jour le site** : le site ne bouge pas tout seul quand on pousse sur `v2` ; il faut ensuite `git push site v2:main` (remote `site` = `ethanbacquier/ethanbacquier.github.io`).
- Domaine perso (`ethanbacquier.fr`) : plus tard, facultatif (Settings → Pages → Custom domain + variable `SITE_URL`).
- GitHub Pages n'envoie pas d'en-têtes HTTP : `_headers` (toujours généré, pour Cloudflare Pages / Netlify) y est ignoré, la CSP passe en `<meta>`. Ne jamais annoncer HSTS ni `frame-ancestors` sur le site.
- **Obligations légales** : `public/mentions-legales.html` (LCEN : éditeur non professionnel sans adresse personnelle, hébergeur GitHub, Inc., 88 Colin P. Kelly Jr. St., San Francisco, CA 94107, États-Unis — adresse tirée de la déclaration de confidentialité de GitHub) et `public/confidentialite.html` (base légale art. 6.1.b RGPD, Web3Forms et Gmail hors UE, journaux IP de GitHub Pages, droits, CNIL). À mettre à jour si l'hébergeur change. Aucun cookie : pas de bandeau. `check:content` vérifie aussi ces pages annexes.

## 4. Contenu centralisé (`src/data/`)

Tout le texte modifiable sans toucher au code.

| Fichier | Contenu |
|---|---|
| `profile.json` | identité, liens, CV, textes « À propos », « Hors écran », cartes « Ce que je fais » |
| `skills.json` | touches du clavier |
| `projects.json` | bulles projets |
| `timeline.json` | parcours |
| `training.json` | TryHackMe / Hack The Box / certif |
| `availability.json` | calendrier de stage + bloc alternance |
| `testimonials.json` | témoignages (vide → section masquée) |

**Règle des placeholders** : une valeur `"TODO"` ou `null` n'est **jamais** affichée. L'élément est masqué ou remplacé par un état propre. Une entrée `"draft": true` n'est pas rendue. Ajouter un test (ou un script `npm run check:content`) qui échoue si « TODO », « lorem » ou `href="#"` apparaissent dans le HTML pré-rendu.

### 4.1 profile.json
- Nom : **Ethan Bacquier** · pseudo **Tatoune**
- Statut : **Étudiant en B2 Cybersécurité · Ynov Campus Lyon (2026–2027)** (`status`, utilisé dans `llms.txt`) ; version courte du hero `heroStatus` : « B2 · Ynov Campus Lyon · 2026–27 » (évite de répéter « Étudiant en cybersécurité » juste sous le mot rotatif)
- Badge du hero : « Stage 170 h dès nov. 2026 · Alternance B3 en 2027 » (affiché sur 2 lignes, coupé sur « · »)
- Recherche : stage de 170 h cette année **et** alternance en B3 (rentrée 2027, rythme **1 semaine à l'école / 2 semaines en entreprise**). Les recruteurs s'intéressent souvent plus aux alternants : l'alternance est mise en avant (badge, Disponibilités, timeline, formulaire).
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
- CV : `public/cv/ethan-bacquier-cv.pdf`, champ `cv.available: false` → bouton désactivé « CV · bientôt dispo » (`aria-disabled="true"`, pas de lien). Passer à `true` suffit à l'activer.
- Photo volley : champ `offscreen.photo` (`null` → carte texte seule).

### 4.2 timeline.json (Ynov uniquement)
1. **Bachelor 1 Informatique** · Ynov Lyon · 2025–26 · « Bases du développement, des systèmes et des réseaux. Premiers projets en Go et en web. » *(wording à valider par Ethan)*
2. **Bachelor 2 Cybersécurité** · Ynov Lyon · 2026–27 · « Spécialisation cyber : sécurité des systèmes et réseaux, analyse, offensive en lab. En parallèle : TryHackMe, Hack The Box, certif THM en préparation. »
3. **Stage · 170 h** · « Et si c'était chez vous ? » · 2026–27 · « Je cherche un stage en DFIR, CTI, SOC ou infra, les matins (8h–12h) et à temps plein pendant les vacances. » + lien « Voir mes disponibilités ↓ ». Style « à venir » : année en contour (`-webkit-text-stroke`), perle qui pulse.
4. **Alternance · Bachelor 3** · « Prochaine étape » · 2027–28 · « Objectif : continuer en alternance en B3, au rythme de 1 semaine à l'école et 2 semaines en entreprise. » Style « à venir » (plus en version discrète depuis le 17/10 au soir).

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
Champs : `id, name, bubbleLabel` (texte de la bulle et du bouton, `\n` = retour à la ligne), `size, status, role, context, description, stack[], learned, note, links{github,organization,live,current}, image, draft`.
Statuts possibles : « En cours », « Livré », « Projet d'école ».

« Ce que j'ai appris » (`learned`), rédigé à partir des mots d'Ethan (17/10), sans rien ajouter :
- Hera : « Gérer des comptes et leurs permissions, construire une API et une interface d'administration. »
- Power 4 : « Monter un serveur web en Go. » · RedQuest : « Apprendre le langage Go. »
- Cabinet infirmier et VBVB : « Réaliser un site, utiliser l'IA comme aide et le déployer. »

1. **Hera** — `size: 1.6`, mis en avant. **Projet d'école** (projet de groupe à Ynov). Rempli le 17/10 à partir des zips des deux repos d'Ethan :
   - Hera = application autour d'événements sportifs : des organisateurs publient des sessions (sport, niveau, lieu, horaires), les participants les rejoignent.
   - **`admin.hera-app`** (à Ethan) : panel d'administration en Vue 3 + Vue Router + Vite, branché sur l'API Hera (`api.hera-app.fr`, jetons JWT d'accès et de rafraîchissement). Connexion e-mail ou Google, rôles `owner` (organisateur) et `admin`, gestion des événements et des participants, modération des utilisateurs (score, rôle, suppression), des événements et des signalements, création de comptes, réinitialisation du mot de passe.
   - **`hera-connect`** (branche `garmin`) : prototype de connexion Garmin **basé sur le projet open source garmin-grafana** (licence BSD-3, crédité). Apports d'Ethan visibles : script d'export CSV des activités (`csvsimple/export.py`), correctifs pour l'erreur 404 de l'API Garmin, README en français. Ne jamais présenter garmin-grafana comme son code.
   - Stack affichée : Vue 3, Vue Router, Vite, API REST (JWT), Python, Docker, InfluxDB, Grafana. Liens : site https://hera-app.fr + organisation https://github.com/Hera-app (repos privés : pas de lien vers un repo). Plus de note « Fiche détaillée bientôt ».
   - L'ancien portfolio parlait de « chat temps réel / WebSockets » : **rien de tel dans ces deux repos**, ne pas le reprendre.
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
Chaque entrée : `id, label, category, icon (id iconify ou null), mono (monogramme si pas de logo), hotkey (lettre unique), quip, usedIn[]`.
`usedIn` = où Ethan s'est servi de l'outil (réponses d'Ethan du 17/10), affiché « Utilisé : … » sous la phrase, dans le texte du clavier et dans la liste. Valeurs : « Cours à Ynov », « TryHackMe / HTB », « Projets perso », ou un exercice précis (Wireshark → Machine Cap (HTB) ; Nmap → Machines Cap et Nexus (HTB) ; Metasploit → Room Blue (THM) ; John/Hashcat → Room Blue (THM), badge Hash Cracker ; Go → Power 4 Web, RedQuest ; HTML/CSS et JS → Cabinet infirmier, Refonte du VBVB ; Vue → Mon ancien portfolio, Hera (panel admin) ; JavaScript → aussi Hera (panel admin) ; Python et Docker → aussi Hera (prototype Garmin), d'après le code de ses repos ; Git → Tous mes projets GitHub). Ne jamais ajouter un lieu qu'Ethan n'a pas confirmé. Noms longs d'un seul mot (> 8 lettres) : taille réduite (`toolbox__name--long`). Ton complice, jamais vantard. 17 logos Simple Icons existent ; AD, Réseau, Nmap, Gobuster, John/Hashcat, Volatility, Autopsy, CyberChef et MITRE ATT&CK utilisent leur monogramme.

**Prog & web** (`prog`, aubergine `#6A4766`)
- Python — « Le couteau suisse : un script et le problème est réglé. »
- Go — « Mon serveur de Puissance 4 tourne là-dessus. »
- Bash — « Une ligne. Qui fait tout. Presque. »
- C — « Les pointeurs et moi, on apprend à se faire confiance. »
- HTML/CSS — « Centrer une div : mission accomplie. »
- JavaScript — « undefined is not a function… et pourtant ça marche. »
- Vue — « Mon ancien portfolio, c'était lui. »
- Git — « git commit -m "ça marche (je crois)" »

**Système & infra** (`infra`, ardoise `#5E6B85`)
- Linux — « Mon terrain de jeu préféré. »
- Windows — « Il faut connaître le terrain qu'on défend. »
- Docker — « Ça marche sur ma machine. Et sur la tienne aussi, maintenant. »
- VirtualBox / VMware — « Mes labs vivent ici. Et y cassent en paix. »
- Active Directory — « Le royaume des GPO. Et des chemins d'attaque. »
- Réseau (TCP/IP) — « Trois poignées de main avant de se parler. »

**Offensif / CTF** (`offensive`, vieux rose `#B07A86`)
- Kali Linux — « La caisse à outils, version dragon. »
- Nmap — « Toc toc. Qui est là ? 65 535 portes à tester. »
- Burp Suite — « Je m'interpose. Poliment. »
- Metasploit — « En lab uniquement. Promis. »
- Gobuster — « Il frappe à toutes les URL du site. »
- John / Hashcat — « Ton mot de passe ? Plus pour longtemps. »

**DFIR / CTI / Blue team** (`blue`, lilas `#8F86B3`)
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
- Bloc `alternance` (sous le CTA) : « Et après : alternance » · « Pour ma 3e année (Bachelor 3, rentrée 2027), je cherche une alternance. » · « 1 semaine à l'école · 2 semaines en entreprise » · lien « Me parler d'alternance → » (scroll vers Contact, objet « Alternance B3 »).
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
**Thème clair** (ajouté le 23/10 à la demande d'Ethan) : le site suit le réglage de l'OS (`prefers-color-scheme`), sombre par défaut, sans bouton ni script. Tokens clairs dans `main.css` (`@media (prefers-color-scheme: light)`), `pages.css` et deux `<meta name="theme-color">`. Clair (retravaillé le 30/10, « trop blanc » avant) : **lavande brumeuse**, `--bg #ECE8F6`, `--bg-2 #FFFFFF`, `--text #17121F`, `--muted #524B67`, `--accent #6025C9`, cartes en verre blanc à 55 % (AA vérifié jusqu'au cœur des lueurs).
**Fond de page** (`src/components/Backdrop.tsx`, 30/10, les deux thèmes) : calque fixe sous `main` avec trois grandes lueurs radiales (`--orb-a/b/c` ; clair : lavande en haut à gauche, pêche à droite, lilas bleuté en bas ; sombre : violet, prune, bleu nuit à 9–16 %, à peine visibles) qui dérivent au défilement (un seul scrub GSAP sur toute la page, fixe sous « réduire les animations »), + grain SVG fixe (`--grain-opacity`) contre les bandes des dégradés. **Grille de points** (`src/lib/dotGrid.ts`, canvas 2D, choisie par Ethan le 30/10 parmi 4 essais) : points `--grid-alpha` tous les 26 px, estompés vers les bords, défilant à mi-vitesse ; la zone sous la souris s'allume en `--accent` et se soulève, un clic dans le vide (pas sur un lien, bouton ou canevas) lance une onde (la vague au défilement, essayée le 30/10, a été retirée à la demande d'Ethan). Téléphone : onde au toucher, pas de lumière qui suit le doigt. « Réduire les animations » et appareil modeste : grille fixe à l'écran, seule la lueur sous la souris apparaît en fondu. Ne dessine que quand quelque chose bouge. Toute nouvelle couleur passe par un token (pas de `rgb()` codé en dur, utiliser `color-mix` avec les tokens). Scènes 3D : canevas transparents ; seul le socle des bulles change en clair (pas de mélange additif). Les images fixes et l'image Open Graph restent celles du thème sombre.

### Typo (refonte « Apple » du 30/10)
- **Police système partout**, aucune majuscule forcée : titres en minuscules (« Ma boîte / à outils »), très gras (700–800), lettres serrées.
- **Espacement des lettres selon la taille** (jamais une valeur unique) : grands titres `-0.035em` (nom du hero `-0.04em`), titres intermédiaires `-0.02em`, texte et petits libellés `0`.
- Étiquettes (« À propos », légendes) : 13 px semi-gras `--muted` ; boutons 15 px semi-gras.
- Titres en 2 tons : 1re ligne `--text`, 2e ligne `--accent`.
- Les jambages (g, j, p) des titres découpés mot par mot ne sont pas rognés : masque `.split__w` avec `padding-bottom: 0.14em`.

### Matières (verre dépoli, refonte du 30/10)
- Jetons `--glass` (cartes), `--glass-strong` (surfaces flottantes), `--glass-blur`, `--glass-edge`, `--glass-shine` (arête claire), `--float-shadow`, `--radius: 22px`.
- **Surfaces flottantes** en verre : en-tête (avec un fondu sous la barre au lieu d'un trait), menu mobile, fiche projet, toast, onglet CV, info-bulles, modale des crédits (fond de page assombri et flouté derrière).
- **Cartes du contenu** en verre (`.frame` / `.glass-card`) : « Ce que je fais », tuiles d'entraînement, calendrier, « Hors écran », fiches projets, contact, alternance. Le cadre pointillé à équerres a disparu.
- `prefers-reduced-transparency` et `prefers-contrast: more` : surfaces pleines, sans flou (contours nets en contraste élevé).

### Curseur custom (desktop, `pointer: fine` uniquement)
Disque lavande ~22 px, opacité 0.9, lerp 0.18. ×2.2 + `mix-blend-mode: difference` au survol des éléments interactifs. Au-dessus d'une bulle : main (`data-cursor="pointer"`), main fermée pendant le glisser (`grabbing`) ; ailleurs sur la scène des bulles : le disque. Curseur natif conservé sur les champs de formulaire.

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
- **Face, plein pied, debout** (théâtre, chemise noire manches courtes, short cargo crème) → référence principale de l'avatar. Plus utilisée pour un détourage (le hero n'affiche aucune photo).
- **3/4 face, assis** (bateau) → détails du visage et de la coiffure. Contient les mains d'une autre personne au premier plan : **ne jamais publier**.
- **Profil, coucher de soleil** (port) → référence de profil uniquement ; lumière orange trop forte pour la texture.

Traits à respecter (photos) : cheveux brun foncé, volumineux sur le dessus, côtés courts (sur l'avatar, la coupe suit désormais les références choisies par Ethan, voir « Avatar ») ; fine moustache et bouc court ; style vestimentaire sombre et simple.

### Avatar
Construction, réglages et régénération des images fixes : voir `docs/AVATAR.md`.

**Refonte « propre et pro » en cours (depuis le 19/10)**, décidée avec Ethan, validée étape par étape (captures avant/après, un commit par étape) : style figurine vinyle premium, proportions inchangées, toujours modélisé en code.
1. Tête et visage — **fait**. Ethan a gardé la **forme du visage et les yeux d'origine** (billes noires brillantes) ; nouveaux sourcils sculptés, nez couleur peau, oreilles en coquille, bouche (pli + lèvre inférieure), moustache fine et bouc en relief aux bords fondus.
2. Cheveux — **fait** après de nombreux essais refusés (mèches fines, boucles, blocs, houppe, coiffé-arrière Funko, pyramides à arêtes, couronne de pointes, mèches plaquées). Validé le 19/10 : côtés et arrière **ras en dégradé**, dessus en **pointes soudées irrégulières** (pas de couronne) inclinées vers l'avant et vers la droite de l'écran, volume modéré, **brun presque noir**, **mèche blanche devant, côté droit du perso**. Ethan n'aime pas : arêtes vives, effet casque/bonnet, couronne régulière, cheveux plaqués en arrière, trop de volume, aspect plastique.
   Visage : **ovale un peu fin** (validé le 19/10, l'original faisait trop triangle).
3. Corps et tenue — **fait** (validé le 21/10) : torse en V sculpté (poitrine, dos plus plat), épaules tombantes (manche = simple tube, **pas de dôme d'épaule : Ethan trouvait que ça faisait armure**), bras et avant-bras à profil anatomique fin (pas « Playmobil »), mains à 4 doigts à 2 phalanges + pouce (`arms.X.fingers`, pour les frappes), chemise noire avec pied de col, pointes de col et ouverture en V (sans trou), patte et boutons, pantalon anthracite à revers, cuisses affinées, sneakers blanches à semelle en forme de pied aux bords arrondis et tige d'une pièce.
4. Lumière et matières — **fait** (validé le 21/10) : éclairage unique `buildLights()` dans `avatar.js`, partagé par `AvatarStage.tsx` et `tools/poster.html` ; principale blanc chaud, remplissage neutre, **violet seulement en léger liseré lavande à l'arrière** (Ethan a demandé moins de violet), plus aucune lumière violette de face. Peau satinée (`MeshPhysicalMaterial` + sheen), tissus mats (`fabric()`).
5. Bureau — **fait** (validé le 21/10) : plateau arrondi sur pieds en cadre métal, tapis, clavier à vraies touches (InstancedMesh, barre d'espace côté utilisateur), souris à droite du perso, écran fin sur pied à plaque, chaise de bureau (accoudoirs, pied étoile à roulettes). Décor sobre demandé par Ethan : lampe d'architecte à lumière chaude, plante en pot, carnet et stylo, mug. Rien ne doit dépasser du plateau.
6. Animations — **fait** (validé le 22/10) : clignement + saccades du regard ; sourire (morphing de la bouche + yeux plissés) au survol de l'avatar dans le hero ; pose assise calculée par optimisation (poignets au-dessus des touches, avant-bras au-dessus du bord du bureau, `SIT_ARM`) et frappes des doigts (`typeFingers`) ; petit salut du bras droit une seule fois après l'intro (`wavePose`, main près du visage pour ne jamais toucher le texte), sauté sous « réduire les animations ». Bouche : **style B** choisi par Ethan (petite bouche nette, plus étroite que la moustache et calée dessous, mouche sous la lèvre ; réglages dans `FACE`).
   Optimisation : avatar ramené de 303 000 à 137 000 triangles (grille des cheveux et du torse allégée, sans perte visible) ; ouverture du col = pièce de peau posée sur le torse (`buildVNeckGeometry`), bord net quelle que soit la finesse du torse.
Budget : qualité d'abord, optimisation après mesure sur le PC d'Ethan. **Refonte terminée le 22/10** : images fixes (`avatar-poster`, `desk-poster` et versions réduites, fond transparent) et `og-image.jpg` régénérées avec le nouvel avatar (`tools/poster.html` puis capture avec fond transparent, voir `docs/AVATAR.md`).

---

## 7. Structure et chorégraphie

**Architecture 3D** : un Canvas R3F **fixe** (plein écran, sous le contenu, `pointer-events: none`) porte l'avatar du Hero jusqu'à « Ce que je fais ». L'avatar est cadré dans des **emplacements DOM** (`data-slot="hero|about|desk"`) via `camera.setViewOffset`, et le rendu est découpé (scissor) à l'emplacement : aucun texte ne peut passer dessous. La progression vient de `src/lib/stageState.ts` (intro, about, travel, desk), écrite par des ScrollTriggers en scrub. Le canvas passe en pause (`frameloop="never"`) dès qu'aucun emplacement n'est à l'écran ou que l'onglet est caché. Le clavier et les bulles ont chacun leur Canvas, montés **au repos après le chargement** (`useIdleMount` : clavier puis bulles) ou à l'approche (`rootMargin: 100%`), préchauffés (`Warmup`) et en pause hors écran. Appareil modeste : pas de scène avatar (images fixes), 5 bulles max.

### 0. Loader (validé par Ethan le 17/10)
**Durée fixe de 1 s à chaque visite** (2 s avant le 30/10 ; Ethan a refusé toute mémoire dans le navigateur pour raccourcir les visites suivantes : zéro traceur ; `DURATION` dans `Loader.tsx` = durée de `.loader--run` dans `main.css`) (progression fictive, voulue pour la mise en scène), puis ouverture `clip-path: inset` verticale 0,6 s. Nom « Ethan Bacquier » en police système très grasse, **barre violette** dessous (remplissage animé en CSS `transform`, fluide même si la page travaille, avec une tête lumineuse), « CHARGEMENT » + compteur 000 → 100 synchronisé sur l'horloge de l'animation CSS (`getAnimations()`). Paliers communs dans `Loader.tsx` (`STEPS`) et `main.css` (`@keyframes loader-progress`) : les modifier ensemble. Pendant ce temps : préchargement des modules 3D et préchauffage des shaders (`src/lib/warm.ts`, `src/three/Warmup.tsx`). Sous « réduire les animations » : sauté. Sans JS : masqué (`noscript.css`), et une animation CSS de secours le retire après 3 s si le script plante.

### 1. Navigation (fixe)
- Gauche : monogramme « EB » (police système, 800) → haut de page
- Centre (≥ 1200 px) : `ethan.bacquier@gmail.com` en petit, clic = copie + toast « Adresse copiée ✓ »
- Droite : À propos · Projets · Contact (ancres via `lenis.scrollTo`)
- Bas droite fixe : « CV » vertical (rotation 90°, verre dépoli) → désactivé « CV · bientôt » tant que `cv.available: false` (masqué sur mobile)
- Mobile : burger plein écran en verre, liens en grand, mention du CV et de l'e-mail ; **on le ferme aussi en le tirant vers le haut** (poignée en bas)
- Repère de position : le lien de la section en cours passe en `--accent` (`aria-current`)

### 2. Hero (100vh)
3 colonnes desktop, avatar au centre (buste, épaules → haut du crâne), lueur radiale derrière.
- Gauche : « Salut, moi c'est » (`--accent`) puis « Ethan / Bacquier » (h1 unique, police système 800, `clamp(2.6rem, 6vw, 5.6rem)`, `-0.04em`, colonne gauche élargie : grille `1.1fr / 1.15fr / 0.92fr`)
- Droite : « Étudiant en » puis mot rotatif « CYBERSÉCURITÉ » ↔ « INFRA ». Sortant : monte de 100 % dans un masque en passant en `--accent` et en perdant l'opacité ; entrant : arrive du bas en `--text`. Cycle 2.6 s, `power3.inOut` 0.7 s. `aria-live="off"` + span sr-only « Étudiant en cybersécurité et infrastructure ».
- Badge : « ● Stage 170 h dès nov. 2026 / Alternance B3 en 2027 » (2 lignes, 2e en `--accent`, point vert doux qui pulse) → scroll vers Disponibilités
- Sous le badge : boutons « Me contacter » (plein) et « Voir mes projets » (contour). Un 3e bouton « CV » quand `cv.available` passera à `true`.
- Avatar : idle qui respire. **Tête** suit le pointeur (os `Head` : yaw ±35°, pitch ±20°, lerp 0.08), yeux aussi si os disponibles. Tactile : balayage lent automatique.
- Intro GSAP : lueur (scale 0.6 → 1), avatar +40 px en fondu, nom mot par mot (stagger 0.08), colonne droite, badge. Nav et badge utilisables pendant l'intro.
- Indicateur de scroll : ligne verticale qui se remplit en boucle.
- **Aucun chevauchement texte/avatar à aucune largeur.**

### 3. À propos (l'avatar reste)
Le contenu du hero glisse vers l'extérieur en fondu (scrub). Avatar à gauche, tête qui suit toujours. À droite :
- Label « À PROPOS »
- Paragraphe (~20 px, passe de `--muted` à `--text` mot à mot au défilement) :
  > Je suis Ethan, étudiant en 2e année de cybersécurité à Ynov Lyon. Ce qui m'attire, c'est de comprendre ce qui s'est passé après une attaque et qui se cache derrière : la réponse à incident (DFIR) et la threat intelligence (CTI). J'aime aussi mettre les mains dans l'infra, parce qu'on défend mieux ce qu'on sait construire. Je m'entraîne sur TryHackMe et Hack The Box, je code (Go, Python, web) et je cherche un premier stage pour apprendre aux côtés d'une vraie équipe, puis une alternance pour ma 3e année.
- Bloc « Hors écran » (carte `--bg-2`, bordure `--line`) : `volley.webp` (4:5, grayscale → couleur au survol) +
  > Hors clavier, je suis libéro en Nationale 3 au Volley Ball Villefranche Beaujolais (VBVB). Lire le jeu avant l'attaque, rester calme sous pression, jouer pour l'équipe : au fond, c'est le même métier.

  + lien Instagram discret (icône Solar + « @ethan.bcqr »). Sans photo : carte texte seule, sans bloc vide.

### 4. Ce que je fais (le perso s'assoit)
Pin ~150vh (≥ 1024 px uniquement) : l'avatar glisse de la colonne « À propos » vers l'emplacement sous le titre (`travel`), puis la caméra passe du buste à une vue de 3/4 arrière par-dessus l'épaule (`desk`) pendant que le bureau, la chaise et l'écran montent du sol ; fondu debout → assis en train de taper (0.5 s, déclenché à 40 % du pin, pas scrubbé). Sous 1024 px : pas de pin, la même séquence suit simplement le défilement. Écran émissif violet avec texture canvas de faux terminal (log crédible qui défile lentement, ex. `[*] volatility -f mem.raw windows.pslist`).
- Gauche : « Ce que » / « je fais » (police système 800, ~7vw)
- Droite : 2 cartes en verre (coins pointillés à équerres jusqu’au 30/10), une seule ouverte à la fois, la 1re par défaut, `<button aria-expanded>` :
  1. **CYBERSÉCURITÉ** — « Analyser, comprendre, remonter la trace. Forensic, analyse de logs et de trafic, threat intel, et CTF pour garder la main. » · DFIR · CTI · Blue team · CTF
  2. **INFRA** — « Monter, configurer et sécuriser des environnements : Linux, Windows Server, Active Directory, réseau, virtualisation et conteneurs. » · Linux · AD · Réseau · Docker
- Sortie : l'emplacement défile avec la page ; le canvas fixe passe en pause quand il n'est plus visible.

### 5. Parcours (timeline lumineuse)
« Mon parcours & » / « mes objectifs » (700, ~5vw, centré). Grille [Intitulé + établissement] | [Année, gros chiffres] | [Description], ligne verticale entre col. 2 et 3, remplie en `--accent-strong` (dégradé + lueur) au scroll, perle lumineuse en tête. Chaque ligne apparaît (fondu + y 30 px) quand la perle la dépasse. Données : `timeline.json`.

### 6. Ma boîte à outils (clavier 3D)
« MA BOÎTE » / « À OUTILS » + « (astuce : survole ou appuie sur une touche) ».
- **Clavier compact réel** (refait le 29/10 avec Ethan, décisions issues d'un grill) dans `KeyboardScene.tsx` :
  - **Boîtier en noyer moyen** (brun noisette, veinage fin dessiné en code `makeWalnutTexture`, finition satinée huilée), **penché** (`TILT` ≈ 6°, plus haut à l'arrière, fond plat), **rebord fin** (`RIM` ≈ 1/3 de touche), bords arrondis ; les touches sont dans un **renfoncement** sur une **plaque gris anthracite mate**. Ethan a refusé : socle noir plat, liseré néon violet, marge large, lueur violette entre les touches, fond violet, bois plus clair (« miel »).
  - **Disposition `ROWS`** (9,5 unités × 5 rangées) : échap · 7 outils · effacer / tab · 7 outils · $ / verr maj · 6 outils · entrée / maj · 6 outils · maj / ctrl · alt · barre d'espace · alt gr · fn. Les 26 outils occupent les touches de lettres dans l'ordre de `skills.json` (si on ajoute un outil, il faut ajouter une place dans `ROWS`). Les touches de modification sont décoratives (gris taupe `MOD_COLOR`, libellé discret en bas à gauche, sans survol). Même disposition sur mobile.
  - **Touches réalistes** (`makeKeyGeometry`) : base plus large que le dessus, dessus creusé d'avant en arrière (cuvette cylindrique), finition mate ; grille régulière arrondie à la main (`RoundedBoxGeometry` n'a pas de sommets au centre des faces). Logos et monogrammes en **blanc cassé** (`INK`) sur une étiquette courbée comme la cuvette ; la lettre du raccourci est en haut à gauche.
  - Rotation du socle `TURN` (bureau -0,26 rad, mobile -0,08 rad) ; le cadrage recule la caméra juste assez pour que le boîtier tienne entier. Lumières neutres et chaudes (le bois doit rester brun), violet seulement en contre-jour. `ContactShadows` hors du groupe qui tourne, sous le biseau du fond.
- Couleurs par catégorie en **tons poudrés mats** (aubergine `#6A4766`, ardoise `#5E6B85`, vieux rose `#B07A86`, lilas `#8F86B3`), identiques dans `skills.json` et `main.css` (`[data-cat]`), + légende cliquable (surbrillance de la catégorie).
- Dessus de keycap : logo (texture SVG → canvas, repeint en blanc cassé) ou monogramme en police système grasse.
- Survol / toucher ou clic (`onPointerDown`, indispensable sur téléphone où il n'y a pas de survol) / touche physique : enfoncement puis remontée `elastic.out`, émissif, onde discrète sur la plaque ; à gauche, gros texte incliné (-12° desktop, -4° mobile, au-dessus du clavier) : nom (police système 800, couleur de la catégorie) + quip + catégorie. Avant toute touche : « 26 outils ». **Sur téléphone (< 768 px), seul le nom s'affiche** (phrase, « Utilisé : … » et catégorie restent pour les lecteurs d'écran) et le clavier prend toute la largeur de l'écran (30/10).
- Hotkeys : seulement si la section est visible **et** qu'aucun champ n'a le focus ; jamais avec Ctrl/Alt/Meta.
- Rotation y au scroll (scrub), amplitude réduite : ±5° bureau, ±3° mobile.
- `<ul>` réelle des compétences dans le DOM (bouton « Voir en liste ») ; c'est la version affichée sous reduced-motion, sans WebGL et sans JS.
- **Rien d'autre que des keycaps sur le clavier** (aucun personnage, aucune mascotte).

### 7. Terrain d'entraînement (refait le 30/10 : tuiles façon widgets iPhone)
Grille de tuiles en verre (`.tiles`, 4 colonnes, 2 sur mobile, `grid-auto-flow: dense`) : grande tuile TryHackMe (« Top 7 % » géant, « Voir le profil ↗ »), petites tuiles Meilleure ligue / Questions résolues / Meilleure série / Certification (en préparation), tuile large Badges, grande tuile Hack The Box (niveau 13 géant + machines nommées), tuile large Parcours en cours. Une valeur `null` retire sa tuile sans laisser de trou. Compteurs animés une fois. Mention « Stats au 17 oct. 2026 ».

### 8. Projets (bulles physiques)
« MES » / « PROJETS » + « Clique sur une bulle pour ouvrir le projet / ou glisse-la dans le socle → ».
**Interaction validée par Ethan le 17/10 (priorité : qu'un recruteur ouvre un projet sans effort)** :
- **Clic (ou tap) sur une bulle = la bulle file dans le socle et la fiche s'ouvre.** Seuil de 6 px avant de considérer un glisser.
- Survol : la bulle grossit légèrement, reste immobile, curseur main, info-bulle « Ouvrir · nom du projet ». **Pas de sphère « pousseur » au survol** (elle éjectait les bulles hors de portée).
- Glisser : la bulle tenue devient cinématique et suit exactement le pointeur (repousse les autres), le socle s'agrandit et s'illumine quand elle passe au-dessus ; lâcher dans le socle (pointeur ou bulle à moins de 1,5 × son rayon) = ouverture ; ailleurs = la bulle repart avec l'élan du geste. Sur tactile (depuis le 24/10) : un toucher qui **commence sur une bulle** l'attrape (`touchstart` non passif + `preventDefault` après lancer de rayon), on peut la glisser dans le socle (seuil 10 px, sinon c'est un tap qui l'ouvre) ; un toucher qui commence ailleurs fait défiler la page.
- **Rangée de boutons toujours visible sous la scène** (« Ou choisis directement : Hera · Cabinet infirmier · VBVB · Power 4 · RedQuest »), état actif sur le projet ouvert.
- Fiche : s'ouvre **à gauche** sur grand écran (la bulle déposée reste visible dans le socle à droite), feuille en bas d'écran sur mobile, **qu'on tire vers le bas pour la fermer** par sa poignée (`useDragToDismiss` : suivi 1:1, élastique vers le haut, fermeture si la projection du geste dépasse la moitié, sinon retour en place au ressort).
- Rapier, gravité faible vers un attracteur centre-gauche. Sphères nacrées (`MeshPhysicalMaterial` blanc cassé, clearcoat 1, roughness 0.25, iridescence violette légère) avec décal du nom/logo du projet. Taille = `size` (Hera ×1.6).
- Socle à droite : torus émissif `--accent`, halo pulsant, « Déposer ici ». Dépôt = la bulle glisse au centre (GSAP) et tourne lentement. Nouveau dépôt = éjection de la précédente.
- Fiche (DOM) : capture 16:10 si dispo, nom, statut, rôle, contexte, description, stack (chips), « Ce que j'ai appris », liens (icônes Solar). Fermer (bouton + Échap) renvoie la bulle dans le nuage. Champs `null` masqués.
- Accessibilité : les boutons visibles sous la scène ouvrent la fiche (animation bulle → socle) ; focus déplacé dans la fiche puis rendu au bouton à la fermeture.
- Reduced-motion / sans WebGL / sans JS : grille de cartes statiques (même contenu).

### 9. Disponibilités
« QUAND » / « JE SUIS DISPO ».
- Gauche : « Stage de 170 h » · « Les matins en semaine · 8h–12h » · « À temps plein pendant les vacances » · « Lyon ou télétravail »
- Droite (refait le 30/10, **façon app Calendrier d'iOS**) : carte en verre, résumé calculé (« 4 semaines à temps plein · sinon les matins (8h–12h) »), **un mois à la fois** partout, titre « Novembre 2026 » + flèches. Jours ronds : matin dispo = chiffre + point violet ; journée complète = pastille `--accent` pleine ; férié (barré), passé, week-end = grisé. Le mois **suit le doigt (ou la souris) 1:1**, résiste à l'élastique aux extrémités et se cale sur le mois voisin avec un ressort qui reprend la vitesse du lâcher (projection d'Apple) ; un glisser vertical fait défiler la page. Mois hors champ `inert`. Sans JS : tous les mois empilés.
- Info-bulle au survol (souris seulement, « Lun. 2 nov. · journée complète »).
- Vrai tableau accessible (`role="grid"`, libellés de jours complets pour lecteurs d'écran).
- Légende + exemple de calcul + « Autres périodes : à définir ensemble ».
- CTA « Me proposer un créneau → » : scroll vers Contact avec objet pré-rempli « Stage 170 h ».
- Bloc « Et après : alternance » : après le calendrier dans le HTML ; sous le calendrier sur téléphone et tablette, sous les infos (colonne de gauche) sur ordinateur (30/10).

### 10. Contact
« Travaillons » / « ensemble » (police système 800, ~9vw, mot par mot, letter-spacing qui se resserre au scroll).
- Gauche : formulaire Web3Forms : Nom*, Email*, Entreprise, Objet (Stage 170 h / Alternance B3 / Autre), Message*, honeypot caché. Validation native + messages en français. États : focus, erreur inline, envoi (spinner, bouton désactivé), succès « Message reçu, je te réponds vite ✓ », échec (message + mailto de secours). « Tes données servent uniquement à te répondre. » Sans JS : `action` HTTP vers Web3Forms avec redirection. Sans clé : mailto à la place du formulaire.
- Droite : liens rapides (icône Solar + libellé + ↗ qui glisse) : Email (copier), LinkedIn, GitHub, TryHackMe, Hack The Box, Discord « tatoune » (copier), CV (désactivé « bientôt »).

### 11. Footer
Encart « Comment ce site est sécurisé » au-dessus (liste dans `Footer.tsx`, `SECURITY`) : uniquement ce qui est réellement en place (aucun tracker/cookie, polices et icônes auto-hébergées, CSP stricte, ligne Web3Forms seulement si `VITE_FORM_KEY`, lien `security.txt`). Ne pas y annoncer HSTS ou `frame-ancestors` tant que le site n'est pas hébergé avec `_headers`.

Témoignages (`Testimonials.tsx`, entre Projets et Disponibilités) : affichés seulement si `testimonials.json` contient des entrées réelles avec `consent: true`. Jamais de témoignage inventé.

Pied : « © 2026 Ethan Bacquier · Fait à Lyon » · « Politique de confidentialité » (`confidentialite.html`) · « Mentions légales » (`mentions-legales.html`) · « Crédits » (modale `<dialog>`, liste en dur dans `Footer.tsx`, à garder alignée avec `CREDITS.md` : avatar et scènes en code, polices, icônes Solar / Simple Icons, bibliothèques) · « Retour en haut ↑ ».

---

## 8. Système de mouvement

**Mise à jour du 30/10** (skills `emil-design-eng` et `apple-design` d'Emil Kowalski, appliqués avec Ethan) :
- Courbes communes CSS / GSAP : `--ease-out` = `out` (0.23, 1, 0.32, 1), `--ease-in-out` = `inOut` (0.77, 0, 0.175, 1), `--ease-drawer` = `drawer` (0.32, 0.72, 0, 1), via `CustomEase` dans `motion.ts` ; plus de `power3`.
- **Ressorts façon Apple** (`src/lib/spring.ts`, réglés en amortissement + réponse, interruptibles, héritent de la vitesse du geste ; `project()` et `rubberband()`) pour les gestes ; `--spring` (CSS `linear()`, amortissement 1, réponse 0,35 s) pour l'ouverture de la fiche et du toast.
- Tout ce qui se presse s'enfonce (`scale(0.97)`, 160 ms). Survols réservés à `(hover: hover) and (pointer: fine)` (sur téléphone ils restaient collés). Sorties plus rapides que les entrées (fiche 0,25 s, toast 0,2 s). Interfaces sous 300 ms ; gestes répétés (texte du clavier, changement de mois) en simple fondu.
- `prefers-reduced-motion` : **plus de figeage total**, mais aucun mouvement (transform non animés), fondus de 0,2 s conservés ; ressorts posés directement à l'état final ; l'indicateur d'envoi du formulaire tourne toujours.
- Mobile : pas de flash au tap, `touch-action: manipulation`, pas de sélection à l'appui long sur les contrôles.

- GSAP = seul moteur des propriétés DOM. `useFrame` seulement pour l'idle 3D, le suivi de tête et la physique. Jamais deux systèmes sur la même propriété.
- Lenis (`lerp: 0.1`, `smoothWheel: true`) ↔ ScrollTrigger. `ScrollTrigger.refresh()` après `document.fonts.ready`, `load` et la fin du chargement. ScrollTrigger est enregistré dès le chargement du module `motion.ts` (les effets des sections s'exécutent avant celui de l'App).
- **Interdit : `scroll-behavior: smooth` sur `html`** (voir §16).
- Titres : mot par mot (`yPercent` 110 → 0 dans un masque, stagger 0.06, `power3.out` 0.9 s). `aria-label` sur le titre, mots découpés `aria-hidden`. Texte complet visible sans JS (le découpage se fait au montage client).
- Un seul pin : « Ce que je fais ». Le reste en reveals simples.
- Easing par défaut `power3.out`, 0.6–0.9 s, rien au-delà de 1.2 s hors scrub.
- Hover/focus simples en CSS (200 ms).

---

## 9. Responsive

- Breakpoints : ≥ 1200 desktop · 768–1199 tablette · < 768 mobile
- Mobile : hero en colonne (avatar en haut), pas de curseur custom, tête en balayage auto, pas de pin, colonne « À propos » sans avatar, timeline 1 colonne ligne à gauche, clavier compact complet (même disposition que sur ordinateur, touches ~32 px) avec le texte au-dessus, bulles tap uniquement + fiche en bottom sheet, calendrier 1 mois (swipe + boutons), formulaire pleine largeur, onglet CV vertical masqué (CV dans le menu).
- Aucun scroll horizontal de page, gouttière ≥ 16 px.
- Appareils faibles (`hardwareConcurrency ≤ 4` ou `deviceMemory ≤ 4`) : images fixes à la place de l'avatar 3D, 5 bulles max.

---

## 10. Accessibilité

- `header` / `nav` / `main` / `section[aria-labelledby]` / `footer`, un seul `h1` (le nom), h2/h3 propres.
- Lien d'évitement « Aller au contenu ».
- Focus visible partout : `outline: 2px solid var(--accent); outline-offset: 3px`.
- Tout le contenu 3D existe en DOM.
- `prefers-reduced-motion: reduce` → pas de Lenis, pas de scrub, pas de pin, aucun déplacement (fondus courts seulement), avatar en image statique, clavier en liste, bulles en grille.
- `prefers-reduced-transparency` / `prefers-contrast: more` → surfaces pleines sans flou.
- Contraste AA (4.5:1 minimum pour le texte courant).
- Lisible et complet sans JavaScript (pré-rendu).

---

## 11. Performance

- DPR : avatar max 1.75 (1.25 mobile), antialias seulement si DPR < 2 (grand canevas plein écran). Clavier : DPR entre 2 et 3 (suréchantillonné sur les écrans 1×, jusqu'à 3× sur téléphone ; demandé par Ethan le 30/10, il le trouvait flou) et antialias ; logos à 60 % du dessus de touche, monogrammes plus gros (78 % de largeur max). Bulles : DPR max 2 et antialias (petits canevas ; à 1,25 ils étaient flous sur les téléphones 3×). Textures des touches en 512 px (512 × 256 par unité pour les touches de modification), des bulles en 2048 × 1024, anisotropie 8.
- Canvases en pause (`frameloop="never"`) hors écran et quand `document.hidden`.
- Pendant les 2 s de chargement : import des modules clavier et bulles + init du WebAssembly Rapier ; compilation de l'avatar et du bureau (caché) derrière l'écran de chargement. Après : montage échelonné des scènes au repos, avec `Warmup` (textures envoyées, `gl.compile`, rendu à blanc sans frustum culling, et une image complète via `advance()` pour l'ombre du clavier). Preload de l'image fixe du hero seulement.
- Mesures du 17/10 (navigateur de test sans GPU) : pendant le défilement, plus aucune compilation de shader ; une seule tâche longue de 58 ms, contre 4 à 5 s avant correction. JS initial ~120 Ko gzip.
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
- Pages annexes (`404.html`, `merci.html`, `confidentialite.html`) : leur propre CSP en `<meta>`, feuille `pages.css`.

---

## 13. SEO

- `<title>` : « Ethan Bacquier · Étudiant en cybersécurité · Ynov Lyon » (raccourci à moins de 60 caractères après l'audit SEO)
- `meta description` : « Étudiant en B2 cybersécurité à Ynov Lyon (DFIR, CTI, infra) : je cherche un stage de 170 h dès novembre, puis une alternance en 2027. » (133 caractères) (120 à 160 caractères, sans troncature)
- `llms.txt`, `404.html`, `confidentialite.html` (RGPD : formulaire de contact) générés ou présents dans `public/`.
- Open Graph + Twitter card (`og-image.jpg`), canonical, favicon « EB » (SVG + PNG 32/180), `robots.txt`, `sitemap.xml` (générés depuis `VITE_SITE_URL`).
- JSON-LD `@graph` : `Person` (`@id` …/#person, alternateName « Tatoune », affiliation Ynov, `sameAs` GitHub, LinkedIn, TryHackMe, HTB) + `WebSite`.
- Audit `seo-audit` du 17/10 sur le build local avec les en-têtes de `_headers` : 91/100 (A). À refaire maintenant que le site est en ligne (pas faisable depuis le conteneur cloud du 23/10 : son proxy bloque `ethanbacquier.github.io`) : `seomator audit <url> --crawl --format llm`, puis avec `--mobile`.

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

### Outils de vérification
- `?debug` dans l'URL expose `window.__stage` (progression du scroll), `window.__stageDebug` (état de la scène avatar) et `window.__bubbles()` (positions écran des bulles et du socle, bulle déposée). Sert aux tests automatisés (Playwright) ; sans effet pour les visiteurs.
- Tests Playwright : la CSP bloque l'évaluation de code ; créer le contexte avec `bypass_csp=True`. Forcer `navigator.hardwareConcurrency` / `deviceMemory` à 8, sinon la machine de test est vue comme « modeste » et la 3D ne se monte pas.
- Le défilement se mesure avec de vraies molettes (`mouse.wheel`), en relevant `scrollY` à chaque image : un défilement sain avance régulièrement, un défilement bloqué reste plat puis saute.

---

## 16. Décisions prises pendant le build (17 oct. 2026)

- **Ne jamais mettre `scroll-behavior: smooth` sur `html`** (même pour la version sans JS) : ScrollTrigger mémorise la valeur au chargement et la réapplique en style inline après chaque recalcul, ce qui bloque Lenis (la page se fige puis rattrape tout d'un coup). Les règles CSS recommandées par Lenis (`.lenis.lenis-smooth { scroll-behavior: auto !important }`) sont dans `main.css`.
- **Préchauffage 3D** : les scènes clavier et bulles sont montées hors écran dès que le navigateur est au repos après le chargement (`useIdleMount`, échelonné), avec compilation des shaders, envoi des textures et un rendu à blanc (`Warmup`). Sans ça, la compilation se terminait au premier affichage, en plein défilement.
- Appareil « modeste » (`hardwareConcurrency ≤ 4` ou `deviceMemory ≤ 4`, comme le brief) : images fixes à la place de l'avatar 3D. Seuil réglable dans `src/App.tsx` si trop de PC portables tombent dedans.
- Les apparitions au défilement utilisent `opacity` (pas `visibility`) : tout reste atteignable au clavier.
- Couleurs de catégorie en double (JSON pour la 3D, CSS `[data-cat]` pour le HTML) : la CSP interdit les attributs `style` dans le HTML pré-rendu.
- Onglet CV vertical masqué sur mobile ; le CV est dans le menu.
- Le formulaire Web3Forms n'apparaît qu'avec `VITE_FORM_KEY` ; sinon bloc « Écris-moi directement ».
- Rendus de l'avatar découpés (scissor) à son emplacement, avec un fondu en bas de l'emplacement pour masquer la coupe : depuis le 23/10, ce fondu est dessiné dans la scène 3D (bande `buildFade` collée à la caméra, hero et À propos), plus en CSS.
- **Canvas de l'avatar transparent aux clics** (corrigé le 24/10) : le conteneur créé par React Three Fiber se remet en `pointer-events: auto`, donc depuis le 23/10 le canevas plein écran de l'avatar (au-dessus de `main`) avalait les clics et les touchers de **toute la page** (boutons, clavier, bulles). Règle `.stage * { pointer-events: none !important }` ; l'avatar n'écoute que `window` (suivi du pointeur), il n'a pas besoin des événements R3F. Test : `document.elementFromPoint` au centre d'un bouton doit renvoyer le bouton, pas un `CANVAS`.
- **Canvas de l'avatar au-dessus du contenu** (`.stage` en `z-index: 2`, `main` en 1), corrigé le 23/10 : avant, la lueur violette du hero (dans `main`) se dessinait par-dessus le visage et le teintait en mauve sur le site (pas dans les images de `tools/poster.html`). Sans risque pour le texte : rendu découpé à l'emplacement. Le canvas reste sous l'en-tête (50), l'onglet CV (40), le toast (90), le curseur (150) et le loader (200).
- Titres découpés (`SplitHeading`) : une espace entre les lignes, pour que le texte brut se lise « Ethan Bacquier » (moteurs de recherche, copier-coller).
- Mot rotatif du hero : le CSS décale le 2e mot (repli sans JS) ; le JS remet ce décalage à zéro (`y: 0`) avant d'animer en `yPercent`.
- Canvas de l'avatar **effacé quand il se met en pause** (`ClearWhenPaused`) et quand aucun emplacement n'est visible : après un saut de défilement, la dernière image (avatar au bureau) restait figée par-dessus la section Outils.
- Mesures de défilement : la machine de test du 17/10 au soir n'a que 2 cœurs, les chiffres absolus ne sont comparables qu'avec un build de référence mesuré sur la même machine.

### Revue design du 24/10 (corrections faites)
- **En-tête** : fond `--bg` à 82 % + flou dès qu'on quitte le haut de page (`site-header--scrolled`), posé sur `::before` (un `backdrop-filter` sur l'en-tête deviendrait le bloc conteneur du menu mobile et de l'onglet CV en `position: fixed`). L'onglet CV se masque quand le pied de page est visible (`site-header--footer`).
- **Clavier 3D** : le cadrage tient compte de la rotation du socle (jusqu'à 0,46 rad) et du raccourci de la plongée ; plus de coin coupé. Scène mobile `min(96vw, 420px)`.
- **Rythme** : sections en `clamp(72px, 10vh, 120px)` ; « À propos » garde `clamp(96px, 14vh, 168px)` en bas (sinon l'avatar collant atteint le titre « Ce que je fais »). Titres de section réduits (`display--xxl` 7.6rem max, `--xl` 6rem, `--lg` 4.4rem) pour que le nom du hero redevienne le titre le plus fort. Sous 1024 px, le hero prend la hauteur de son contenu.
- « Terrain d'entraînement » en en-tête miroir (`section-head--mirror`, ≥ 768 px). Cartes TryHackMe / HTB en `1.3fr / 1fr`, boutons alignés en bas, valeurs « Top 7 % » / « 8 j » avec espaces insécables.
- Bulles : `unit` paysage 0.23 (au lieu de 0.17), scène `clamp(480px, 70vh, 720px)`. Grille statique : la plus grosse bulle (Hera) prend 2 colonnes (`project-card--featured`).
- Contact sans formulaire : la carte « Écris-moi directement » s'étire à la hauteur des liens rapides, contenu centré.
- Lisibilité : plus aucun texte sous 12 px ; liens texte à 32 px de haut minimum (cible tactile), soulignement par `text-decoration` ; liens du pied de page qui passent à la ligne ; calendrier : hachures plus marquées, jours grisés bordés.

### Pistes examinées le 17/10 (grill « améliorations »)
- **Fait** : « Utilisé : … » sur les touches, boutons du hero, alternance B3 mise en avant, « Ce que j'ai appris », encart sécurité, emplacement témoignages.
- **Écarté pour l'instant** (ne pas réintroduire sans demande) : rapports d'exercices détaillés (enquêtes type alerte → recherche → conclusion), bloc « En ce moment », statistiques de visite (le site reste **zéro tracker**), page sécurité dédiée (un encart suffit).

## 17. TODO d'Ethan (mis à jour le 23 oct. 2026, après la mise en ligne)

- [ ] Vérifier sur son PC la fluidité de la 3D (avatar, clavier, bulles) et le nouveau défilement
- [ ] Regarder les animations du nouvel avatar en vrai (`npm run dev`) : salut après l'intro, sourire au survol, frappes au bureau (impossibles à voir en mouvement sur la machine de test)
- [ ] Projets collaborateurs (Groupie Tracker, EscapeQuizz, CineList, YSentinelle) : en `draft`, à rédiger depuis le code et les commits d'Ethan
- [ ] Valider le wording du Bachelor 1
- [ ] Ajouter ses vacances Ynov de mars à juin 2027 dans `availability.json`
- [ ] Photo de volley (`volley.webp`)
- [ ] Captures des projets (16:10)
- [ ] CV PDF puis `cv.available: true` (un ancien `CV_Bacquier_Ethan.pdf` existe sur la branche `v1` (ancien portfolio) : à vérifier avant de le réutiliser)
- [ ] Créer une clé Web3Forms (`VITE_FORM_KEY`)
- [x] Créer l'organisation GitHub gratuite `ethanbacquier`, le repo public `ethanbacquier.github.io`, activer Pages (source : GitHub Actions), puis `git push site v2:main` — **fait le 23/10, site en ligne**
- [ ] Ouvrir https://ethanbacquier.github.io sur PC et sur téléphone pour un dernier coup d'œil (vérifié côté GitHub, pas affichable depuis le conteneur cloud)
- [ ] Relancer l'audit SEO sur le site en ligne (§13)
- [ ] Ajouter la variable de repo `FORM_KEY` une fois la clé Web3Forms créée
- [ ] Confirmer l'accord du cabinet infirmier et du VBVB pour être cités comme projets
- [ ] Plus tard, facultatif : domaine perso `ethanbacquier.fr`
- [ ] Mettre à jour `training.json` de temps en temps
- [ ] Stack du site VBVB ; lien live du cabinet quand il est en ligne
- [ ] Demander de vrais témoignages (prof Ynov, coach de volley, cabinet infirmier) avec accord de publication → `testimonials.json`
- [ ] Monter un homelab (puis on pourra l'ajouter au site)
- [ ] Créer un compte Root-Me, participer au FCSC ou au 404CTF (puis les ajouter dans « Terrain d'entraînement »)
- [ ] Choisir la certification TryHackMe, puis renseigner `certification.name` (la SAL1, analyste SOC, est la plus proche du DFIR/SOC ; la PT1 est offensive)
