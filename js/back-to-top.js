// Module bouton retour en haut
const BackToTop = {
    button: null,

    init() {
        this.button = document.getElementById('backToTop');
        if (!this.button) return;

        // Afficher/masquer le bouton au scroll
        window.addEventListener('scroll', () => this.toggleVisibility(), { passive: true });

        // Action au clic
        this.button.addEventListener('click', () => this.scrollToTop());
    },

    toggleVisibility() {
        if (window.pageYOffset > 300) {
            this.button.classList.add('visible');
        } else {
            this.button.classList.remove('visible');
        }
    },

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
};
