/* ===================================
   MORDOR - The Dark Land
   Main JavaScript
   =================================== */

(function () {
    'use strict';

    // --- Particle System (Ember/Ash) ---
    class ParticleSystem {
        constructor(container) {
            this.container = container;
            this.particles = [];
            this.maxParticles = 60;
            this.init();
        }

        init() {
            for (let i = 0; i < this.maxParticles; i++) {
                setTimeout(() => this.createParticle(), Math.random() * 5000);
            }
        }

        createParticle() {
            const particle = document.createElement('div');
            const size = Math.random() * 4 + 1;
            const isEmber = Math.random() > 0.6;

            Object.assign(particle.style, {
                position: 'fixed',
                width: size + 'px',
                height: size + 'px',
                borderRadius: '50%',
                background: isEmber
                    ? `radial-gradient(circle, #ff4500, #ff2200)`
                    : `radial-gradient(circle, #4a3020, #2a1a10)`,
                boxShadow: isEmber ? `0 0 ${size * 2}px rgba(255, 69, 0, 0.4)` : 'none',
                opacity: Math.random() * 0.6 + 0.2,
                pointerEvents: 'none',
                zIndex: '1',
                left: Math.random() * 100 + 'vw',
                top: '100vh',
                transition: 'none',
            });

            this.container.appendChild(particle);

            const duration = Math.random() * 8000 + 6000;
            const swayAmount = Math.random() * 200 - 100;

            const animation = particle.animate([
                {
                    transform: `translate(0, 0) scale(1)`,
                    opacity: particle.style.opacity,
                },
                {
                    transform: `translate(${swayAmount * 0.5}px, -40vh) scale(${0.8 + Math.random() * 0.4})`,
                    opacity: parseFloat(particle.style.opacity) * 0.8,
                },
                {
                    transform: `translate(${swayAmount}px, -100vh) scale(0.2)`,
                    opacity: 0,
                },
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            });

            animation.onfinish = () => {
                particle.remove();
                this.createParticle();
            };
        }
    }

    // --- Navigation ---
    function initNavigation() {
        const nav = document.getElementById('main-nav');
        const toggle = document.getElementById('nav-toggle');
        const links = document.querySelector('.nav-links');
        const navLinks = document.querySelectorAll('.nav-link');

        // Scroll effect
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            nav.classList.toggle('scrolled', scrollY > 50);
            lastScroll = scrollY;
        }, { passive: true });

        // Mobile toggle
        toggle.addEventListener('click', () => {
            links.classList.toggle('open');
            const spans = toggle.querySelectorAll('span');
            const isOpen = links.classList.contains('open');
            spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
            spans[1].style.opacity = isOpen ? '0' : '1';
            spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px, -5px)' : '';
        });

        // Active link tracking
        const sections = document.querySelectorAll('section[id]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                    });
                }
            });
        }, { threshold: 0.3 });

        sections.forEach(s => observer.observe(s));

        // Smooth scroll & close mobile
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                links.classList.remove('open');
            });
        });
    }

    // --- Scroll Reveal ---
    function initScrollReveal() {
        const elements = document.querySelectorAll(
            '.realm-card, .fortress-item, .army-card, .timeline-item'
        );

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');

                    // Animate strength bars
                    const bars = entry.target.querySelectorAll('.strength-fill');
                    bars.forEach(bar => bar.classList.add('animated'));
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        elements.forEach(el => observer.observe(el));
    }

    // --- Lightning Effect ---
    function initLightning() {
        const flash = document.getElementById('lightning-flash');

        function triggerLightning() {
            flash.style.opacity = '1';
            setTimeout(() => { flash.style.opacity = '0'; }, 80);
            setTimeout(() => {
                flash.style.opacity = '0.5';
                setTimeout(() => { flash.style.opacity = '0'; }, 60);
            }, 150);

            // Random next flash
            setTimeout(triggerLightning, Math.random() * 15000 + 8000);
        }

        setTimeout(triggerLightning, Math.random() * 5000 + 3000);
    }

    // --- Eye of Sauron Mouse Tracking ---
    function initEyeTracking() {
        const eye = document.getElementById('sauron-eye');
        if (!eye) return;

        const pupil = eye.querySelector('.eye-pupil');
        if (!pupil) return;

        document.addEventListener('mousemove', (e) => {
            const rect = eye.getBoundingClientRect();
            const eyeCenterX = rect.left + rect.width / 2;
            const eyeCenterY = rect.top + rect.height / 2;

            const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);
            const distance = Math.min(
                Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY) / 20,
                8
            );

            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        });
    }

    // --- Map Tooltips ---
    function initMapTooltips() {
        const tooltip = document.getElementById('map-tooltip');
        if (!tooltip) return;

        const locations = {
            'map-doom': {
                title: 'Mount Doom (Orodruin)',
                desc: 'The volcanic forge where the One Ring was made. Its fires never fully die.',
            },
            'map-barad-dur': {
                title: 'Barad-dûr',
                desc: 'The Dark Tower of Sauron, greatest fortress in Middle-earth.',
            },
            'map-black-gate': {
                title: 'The Black Gate (Morannon)',
                desc: 'The main entrance to Mordor, heavily fortified and guarded.',
            },
            'map-morgul': {
                title: 'Minas Morgul',
                desc: 'The Tower of Dark Sorcery, seat of the Witch-king of Angmar.',
            },
            'map-cirith-ungol': {
                title: 'Cirith Ungol',
                desc: 'The pass guarded by Shelob. A treacherous path into Mordor.',
            },
        };

        Object.keys(locations).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('mouseenter', (e) => {
                const loc = locations[id];
                tooltip.querySelector('h4').textContent = loc.title;
                tooltip.querySelector('p').textContent = loc.desc;
                tooltip.classList.remove('hidden');
            });

            el.addEventListener('mousemove', (e) => {
                const container = document.querySelector('.map-container');
                const rect = container.getBoundingClientRect();
                tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
                tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
            });

            el.addEventListener('mouseleave', () => {
                tooltip.classList.add('hidden');
            });
        });
    }

    // --- Ring Hover Effect ---
    function initRingEffect() {
        const ring = document.getElementById('the-ring');
        if (!ring) return;

        ring.addEventListener('mouseenter', () => {
            ring.querySelector('.ring-band').style.boxShadow = `
                0 0 40px rgba(255, 165, 0, 0.6),
                0 0 80px rgba(255, 165, 0, 0.3),
                inset 0 0 30px rgba(255, 165, 0, 0.4)
            `;
            ring.querySelector('.ring-inscription span').style.opacity = '1';
            ring.querySelector('.ring-inscription span').style.color = '#ff6a00';
        });

        ring.addEventListener('mouseleave', () => {
            ring.querySelector('.ring-band').style.boxShadow = '';
            ring.querySelector('.ring-inscription span').style.opacity = '';
            ring.querySelector('.ring-inscription span').style.color = '';
        });
    }

    // --- Parallax on Hero ---
    function initParallax() {
        const hero = document.querySelector('.hero-content');
        const mountains = document.querySelector('.hero-mountains');

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            if (scrollY < window.innerHeight) {
                const opacity = 1 - scrollY / (window.innerHeight * 0.8);
                hero.style.opacity = Math.max(opacity, 0);
                hero.style.transform = `translateY(${scrollY * 0.3}px)`;
                mountains.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }, { passive: true });
    }

    // --- Ambient Sound Toggle (optional, visual only) ---
    function initAmbientIndicator() {
        // Create a subtle ambient visual in the background
        const body = document.body;
        let hue = 0;

        function ambientShift() {
            hue = (hue + 0.1) % 10;
            const intensity = 0.02 + Math.sin(Date.now() / 3000) * 0.01;
            body.style.backgroundImage = `
                radial-gradient(ellipse at 50% 100%, rgba(255, ${40 + hue}, 0, ${intensity}) 0%, transparent 50%)
            `;
            requestAnimationFrame(ambientShift);
        }

        ambientShift();
    }

    // --- Text Reveal Animation ---
    function initTextReveal() {
        const heroTitle = document.querySelector('.title-main');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroDesc = document.querySelector('.hero-description');
        const ctaBtn = document.querySelector('.cta-button');

        if (heroTitle) {
            heroTitle.style.opacity = '0';
            heroTitle.style.transform = 'translateY(30px)';
            setTimeout(() => {
                heroTitle.style.transition = 'opacity 1.5s, transform 1.5s';
                heroTitle.style.opacity = '1';
                heroTitle.style.transform = 'translateY(0)';
            }, 500);
        }

        if (heroSubtitle) {
            heroSubtitle.style.opacity = '0';
            setTimeout(() => {
                heroSubtitle.style.transition = 'opacity 1.5s';
                heroSubtitle.style.opacity = '1';
            }, 1200);
        }

        if (heroDesc) {
            heroDesc.style.opacity = '0';
            setTimeout(() => {
                heroDesc.style.transition = 'opacity 1.5s';
                heroDesc.style.opacity = '1';
            }, 1800);
        }

        if (ctaBtn) {
            ctaBtn.style.opacity = '0';
            ctaBtn.style.transform = 'translateY(20px)';
            setTimeout(() => {
                ctaBtn.style.transition = 'opacity 1s, transform 1s, color 0.3s, box-shadow 0.3s';
                ctaBtn.style.opacity = '1';
                ctaBtn.style.transform = 'translateY(0)';
            }, 2200);
        }
    }

    // --- Initialize Everything ---
    document.addEventListener('DOMContentLoaded', () => {
        new ParticleSystem(document.getElementById('particle-canvas'));
        initNavigation();
        initScrollReveal();
        initLightning();
        initEyeTracking();
        initMapTooltips();
        initRingEffect();
        initParallax();
        initAmbientIndicator();
        initTextReveal();
    });
})();
