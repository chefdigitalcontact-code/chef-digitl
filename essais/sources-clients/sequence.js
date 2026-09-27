(function () {
    'use strict';
    // Le plat en rotation : une suite d'images photoréalistes (rendues sous Blender, moteur Cycles)
    // lue comme un objet 3D. Il tourne doucement, suit le pointeur et le défilement, et un fondu
    // entre deux images voisines rend le mouvement continu.
    const R = window.SEQUENCE;
    const canvas = document.getElementById('scene-3d');
    if (!R || !canvas) return;
    const boite = canvas.parentElement, ctx = canvas.getContext('2d');
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N = R.images, images = new Array(N), prets = new Array(N).fill(false);
    const nom = function (i) { return R.dossier + '/tour_' + String(i).padStart(2, '0') + '.jpg'; };
    function charger(i) {
        const img = new Image(); img.decoding = 'async';
        img.onload = function () { prets[i] = true; if (i === R.depart) { dessiner(); canvas.classList.add('pret'); } };
        img.src = nom(i); images[i] = img;
    }
    // L'image de départ d'abord, puis les autres par ordre de proximité.
    charger(R.depart);
    for (let k = 1; k <= N / 2; k++) { charger((R.depart + k) % N); if (k < N / 2) charger((R.depart - k + N) % N); }

    // Les photos de la galerie viennent du même tournage.
    function annoncerPhotos() {
        const d = window.CLIENT_DESIGN; if (!d) return;
        const urls = []; for (let k = 0; k < R.photos; k++) urls.push(R.dossier + '/photo_' + k + '.jpg');
        document.dispatchEvent(new CustomEvent('photos', { detail: { n: d.n, urls: urls } }));
    }
    document.addEventListener('maquette', function () { setTimeout(annoncerPhotos, 0); });
    annoncerPhotos();

    let angle = R.depart, cible = 0, pointeur = 0, visible = true, dernier = performance.now(), l = 0, h = 0;
    function taille() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        l = boite.clientWidth; h = boite.clientHeight;
        if (!l || !h) return;
        canvas.width = Math.round(l * ratio); canvas.height = Math.round(h * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        dessiner();
    }
    function peindre(img, alpha) {
        if (!img) return;
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const s = Math.max(l / iw, h / ih) * (R.zoom || 1);
        const dw = iw * s, dh = ih * s;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, (l - dw) * (R.axeX || 0.5), (h - dh) * (R.axeY || 0.5), dw, dh);
    }
    function dessiner() {
        if (!l || !h) return;
        const a = ((angle % N) + N) % N, i0 = Math.floor(a), i1 = (i0 + 1) % N, f = a - i0;
        const base = prets[i0] ? i0 : (prets[i1] ? i1 : R.depart);
        ctx.clearRect(0, 0, l, h);
        if (!prets[base]) return;
        peindre(images[base], 1);
        if (base === i0 && prets[i1] && f > 0.02) peindre(images[i1], f);
        ctx.globalAlpha = 1;
    }
    window.addEventListener('pointermove', function (e) { pointeur = (e.clientX / window.innerWidth - 0.5) * 2; }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(boite);
    if ('ResizeObserver' in window) new ResizeObserver(taille).observe(boite); else window.addEventListener('resize', taille);
    (function boucle(t) {
        requestAnimationFrame(boucle);
        const dt = Math.min(0.05, (t - dernier) / 1000); dernier = t;
        if (!visible || reduit) return;
        // Rotation lente, plus un décalage qui suit le pointeur et le défilement.
        cible += dt * R.vitesse;
        const voulu = cible + pointeur * R.suivi + window.scrollY / 90;
        angle += (R.depart + voulu - angle) * Math.min(1, dt * 4);
        dessiner();
    })(performance.now());
    if (reduit) setTimeout(dessiner, 50);
})();
