// ===== CANVAS BACKGROUND =====
const canvas = document.getElementById('backgroundCanvas');
const ctx = canvas.getContext('2d');
const particles = [];
const particleCount = 50;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196, 255, 0, ${this.opacity})`;
        ctx.fill();
    }
}

for (let i = 0; i < particleCount; i++) particles.push(new Particle());

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((particle, i) => {
        particle.update();
        particle.draw();
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[j].x - particle.x;
            const dy = particles[j].y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 150) {
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(196, 255, 0, ${0.1 * (1 - distance / 150)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', resizeCanvas);

// ===== NAVIGATION =====
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');
const header = document.querySelector('.header');

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

// ===== HEADER SCROLL =====
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

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - header.offsetHeight,
                behavior: 'smooth'
            });
        }
    });
});

// ===== INTERSECTION OBSERVERS =====
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' };

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

// Apply stagger animation
document.querySelectorAll('.about-stats, .skills-layout').forEach(container => {
    Array.from(container.children).forEach(child => {
        child.style.cssText = 'opacity:0;transform:translateY(80px) scale(0.95);filter:blur(10px);transition:all 1s cubic-bezier(0.16,1,0.3,1)';
    });
    staggerObserver.observe(container);
});

// Apply fade-in animation
document.querySelectorAll('.manifesto, .about-quote, .section-title-large, .contact-item-large, .footer-tagline').forEach(el => {
    el.style.cssText = 'opacity:0;transform:translateY(60px) rotateX(-10deg);filter:blur(5px);transition:all 1.2s cubic-bezier(0.16,1,0.3,1)';
    fadeInObserver.observe(el);
});

// ===== COUNTER ANIMATION =====
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

// ===== PROJECT CARDS =====
const helmetCards = document.querySelectorAll('.helmet-card');
if (helmetCards.length) {
    const helmetsGallery = document.querySelector('.helmets-gallery');
    if (helmetsGallery) {
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
    }

    // Modal functions
    function showProjectDetails(projectId) {
        const details = document.querySelector(`.project-details[data-project-id="${projectId}"]`);
        if (details) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('modal-open');
            setTimeout(() => details.classList.add('active'), 50);
        }
    }

    function hideProjectDetails() {
        const activeDetails = document.querySelector('.project-details.active');
        if (activeDetails) activeDetails.classList.remove('active');
        setTimeout(() => {
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
        }, 500);
    }

    // Holographic card animation (Pokemon-style)
    helmetCards.forEach(card => {
        const projectId = card.dataset.project;
        const helmetImages = card.querySelector('.helmet-images');
        
        const moreInfoBtn = card.querySelector('.btn-more-info');
        if (moreInfoBtn) {
            moreInfoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showProjectDetails(projectId);
            });
        }

        card.addEventListener('mouseenter', () => {
            card.style.setProperty('--active', '1');
            if (helmetImages) {
                helmetImages.style.setProperty('--active', '1');
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--active', '0');
            if (helmetImages) {
                helmetImages.style.setProperty('--active', '0');
            }
            card.style.transition = 'transform 0.5s ease';
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });

        card.addEventListener('mousemove', (e) => {
            if (document.body.classList.contains('modal-open')) return;

            const rect = card.getBoundingClientRect();
            const absolute = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            const percent = {
                x: (100 / rect.width) * absolute.x,
                y: (100 / rect.height) * absolute.y
            };
            const center = {
                x: percent.x - 50,
                y: percent.y - 50
            };

            // Update CSS variables for holographic effect
            card.style.setProperty('--pointer-x', `${percent.x}%`);
            card.style.setProperty('--pointer-y', `${percent.y}%`);
            card.style.setProperty('--pointer-from-center', Math.sqrt(center.x ** 2 + center.y ** 2) / Math.sqrt(50 ** 2 + 50 ** 2));
            
            if (helmetImages) {
                helmetImages.style.setProperty('--pointer-x', `${percent.x}%`);
                helmetImages.style.setProperty('--pointer-y', `${percent.y}%`);
                helmetImages.style.setProperty('--pointer-from-center', Math.sqrt(center.x ** 2 + center.y ** 2) / Math.sqrt(50 ** 2 + 50 ** 2));
            }
            
            // Calculate sparkle gradient
            const angle = Math.atan2(center.y, center.x) * (180 / Math.PI);
            const sparkleColor = `hsla(${(angle + 180) % 360}, 100%, 70%, 0.3)`;
            card.style.setProperty('--sparkle-color', sparkleColor);

            // 3D tilt effect
            const rotateY = (center.x / 50) * 15;
            const rotateX = -(center.y / 50) * 15;
            
            card.style.transition = 'none';
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
    });

    document.querySelectorAll('.btn-close-details').forEach(btn => {
        btn.addEventListener('click', hideProjectDetails);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideProjectDetails();
    });
}

// ===== HERO ANIMATIONS =====
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

// Hero parallax
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

// ===== CONTACT FORM =====
const contactForm = document.querySelector('.contact-form-modern');
if (contactForm) {
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

// ===== MAGNETIC ELEMENTS =====
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

// ===== SCROLL PROGRESS BAR =====
const progressBar = document.createElement('div');
progressBar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:var(--accent-color);z-index:10001;transition:width 0.1s ease;width:0';
document.body.appendChild(progressBar);

window.addEventListener('scroll', () => {
    const scrolled = (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    progressBar.style.width = scrolled + '%';
}, { passive: true });

// ===== LOAD ANIMATIONS =====
window.addEventListener('load', () => {
    const heroBadge = document.querySelector('.hero-badge');
    const heroTagline = document.querySelector('.hero-tagline');
    
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

// ===== RIPPLE EFFECT =====
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
