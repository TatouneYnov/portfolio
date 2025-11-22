// Module d'animations
const Animations = {
    // Initialise les observers pour les animations au scroll
    initObservers() {
        const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' };

        // Stagger animation
        const staggerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    Array.from(entry.target.children).forEach((child, index) => {
                        setTimeout(() => {
                            child.style.opacity = '1';
                            child.style.transform = 'translateY(0) scale(1)';
                            child.style.filter = 'blur(0px)';
                        }, index * 120);
                    });
                    staggerObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Fade-in animation
        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0) rotateX(0deg)';
                    entry.target.style.filter = 'blur(0px)';
                    fadeInObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Apply animations
        document.querySelectorAll('.about-stats, .skills-layout').forEach(container => {
            Array.from(container.children).forEach(child => {
                child.style.cssText = 'opacity:0;transform:translateY(80px) scale(0.95);filter:blur(10px);transition:all 1s cubic-bezier(0.16,1,0.3,1)';
            });
            staggerObserver.observe(container);
        });

        document.querySelectorAll('.manifesto, .about-quote, .section-title-large, .contact-item-large, .footer-tagline').forEach(el => {
            el.style.cssText = 'opacity:0;transform:translateY(60px) rotateX(-10deg);filter:blur(5px);transition:all 1.2s cubic-bezier(0.16,1,0.3,1)';
            fadeInObserver.observe(el);
        });
    },

    // Animation du compteur de stats
    initCounters() {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                    const target = parseInt(entry.target.dataset.count);
                    let current = 0;
                    const increment = target / 60;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            entry.target.textContent = target + '+';
                            clearInterval(timer);
                        } else {
                            entry.target.textContent = Math.floor(current) + '+';
                        }
                    }, 25);
                    entry.target.classList.add('counted');
                }
            });
        }, { threshold: 0.8 });

        document.querySelectorAll('.stat-number[data-count]').forEach(stat => statsObserver.observe(stat));
    },

    // Animation des lettres du hero
    initHeroAnimation() {
        document.querySelectorAll('.hero-name').forEach((name, nameIndex) => {
            const text = name.textContent;
            name.textContent = '';
            text.split('').forEach((char, index) => {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.cssText = 'opacity:0;display:inline-block;transform:translateY(50px) rotateX(-90deg);transition:all 0.8s cubic-bezier(0.16,1,0.3,1)';
                name.appendChild(span);
                setTimeout(() => {
                    span.style.opacity = '1';
                    span.style.transform = 'translateY(0) rotateX(0)';
                }, (nameIndex * text.length + index) * 60 + 400);
            });
        });
    },

    // Parallax du hero
    initHeroParallax() {
        const heroBg = document.querySelector('.hero-bg');
        const heroContent = document.querySelector('.hero-content');
        const heroScroll = document.querySelector('.hero-scroll');
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrolled = window.pageYOffset;
                    if (scrolled < window.innerHeight) {
                        if (heroBg) {
                            heroBg.style.transform = `translateY(${scrolled * 0.5}px) scale(${1 + scrolled * 0.0002})`;
                            heroBg.style.opacity = 1 - scrolled / window.innerHeight;
                        }
                        if (heroContent) {
                            heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
                            heroContent.style.opacity = 1 - scrolled / (window.innerHeight * 0.7);
                        }
                        if (heroScroll) {
                            heroScroll.style.transform = `translateY(${scrolled * 0.2}px)`;
                            heroScroll.style.opacity = Math.max(0, 1 - scrolled / 300);
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    },

    // Animation au chargement
    initLoadAnimations() {
        window.addEventListener('load', () => {
            const heroBadge = document.querySelector('.hero-badge');
            const heroTagline = document.querySelector('.hero-tagline');
            const heroScroll = document.querySelector('.hero-scroll');
            
            if (heroBadge) {
                heroBadge.style.cssText = 'opacity:0;transform:translateY(-20px)';
                setTimeout(() => {
                    heroBadge.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    heroBadge.style.opacity = '1';
                    heroBadge.style.transform = 'translateY(0)';
                }, 100);
            }
            if (heroTagline) {
                heroTagline.style.opacity = '0';
                setTimeout(() => {
                    heroTagline.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    heroTagline.style.opacity = '1';
                }, 1500);
            }
            if (heroScroll) {
                heroScroll.style.opacity = '0';
                setTimeout(() => {
                    heroScroll.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    heroScroll.style.opacity = '1';
                }, 2000);
            }
        });
    }
};
