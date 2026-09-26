(function () {
    'use strict';
    const MAQUETTES = {
        7: { nom: 'Bouclier', type: 'Emblème 3D, bleu nuit' },
        8: { nom: 'Constellation', type: 'Réseau de veille 3D' },
        9: { nom: 'Globe', type: 'Globe 3D, trajectoires' },
        10: { nom: 'Sceau', type: 'Sceau d’or 3D, ivoire' },
        11: { nom: 'Balance', type: 'Balance 3D, gris perle' }
    };
    const NUMEROS = [7, 8, 9, 10, 11];
    const site = document.getElementById('site');
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const G = window.gsap, ST = window.ScrollTrigger;
    const aGsap = Boolean(G && ST);
    if (aGsap) G.registerPlugin(ST);
    const choix = document.getElementById('sel-choix');
    const actuel = document.getElementById('sel-actuel');
    let courante = 7, animations = null;

    // Maquettes seulement : les pages internes n'ont pas d'adresse ici.
    document.querySelectorAll('.site a[href="#"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });

    let lenis = null;
    if (!reduit && window.Lenis) {
        lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
        if (aGsap) { lenis.on('scroll', ST.update); G.ticker.add(function (t) { lenis.raf(t * 1000); }); G.ticker.lagSmoothing(0); }
        else { (function f(t) { lenis.raf(t); requestAnimationFrame(f); })(performance.now()); }
    }
    function allerEnHaut() { if (lenis) lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); }

    // Titre : chaque mot glisse depuis son masque ; le surtitre reste d'un seul tenant.
    const titre = document.querySelector('.hero h1');
    function decouper(noeud) {
        Array.from(noeud.childNodes).forEach(function (n) {
            if (n.nodeType === 3) {
                const frag = document.createDocumentFragment();
                n.textContent.split(/(\s+)/).forEach(function (m) {
                    if (!m) return;
                    if (/^\s+$/.test(m)) { frag.appendChild(document.createTextNode(' ')); return; }
                    const o = document.createElement('span'); o.className = 'mot';
                    const i = document.createElement('span'); i.className = 'mot-i'; i.textContent = m;
                    o.appendChild(i); frag.appendChild(o);
                });
                n.replaceWith(frag);
            } else if (n.nodeType === 1 && !n.classList.contains('hero-surtitre')) decouper(n);
        });
    }
    titre.setAttribute('aria-label', titre.textContent.replace(/\s+/g, ' ').trim());
    decouper(titre);

    NUMEROS.forEach(function (n) {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<b>' + n + ' · ' + MAQUETTES[n].nom + '</b><span>' + MAQUETTES[n].type + '</span>';
        b.addEventListener('click', function () { afficher(n, true); });
        choix.appendChild(b);
    });
    function voisine(sens) { const i = NUMEROS.indexOf(courante); return NUMEROS[(i + sens + NUMEROS.length) % NUMEROS.length]; }
    document.getElementById('sel-prec').addEventListener('click', function () { afficher(voisine(-1), true); });
    document.getElementById('sel-suiv').addEventListener('click', function () { afficher(voisine(1), true); });

    const burger = document.getElementById('burger');
    burger.addEventListener('click', function () {
        const ouvert = !site.classList.contains('menu-ouvert');
        site.classList.toggle('menu-ouvert', ouvert);
        burger.setAttribute('aria-expanded', String(ouvert));
    });

    // ---- Outils d'animation (créés tout de suite, annulables au changement de maquette) ----
    function apparaitre(elements, depart, options) {
        const els = G.utils.toArray(elements);
        if (!els.length) return;
        const fin = { opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'power3.out' };
        Object.keys(fin).forEach(function (k) { if (!(k in depart) && ['duration', 'ease'].indexOf(k) < 0) delete fin[k]; });
        els.forEach(function (el, i) {
            const rang = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : i;
            G.fromTo(el, Object.assign({}, depart), Object.assign({}, fin, { delay: (rang % 4) * 0.09, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }, options || {}));
        });
    }
    function compteurs() {
        G.utils.toArray('.stat-v').forEach(function (el) {
            const texte = el.textContent, m = texte.match(/\d+/);
            if (!m) return;
            const cible = Number(m[0]), avant = texte.slice(0, m.index), apres = texte.slice(m.index + m[0].length), o = { v: 0 };
            ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
                G.fromTo(o, { v: 0 }, { v: cible, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = avant + Math.round(o.v) + apres; }, onComplete: function () { el.textContent = texte; } });
            } });
        });
    }
    function entreeTitre(duree) {
        G.from('.hero h1 .mot-i', { yPercent: 115, duration: duree || 1.2, ease: 'expo.out', stagger: 0.06, delay: 0.15 });
        G.from('.hero-surtitre, .hero .lead, .hero-actions, .hero-preuves li', { y: 22, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.3 });
    }
    function inclinaison(selecteur, force) {
        const nettoyages = [];
        G.utils.toArray(selecteur).forEach(function (c) {
            const rx = G.quickTo(c, 'rotateX', { duration: 0.5, ease: 'power3' }), ry = G.quickTo(c, 'rotateY', { duration: 0.5, ease: 'power3' });
            G.set(c, { transformPerspective: 900 });
            const bouge = function (e) { const r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * force); rx((0.5 - (e.clientY - r.top) / r.height) * force * 0.8); };
            const sort = function () { rx(0); ry(0); };
            c.addEventListener('pointermove', bouge); c.addEventListener('pointerleave', sort);
            nettoyages.push(function () { c.removeEventListener('pointermove', bouge); c.removeEventListener('pointerleave', sort); G.set(c, { clearProps: 'transform' }); });
        });
        return function () { nettoyages.forEach(function (f) { f(); }); };
    }
    function aimant(selecteur) {
        const nettoyages = [];
        G.utils.toArray(selecteur).forEach(function (b) {
            const bouge = function (e) { const r = b.getBoundingClientRect(); G.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.32, duration: 0.4, ease: 'power3.out', overwrite: 'auto' }); };
            const sort = function () { G.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' }); };
            b.addEventListener('pointermove', bouge); b.addEventListener('pointerleave', sort);
            nettoyages.push(function () { b.removeEventListener('pointermove', bouge); b.removeEventListener('pointerleave', sort); G.set(b, { clearProps: 'transform' }); });
        });
        return function () { nettoyages.forEach(function (f) { f(); }); };
    }
    const TOUT = 'main > section:not(.hero) .tete';

    const CHOREGRAPHIES = {
        7: function () {
            entreeTitre(1.3);
            apparaitre(TOUT + ', .deux-col > div', { opacity: 0, y: 36 });
            apparaitre('.stat, .coches li, .pilier, .carte, .gov-col, .post, .faq details', { opacity: 0, y: 44 });
            apparaitre('.plan', { opacity: 0, y: 70 }, { duration: 1.2 });
            apparaitre('.puce', { opacity: 0, y: 16 }, { duration: 0.6 });
            compteurs();
            return aimant('.hero-actions .btn');
        },
        8: function (grand) {
            entreeTitre(1.3);
            apparaitre(TOUT + ', .deux-col > div', { opacity: 0, y: 30 });
            apparaitre('.stat, .coches li, .pilier, .gov-col, .plan, .post, .faq details', { opacity: 0, y: 36 });
            apparaitre('.puce', { opacity: 0, scale: 0.85 }, { duration: 0.6, ease: 'back.out(1.8)' });
            compteurs();
            if (grand) {
                const piste = document.querySelector('.cartes');
                const distance = function () { return Math.max(0, piste.scrollWidth - document.documentElement.clientWidth); };
                G.to(piste, { x: function () { return -distance(); }, ease: 'none', scrollTrigger: { trigger: '.expertises', start: 'top top', end: function () { return '+=' + distance(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true } });
            } else {
                apparaitre('.carte', { opacity: 0, y: 36 });
            }
            return aimant('.hero-actions .btn');
        },
        9: function () {
            entreeTitre(1.2);
            G.utils.toArray(TOUT + ' h2, .deux-col h2').forEach(function (h) {
                G.fromTo(h, { clipPath: 'inset(0% 0% 100% 0%)', y: 24 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
            });
            apparaitre('.stat, .coches li, .pilier, .carte, .post, .faq details', { opacity: 0, y: 36 });
            apparaitre('.gov-col', { opacity: 0, y: 40, scale: 0.96 });
            apparaitre('.plan', { opacity: 0, rotateY: -28, x: -24 }, { transformPerspective: 1000, duration: 1.2 });
            apparaitre('.puce', { opacity: 0, scale: 0.7 }, { duration: 0.7, ease: 'back.out(2)' });
            compteurs();
            return aimant('.hero-actions .btn');
        },
        10: function () {
            entreeTitre(1.6);
            apparaitre(TOUT + ', .deux-col > div', { opacity: 0, y: 30 }, { duration: 1.3 });
            apparaitre('.stat, .coches li, .pilier, .carte, .post, .faq details', { opacity: 0, y: 30 }, { duration: 1.2 });
            apparaitre('.gov-n', { opacity: 0, y: 60 }, { duration: 1.4, ease: 'expo.out' });
            apparaitre('.plan', { opacity: 0, rotateX: -35, y: 40 }, { transformPerspective: 1000, duration: 1.3, transformOrigin: '50% 0%' });
            apparaitre('.puce', { opacity: 0, y: 14 }, { duration: 0.7 });
            compteurs();
            return aimant('.hero-actions .btn');
        },
        11: function () {
            entreeTitre(1.2);
            G.utils.toArray(TOUT + ' h2').forEach(function (h, i) {
                G.fromTo(h, { x: i % 2 ? -50 : 50 }, { x: 0, ease: 'none', scrollTrigger: { trigger: h, start: 'top bottom', end: 'top 55%', scrub: true } });
            });
            apparaitre('.deux-col > div', { opacity: 0, y: 30 });
            apparaitre('.stat, .coches li, .pilier, .carte, .gov-col, .post, .faq details', { opacity: 0, y: 40, rotateX: -10 }, { transformPerspective: 900 });
            apparaitre('.plan', { opacity: 0, y: 60 });
            apparaitre('.puce', { opacity: 0, y: 14 }, { duration: 0.6 });
            compteurs();
            const a = inclinaison('.pilier, .carte, .stat', 10), b = aimant('.hero-actions .btn');
            return function () { a(); b(); };
        }
    };

    function lancerAnimations() {
        if (animations) { animations.revert(); animations = null; }
        if (!aGsap || reduit) return;
        animations = G.matchMedia();
        animations.add({ grand: '(min-width: 900px)', petit: '(max-width: 899px)' }, function (ctx) {
            const retirer = CHOREGRAPHIES[courante](ctx.conditions.grand);
            return function () { if (typeof retirer === 'function') retirer(); };
        });
        ST.refresh();
    }

    function afficher(n, defiler) {
        courante = n;
        const ouvert = site.classList.contains('menu-ouvert');
        if (animations) { animations.revert(); animations = null; }
        site.className = 'site m' + n + (ouvert ? ' menu-ouvert' : '');
        choix.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', String(NUMEROS[i] === n)); });
        actuel.innerHTML = '<b>Maquette ' + n + ' · ' + MAQUETTES[n].nom + '</b><span>' + MAQUETTES[n].type + '</span>';
        try { localStorage.setItem('aegis-maquette-3d', String(n)); } catch (e) {}
        if (location.hash !== '#m' + n) history.replaceState(null, '', '#m' + n);
        if (defiler) allerEnHaut();
        window.AE_MAQUETTE = n;
        document.dispatchEvent(new CustomEvent('maquette', { detail: n }));
        requestAnimationFrame(lancerAnimations);
    }

    let depart = 7;
    const h = (location.hash || '').match(/^#m(7|8|9|10|11)$/);
    if (h) depart = Number(h[1]);
    else { try { const s = Number(localStorage.getItem('aegis-maquette-3d')); if (NUMEROS.indexOf(s) >= 0) depart = s; } catch (e) {} }
    afficher(depart, false);
    window.addEventListener('load', function () { if (aGsap) ST.refresh(); });
})();
