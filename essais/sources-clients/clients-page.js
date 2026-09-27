(function () {
    'use strict';
    // Maquettes de sites clients : les 6 pages d'un site généré par Chef Digital (Accueil, Notre
    // Histoire, La Carte, Galerie, Réservation, Contact), rendues depuis les données du restaurant.
    const C = window.CLIENTS;
    const DESIGNS = C.designs, NUMEROS = DESIGNS.map(function (d) { return d.n; });
    const PAGES = ['accueil', 'histoire', 'carte', 'galerie', 'reservation', 'contact'];
    const site = document.getElementById('site');
    const boite3d = document.getElementById('boite-3d');
    const rideau = document.getElementById('rideau');
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const G = window.gsap, ST = window.ScrollTrigger;
    const aGsap = Boolean(G && ST);
    if (aGsap) G.registerPlugin(ST);
    let design = DESIGNS[0], page = 'accueil', animations = null, enTransition = false;
    const photos = {};

    // ---- Défilement doux ----
    let lenis = null;
    if (!reduit && window.Lenis) {
        lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
        if (aGsap) { lenis.on('scroll', ST.update); G.ticker.add(function (t) { lenis.raf(t * 1000); }); G.ticker.lagSmoothing(0); }
        else { (function f(t) { lenis.raf(t); requestAnimationFrame(f); })(performance.now()); }
    }
    function allerEnHaut() { if (lenis) lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); }

    // ---- Gabarit du site client ----
    const ECH = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    function e(v) { return String(v == null ? '' : v).replace(/[&<>'"]/g, function (c) { return ECH[c]; }); }
    function prix(v) { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : e(v); }
    function mots(texte) { return e(texte).split(' ').map(function (m) { return '<span class="mot"><span class="mot-i">' + m + '</span></span>'; }).join(' '); }
    const ICONES = {
        adresse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
        tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
        horaires: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
    };
    function infos(r, grandes) {
        return '<ul class="infos' + (grandes ? ' infos-grandes' : '') + '">' +
            '<li>' + ICONES.adresse + '<span>' + e(r.adresse) + '</span></li>' +
            '<li>' + ICONES.tel + '<span>' + e(r.tel) + '</span></li>' +
            '<li>' + ICONES.horaires + '<span>' + r.horaires.map(e).join('<br>') + '</span></li></ul>';
    }
    function photo(k, r, classe) { return '<figure class="photo-cadre' + (classe ? ' ' + classe : '') + '"><img class="photo" data-photo="' + k + '" alt="' + e(r.nom) + ', photo ' + (k + 1) + '"></figure>'; }
    function gabarit(r) {
        const nomMots = r.nom.split(' '), premier = nomMots.shift(), reste = nomMots.join(' ');
        const histoire = r.histoire || (r.nom + " vous accueille pour un moment de convivialité autour d'une cuisine soignée.");
        const histoireTitre = r.histoireTitre || r.accroche;
        const liens = [['accueil', 'Accueil'], ['histoire', 'Notre Histoire'], ['carte', 'La Carte'], ['galerie', 'Galerie'], ['contact', 'Contact']];
        const heures = ['12:00', '12:30', '13:00', '19:00', '19:30', '20:00', '20:30', '21:00'];
        const couverts = ['1 personne', '2 personnes', '3 personnes', '4 personnes', '5 personnes', '6 personnes et plus'];
        return '' +
        '<header class="nav"><div class="enveloppe nav-in">' +
            '<a class="nav-logo" href="#accueil" data-page="accueil">' + e(r.nom) + '</a>' +
            '<nav class="nav-liens" aria-label="Navigation principale">' + liens.map(function (l) { return '<a href="#' + l[0] + '" data-page="' + l[0] + '">' + l[1] + '</a>'; }).join('') +
                '<a class="nav-liens-resa" href="#reservation" data-page="reservation">' + e(r.bouton) + '</a></nav>' +
            '<a class="btn btn-plein nav-resa" href="#reservation" data-page="reservation">' + e(r.bouton) + '</a>' +
            '<button type="button" class="burger" aria-expanded="false" aria-label="Ouvrir le menu"><span></span></button>' +
        '</div></header>' +
        '<main>' +
        // Accueil
        '<section class="page" data-page="accueil">' +
            '<div class="hero"><div class="hero-scene"></div>' +
                '<div class="enveloppe hero-in"><div class="hero-texte">' +
                    (r.surtitre ? '<p class="surtitre hero-surtitre">' + e(r.surtitre) + '</p>' : '') +
                    '<h1 class="hero-titre" aria-label="' + e(r.nom) + '"><span class="hero-petit">' + mots(premier) + '</span> <span class="hero-grand">' + mots(reste) + '</span></h1>' +
                    '<p class="hero-accroche">' + e(r.accroche) + '</p>' +
                    '<div class="hero-actions"><a class="btn btn-plein" href="#carte" data-page="carte">Découvrir la Carte</a><a class="btn btn-ligne" href="#reservation" data-page="reservation">' + e(r.bouton) + '</a></div>' +
                    (r.stats ? '<ul class="hero-stats">' + r.stats.map(function (s) { return '<li><b>' + e(s.v) + '</b><span>' + e(s.l) + '</span></li>'; }).join('') + '</ul>' : '') +
                '</div></div>' +
                '<p class="decouvrir" aria-hidden="true">Découvrir</p>' +
            '</div>' +
            '<div class="enveloppe tuiles">' +
                '<a class="tuile" href="#carte" data-page="carte"><h3>La Carte</h3><p>Découvrez notre sélection du moment.</p></a>' +
                '<a class="tuile" href="#galerie" data-page="galerie"><h3>Galerie</h3><p>Un aperçu en images de la maison.</p></a>' +
                '<a class="tuile" href="#reservation" data-page="reservation"><h3>' + e(r.bouton) + '</h3><p>Réservez votre table en ligne.</p></a>' +
            '</div>' +
            '<section class="teaser"><div class="enveloppe teaser-in">' + photo(0, r) +
                '<div><p class="surtitre">Notre Histoire</p><h2>' + e(histoireTitre) + '</h2><p>' + e(histoire) + '</p><a class="lien" href="#histoire" data-page="histoire">En savoir plus</a></div>' +
            '</div></section>' +
        '</section>' +
        // Notre Histoire
        '<section class="page" data-page="histoire"><div class="enveloppe page-corps histoire-in">' +
            '<div class="histoire-texte"><p class="surtitre">Notre Histoire</p><h2>' + e(histoireTitre) + '</h2><p>' + e(histoire) + '</p>' +
                (r.badge ? '<p class="badge">' + e(r.badge) + '</p>' : '') + infos(r) + '</div>' + photo(1, r, 'photo-haute') +
        '</div></section>' +
        // La Carte
        '<section class="page" data-page="carte"><div class="enveloppe page-corps">' +
            '<div class="page-tete"><p class="surtitre">Notre Sélection</p><h2>La Carte</h2></div>' +
            '<nav class="onglets" aria-label="Catégories de la carte">' + r.categories.map(function (c, i) { return '<a href="#cat-' + i + '" data-cat="' + i + '">' + e(c.nom) + '</a>'; }).join('') + '</nav>' +
            r.categories.map(function (c, i) {
                return '<div class="categorie" id="cat-' + i + '"><h3 class="categorie-nom">' + e(c.nom) + '</h3><ul class="plats">' +
                    c.plats.map(function (p) { return '<li class="plat"><div class="plat-ligne"><span class="plat-nom">' + e(p.nom) + '</span><span class="plat-points" aria-hidden="true"></span><span class="plat-prix">' + prix(p.prix) + ' €</span></div><p class="plat-desc">' + e(p.desc) + '</p></li>'; }).join('') +
                    '</ul></div>';
            }).join('') +
            '<div class="carte-note"><p>Information allergènes : la liste des allergènes présents dans nos plats est disponible sur demande auprès de notre équipe.</p><p>Vous pouvez aussi nous appeler au ' + e(r.tel) + '.</p><p>Prix nets, taxes et service compris.</p></div>' +
        '</div></section>' +
        // Galerie
        '<section class="page" data-page="galerie"><div class="enveloppe page-corps">' +
            '<div class="page-tete"><h2>Galerie</h2></div>' +
            '<div class="galerie-grille">' + [2, 3, 4, 5, 6, 7].map(function (k) { return photo(k, r); }).join('') + '</div>' +
        '</div></section>' +
        // Réservation
        '<section class="page" data-page="reservation"><div class="enveloppe page-corps resa">' +
            '<div class="resa-texte"><p class="surtitre">Nous Rejoindre</p><h2>Réservez votre table</h2><p>Pour un dîner en amoureux, un déjeuner d\'affaires ou un repas en famille, nous serons heureux de vous accueillir. Réservez en ligne ou appelez-nous directement.</p>' + infos(r) + '</div>' +
            '<form class="resa-form" id="resa-form"><h3>Votre Réservation</h3><div class="champs">' +
                '<label class="champ" for="resa-prenom">Prénom<input id="resa-prenom" name="prenom" autocomplete="given-name" required></label>' +
                '<label class="champ" for="resa-nom">Nom<input id="resa-nom" name="nom" autocomplete="family-name" required></label>' +
                '<label class="champ" for="resa-email">Email<input id="resa-email" name="email" type="email" autocomplete="email" required></label>' +
                '<label class="champ" for="resa-tel">Téléphone<input id="resa-tel" name="tel" type="tel" autocomplete="tel" required></label>' +
                '<label class="champ" for="resa-date">Date<input id="resa-date" name="date" type="date" required></label>' +
                '<label class="champ" for="resa-heure">Heure<select id="resa-heure" name="heure">' + heures.map(function (h) { return '<option>' + h + '</option>'; }).join('') + '</select></label>' +
                '<label class="champ champ-large" for="resa-couverts">Nombre de couverts<select id="resa-couverts" name="couverts">' + couverts.map(function (h, i) { return '<option' + (i === 1 ? ' selected' : '') + '>' + h + '</option>'; }).join('') + '</select></label>' +
            '</div><button type="submit" class="btn btn-plein">Confirmer la Réservation</button><p class="resa-message" id="resa-message" role="status" hidden></p></form>' +
        '</div></section>' +
        // Contact
        '<section class="page" data-page="contact"><div class="enveloppe page-corps contact-grille">' +
            '<div><div class="page-tete"><p class="surtitre">Nous Trouver</p><h2>Contact</h2></div>' + infos(r, true) +
                '<div class="contact-actions"><a class="btn btn-plein" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + encodeURIComponent(r.nom + ', ' + r.adresse) + '" target="_blank" rel="noopener">Itinéraire</a><a class="btn btn-ligne" href="tel:' + e(r.tel.replace(/\s/g, '')) + '">Appeler</a></div></div>' +
            photo(0, r) +
        '</div></section>' +
        '</main>' +
        '<footer class="pied"><div class="enveloppe pied-grille">' +
            '<div><p class="pied-nom">' + e(r.nom) + '</p><p>' + e(r.piedTexte || r.accroche) + '</p></div>' +
            '<div><h3>Horaires</h3><p>' + r.horaires.map(e).join('<br>') + '</p></div>' +
            '<div><h3>Contact</h3><p>' + e(r.adresse) + '</p><p>' + e(r.tel) + '</p></div>' +
        '</div><div class="enveloppe pied-bas"><span>© 2026 ' + e(r.nom) + '. Tous droits réservés.</span>' +
            '<span><a href="#mentions" data-legal>Mentions légales</a> · <a href="#cgv" data-legal>CGV</a> · <a href="#confidentialite" data-legal>Confidentialité</a></span>' +
            '<span>Site réalisé par Chef Digital</span></div></footer>';
    }

    // ---- Montage d'une maquette ----
    function monter(d) {
        design = d;
        const ouvert = site.classList.contains('menu-ouvert');
        site.className = 'site ' + d.style;
        site.innerHTML = gabarit(d.resto);
        site.querySelector('.hero-scene').appendChild(boite3d);
        boite3d.hidden = false;
        if (ouvert) fermerMenu();
        appliquerPhotos();
        window.CLIENT_DESIGN = d;
        document.dispatchEvent(new CustomEvent('maquette', { detail: d }));
    }
    function appliquerPhotos() {
        const liste = photos[design.n];
        if (!liste) return;
        site.querySelectorAll('img[data-photo]').forEach(function (img) { const k = Number(img.dataset.photo); if (liste[k]) img.src = liste[k]; });
    }
    document.addEventListener('photos', function (ev) { photos[ev.detail.n] = ev.detail.urls; if (ev.detail.n === design.n) appliquerPhotos(); });

    // ---- Navigation entre les pages ----
    function hash() { return '#' + (DESIGNS.length > 1 ? 'c' + design.n + '-' : '') + page; }
    function montrer(p) {
        page = p;
        site.querySelectorAll('.page').forEach(function (s) { s.classList.toggle('active', s.dataset.page === p); });
        site.querySelectorAll('.nav [data-page]').forEach(function (a) { if (a.dataset.page === p && !a.classList.contains('nav-logo')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
        fermerMenu();
        allerEnHaut();
        if (location.hash !== hash()) history.replaceState(null, '', hash());
        requestAnimationFrame(lancerAnimations);
    }
    // Transition entre deux pages : un rideau propre à chaque maquette.
    const RIDEAUX = {
        balayage: [{ xPercent: -100, yPercent: 0, clipPath: 'inset(0% 0% 0% 0%)' }, { xPercent: 0 }, { xPercent: 100 }],
        cercle: [{ xPercent: 0, yPercent: 0, clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }],
        volet: [{ xPercent: 0, yPercent: 100, clipPath: 'inset(0% 0% 0% 0%)' }, { yPercent: 0 }, { yPercent: -100 }],
        diagonale: [{ xPercent: 0, yPercent: 0, clipPath: 'polygon(0% 0%, 0% 0%, -30% 100%, -30% 100%)' }, { clipPath: 'polygon(0% 0%, 130% 0%, 100% 100%, -30% 100%)' }, { clipPath: 'polygon(130% 0%, 130% 0%, 100% 100%, 100% 100%)' }],
        fondu: [{ xPercent: 0, yPercent: 0, clipPath: 'inset(0% 0% 0% 0%)', opacity: 0 }, { opacity: 1 }, { opacity: 0 }]
    };
    const RIDEAU_STYLE = { ardoise: 'balayage', four: 'cercle', sakura: 'fondu', smash: 'diagonale', pression: 'volet', dani: 'volet' };
    function allerPage(p, anime) {
        if (PAGES.indexOf(p) < 0) p = 'accueil';
        if (enTransition) return;
        if (!anime || reduit || !aGsap || p === page) { montrer(p); return; }
        const r = RIDEAUX[RIDEAU_STYLE[design.style]] || RIDEAUX.volet;
        enTransition = true;
        G.set(rideau, Object.assign({ visibility: 'visible', opacity: 1 }, r[0]));
        G.timeline({ onComplete: function () { G.set(rideau, { visibility: 'hidden', clearProps: 'clipPath,transform,opacity' }); enTransition = false; } })
            .to(rideau, Object.assign({ duration: 0.45, ease: 'power3.in' }, r[1]))
            .add(function () { montrer(p); })
            .to(rideau, Object.assign({ duration: 0.55, ease: 'power3.out', delay: 0.05 }, r[2]));
    }
    function fermerMenu() {
        site.classList.remove('menu-ouvert');
        const b = site.querySelector('.burger'); if (b) b.setAttribute('aria-expanded', 'false');
    }
    site.addEventListener('click', function (ev) {
        // Les sections de page portent aussi data-page : seuls les liens naviguent.
        const lien = ev.target.closest('a[data-page]');
        if (lien) { ev.preventDefault(); allerPage(lien.dataset.page, true); return; }
        const onglet = ev.target.closest('[data-cat]');
        if (onglet) {
            ev.preventDefault();
            const cible = document.getElementById('cat-' + onglet.dataset.cat);
            if (cible) { if (lenis) lenis.scrollTo(cible, { offset: -150 }); else cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth' }); }
            return;
        }
        if (ev.target.closest('[data-legal]')) { ev.preventDefault(); return; }
        const burger = ev.target.closest('.burger');
        if (burger) {
            const ouvert = !site.classList.contains('menu-ouvert');
            site.classList.toggle('menu-ouvert', ouvert);
            burger.setAttribute('aria-expanded', String(ouvert));
        }
    });
    // Maquette : le formulaire ne transmet rien, il le dit.
    site.addEventListener('submit', function (ev) {
        ev.preventDefault();
        const f = ev.target, m = f.querySelector('.resa-message');
        if (!f.checkValidity()) { f.reportValidity(); return; }
        m.hidden = false;
        m.textContent = 'Maquette de démonstration : aucune réservation n\'est envoyée. Sur le site du restaurant, la demande part directement chez lui.';
    });

    // ---- Animations ----
    function de(els, vars) { if (els.length) G.from(els, vars); }
    function apparaitre(elements, depart, options) {
        const els = G.utils.toArray(elements);
        if (!els.length) return;
        const fin = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, rotateX: 0, rotateY: 0, clipPath: 'inset(0% 0% 0% 0%)', filter: 'blur(0px)', duration: 1, ease: 'power3.out' };
        Object.keys(fin).forEach(function (k) { if (!(k in depart) && ['duration', 'ease'].indexOf(k) < 0) delete fin[k]; });
        els.forEach(function (el, i) {
            const rang = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : i;
            G.fromTo(el, Object.assign({}, depart), Object.assign({}, fin, { delay: (rang % 4) * 0.08, scrollTrigger: { trigger: el, start: 'top 92%', once: true } }, options || {}));
        });
    }
    function aimant(selecteur) {
        const nettoyages = [];
        G.utils.toArray(selecteur).forEach(function (b) {
            const bouge = function (ev) { const r = b.getBoundingClientRect(); G.to(b, { x: (ev.clientX - r.left - r.width / 2) * 0.25, y: (ev.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out', overwrite: 'auto' }); };
            const sort = function () { G.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' }); };
            b.addEventListener('pointermove', bouge); b.addEventListener('pointerleave', sort);
            nettoyages.push(function () { b.removeEventListener('pointermove', bouge); b.removeEventListener('pointerleave', sort); G.set(b, { clearProps: 'transform' }); });
        });
        return function () { nettoyages.forEach(function (f) { f(); }); };
    }
    // Onglets de la carte : l'onglet de la catégorie visible s'allume.
    function suivreOnglets(p) {
        const onglets = G.utils.toArray(p.querySelectorAll('.onglets a'));
        onglets.forEach(function (o, i) {
            const cat = p.querySelector('#cat-' + i);
            ST.create({ trigger: cat, start: 'top 60%', end: 'bottom 60%', onToggle: function (s) { if (s.isActive) onglets.forEach(function (x) { x.classList.toggle('actif', x === o); }); } });
        });
        if (onglets[0]) onglets[0].classList.add('actif');
    }
    // Chaque maquette : l'entrée de l'ouverture et l'arrivée des blocs de chaque page.
    const STYLES = {
        ardoise: { titre: { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06 }, bloc: { opacity: 0, y: 30 }, titres: { clipPath: 'inset(0% 100% 0% 0%)' }, titresOpt: { duration: 1.1, ease: 'steps(16)' }, plat: { opacity: 0, x: -16 } },
        four: { titre: { yPercent: 120, rotate: 6, duration: 1.2, ease: 'back.out(1.6)', stagger: 0.07 }, bloc: { opacity: 0, y: 50, scale: 0.96 }, blocOpt: { ease: 'back.out(1.4)' }, titres: { opacity: 0, y: 40 }, plat: { opacity: 0, y: 24 } },
        sakura: { titre: { yPercent: 100, opacity: 0, duration: 1.6, ease: 'power4.out', stagger: 0.12 }, bloc: { opacity: 0, filter: 'blur(8px)' }, blocOpt: { duration: 1.4 }, titres: { opacity: 0, y: 24, filter: 'blur(6px)' }, titresOpt: { duration: 1.4 }, plat: { opacity: 0, y: 12 } },
        smash: { titre: { yPercent: 110, scale: 1.3, duration: 0.8, ease: 'power4.out', stagger: 0.05 }, bloc: { opacity: 0, y: 70, rotate: -2 }, blocOpt: { ease: 'back.out(2)', duration: 0.8 }, titres: { opacity: 0, scale: 1.2 }, titresOpt: { ease: 'power4.out', duration: 0.7 }, plat: { opacity: 0, x: 30 } },
        pression: { titre: { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.08 }, bloc: { opacity: 0, y: 40 }, titres: { clipPath: 'inset(0% 50% 0% 50%)' }, titresOpt: { duration: 1.3, ease: 'power3.inOut' }, plat: { opacity: 0, y: 20 } },
        dani: { titre: { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.08 }, bloc: { opacity: 0, y: 40 }, titres: { clipPath: 'inset(0% 0% 100% 0%)', y: 20 }, titresOpt: { duration: 1.2 }, plat: { opacity: 0, y: 20 } }
    };
    function choregraphie(p, grand) {
        const s = STYLES[design.style] || STYLES.dani;
        const retraits = [];
        if (page === 'accueil') {
            de(p.querySelectorAll('.hero-titre .mot-i'), Object.assign({ delay: 0.15 }, s.titre));
            de(p.querySelectorAll('.hero-surtitre, .hero-accroche, .hero-actions, .hero-stats li, .decouvrir'), { y: 22, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.45 });
            if (grand) G.to(p.querySelector('.hero-in'), { yPercent: 14, opacity: 0.3, ease: 'none', scrollTrigger: { trigger: p.querySelector('.hero'), start: 'top top', end: 'bottom top', scrub: true } });
            apparaitre(p.querySelectorAll('.tuile'), s.bloc, s.blocOpt);
            apparaitre(p.querySelectorAll('.teaser .photo-cadre'), { opacity: 0, clipPath: 'inset(12% 12% 12% 12%)' }, { duration: 1.3, ease: 'power3.out', clearProps: 'clipPath' });
            apparaitre(p.querySelectorAll('.teaser h2'), s.titres, Object.assign({ clearProps: 'clipPath,filter' }, s.titresOpt));
            apparaitre(p.querySelectorAll('.teaser p, .teaser .lien'), { opacity: 0, y: 20 });
            retraits.push(aimant(p.querySelectorAll('.hero-actions .btn')));
        } else {
            de(p.querySelectorAll('.page-tete .surtitre, .histoire-texte .surtitre, .resa-texte .surtitre'), { opacity: 0, y: 16, duration: 0.8, ease: 'power3.out', delay: 0.1 });
            G.fromTo(p.querySelectorAll('h2'), Object.assign({}, s.titres), Object.assign({ opacity: 1, x: 0, y: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0%)', filter: 'blur(0px)', duration: 1, ease: 'power3.out', delay: 0.15, clearProps: 'clipPath,filter' }, s.titresOpt));
            de(p.querySelectorAll('.histoire-texte > p:not(.surtitre), .resa-texte > p:not(.surtitre), .infos li, .badge, .contact-actions'), { opacity: 0, y: 20, duration: 0.8, ease: 'power3.out', stagger: 0.06, delay: 0.35 });
            de(p.querySelectorAll('.onglets a'), { opacity: 0, y: 12, duration: 0.6, stagger: 0.05, delay: 0.3 });
            apparaitre(p.querySelectorAll('.categorie-nom'), s.titres, Object.assign({ clearProps: 'clipPath,filter' }, s.titresOpt));
            apparaitre(p.querySelectorAll('.plat'), s.plat, { duration: 0.8 });
            apparaitre(p.querySelectorAll('.carte-note'), { opacity: 0, y: 20 });
            apparaitre(p.querySelectorAll('.photo-cadre'), { opacity: 0, clipPath: 'inset(10% 10% 10% 10%)', scale: 1.04 }, { duration: 1.2, clearProps: 'clipPath' });
            apparaitre(p.querySelectorAll('.resa-form'), s.bloc, s.blocOpt);
            if (page === 'carte') suivreOnglets(p);
        }
        return function () { retraits.forEach(function (f) { f(); }); };
    }
    function lancerAnimations() {
        if (animations) { animations.revert(); animations = null; }
        const p = site.querySelector('.page.active');
        if (!aGsap || reduit || !p) return;
        animations = G.matchMedia();
        animations.add({ grand: '(min-width: 900px)', petit: '(max-width: 899px)' }, function (ctx) {
            const retirer = choregraphie(p, ctx.conditions.grand);
            return function () { if (typeof retirer === 'function') retirer(); };
        });
        ST.refresh();
    }

    // ---- Barre de choix des maquettes ----
    const choix = document.getElementById('sel-choix'), actuel = document.getElementById('sel-actuel');
    const barre = document.querySelector('.selecteur');
    function afficher(n, defiler) {
        const d = DESIGNS.filter(function (x) { return x.n === n; })[0] || DESIGNS[0];
        if (animations) { animations.revert(); animations = null; }
        monter(d);
        if (choix) choix.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', String(NUMEROS[i] === d.n)); });
        if (actuel) actuel.innerHTML = '<b>Maquette ' + d.n + ' · ' + e(d.nom) + '</b><span>' + e(d.type) + '</span>';
        try { localStorage.setItem(C.cle, String(d.n)); } catch (err) {}
        montrer(defiler ? 'accueil' : page);
    }
    if (DESIGNS.length > 1 && choix) {
        DESIGNS.forEach(function (d) {
            const b = document.createElement('button'); b.type = 'button';
            b.innerHTML = '<b>' + d.n + ' · ' + e(d.nom) + '</b><span>' + e(d.type) + '</span>';
            b.addEventListener('click', function () { afficher(d.n, true); });
            choix.appendChild(b);
        });
        const voisine = function (sens) { const i = NUMEROS.indexOf(design.n); return NUMEROS[(i + sens + NUMEROS.length) % NUMEROS.length]; };
        document.getElementById('sel-prec').addEventListener('click', function () { afficher(voisine(-1), true); });
        document.getElementById('sel-suiv').addEventListener('click', function () { afficher(voisine(1), true); });
    } else if (barre) barre.remove();

    // Point de départ : #c2-carte, #carte, ou la dernière maquette vue.
    let depart = DESIGNS[0].n;
    const h = (location.hash || '').replace('#', '');
    const m = h.match(/^c(\d+)-([a-z]+)$/);
    if (m && NUMEROS.indexOf(Number(m[1])) >= 0) { depart = Number(m[1]); if (PAGES.indexOf(m[2]) >= 0) page = m[2]; }
    else if (PAGES.indexOf(h) >= 0) page = h;
    else { try { const s = Number(localStorage.getItem(C.cle)); if (NUMEROS.indexOf(s) >= 0) depart = s; } catch (err) {} }
    afficher(depart, false);
    window.addEventListener('load', function () { if (aGsap) ST.refresh(); });
})();
