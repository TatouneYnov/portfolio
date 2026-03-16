# Portfolio Vue - Bacquier Ethan

Portfolio migre vers Vue 3 avec Vite.

## Stack

- Vue 3
- Vite 5
- CSS existant conserve

## Lancer en local

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

## Structure utile

```text
src/
    App.vue
    main.js
    data/projects.js
public/
    images/
    assets/
    conditions-generales.html
    confidentialite.html
    styles.css
styles.css
index.html
```

## Modifier les projets

Edite `src/data/projects.js` et ajoute un objet dans le tableau `projects`.

## Notes

- Les pages legales sont servies depuis `public/`.
- Les anciens scripts dans `js/` sont conserves pour archive, mais ne sont plus utilises par l'application Vue.
