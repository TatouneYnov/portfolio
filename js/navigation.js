// Module de navigation
const Navigation = {
    init() {
        this.initMobileMenu();
        this.initScrollHeader();
        this.initSmoothScroll();
        this.initScrollProgressBar();
    },

    initMobileMenu() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (!mobileMenuToggle || !navLinks) return;

        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
    },

    initScrollHeader() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            if (currentScroll > 100) {
                header.classList.add('scrolled');
                header.classList.toggle('hidden', currentScroll > lastScroll && currentScroll > 300);
            } else {
                header.classList.remove('scrolled', 'hidden');
            }
            lastScroll = currentScroll;
        }, { passive: true });
    },

    initSmoothScroll() {
        const header = document.querySelector('.header');
        
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - (header ? header.offsetHeight : 0),
                        behavior: 'smooth'
                    });
                }
            });
        });
    },

    initScrollProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:var(--accent-color);z-index:10001;transition:width 0.1s ease;width:0';
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const scrolled = (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            progressBar.style.width = scrolled + '%';
        }, { passive: true });
    }
};
