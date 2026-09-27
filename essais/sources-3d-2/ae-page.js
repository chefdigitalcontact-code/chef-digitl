(function () {
    'use strict';
    const MAQUETTES = {
        12: { nom: 'Dossier', type: 'Pièces 3D, ivoire' },
        13: { nom: 'Palais', type: 'Colonnade 3D, de nuit' },
        14: { nom: 'Radar', type: 'Veille 3D, bleu nuit' },
        15: { nom: 'Relief', type: 'Lignes 3D, gris perle' },
        16: { nom: 'Textes', type: 'Anneaux de loi 3D' }
    };
    const NUMEROS = [12, 13, 14, 15, 16];
    const site = document.getElementById('site');
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const G = window.gsap, ST = window.ScrollTrigger;
    const aGsap = Boolean(G && ST);
    if (aGsap) G.registerPlugin(ST);
    const choix = document.getElementById('sel-choix');
    const actuel = document.getElementById('sel-actuel');
    let courante = 12, animations = null;

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
        const fin = { opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, rotate: 0, clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'power3.out' };
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

    const TITRES = TOUT + ' h2, .deux-col h2';
    // Pour les éléments qui alternent de sens : leur rang parmi leurs voisins.
    function rang(el) { return el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0; }

    const CHOREGRAPHIES = {
        12: function () {
            entreeTitre(1.2);
            // Sous chaque titre, un filet d'or se trace.
            G.utils.toArray(TITRES).forEach(function (h) {
                G.fromTo(h, { '--trait': 0 }, { '--trait': 1, duration: 1.1, ease: 'power3.inOut', delay: 0.3, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
            });
            apparaitre(TOUT + ', .deux-col > div', { opacity: 0, y: 30 });
            // Les blocs se posent comme des feuilles sur un bureau.
            G.utils.toArray('.stat, .pilier, .carte, .post, .gov-col').forEach(function (el) {
                const r = rang(el);
                G.fromTo(el, { opacity: 0, y: 50, rotate: (r % 2 ? 1 : -1) * 2.5 }, { opacity: 1, y: 0, rotate: 0, duration: 1.1, ease: 'power3.out', delay: (r % 4) * 0.08, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
            });
            apparaitre('.coches li', { opacity: 0, x: -24 });
            // Les numéros sont apposés comme un tampon.
            G.utils.toArray('.gov-n').forEach(function (n) {
                G.fromTo(n, { scale: 2.2, opacity: 0, rotate: -14 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.55, ease: 'back.out(2.2)', delay: 0.45 + (rang(n.parentElement) % 3) * 0.08, scrollTrigger: { trigger: n, start: 'top 88%', once: true } });
            });
            apparaitre('.plan', { opacity: 0, y: 60 });
            apparaitre('.puce', { opacity: 0, y: 14 }, { duration: 0.6 });
            apparaitre('.faq details', { opacity: 0, y: 20 });
            compteurs();
            return aimant('.hero-actions .btn');
        },
        13: function () {
            G.from('.hero h1 .mot-i', { yPercent: 115, duration: 1.6, ease: 'expo.out', stagger: 0.09, delay: 0.3 });
            G.from('.hero-surtitre, .hero .lead, .hero-actions, .hero-preuves li', { y: 22, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.7 });
            G.to('.hero-texte', { yPercent: -8, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
            // Les titres montent derrière leur ligne, lentement.
            G.utils.toArray(TITRES).forEach(function (h) {
                G.fromTo(h, { clipPath: 'inset(0% 0% 100% 0%)', y: 40 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.3, ease: 'power4.out', clearProps: 'clipPath', scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
            });
            apparaitre(TOUT + ' .surtitre, ' + TOUT + ' p:not(.surtitre), .deux-col p, .deux-col .lien-fleche', { opacity: 0, y: 20 });
            // Les trois piliers et les trois offres s'élèvent comme des colonnes.
            apparaitre('.pilier, .plan', { clipPath: 'inset(100% 0% 0% 0% round 0px)' }, { duration: 1.5, ease: 'power4.inOut', clearProps: 'clipPath' });
            apparaitre('.stat, .coches li, .carte, .gov-col, .post, .faq details', { opacity: 0, y: 40 }, { duration: 1.2 });
            apparaitre('.puce', { opacity: 0, y: 14 }, { duration: 0.7 });
            compteurs();
            return aimant('.hero-actions .btn');
        },
        14: function (grand) {
            entreeTitre(1.1);
            apparaitre(TOUT + ', .deux-col > div', { opacity: 0, y: 30 });
            apparaitre('.stat, .pilier, .carte, .post, .faq details, .coches li', { opacity: 0, scale: 0.94 }, { duration: 0.9, ease: 'expo.out' });
            if (grand) {
                // Gouvernance épinglée : prévenir, guérir, sanctionner s'allument à tour de rôle.
                const tl = G.timeline({ scrollTrigger: { trigger: '.gouvernance', start: 'top top', end: '+=110%', pin: true, scrub: 0.6 } });
                tl.fromTo('.gouvernance .gov-col', { opacity: 0.12, y: 50 }, { opacity: 1, y: 0, stagger: 0.5, duration: 0.6, ease: 'power2.out' }, 0);
                tl.fromTo('.gouvernance .gov', { '--balayage': 0 }, { '--balayage': 1, duration: 1.6, ease: 'none' }, 0);
                apparaitre('.premier-contact .gov-col', { opacity: 0, y: 36 });
            } else apparaitre('.gov-col', { opacity: 0, y: 36 });
            apparaitre('.plan', { opacity: 0, y: 50 });
            apparaitre('.puce', { opacity: 0, scale: 0.8 }, { duration: 0.6, ease: 'back.out(2)' });
            compteurs();
            const a = inclinaison('.carte', 8), b = aimant('.hero-actions .btn');
            return function () { a(); b(); };
        },
        15: function () {
            entreeTitre(1.3);
            // Les titres se dévoilent de gauche à droite.
            G.utils.toArray(TITRES).forEach(function (h) {
                G.fromTo(h, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
            });
            apparaitre(TOUT + ' .surtitre, ' + TOUT + ' p:not(.surtitre), .deux-col p, .deux-col .lien-fleche', { opacity: 0, y: 18 });
            apparaitre('.stat', { opacity: 0, y: 40 });
            G.utils.toArray('.stat').forEach(function (s) {
                G.fromTo(s, { '--jauge': 0 }, { '--jauge': 1, duration: 1.6, ease: 'power2.out', delay: 0.2, scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
            });
            apparaitre('.coches li, .pilier, .carte, .gov-col, .post, .faq details', { opacity: 0, y: 40, rotateX: -12 }, { transformPerspective: 900 });
            apparaitre('.plan', { opacity: 0, rotateX: -30, y: 40 }, { transformPerspective: 1100, transformOrigin: '50% 0%' });
            apparaitre('.puce', { opacity: 0, y: 12 }, { duration: 0.6 });
            compteurs();
            const a = inclinaison('.pilier, .carte, .post', 9), b = aimant('.hero-actions .btn');
            return function () { a(); b(); };
        },
        16: function () {
            entreeTitre(1.4);
            // Titres : flous puis nets, comme une page qui vient au point.
            G.utils.toArray(TITRES + ', .bandeau-cta h2').forEach(function (h) {
                G.fromTo(h, { opacity: 0, y: 16, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3, ease: 'power3.out', clearProps: 'filter', scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
            });
            apparaitre(TOUT + ' .surtitre, ' + TOUT + ' p:not(.surtitre), .deux-col p, .deux-col .lien-fleche', { opacity: 0, y: 16 });
            apparaitre('.stat, .coches li, .faq details', { opacity: 0, y: 30 });
            // Les cartes s'ouvrent comme les pages d'un code.
            apparaitre('.pilier, .carte, .gov-col, .post', { opacity: 0, rotateY: -28, x: -20 }, { transformPerspective: 1000, transformOrigin: '0% 50%', duration: 1.2 });
            apparaitre('.plan', { opacity: 0, y: 60, scale: 0.96 });
            apparaitre('.puce', { opacity: 0, y: 12 }, { duration: 0.6 });
            compteurs();
            return aimant('.hero-actions .btn');
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
        try { localStorage.setItem('aegis-maquette-3d-2', String(n)); } catch (e) {}
        if (location.hash !== '#m' + n) history.replaceState(null, '', '#m' + n);
        if (defiler) allerEnHaut();
        window.AE_MAQUETTE = n;
        document.dispatchEvent(new CustomEvent('maquette', { detail: n }));
        requestAnimationFrame(lancerAnimations);
    }

    let depart = 12;
    const h = (location.hash || '').match(/^#m(12|13|14|15|16)$/);
    if (h) depart = Number(h[1]);
    else { try { const s = Number(localStorage.getItem('aegis-maquette-3d-2')); if (NUMEROS.indexOf(s) >= 0) depart = s; } catch (e) {} }
    afficher(depart, false);
    window.addEventListener('load', function () { if (aGsap) ST.refresh(); });
})();
