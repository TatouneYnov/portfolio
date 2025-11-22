# 🎨 Portfolio - Bacquier Ethan

Portfolio personnel moderne avec animations holographiques et architecture modulaire optimisée.

## 🚀 Architecture

### Structure des fichiers
```
portfolio/
├── index.html              # Page principale
├── styles.css              # Styles CSS optimisés
├── js/                     # Scripts JavaScript modulaires
│   ├── main.js            # Point d'entrée principal
│   ├── config.js          # Configuration des projets
│   ├── templates.js       # Templates HTML dynamiques
│   ├── projects.js        # Gestion des projets
│   ├── canvas.js          # Animation du fond canvas
│   ├── navigation.js      # Navigation et menu
│   ├── animations.js      # Animations au scroll
│   └── interactive.js     # Effets interactifs
├── images/                 # Ressources images
├── conditions-generales.html
├── confidentialite.html
└── README.md              # Documentation
```

### Modules JavaScript

- **CanvasBackground** - Animation de particules en arrière-plan
- **Navigation** - Menu responsive, scroll smooth, barre de progression
- **Animations** - Animations d'apparition au scroll, parallax, compteurs
- **ProjectsManager** - Gestion dynamique des projets avec effet holographique
- **InteractiveEffects** - Effets UI (magnetic, ripple, formulaire contact)
- **Templates** - Génération dynamique du HTML des projets

## 📝 Ajouter un nouveau projet

Éditez `js/config.js` et ajoutez votre projet au tableau `PROJECTS_DATA` :

```javascript
{
    id: 'mon-projet',                      // ID unique
    name: 'Mon Projet',                    // Nom court
    fullName: 'Mon Projet Complet',        // Nom complet pour le modal
    year: '2025',                          // Année
    image: 'images/mon-projet.svg',        // Image du projet
    badge: 'PROJET',                       // Texte du badge holographique
    shortDesc: 'Description courte...',    // Description pour la carte
    fullDesc: 'Description complète...',   // Description pour le modal
    techStack: ['Tech1', 'Tech2'],         // Technologies utilisées
    features: [                            // Liste des fonctionnalités
        'Feature 1',
        'Feature 2'
    ],
    githubUrl: 'https://github.com/...'   // Lien GitHub
}
```

Les cartes et modals se génèrent automatiquement ! ✨

## 🎨 Effet holographique des cartes projets

Inspiré des cartes Pokémon du site https://poke-holo.simey.me/ :
- ✨ Gradients arc-en-ciel dynamiques qui suivent la souris
- 💎 Reflets lumineux holographiques
- 🎭 Rotation 3D immersive
- ⚡ Sparkles colorés changeants
- 🌈 Blend modes CSS avancés (color-dodge, exclusion)

### Technologies de l'effet
- CSS Custom Properties pour les positions dynamiques
- `background-blend-mode` pour les effets de couleur
- `repeating-linear-gradient` pour les patterns holographiques
- `radial-gradient` pour les reflets suivant la souris
- `transform-style: preserve-3d` pour la rotation 3D

## 🎯 Personnalisation

### Couleurs principales
Dans `styles.css`, variables CSS `:root` :

```css
--accent-color: #c4ff00;      /* Vert néon */
--bg-primary: #0a0a0a;        /* Noir profond */
--text-primary: #ffffff;      /* Blanc */
--text-secondary: #a0a0a0;    /* Gris */
```

### Nombre de particules
Dans `js/canvas.js` :
```javascript
particleCount: 50  // Modifier ce nombre
```

## 📱 Responsive Design

Breakpoints optimisés :
- **Mobile** : < 768px (menu hamburger, grille 1 colonne)
- **Tablet** : 768px - 1024px (grille 2 colonnes)
- **Desktop** : > 1024px (grille 3-4 colonnes)

## ⚡ Optimisations

### Performance
- Code modulaire et bien organisé
- Événements avec `{ passive: true }` pour le scroll
- `requestAnimationFrame` pour les animations
- Intersection Observer pour les animations au scroll
- Pas de bibliothèques externes (Vanilla JS)

### SEO
- Balises meta appropriées
- Structure sémantique HTML5
- Images avec attributs `alt`
- Liens avec `rel="noopener noreferrer"`

### Accessibilité
- Labels sur les boutons
- Navigation au clavier
- Contraste des couleurs
- Focus visible

## 🛠️ Technologies

- **HTML5** - Structure sémantique
- **CSS3** - Animations, Grid, Flexbox, Custom Properties
- **JavaScript ES6+** - Modules, classes, arrow functions
- **Canvas API** - Animation de particules
- **Intersection Observer API** - Animations au scroll
- **CSS Blend Modes** - Effets holographiques

## 🚀 Déploiement

Le site est statique et peut être déployé sur :
- **GitHub Pages** : Push vers `main`, activez Pages
- **Netlify** : Drag & drop ou connexion Git
- **Vercel** : Import depuis GitHub
- **Tout hébergeur statique**

Aucune compilation ou build nécessaire !

## 📦 Aucune dépendance

100% Vanilla JavaScript - Aucune bibliothèque externe requise !

## 📄 Licence

© 2025 Bacquier Ethan. Tous droits réservés.

---

**Made with ❤️ and ⚡ by Ethan**
