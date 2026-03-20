// ========== ASH PARTICLE SYSTEM ==========
const canvas = document.getElementById('ash');
const ctx = canvas.getContext('2d');
let particles = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

class Ash {
    constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.size = Math.random() * 3 + 0.5;
        this.speed = Math.random() * 0.8 + 0.2;
        this.wind = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.flicker = Math.random() * 0.02;
    }
    update() {
        this.y += this.speed;
        this.x += this.wind + Math.sin(this.y * 0.01) * 0.3;
        this.opacity += Math.sin(Date.now() * this.flicker) * 0.005;
        if (this.y > canvas.height + 10) this.reset();
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${150 + Math.random()*50}, ${50 + Math.random()*30}, ${10}, ${Math.max(0, this.opacity)})`;
        ctx.fill();
    }
}

for (let i = 0; i < 80; i++) particles.push(new Ash());

function animateAsh() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateAsh);
}
animateAsh();

// ========== EYE OF SAURON (follows cursor) ==========
const eye = document.getElementById('eye');
const eyeSlit = eye.querySelector('.eye-slit');

document.addEventListener('mousemove', e => {
    const rect = eye.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const dist = Math.min(3, Math.hypot(e.clientX - cx, e.clientY - cy) * 0.01);
    eyeSlit.style.transform = `translateX(${Math.cos(angle) * dist}px) translateY(${Math.sin(angle) * dist}px)`;
});

// ========== NAV SCROLL ==========
const nav = document.getElementById('nav');
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('nav a');

function onScroll() {
    const scrollY = window.scrollY;

    // Nav background
    nav.classList.toggle('scrolled', scrollY > 100);

    // Eye visibility
    eye.classList.toggle('visible', scrollY > window.innerHeight * 0.5);

    // Active nav link
    let current = '';
    sections.forEach(s => {
        if (scrollY >= s.offsetTop - 300) current = s.id;
    });
    navLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ========== SCROLL REVEAL ==========
const revealEls = document.querySelectorAll('.card, .tower-block, .army-card, .decree-scroll, .verse');

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 100);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

revealEls.forEach(el => observer.observe(el));

// ========== POWER BARS ==========
const barObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const fill = entry.target.querySelector('.power-fill');
            if (fill) fill.style.width = fill.dataset.power + '%';
            barObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.army-card').forEach(el => barObserver.observe(el));

// ========== DECREE FORM ==========
document.getElementById('decree-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const realm = document.getElementById('realm-select').value;

    if (!name) {
        shakeElement(document.getElementById('name'));
        return;
    }

    const scroll = document.querySelector('.decree-scroll');
    scroll.innerHTML = `
        <div style="text-align:center;padding:2rem 0">
            <div style="font-size:3rem;color:var(--fire);margin-bottom:1rem;text-shadow:0 0 30px var(--fire-dim)">&#9737;</div>
            <h3 style="font-family:var(--font-head);color:var(--gold);font-size:1.5rem;margin-bottom:1rem">
                It is done, ${escapeHtml(name)}.
            </h3>
            <p style="color:var(--text-dim);line-height:1.8">
                ${realm === 'isengard'
                    ? 'Isengard stands with Mordor. Your loyalty is noted.'
                    : realm === 'shire'
                    ? 'The Shire? How... quaint. Your courage will be useful in the mines.'
                    : 'Your former allegiance is forgotten. You serve the Eye now.'}
            </p>
            <p style="color:var(--fire);font-family:var(--font-head);margin-top:1.5rem;letter-spacing:.1em">
                The Eye sees all. The Eye is pleased.
            </p>
        </div>
    `;
    scroll.classList.add('visible');
});

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake .5s ease';
    el.style.borderColor = 'var(--fire)';
    setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 600);
}

// inject shake keyframes
const style = document.createElement('style');
style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`;
document.head.appendChild(style);

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== PARALLAX HERO ==========
const hero = document.querySelector('.hero-content');
window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) {
        hero.style.transform = `translateY(${y * 0.3}px)`;
        hero.style.opacity = 1 - y / window.innerHeight;
    }
}, { passive: true });

// ========== AMBIENT LAVA GLOW ==========
// Subtle pulsing red glow on the body
const glowStyle = document.createElement('style');
glowStyle.textContent = `
body::after {
    content: '';
    position: fixed;
    bottom: -50%;
    left: 50%;
    transform: translateX(-50%);
    width: 150vw;
    height: 80vh;
    background: radial-gradient(ellipse, rgba(255,68,0,0.03), transparent 70%);
    pointer-events: none;
    z-index: -1;
    animation: lava-ambient 8s ease-in-out infinite alternate;
}
@keyframes lava-ambient {
    from { opacity: 0.5; }
    to { opacity: 1; }
}
`;
document.head.appendChild(glowStyle);
