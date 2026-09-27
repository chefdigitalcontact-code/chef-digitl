(function () {
    'use strict';
    const MAQUETTES = {
        12: { nom: 'Carte', type: 'Menu 3D qui se déplie' },
        13: { nom: 'Néon', type: 'Enseigne 3D, sombre' },
        14: { nom: 'Apesanteur', type: 'Ingrédients 3D, blanc' },
        15: { nom: 'Plan de salle', type: 'Salle 3D, réservations' },
        16: { nom: 'Métamorphose', type: 'Particules, lie-de-vin' }
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

    // ---- Défilement doux ----
    let lenis = null;
    if (!reduit && window.Lenis) {
        lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
        if (aGsap) { lenis.on('scroll', ST.update); G.ticker.add(function (t) { lenis.raf(t * 1000); }); G.ticker.lagSmoothing(0); }
        else { (function f(t) { lenis.raf(t); requestAnimationFrame(f); })(performance.now()); }
    }
    function allerEnHaut() { if (lenis) lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); }

    // ---- Titre découpé en mots (chaque mot glisse depuis son masque) ----
    const titre = document.querySelector('.hero-titre');
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
            } else if (n.classList && n.classList.contains('insecable')) {
                const o = document.createElement('span'); o.className = 'mot';
                const i = document.createElement('span'); i.className = 'mot-i'; i.textContent = n.textContent;
                o.appendChild(i); n.replaceWith(o);
            } else if (n.nodeType === 1) decouper(n);
        });
    }
    titre.setAttribute('aria-label', titre.textContent.replace(/\s+/g, ' ').trim());
    decouper(titre);

    // ---- Sélecteur ----
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

    // ---- Outils d'animation ----
    function apparaitre(elements, depart, options) {
        // Une animation par élément, créée tout de suite : le changement de maquette peut ainsi
        // tout annuler proprement (gsap.matchMedia().revert()).
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
            const texte = el.textContent, m = texte.match(/-?\d+(?:[.,]\d+)?/);
            if (!m) return;
            const cible = parseFloat(m[0].replace(',', '.')), avant = texte.slice(0, m.index), apres = texte.slice(m.index + m[0].length);
            const dec = (m[0].split(/[.,]/)[1] || '').length, o = { v: 0 };
            ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
                G.fromTo(o, { v: 0 }, { v: cible, duration: 1.6, ease: 'power2.out', onUpdate: function () { el.textContent = avant + o.v.toFixed(dec).replace('.', ',') + apres; }, onComplete: function () { el.textContent = texte; } });
            } });
        });
    }
    function entreeTitre(duree) {
        G.from('.hero-titre .mot-i', { yPercent: 115, duration: duree || 1.1, ease: 'expo.out', stagger: 0.045, delay: 0.1 });
        G.from('.hero .surtitre, .hero-chapo, .hero-actions, .hero-garanties', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.35 });
        G.from('.exemples', { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', delay: 0.6 });
    }
    // Survol : inclinaison 3D qui suit le curseur. Renvoie de quoi retirer les écouteurs.
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
            const bouge = function (e) { const r = b.getBoundingClientRect(); G.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.38, duration: 0.4, ease: 'power3.out', overwrite: 'auto' }); };
            const sort = function () { G.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' }); };
            b.addEventListener('pointermove', bouge); b.addEventListener('pointerleave', sort);
            nettoyages.push(function () { b.removeEventListener('pointermove', bouge); b.removeEventListener('pointerleave', sort); G.set(b, { clearProps: 'transform' }); });
        });
        return function () { nettoyages.forEach(function (f) { f(); }); };
    }

    // ---- Une chorégraphie par maquette ----
    function entreeHero(retard) {
        G.from('.hero .surtitre, .hero-chapo, .hero-actions, .hero-garanties', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: retard || 0.35 });
        G.from('.exemples', { y: 50, opacity: 0, duration: 1.1, ease: 'power3.out', delay: (retard || 0.35) + 0.25 });
    }
    // Un titre qui s'allume comme un néon : quelques ratés, puis la lumière tient.
    function allumer(cible, declencheur, retard) {
        const tl = G.timeline(declencheur ? { scrollTrigger: { trigger: declencheur, start: 'top 85%', once: true } } : { delay: retard || 0 });
        tl.fromTo(cible, { opacity: 0.1 }, { opacity: 1, duration: 0.05 })
            .to(cible, { opacity: 0.25, duration: 0.07 })
            .to(cible, { opacity: 1, duration: 0.05 })
            .to(cible, { opacity: 0.45, duration: 0.1, delay: 0.1 })
            .to(cible, { opacity: 1, duration: 0.3 });
    }
    const CHOREGRAPHIES = {
        12: function () {
            entreeTitre(1.2);
            apparaitre('main > section:not(.hero) .tete', { opacity: 0, y: 30 });
            // Les chiffres s'écrivent de gauche à droite, comme à l'encre.
            apparaitre('.stat', { opacity: 0, clipPath: 'inset(0% 100% 0% 0% round 0px)' }, { duration: 1.3, ease: 'power3.inOut', clearProps: 'clipPath' });
            // Étapes empilées comme les pages d'une carte : la précédente recule quand la suivante arrive.
            const etapes = G.utils.toArray('.etape');
            etapes.forEach(function (e, i) {
                const suivante = etapes[i + 1];
                if (suivante) G.fromTo(e, { scale: 1, opacity: 1 }, { scale: 0.93, opacity: 0.5, ease: 'none', scrollTrigger: { trigger: suivante, start: 'top 85%', end: 'top 30%', scrub: true } });
            });
            apparaitre('.inclus-item', { opacity: 0, y: 24 });
            // Les forfaits s'ouvrent comme une page qu'on tourne.
            apparaitre('.offre', { opacity: 0, rotateY: -70 }, { transformPerspective: 1400, transformOrigin: '0% 50%', duration: 1.3 });
            apparaitre('.faq details', { opacity: 0, y: 20 });
            apparaitre('.pied-cta h2, .pied-cta p, .pied-cta .btn', { opacity: 0, y: 24 });
            compteurs();
            return aimant('.hero-actions .btn, .pied-cta .btn');
        },
        13: function () {
            entreeTitre(0.9);
            allumer('.hero-accent', null, 1.1);
            G.utils.toArray('main > section:not(.hero) .tete h2, .pied-cta h2').forEach(function (h) { allumer(h, h); });
            apparaitre('main > section:not(.hero) .surtitre, .tete-sous', { opacity: 0, y: 12 });
            apparaitre('.stat', { opacity: 0, y: 40 });
            apparaitre('.etape', { opacity: 0, x: -40 });
            apparaitre('.inclus-item', { opacity: 0, scale: 0.95 });
            apparaitre('.offre', { opacity: 0, y: 60, scale: 0.96 });
            apparaitre('.faq details', { opacity: 0, y: 20 });
            compteurs();
            return aimant('.hero-actions .btn, .pied-cta .btn');
        },
        14: function (grand) {
            G.from('.hero-titre .mot-i', { yPercent: 120, rotate: function () { return G.utils.random(-14, 14); }, duration: 1.3, ease: 'back.out(1.5)', stagger: 0.05, delay: 0.1 });
            entreeHero(0.4);
            apparaitre('main > section:not(.hero) .tete', { opacity: 0, y: 40 });
            G.utils.toArray('main > section:not(.hero) .tete h2').forEach(function (h) {
                G.fromTo(h, { y: 30 }, { y: -20, ease: 'none', scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true } });
            });
            // Les cartes arrivent en flottant, puis continuent de dériver doucement.
            G.utils.toArray('.stat, .etape, .inclus-item, .offre').forEach(function (el, i) {
                const rang = Array.prototype.indexOf.call(el.parentElement.children, el);
                G.fromTo(el, { opacity: 0, y: 90, rotate: (i % 2 ? 1 : -1) * G.utils.random(3, 7) }, { opacity: 1, y: 0, rotate: 0, duration: 1.5, ease: 'elastic.out(1, 0.8)', delay: (rang % 3) * 0.08, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
                if (grand) G.to(el, { yPercent: G.utils.random(-3, 3), duration: G.utils.random(2.6, 4), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: G.utils.random(0, 2) });
            });
            apparaitre('.faq details', { opacity: 0, y: 24 });
            compteurs();
            return aimant('.hero-actions .btn, .pied-cta .btn');
        },
        15: function (grand) {
            entreeTitre(1);
            // Les surtitres se tapent lettre à lettre, comme une étiquette de plan.
            G.utils.toArray('main > section:not(.hero) .surtitre').forEach(function (s) {
                G.fromTo(s, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'steps(20)', clearProps: 'clipPath', scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
            });
            apparaitre('main > section:not(.hero) .tete h2, .tete-sous', { opacity: 0, y: 30 });
            apparaitre('.stat', { opacity: 0, y: 30 });
            // Le trait qui relie les trois étapes se trace au défilement.
            if (grand) G.fromTo('.etapes-liste', { '--trace': 0 }, { '--trace': 1, ease: 'none', scrollTrigger: { trigger: '.etapes-liste', start: 'top 80%', end: 'bottom 60%', scrub: true } });
            apparaitre('.etape', { opacity: 0, y: 40 });
            apparaitre('.inclus-item', { opacity: 0, scale: 0.92 }, { ease: 'back.out(1.6)' });
            apparaitre('.offre', { opacity: 0, y: 70 });
            apparaitre('.faq details', { opacity: 0, x: -20 });
            compteurs();
            const a = inclinaison('.offre', 8), b = aimant('.hero-actions .btn, .pied-cta .btn');
            return function () { a(); b(); };
        },
        16: function (grand) {
            G.from('.hero-titre .mot-i', { yPercent: 115, opacity: 0, filter: 'blur(10px)', duration: 1.4, ease: 'expo.out', stagger: 0.05, delay: 0.15 });
            entreeHero(0.45);
            // Les titres se forment comme les points de la scène : flous, puis nets.
            G.utils.toArray('main > section:not(.hero) .tete h2, .pied-cta h2').forEach(function (h) {
                G.fromTo(h, { opacity: 0, filter: 'blur(12px)', scale: 0.96 }, { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 1.4, ease: 'expo.out', clearProps: 'filter', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
            });
            apparaitre('main > section:not(.hero) .tete .surtitre, .tete-sous', { opacity: 0, y: 16 });
            apparaitre('.stat', { opacity: 0, y: 40 });
            G.utils.toArray('.etape').forEach(function (e, i) {
                G.fromTo(e, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.4, delay: i * 0.12, ease: 'power3.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: e, start: 'top 88%', once: true } });
            });
            apparaitre('.inclus-item', { opacity: 0, y: 30, scale: 0.96 });
            if (grand) {
                // Section Tarifs épinglée : les trois forfaits montent l'un après l'autre.
                const tl = G.timeline({ scrollTrigger: { trigger: '.tarifs', start: 'top top', end: '+=80%', pin: true, scrub: 0.8 } });
                tl.fromTo('.offre', { opacity: 0, y: 140, rotateX: -32, transformPerspective: 1200 }, { opacity: 1, y: 0, rotateX: 0, stagger: 0.25, duration: 1, ease: 'power2.out' });
            } else apparaitre('.offre', { opacity: 0, y: 60 });
            apparaitre('.faq details', { opacity: 0, y: 20 });
            compteurs();
            return aimant('.hero-actions .btn, .pied-cta .btn');
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
        try { localStorage.setItem('cd-maquette-3d-2', String(n)); } catch (e) {}
        if (location.hash !== '#m' + n) history.replaceState(null, '', '#m' + n);
        if (defiler) allerEnHaut();
        window.CD_MAQUETTE = n;
        document.dispatchEvent(new CustomEvent('maquette', { detail: n }));
        manege.reinitialiser();
        requestAnimationFrame(lancerAnimations);
    }

    // ---- Manège des exemples (bande qui défile, identique au site) ----
    const manege = (function () {
        const racine = document.getElementById('exemples');
        const fenetre = racine.querySelector('.ex-fenetre');
        const cartes = Array.from(racine.querySelectorAll('.ex-carte'));
        const n = cartes.length;
        let largeurF = 0, largeurC = 0, pas = 0, decalage = 0, trajet = null, survol = false, saisie = null, clicBloque = false, visible = true, instant = null;
        function mesurer() {
            largeurF = fenetre.clientWidth;
            const parVue = largeurF >= 1024 ? 3 : largeurF >= 640 ? 2 : 1.15, ecart = largeurF >= 640 ? 24 : 16;
            largeurC = (largeurF - ecart * (parVue - 1)) / parVue;
            pas = largeurC + ecart;
            racine.style.setProperty('--ex-ecart', ecart + 'px');
            racine.style.setProperty('--ex-l', largeurC + 'px');
            placer();
        }
        function placer() {
            const tour = n * pas;
            cartes.forEach(function (c, i) {
                let x = ((i * pas - decalage) % tour + tour) % tour;
                if (x >= tour - pas) x -= tour;
                c.style.transform = 'translate3d(' + (x - i * pas).toFixed(2) + 'px,0,0)';
                const hors = x < -largeurC / 2 || x > largeurF - largeurC / 2;
                if (c.inert !== hors) c.inert = hors;
            });
        }
        function tourner(t) {
            const dt = instant === null ? 0 : Math.min(t - instant, 64) / 1000;
            instant = t;
            if (trajet) {
                const p = Math.min(1, (t - trajet.debut) / trajet.duree);
                decalage = trajet.de + (trajet.vers - trajet.de) * (1 - Math.pow(1 - p, 3));
                if (p === 1) trajet = null;
            } else if (!survol && !saisie && !reduit) decalage += 30 * dt;
            placer();
            if (visible) requestAnimationFrame(tourner); else instant = null;
        }
        function avancer(sens) { trajet = { de: decalage, vers: Math.round(decalage / pas) * pas + sens * pas, debut: performance.now(), duree: reduit ? 1 : 650 }; }
        racine.querySelector('.ex-prec').addEventListener('click', function () { avancer(-1); });
        racine.querySelector('.ex-suiv').addEventListener('click', function () { avancer(1); });
        racine.addEventListener('mouseenter', function () { survol = true; });
        racine.addEventListener('mouseleave', function () { survol = false; });
        racine.addEventListener('focusin', function () { survol = true; });
        racine.addEventListener('focusout', function () { survol = false; });
        fenetre.addEventListener('pointerdown', function (e) { if (e.button !== 0) return; trajet = null; saisie = { x: e.clientX, depart: decalage, id: e.pointerId, bouge: false }; });
        fenetre.addEventListener('pointermove', function (e) {
            if (!saisie || e.pointerId !== saisie.id) return;
            const dx = e.clientX - saisie.x;
            if (!saisie.bouge && Math.abs(dx) > 6) { saisie.bouge = true; fenetre.setPointerCapture(e.pointerId); }
            if (saisie.bouge) { decalage = saisie.depart - dx; placer(); }
        });
        const lacher = function (e) { if (!saisie || e.pointerId !== saisie.id) return; clicBloque = saisie.bouge; saisie = null; };
        fenetre.addEventListener('pointerup', lacher);
        fenetre.addEventListener('pointercancel', lacher);
        fenetre.addEventListener('click', function (e) { if (clicBloque) { e.preventDefault(); clicBloque = false; } }, true);
        fenetre.addEventListener('dragstart', function (e) { e.preventDefault(); });
        if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { const avant = visible; visible = e[0].isIntersecting; if (visible && !avant) requestAnimationFrame(tourner); }).observe(racine);
        if ('ResizeObserver' in window) new ResizeObserver(mesurer).observe(fenetre); else window.addEventListener('resize', mesurer);
        requestAnimationFrame(tourner);
        return { reinitialiser: function () { decalage = 0; trajet = null; requestAnimationFrame(mesurer); } };
    })();

    let depart = 12;
    const h = (location.hash || '').match(/^#m(12|13|14|15|16)$/);
    if (h) depart = Number(h[1]);
    else { try { const s = Number(localStorage.getItem('cd-maquette-3d-2')); if (NUMEROS.indexOf(s) >= 0) depart = s; } catch (e) {} }
    afficher(depart, false);
    window.addEventListener('load', function () { if (aGsap) ST.refresh(); });
})();
