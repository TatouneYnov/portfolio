const canvas = document.getElementById('backgroundCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const particles = [];
const particleCount = 50;
class Particle {
    constructor() {
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
for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}
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
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');
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
const header = document.querySelector('.header');
let lastScroll = 0;
let scrollTimeout;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 100) {
        header.classList.add('scrolled');
        if (currentScroll > lastScroll && currentScroll > 300) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
    } else {
        header.classList.remove('scrolled', 'hidden');
    }
    lastScroll = currentScroll;
});
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerHeight = header.offsetHeight;
            const targetPosition = target.offsetTop - headerHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};
const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const children = entry.target.children;
            Array.from(children).forEach((child, index) => {
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
const staggerContainers = document.querySelectorAll('.about-images, .about-stats, .skills-layout');
staggerContainers.forEach(container => {
    const children = container.children;
    Array.from(children).forEach(child => {
        child.style.opacity = '0';
        child.style.transform = 'translateY(80px) scale(0.95)';
        child.style.filter = 'blur(10px)';
        child.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
    });
    staggerObserver.observe(container);
});
const animatedElements = document.querySelectorAll(
    '.manifesto, .about-quote, .section-title-large, .contact-item-large, .projects-subtitle, .footer-tagline'
);
animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(60px) rotateX(-10deg)';
    el.style.filter = 'blur(5px)';
    el.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    fadeInObserver.observe(el);
});
function animateCounter(element) {
    const target = parseInt(element.dataset.count);
    let current = 0;
    const increment = target / 60;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + '+';
        }
    }, 25);
}
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
            animateCounter(entry.target);
            entry.target.classList.add('counted');
        }
    });
}, { threshold: 0.8 });
document.querySelectorAll('.stat-number[data-count]').forEach(stat => {
    statsObserver.observe(stat);
});
const helmetCards = document.querySelectorAll('.helmet-card');
if (helmetCards.length > 0) {
    const helmetObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const cards = entry.target.querySelectorAll('.helmet-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0) scale(1)';
                        card.style.filter = 'blur(0px)';
                    }, index * 120);
                });
                helmetObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.02 });
    const helmetsGallery = document.querySelector('.helmets-gallery');
    if (helmetsGallery) {
        helmetCards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(40px) scale(0.95)';
            card.style.filter = 'blur(8px)';
            card.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
        });
        helmetObserver.observe(helmetsGallery);
    }
    // Système de modal pour les détails de projet
    function showProjectDetails(projectId) {
        const details = document.querySelector(`.project-details[data-project-id="${projectId}"]`);
        
        if (details) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('modal-open');
            
            setTimeout(() => {
                details.classList.add('active');
            }, 50);
        }
    }

    function hideProjectDetails() {
        const activeDetails = document.querySelector('.project-details.active');
        
        if (activeDetails) {
            activeDetails.classList.remove('active');
        }
        
        setTimeout(() => {
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
        }, 500);
    }

    // Gestion des événements pour les cartes de projet
    helmetCards.forEach(card => {
        const projectId = card.dataset.project;
        let rect = null;

        // Bouton "En savoir plus"
        const moreInfoBtn = card.querySelector('.btn-more-info');
        if (moreInfoBtn) {
            moreInfoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showProjectDetails(projectId);
            });
        }

        // Mettre à jour le rectangle au mouseenter
        card.addEventListener('mouseenter', () => {
            rect = card.getBoundingClientRect();
        });

        // Mouvement 3D fluide
        card.addEventListener('mousemove', (e) => {
            // Ne pas appliquer l'animation 3D si la modal est ouverte
            if (document.body.classList.contains('modal-open')) {
                return;
            }
            
            // Ne pas appliquer l'animation 3D si on survole la description
            const description = card.querySelector('.project-description');
            if (description && e.target.closest('.project-description')) {
                return;
            }

            if (!rect) rect = card.getBoundingClientRect();

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const centerX = mouseX - rect.width / 2;
            const centerY = mouseY - rect.height / 2;

            const rotateX = (centerY / (rect.height / 2)) * 20;
            const rotateY = (centerX / (rect.width / 2)) * -20;

            card.style.transform = `
                perspective(1000px)
                rotateX(${-rotateX}deg)
                rotateY(${rotateY}deg)
                scale3d(1.08, 1.08, 1.08)
                translateZ(20px)
            `;

            const images = card.querySelectorAll('.helmet-img');
            images.forEach((img, idx) => {
                const depth = idx === 0 ? 1 : 1.1;
                const imgRotateX = rotateX * (idx === 0 ? 0.5 : 1);
                const imgRotateY = rotateY * (idx === 0 ? 0.5 : 1);

                img.style.transform = `
                    perspective(1000px)
                    rotateX(${-imgRotateX}deg)
                    rotateY(${imgRotateY}deg)
                    scale3d(${depth}, ${depth}, ${depth})
                    translateZ(${idx * 15}px)
                `;
            });
        });

        card.addEventListener('mouseleave', () => {
            rect = null;
            card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.transform = '';

            const images = card.querySelectorAll('.helmet-img');
            images.forEach(img => {
                img.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                img.style.transform = '';
            });

            setTimeout(() => {
                card.style.transition = '';
                images.forEach(img => img.style.transition = '');
            }, 600);
        });
    });

    // Gestion des boutons de fermeture
    document.querySelectorAll('.btn-close-details').forEach(btn => {
        btn.addEventListener('click', hideProjectDetails);
    });

    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideProjectDetails();
        }
    });
}
const heroNames = document.querySelectorAll('.hero-name');
heroNames.forEach((name, nameIndex) => {
    const text = name.textContent;
    name.textContent = '';
    name.style.display = 'block';
    text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.opacity = '0';
        span.style.display = 'inline-block';
        span.style.transform = 'translateY(50px) rotateX(-90deg)';
        span.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        name.appendChild(span);
        setTimeout(() => {
            span.style.opacity = '1';
            span.style.transform = 'translateY(0) rotateX(0)';
        }, (nameIndex * text.length + index) * 60 + 400);
    });
});
const heroBg = document.querySelector('.hero-bg');
const heroContent = document.querySelector('.hero-content');
const heroScroll = document.querySelector('.hero-scroll');
let ticking = false;
let scrollPos = 0;
function updateParallax() {
    const scrolled = scrollPos;
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
}
window.addEventListener('scroll', () => {
    scrollPos = window.pageYOffset;
    if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
    }
});
const projectCards = document.querySelectorAll('.project-card-large');
projectCards.forEach(card => {
    card.addEventListener('mouseenter', function () {
        this.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        const cardImage = this.querySelector('.project-image-large');
        if (cardImage) {
            cardImage.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            cardImage.style.transform = 'scale(1.1)';
        }
    });
    card.addEventListener('mouseleave', function () {
        const cardImage = this.querySelector('.project-image-large');
        if (cardImage) {
            cardImage.style.transform = 'scale(1.05)';
        }
    });
});
const skillItems = document.querySelectorAll('.skills-list li');
skillItems.forEach(item => {
    item.addEventListener('mouseenter', function () {
        const allItems = this.parentElement.querySelectorAll('li');
        const index = Array.from(allItems).indexOf(this);
        allItems.forEach((sibling, i) => {
            const distance = Math.abs(i - index);
            const delay = distance * 50;
            setTimeout(() => {
                if (sibling !== this) {
                    sibling.style.transform = 'translateX(5px)';
                    setTimeout(() => {
                        sibling.style.transform = 'translateX(0)';
                    }, 200);
                }
            }, delay);
        });
    });
});
const skillBars = document.querySelectorAll('.skill-progress');
if (skillBars.length > 0) {
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progress = entry.target.getAttribute('data-progress');
                setTimeout(() => {
                    entry.target.style.width = progress + '%';
                }, 200);
                skillObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    skillBars.forEach(bar => {
        skillObserver.observe(bar);
    });
}
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
            const mailtoLink = `mailto:ethan.bacquier@ynov.com?subject=${subject}&body=${body}`;
            window.location.href = mailtoLink;
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
/*
const cursor = document.createElement('div');
cursor.style.cssText = `
    width: 8px;
    height: 8px;
    background: var(--accent-color);
    border-radius: 50%;
    position: fixed;
    pointer-events: none;
    z-index: 10000;
    transition: transform 0.2s ease;
    mix-blend-mode: screen;
`;
document.body.appendChild(cursor);
const cursorFollower = document.createElement('div');
cursorFollower.style.cssText = `
    width: 32px;
    height: 32px;
    border: 2px solid var(--accent-color);
    border-radius: 50%;
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.5;
`;
document.body.appendChild(cursorFollower);
let mouseX = 0, mouseY = 0;
let followerX = 0, followerY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX - 4 + 'px';
    cursor.style.top = mouseY - 4 + 'px';
});
function animateFollower() {
    followerX += (mouseX - followerX) * 0.15;
    followerY += (mouseY - followerY) * 0.15;
    cursorFollower.style.left = followerX - 16 + 'px';
    cursorFollower.style.top = followerY - 16 + 'px';
    requestAnimationFrame(animateFollower);
}
animateFollower();
document.querySelectorAll('a, button, .project-card-large').forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursor.style.transform = 'scale(2)';
        cursorFollower.style.transform = 'scale(1.5)';
        cursorFollower.style.borderColor = 'var(--text-primary)';
    });
    el.addEventListener('mouseleave', () => {
        cursor.style.transform = 'scale(1)';
        cursorFollower.style.transform = 'scale(1)';
        cursorFollower.style.borderColor = 'var(--accent-color)';
    });
});
if (window.innerWidth < 768) {
    cursor.style.display = 'none';
    cursorFollower.style.display = 'none';
}
*/
const magneticElements = document.querySelectorAll('.btn-modern, .social-link, .nav-links a');
magneticElements.forEach(el => {
    el.addEventListener('mousemove', function (e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const moveX = x * 0.3;
        const moveY = y * 0.3;
        this.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
    el.addEventListener('mouseleave', function () {
        this.style.transform = 'translate(0, 0)';
    });
});
const createScrollProgress = () => {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: var(--accent-color);
        z-index: 10001;
        transition: width 0.1s ease;
        width: 0;
    `;
    document.body.appendChild(progressBar);
    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = (window.pageYOffset / windowHeight) * 100;
        progressBar.style.width = scrolled + '%';
    });
};
createScrollProgress();
window.addEventListener('load', () => {
    const heroBadge = document.querySelector('.hero-badge');
    const heroTagline = document.querySelector('.hero-tagline');
    const heroScroll = document.querySelector('.hero-scroll');
    if (heroBadge) {
        heroBadge.style.opacity = '0';
        heroBadge.style.transform = 'translateY(-20px)';
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
const aboutImages = document.querySelectorAll('.about-img');
aboutImages.forEach((img, index) => {
    img.style.transform = 'scale(0.8)';
    img.style.opacity = '0';
    img.style.clipPath = 'inset(0 50% 0 50%)';
});
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
                entry.target.style.transform = 'scale(1)';
                entry.target.style.opacity = '1';
                entry.target.style.clipPath = 'inset(0 0% 0 0%)';
            }, index * 150);
            imageObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.2 });
aboutImages.forEach(img => imageObserver.observe(img));
const interactiveLinks = document.querySelectorAll('.contact-link, .social-link');
interactiveLinks.forEach(link => {
    link.addEventListener('mouseenter', function (e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            background: radial-gradient(circle, rgba(196, 255, 0, 0.3) 0%, transparent 70%);
            pointer-events: none;
            animation: ripple 0.6s ease-out;
        `;
        this.style.position = 'relative';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        from { transform: scale(0); opacity: 1; }
        to { transform: scale(1.5); opacity: 0; }
    }
`;
document.head.appendChild(style);
