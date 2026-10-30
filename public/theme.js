// Thème : clair par défaut, sombre seulement si le visiteur l'a choisi avec le bouton de l'en-tête
// (src/lib/theme.ts). Script bloquant dans <head> : le bon thème est posé avant le premier affichage.
(function () {
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#07050C');
    }
  } catch (e) {}
})();
