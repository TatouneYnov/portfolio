// Module des effets interactifs
const InteractiveEffects = {
    init() {
        this.initMagneticElements();
        this.initRippleEffect();
        this.initContactForm();
    },

    initMagneticElements() {
        document.querySelectorAll('.btn-modern, .social-link, .nav-links a').forEach(el => {
            el.addEventListener('mousemove', function (e) {
                const rect = this.getBoundingClientRect();
                const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
                const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
                this.style.transform = `translate(${x}px, ${y}px)`;
            });
            el.addEventListener('mouseleave', function () {
                this.style.transform = 'translate(0, 0)';
            });
        });
    },

    initRippleEffect() {
        const style = document.createElement('style');
        style.textContent = '@keyframes ripple{from{transform:scale(0);opacity:1}to{transform:scale(1.5);opacity:0}}';
        document.head.appendChild(style);

        document.querySelectorAll('.contact-link, .social-link').forEach(link => {
            link.addEventListener('mouseenter', function () {
                const ripple = document.createElement('span');
                ripple.style.cssText = 'position:absolute;width:100%;height:100%;top:0;left:0;background:radial-gradient(circle,rgba(196,255,0,0.3) 0%,transparent 70%);pointer-events:none;animation:ripple 0.6s ease-out';
                this.style.position = 'relative';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
    },

    initContactForm() {
        const contactForm = document.querySelector('.contact-form-modern');
        if (!contactForm) return;

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;
            
            if (name && email && message) {
                const btn = contactForm.querySelector('.btn-modern');
                const originalText = btn.textContent;
                const subject = encodeURIComponent(`Message de ${name} - Portfolio`);
                const body = encodeURIComponent(`Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
                window.location.href = `mailto:ethan.bacquier@ynov.com?subject=${subject}&body=${body}`;
                btn.textContent = '✓ ENVOYÉ';
                btn.style.background = 'var(--accent-color)';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    contactForm.reset();
                }, 2000);
            }
        });
    }
};
