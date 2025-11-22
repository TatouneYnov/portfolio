// Point d'entrée principal - Initialise tous les modules
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser tous les modules
    CanvasBackground.init();
    Navigation.init();
    ProjectsManager.init();
    Animations.initObservers();
    Animations.initCounters();
    Animations.initHeroAnimation();
    Animations.initHeroParallax();
    Animations.initLoadAnimations();
    InteractiveEffects.init();
    BackToTop.init();
});
