// Module de gestion des projets
const ProjectsManager = {
    // Génère les cartes projets
    renderProjects() {
        const gallery = document.querySelector('.helmets-gallery');
        if (!gallery) return;

        const cardsHTML = PROJECTS_DATA.map(project => Templates.projectCard(project)).join('');
        gallery.innerHTML = cardsHTML;
    },

    // Génère les modals
    renderModals() {
        const projectsSection = document.querySelector('#projects');
        if (!projectsSection) return;

        const modalsHTML = PROJECTS_DATA.map(project => Templates.projectModal(project)).join('');
        projectsSection.insertAdjacentHTML('afterend', modalsHTML);
    },

    // Initialise les animations des cartes
    initCardsAnimation() {
        const helmetsGallery = document.querySelector('.helmets-gallery');
        const helmetCards = document.querySelectorAll('.helmet-card');
        
        if (!helmetsGallery || !helmetCards.length) return;

        helmetCards.forEach(card => {
            card.style.cssText = 'opacity:0;transform:translateY(40px) scale(0.95);filter:blur(8px);transition:all 1.2s cubic-bezier(0.16,1,0.3,1)';
        });
        
        const helmetObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const cards = entry.target.querySelectorAll('.helmet-card');
                    cards.forEach((card, index) => {
                        setTimeout(() => {
                            card.style.cssText = 'opacity:1;transform:translateY(0) scale(1);filter:blur(0px);transition:all 1.2s cubic-bezier(0.16,1,0.3,1)';
                        }, index * 120);
                    });
                    helmetObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.02 });
        
        helmetObserver.observe(helmetsGallery);
    },

    // Gestion des modals
    showModal(projectId) {
        const modal = document.querySelector(`.project-details[data-project-id="${projectId}"]`);
        if (modal) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('modal-open');
            setTimeout(() => modal.classList.add('active'), 50);
        }
    },

    hideModal() {
        const activeModal = document.querySelector('.project-details.active');
        if (activeModal) activeModal.classList.remove('active');
        setTimeout(() => {
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
        }, 500);
    },

    // Initialise l'effet holographique des cartes
    initHolographicEffect() {
        const helmetCards = document.querySelectorAll('.helmet-card');
        
        helmetCards.forEach(card => {
            const projectId = card.dataset.project;
            const helmetImages = card.querySelector('.helmet-images');
            
            const moreInfoBtn = card.querySelector('.btn-more-info');
            if (moreInfoBtn) {
                moreInfoBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showModal(projectId);
                });
            }

            card.addEventListener('mouseenter', () => {
                card.style.setProperty('--active', '1');
                if (helmetImages) helmetImages.style.setProperty('--active', '1');
            });

            card.addEventListener('mouseleave', () => {
                card.style.setProperty('--active', '0');
                if (helmetImages) helmetImages.style.setProperty('--active', '0');
                card.style.transition = 'transform 0.5s ease';
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            });

            card.addEventListener('mousemove', (e) => {
                if (document.body.classList.contains('modal-open')) return;

                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const percentX = (100 / rect.width) * x;
                const percentY = (100 / rect.height) * y;
                const centerX = percentX - 50;
                const centerY = percentY - 50;

                // Mise à jour des variables CSS pour l'effet holographique
                const pointerFromCenter = Math.sqrt(centerX ** 2 + centerY ** 2) / Math.sqrt(50 ** 2 + 50 ** 2);
                card.style.setProperty('--pointer-x', `${percentX}%`);
                card.style.setProperty('--pointer-y', `${percentY}%`);
                card.style.setProperty('--pointer-from-center', pointerFromCenter);
                
                if (helmetImages) {
                    helmetImages.style.setProperty('--pointer-x', `${percentX}%`);
                    helmetImages.style.setProperty('--pointer-y', `${percentY}%`);
                    helmetImages.style.setProperty('--pointer-from-center', pointerFromCenter);
                }
                
                // Gradient sparkle
                const angle = Math.atan2(centerY, centerX) * (180 / Math.PI);
                const sparkleColor = `hsla(${(angle + 180) % 360}, 100%, 70%, 0.3)`;
                card.style.setProperty('--sparkle-color', sparkleColor);

                // Effet 3D tilt
                const rotateY = (centerX / 50) * 15;
                const rotateX = -(centerY / 50) * 15;
                card.style.transition = 'none';
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });
        });

        // Gestion fermeture modal
        document.querySelectorAll('.btn-close-details').forEach(btn => {
            btn.addEventListener('click', () => this.hideModal());
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideModal();
        });
    },

    // Initialise tout
    init() {
        this.renderProjects();
        this.renderModals();
        this.initCardsAnimation();
        this.initHolographicEffect();
    }
};
