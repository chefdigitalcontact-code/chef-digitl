(function () {
    'use strict';
    // Ouverture photo : l'image du plat (rendue en photoréalisme sous Blender, moteur Cycles) vit
    // doucement : zoom lent, léger décalage qui suit le pointeur et le défilement, et une touche
    // propre à chaque maquette (braises, pétales, poussière de craie, reflets, vapeur).
    const P = window.PHOTOS_CLIENTS;
    const canvas = document.getElementById('scene-3d');
    if (!P || !canvas) return;
    const boite = canvas.parentElement, ctx = canvas.getContext('2d');
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cache = {};
    let reglage = null, image = null, ancienne = null, fondu = 1, l = 0, h = 0, ratio = 1;
    let px = 0, py = 0, pxv = 0, pyv = 0, t0 = performance.now(), visible = true, particules = [];

    function charger(src) {
        if (cache[src]) return cache[src];
        const img = new Image(); img.decoding = 'async'; img.src = src;
        img.onload = function () { if (reglage && src === reglage.hero) { canvas.classList.add('pret'); dessiner(performance.now()); } };
        cache[src] = img; return img;
    }
    function pret(img) { return img && img.complete && img.naturalWidth > 0; }

    function choisir(d) {
        const r = P[d.n]; if (!r) return;
        if (image && pret(image)) { ancienne = image; fondu = 0; }
        reglage = r; image = charger(r.hero); t0 = performance.now();
        const urls = []; for (let k = 0; k < r.photos; k++) urls.push(r.dossier + '/photo_' + k + '.jpg');
        document.dispatchEvent(new CustomEvent('photos', { detail: { n: d.n, urls: urls } }));
        semer();
        if (pret(image)) canvas.classList.add('pret');
    }
    document.addEventListener('maquette', function (ev) { choisir(ev.detail); });
    if (window.CLIENT_DESIGN) choisir(window.CLIENT_DESIGN);

    function taille() {
        ratio = Math.min(window.devicePixelRatio || 1, 2);
        l = boite.clientWidth; h = boite.clientHeight;
        if (!l || !h) return;
        canvas.width = Math.round(l * ratio); canvas.height = Math.round(h * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        semer(); dessiner(performance.now());
    }

    // ---- Particules ----
    function hasard(a, b) { return a + Math.random() * (b - a); }
    function nouvelle(initiale) {
        const e = reglage.effet;
        const q = { x: hasard(0, l), y: initiale ? hasard(0, h) : h + 10, v: 0, a: 0, r: 1, vie: 0, rot: hasard(0, 6.28), vr: hasard(-1, 1) };
        if (e === 'braises') { q.r = hasard(0.8, 2.2); q.v = hasard(18, 46); q.x = hasard(l * 0.15, l * 0.95); q.a = hasard(0.5, 1); }
        else if (e === 'petales') { q.y = initiale ? hasard(0, h) : -12; q.r = hasard(3.5, 6.5); q.v = hasard(14, 30); q.a = hasard(0.55, 0.9); }
        else if (e === 'craie') { q.r = hasard(0.5, 1.4); q.v = hasard(2, 7); q.a = hasard(0.15, 0.45); q.y = hasard(0, h); }
        else if (e === 'reflets') { q.r = hasard(8, 22); q.v = hasard(3, 8); q.a = hasard(0.05, 0.14); q.y = initiale ? hasard(0, h) : h + 30; }
        else if (e === 'vapeur') { q.r = hasard(18, 38); q.v = hasard(10, 20); q.x = l * (reglage.vapeurX || 0.5) + hasard(-l * 0.1, l * 0.1); q.y = h * (reglage.vapeurY || 0.45) + (initiale ? -hasard(0, h * 0.35) : 0); q.a = 0; q.vie = initiale ? hasard(0, 1) : 0; }
        return q;
    }
    function semer() {
        if (!reglage || !l) return;
        const n = { braises: 34, petales: 16, craie: 60, reflets: 14, vapeur: 9 }[reglage.effet] || 0;
        particules = []; for (let i = 0; i < n; i++) particules.push(nouvelle(true));
    }
    function animerParticules(dt, t) {
        const e = reglage.effet;
        for (let i = 0; i < particules.length; i++) {
            const q = particules[i];
            if (e === 'braises') { q.y -= q.v * dt; q.x += Math.sin(t * 0.0012 + i) * 12 * dt; if (q.y < -10) particules[i] = nouvelle(false); }
            else if (e === 'petales') { q.y += q.v * dt; q.x += (Math.sin(t * 0.0009 + i * 1.7) * 22 - 8) * dt; q.rot += q.vr * dt; if (q.y > h + 12) particules[i] = nouvelle(false); }
            else if (e === 'craie') { q.y -= q.v * dt * 0.4; q.x += Math.sin(t * 0.0004 + i) * 4 * dt; if (q.y < -4) { q.y = h + 4; q.x = hasard(0, l); } }
            else if (e === 'reflets') { q.y -= q.v * dt; if (q.y < -30) particules[i] = nouvelle(false); }
            else if (e === 'vapeur') { q.vie += dt / 6; q.y -= q.v * dt; q.x += Math.sin(t * 0.0007 + i * 2.1) * 10 * dt; q.r += 5 * dt; if (q.vie > 1) particules[i] = nouvelle(false); }
        }
    }
    function peindreParticules(t) {
        const e = reglage.effet;
        ctx.save();
        if (e === 'braises' || e === 'reflets') ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < particules.length; i++) {
            const q = particules[i];
            if (e === 'braises') {
                const s = 0.6 + 0.4 * Math.sin(t * 0.008 + i * 3);
                ctx.globalAlpha = q.a * s * Math.min(1, (h - q.y) / 60);
                ctx.fillStyle = i % 3 ? '#FFB14A' : '#FF7A2A';
                ctx.shadowColor = '#FF8A30'; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
            } else if (e === 'petales') {
                ctx.globalAlpha = q.a; ctx.fillStyle = i % 2 ? '#F7C6D3' : '#F2B3C4';
                ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, 0.55 + 0.35 * Math.sin(t * 0.002 + i));
                ctx.beginPath(); ctx.ellipse(0, 0, q.r, q.r * 0.62, 0, 0, 6.283); ctx.fill(); ctx.restore();
            } else if (e === 'craie') {
                ctx.globalAlpha = q.a * (0.6 + 0.4 * Math.sin(t * 0.001 + i)); ctx.fillStyle = '#F4EFE6';
                ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
            } else if (e === 'reflets') {
                const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
                g.addColorStop(0, 'rgba(255, 196, 110, ' + q.a + ')'); g.addColorStop(1, 'rgba(255, 196, 110, 0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
            } else if (e === 'vapeur') {
                const a = Math.sin(Math.PI * q.vie) * 0.11;
                const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
                g.addColorStop(0, 'rgba(255, 255, 255, ' + a + ')'); g.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
            }
        }
        ctx.restore();
    }

    // ---- Image ----
    function peindre(img, alpha, t) {
        if (!pret(img)) return;
        const iw = img.naturalWidth, ih = img.naturalHeight;
        // Zoom lent d'avant en arrière sur 24 secondes, plus un léger décalage (pointeur, défilement).
        const zoom = (reglage.zoom || 1.04) + (reduit ? 0 : 0.035 * (0.5 - 0.5 * Math.cos((t - t0) / 24000 * 6.283)));
        const s = Math.max(l / iw, h / ih) * zoom;
        const dw = iw * s, dh = ih * s;
        const dx = (l - dw) * (reglage.axeX || 0.5) + px * 14, dy = (h - dh) * (reglage.axeY || 0.5) + py * 10 - Math.min(window.scrollY, 600) * 0.06;
        ctx.globalAlpha = alpha; ctx.drawImage(img, dx, dy, dw, dh);
    }
    function dessiner(t) {
        if (!l || !h || !reglage) return;
        ctx.clearRect(0, 0, l, h);
        if (ancienne && fondu < 1) peindre(ancienne, 1 - fondu, t);
        peindre(image, ancienne && fondu < 1 ? fondu : 1, t);
        // Petite respiration de la lumière (bougie du bistrot, four à bois).
        if (!reduit && reglage.vacille) {
            ctx.globalAlpha = 0.05 + 0.04 * Math.sin(t * 0.004) * Math.sin(t * 0.0107);
            ctx.fillStyle = reglage.vacille; ctx.globalCompositeOperation = 'soft-light'; ctx.fillRect(0, 0, l, h);
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 1;
        if (!reduit) peindreParticules(t);
    }

    window.addEventListener('pointermove', function (e) { pxv = (e.clientX / window.innerWidth - 0.5) * 2; pyv = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(boite);
    if ('ResizeObserver' in window) new ResizeObserver(taille).observe(boite); else window.addEventListener('resize', taille);
    let dernier = performance.now();
    (function boucle(t) {
        requestAnimationFrame(boucle);
        const dt = Math.min(0.05, (t - dernier) / 1000); dernier = t;
        if (!visible || !reglage) return;
        if (ancienne && fondu < 1) { fondu = Math.min(1, fondu + dt / 0.8); if (fondu >= 1) ancienne = null; }
        if (reduit) { if (ancienne || !canvas.dataset.fixe) { dessiner(t); canvas.dataset.fixe = '1'; } return; }
        px += (pxv - px) * Math.min(1, dt * 3); py += (pyv - py) * Math.min(1, dt * 3);
        animerParticules(dt, t);
        dessiner(t);
    })(performance.now());
})();
