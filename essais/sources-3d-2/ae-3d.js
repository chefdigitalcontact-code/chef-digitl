// Scènes 3D de l'ouverture d'Aegis (Three.js), maquettes 12 à 16 : une par maquette, reconstruite à chaque changement.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('scene-3d');
const boite = canvas.parentElement;
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
    renderer = null;
}

const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const doux = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const sortie = x => 1 - Math.pow(1 - x, 3);
const alea = (a, b) => a + Math.random() * (b - a);
const TAN = Math.tan(THREE.MathUtils.degToRad(15));
const OR = 0xD4AF5A, NUIT = 0x0B1B33;
const matOr = (r) => new THREE.MeshStandardMaterial({ color: OR, metalness: 1, roughness: r === undefined ? 0.22 : r });
const matNuit = () => new THREE.MeshPhysicalMaterial({ color: NUIT, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });

function rondRect(x, px, py, l, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + l, py, px + l, py + h, r); x.arcTo(px + l, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + l, py, r); x.closePath(); }
function textureDepuis(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return t;
}
function espacer(x, valeur) { try { x.letterSpacing = valeur; } catch (e) {} }
function spriteRond() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}
function ombreSol(l, h, force) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(6,18,42,' + force + ')'); g.addColorStop(0.6, 'rgba(6,18,42,' + (force * 0.35) + ')'); g.addColorStop(1, 'rgba(6,18,42,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(l, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
}
function poussiere(nb, etendue, taille, couleur, opacite) {
    const pos = new Float32Array(nb * 3);
    for (let i = 0; i < nb; i++) { pos[i * 3] = alea(-etendue, etendue); pos[i * 3 + 1] = alea(-etendue * 0.7, etendue * 0.7); pos[i * 3 + 2] = alea(-etendue, etendue * 0.3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size: taille, map: spriteRond(), color: couleur, transparent: true, opacity: opacite, depthWrite: false, blending: THREE.AdditiveBlending }));
}
// Place la caméra pour qu'un objet de largeur l et de hauteur h tienne dans le cadre.
function recul(l, h, aspect) { return Math.max(h / (2 * TAN), l / (2 * TAN * aspect)); }

// L'emblème du site (bouclier et « A »), repris de son tracé SVG (repère 420 × 420).
function formeBouclier(k) {
    const X = x => (x - 210) * k, Y = y => -(y - 193) * k;
    const s = new THREE.Shape();
    s.moveTo(X(210), Y(92));
    s.lineTo(X(290), Y(124));
    s.lineTo(X(290), Y(182));
    s.bezierCurveTo(X(290), Y(236), X(256), Y(278), X(210), Y(294));
    s.bezierCurveTo(X(164), Y(278), X(130), Y(236), X(130), Y(182));
    s.lineTo(X(130), Y(124));
    s.closePath();
    return s;
}
function lettreA(k, rayon, mat) {
    const X = x => (x - 210) * k, Y = y => -(y - 193) * k;
    const g = new THREE.Group();
    const v = p => new THREE.Vector3(X(p[0]), Y(p[1]), 0);
    [[[176, 250], [210, 170]], [[210, 170], [244, 250]], [[188.5, 222], [231.5, 222]]].forEach(function (s) {
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(v(s[0]), v(s[1])), 1, rayon, 20, false), mat));
    });
    [[176, 250], [210, 170], [244, 250], [188.5, 222], [231.5, 222]].forEach(function (p) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(rayon, 20, 14), mat); b.position.copy(v(p)); g.add(b);
    });
    return g;
}
function bouclierMassif(k, profondeur, biseau, matFace, matTranche) {
    const geo = new THREE.ExtrudeGeometry(formeBouclier(k), { depth: profondeur, bevelEnabled: true, bevelThickness: biseau, bevelSize: biseau * 0.85, bevelSegments: 8, curveSegments: 64 });
    geo.center();
    return new THREE.Mesh(geo, [matFace, matTranche]);
}

// ---- 12 · Dossier : la chemise s'ouvre, les pièces du dossier se déploient en éventail ----
const PIECES = [
    { n: 1, titre: ['Constat de commissaire', 'de justice'], ref: 'AFD-2026-0412' },
    { n: 2, titre: ['Notification de', 'contenu illicite'], ref: 'AFD-2026-0413' },
    { n: 3, titre: ['Demande de', 'déréférencement'], ref: 'AFD-2026-0415' },
    { n: 4, titre: ['Rapport de veille'], ref: 'AFD-2026-0416' },
    { n: 5, titre: ['Mise en demeure'], ref: 'AFD-2026-0414', tampon: true }
];
function dessinerPiece(p) {
    const c = document.createElement('canvas'); c.width = 580; c.height = 820;
    const x = c.getContext('2d'), W = 580, H = 820;
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(11,27,51,' + alea(0.01, 0.035).toFixed(3) + ')'; x.fillRect(alea(0, W), alea(0, H), 1.5, 1.5); }
    x.fillStyle = '#0B1B33'; x.font = '600 14px "Source Sans 3", sans-serif'; espacer(x, '3px'); x.fillText('AEGIS FAMA & DOXA', 50, 66); espacer(x, '0px');
    x.textAlign = 'right'; x.fillStyle = '#86681F'; x.font = 'italic 400 16px "Libre Baskerville", Georgia, serif'; x.fillText('Pièce n° ' + p.n, W - 50, 66); x.textAlign = 'left';
    x.fillStyle = '#C9A54C'; x.fillRect(50, 84, W - 100, 1.5);
    x.fillStyle = '#0B1B33'; x.font = '400 28px "Libre Baskerville", Georgia, serif';
    p.titre.forEach(function (l, i) { x.fillText(l, 50, 148 + i * 40); });
    let y = 148 + p.titre.length * 40;
    x.fillStyle = '#5F6A7B'; x.font = '400 15px "Source Sans 3", sans-serif'; x.fillText('Réf. ' + p.ref + '  ·  Confidentiel', 50, y); y += 46;
    x.fillStyle = 'rgba(20,27,38,.15)';
    for (let l = 0; l < 17; l++) { if (l === 5 || l === 11) { y += 16; continue; } const w = (l === 4 || l === 10 || l === 16) ? alea(140, 260) : alea(400, 480); x.fillRect(50, y, w, 7); y += 24; }
    x.strokeStyle = '#1A355F'; x.lineWidth = 2.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(W - 230, H - 104); x.bezierCurveTo(W - 210, H - 150, W - 190, H - 70, W - 170, H - 116); x.bezierCurveTo(W - 150, H - 150, W - 140, H - 80, W - 110, H - 110); x.bezierCurveTo(W - 96, H - 124, W - 84, H - 104, W - 70, H - 112); x.stroke();
    x.fillStyle = '#5F6A7B'; x.font = '400 13px "Source Sans 3", sans-serif'; x.fillText('Le juriste en charge du dossier', W - 250, H - 66);
    if (p.tampon) {
        x.save(); x.translate(170, H - 150); x.rotate(-0.16); x.strokeStyle = x.fillStyle = 'rgba(26,53,95,.78)';
        x.lineWidth = 3.5; rondRect(x, -118, -34, 236, 68, 8); x.stroke(); x.lineWidth = 1.2; rondRect(x, -110, -26, 220, 52, 5); x.stroke();
        x.font = '700 24px "Source Sans 3", sans-serif'; espacer(x, '5px'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CONFIDENTIEL', 3, 2);
        x.restore();
    }
    return c;
}
function dessinerEtiquetteDossier() {
    const c = document.createElement('canvas'); c.width = 480; c.height = 240;
    const x = c.getContext('2d');
    x.fillStyle = '#FBFAF6'; x.fillRect(0, 0, 480, 240);
    x.strokeStyle = '#C9A54C'; x.lineWidth = 3; x.strokeRect(12, 12, 456, 216);
    x.fillStyle = '#86681F'; x.font = '600 16px "Source Sans 3", sans-serif'; espacer(x, '4px'); x.textAlign = 'center'; x.fillText('AEGIS FAMA & DOXA', 240, 64); espacer(x, '0px');
    x.fillStyle = '#0B1B33'; x.font = '400 34px "Libre Baskerville", Georgia, serif'; x.fillText('Dossier', 240, 124);
    x.font = 'italic 400 22px "Libre Baskerville", Georgia, serif'; x.fillText('confidentiel', 240, 160);
    x.fillStyle = '#5F6A7B'; x.font = '400 16px "Source Sans 3", sans-serif'; x.fillText('Réf. AFD-2026-04', 240, 200);
    return c;
}
function trombone(mat) {
    const pts = [];
    const ligne = (a, b) => { for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * i / 6, a[1] + (b[1] - a[1]) * i / 6, 0)); };
    const arc = (cx, cy, r, a0, a1) => { for (let i = 1; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0)); } };
    ligne([-0.06, 0.2], [-0.06, -0.4]); arc(0, -0.4, 0.06, Math.PI, 2 * Math.PI);
    ligne([0.06, -0.4], [0.06, 0.5]); arc(-0.03, 0.5, 0.09, 0, Math.PI);
    ligne([-0.12, 0.5], [-0.12, -0.55]); arc(0, -0.55, 0.12, Math.PI, 2 * Math.PI);
    ligne([0.12, -0.55], [0.12, 0.3]);
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.014, 10, false), mat);
}
function sceneDossier(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f7a, 0.8));
    const cle = new THREE.DirectionalLight(0xfff6e8, 1.3); cle.position.set(-4, 6, 8); scene.add(cle);
    const groupe = new THREE.Group(); scene.add(groupe);
    const L = 3.3, H = 4.5, pL = 2.9, pH = 4.1;
    const carton = new THREE.MeshStandardMaterial({ color: 0x12264A, roughness: 0.55, metalness: 0.1 });
    const dos = new THREE.Mesh(new THREE.BoxGeometry(L, H, 0.04), carton); groupe.add(dos);
    const charniere = new THREE.Group(); charniere.position.set(-L / 2, 0, 0.36); groupe.add(charniere);
    const couverture = new THREE.Mesh(new THREE.BoxGeometry(L, H, 0.04), carton); couverture.position.x = L / 2; charniere.add(couverture);
    const lisere = new THREE.Mesh(new THREE.BoxGeometry(L - 0.24, 0.02, 0.05), matOr(0.3)); lisere.position.set(L / 2, -H / 2 + 0.28, 0.01); charniere.add(lisere);
    const etiquette = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), new THREE.MeshStandardMaterial({ map: textureDepuis(dessinerEtiquetteDossier()), roughness: 0.8 }));
    etiquette.position.set(L / 2, 0.9, 0.022); charniere.add(etiquette);
    // Les pièces : une face imprimée, un verso blanc, une légère courbure du papier.
    const papier = new THREE.MeshStandardMaterial({ color: 0xF6F3EC, roughness: 0.9, side: THREE.BackSide });
    const feuilles = PIECES.map(function (p, i) {
        const geo = new THREE.PlaneGeometry(pL, pH, 1, 14), pos = geo.attributes.position;
        for (let k = 0; k < pos.count; k++) { const y = pos.getY(k) / (pH / 2); pos.setZ(k, 0.07 * y * y); }
        geo.computeVertexNormals(); geo.translate(0, pH / 2, 0);
        const pivot = new THREE.Group(); pivot.position.set(0, -pH / 2 + 0.05, 0.06 + i * 0.05); groupe.add(pivot);
        pivot.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: textureDepuis(dessinerPiece(p)), roughness: 0.88 })));
        pivot.add(new THREE.Mesh(geo, papier));
        return pivot;
    });
    const clip = trombone(matOr(0.25)); clip.scale.setScalar(1.05); clip.rotation.z = 0.06; clip.position.set(-0.85, pH - 0.25, 0.03); feuilles[feuilles.length - 1].add(clip);
    const ombre = ombreSol(7, 3, 0.25); ombre.position.y = -H / 2 - 0.5; scene.add(ombre);
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 0.5, recul(7.4, 7.6, a)); camera.lookAt(0, 0.2, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const e = sortie(lisse(0, 1.1, t)), ouv = doux(lisse(0.8, 1.9, t));
            charniere.rotation.y = -ouv * 2.75;
            groupe.position.set(ouv * 1.25, (1 - e) * -3 + Math.sin(t * 0.7) * 0.05, 0);
            groupe.rotation.y = (1 - e) * 0.6 - 0.28 + souris.x * 0.3 + Math.sin(t * 0.3) * 0.05 + defil * 0.6;
            groupe.rotation.x = -0.05 - souris.y * 0.1;
            feuilles.forEach(function (f, i) {
                const p = doux(lisse(1.5 + i * 0.12, 2.7 + i * 0.12, t)), c = i - (feuilles.length - 1) / 2;
                f.rotation.z = -p * (c * 0.17 + Math.sin(t * 0.6 + i) * 0.012);
                f.position.x = p * c * 0.22;
                f.position.y = -pH / 2 + 0.05 + p * 0.35;
                f.rotation.y = p * c * 0.05;
            });
            ombre.material.opacity = e;
        }
    };
}

// ---- 13 · Palais : la colonnade éclairée de nuit, un balayage de lumière dorée ----
function colonneCannelee(r0, r1, h, nb) {
    const g = new THREE.CylinderGeometry(r1, r0, h, 144, 1, true), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), f = 1 - 0.075 * Math.pow(0.5 + 0.5 * Math.cos(a * nb), 3); p.setX(i, x * f); p.setZ(i, z * f); }
    g.computeVertexNormals();
    return g;
}
function dessinerFrise() {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 110;
    const x = c.getContext('2d');
    x.fillStyle = '#22385F'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '600 70px "Cinzel", Georgia, serif'; espacer(x, '26px');
    x.fillText('AEGIS · FAMA · DOXA', 1024, 58);
    return c;
}
function scenePalais(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0x3a5486, 0x06122A, 0.7));
    const lumiere = new THREE.DirectionalLight(0xFFD89A, 1.5); lumiere.position.set(-3, 1, 9); scene.add(lumiere);
    const balayage = new THREE.PointLight(0xFFCF7A, 30, 10, 1.5); scene.add(balayage);
    const temple = new THREE.Group(); scene.add(temple);
    const pierre = new THREE.MeshStandardMaterial({ color: 0xE3DCCD, roughness: 0.62, envMapIntensity: 0.35 }), or = matOr(0.28);
    const bloc = function (l, h, p, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat || pierre); m.position.set(x, y, z); temple.add(m); return m; };
    bloc(10.4, 0.25, 3.3, 0, 0.125, 0); bloc(9.9, 0.25, 2.9, 0, 0.375, 0); bloc(9.4, 0.25, 2.5, 0, 0.625, 0);
    // Le mur du fond et sa porte éclairée
    bloc(8.6, 4.4, 0.3, 0, 2.95, -0.75, new THREE.MeshStandardMaterial({ color: 0x1B2C4B, roughness: 0.8 }));
    const cp = document.createElement('canvas'); cp.width = 64; cp.height = 128; const xp = cp.getContext('2d'), gp = xp.createLinearGradient(0, 128, 0, 0);
    gp.addColorStop(0, '#F6DDA0'); gp.addColorStop(1, '#B8893C'); xp.fillStyle = gp; xp.fillRect(0, 0, 64, 128);
    const porte = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.7), new THREE.MeshBasicMaterial({ map: textureDepuis(cp), toneMapped: false })); porte.position.set(0, 2.1, -0.59); temple.add(porte);
    bloc(1.6, 0.12, 0.1, 0, 3.5, -0.56, or);
    const fut = colonneCannelee(0.34, 0.29, 4.0, 20);
    for (let k = 0; k < 6; k++) {
        const x = -3.9 + k * 1.56, z = 0.55;
        bloc(0.8, 0.14, 0.8, x, 0.82, z);
        const tore = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 12, 48), pierre); tore.rotation.x = Math.PI / 2; tore.position.set(x, 0.95, z); temple.add(tore);
        const c = new THREE.Mesh(fut, pierre); c.position.set(x, 2.98, z); temple.add(c);
        const echine = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.06, 12, 48), or); echine.rotation.x = Math.PI / 2; echine.position.set(x, 5.0, z); temple.add(echine);
        bloc(0.86, 0.16, 0.86, x, 5.14, z);
    }
    bloc(9.2, 0.46, 1.9, 0, 5.45, -0.05);
    bloc(9.2, 0.56, 1.8, 0, 5.96, -0.05);
    const frise = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 0.45), new THREE.MeshStandardMaterial({ map: textureDepuis(dessinerFrise()), transparent: true, roughness: 0.6 }));
    frise.position.set(0, 5.96, 0.86); temple.add(frise);
    bloc(9.7, 0.16, 2.1, 0, 6.32, -0.05);
    bloc(9.7, 0.03, 0.04, 0, 6.24, 1.0, or);
    const fronton = new THREE.Shape(); fronton.moveTo(-4.75, 0); fronton.lineTo(4.75, 0); fronton.lineTo(0, 1.35); fronton.closePath();
    const geoF = new THREE.ExtrudeGeometry(fronton, { depth: 1.7, bevelEnabled: false }); geoF.translate(0, 0, -0.9);
    const f = new THREE.Mesh(geoF, pierre); f.position.y = 6.4; temple.add(f);
    const pente = Math.atan2(1.35, 4.75), long = Math.hypot(1.35, 4.75);
    [-1, 1].forEach(function (s) { const r = bloc(long + 0.3, 0.14, 2.0, s * 2.375, 6.4 + 0.675 + 0.06, -0.05); r.rotation.z = -s * pente; });
    const poudre = poussiere(320, 9, 0.09, 0xE4CD8A, 0.5); poudre.position.set(0, 3.5, 2); temple.add(poudre);
    const vise = new THREE.Vector3();
    let base = { z: 22, y: 2.4 };
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) {
            const a = w / h; camera.aspect = a; camera.updateProjectionMatrix();
            if (a >= 1.15) {
                const z = Math.max(23, 12.6 / (TAN * a)); base = { z: z, y: 2.9 };
                temple.scale.setScalar(1); temple.position.set(Math.min(6.6, TAN * a * z - 5.4), -0.9, 0);
            } else {
                const z = 22, vh = 2 * z * TAN, vw = vh * a, s = Math.min(1, vw * 0.92 / 10.4); base = { z: z, y: 2.6 };
                temple.scale.setScalar(s); temple.position.set(0, 2.6 + vh / 2 - 7.8 * s - vh * 0.06, 0);
            }
        },
        maj: function (t, souris, defil) {
            const e = sortie(lisse(0, 2.2, t));
            camera.position.set(souris.x * 1.1 + (1 - e) * 3, base.y + souris.y * 0.6 + (1 - e) * 1.5, base.z - defil * 5 + (1 - e) * 4);
            vise.set(souris.x * 0.3, base.y, 0);
            camera.lookAt(vise);
            balayage.position.set(temple.position.x + Math.sin(t * 0.35) * 6 * temple.scale.x, temple.position.y + 3.2 * temple.scale.x, 3);
            lumiere.intensity = 1.5 * e;
            poudre.rotation.y = t * 0.02;
        }
    };
}

// ---- 14 · Radar : la veille balaie le web, les signaux s'allument à son passage ----
const SOURCES = ['Avis Google', 'Forum', 'Presse en ligne', 'Réseau social'];
function dessinerSource(texte) {
    const c = document.createElement('canvas'); c.width = 384; c.height = 72;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(6,18,42,.82)'; rondRect(x, 2, 2, 380, 68, 10); x.fill();
    x.strokeStyle = 'rgba(201,165,76,.7)'; x.lineWidth = 2; rondRect(x, 2, 2, 380, 68, 10); x.stroke();
    x.fillStyle = '#E4CD8A'; x.font = '500 30px "Geist Mono", ui-monospace, monospace'; x.textBaseline = 'middle'; x.fillText(texte, 22, 38);
    return c;
}
function sceneRadar() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const groupe = new THREE.Group(); scene.add(groupe);
    const R = 5;
    const disque = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R), new THREE.ShaderMaterial({
        uniforms: { uAngle: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
            'uniform float uAngle; varying vec2 vUv;',
            'const float PI = 3.14159265;',
            'void main(){',
            '  vec2 p = (vUv - 0.5) * 2.0; float r = length(p); if (r > 1.0) discard;',
            '  float a = atan(p.y, p.x);',
            '  float dr = abs(r * 4.0 - floor(r * 4.0 + 0.5)) / 4.0;',
            '  float anneau = 1.0 - smoothstep(0.002, 0.007, dr);',
            '  float s = abs(mod(a + PI / 12.0, PI / 6.0) - PI / 12.0);',
            '  float rayon = (1.0 - smoothstep(0.002, 0.006, s * r)) * step(0.06, r);',
            '  float d = mod(uAngle - a, 2.0 * PI);',
            '  float trainee = exp(-d * 2.6) * smoothstep(1.0, 0.94, r);',
            '  float bord = 1.0 - smoothstep(0.004, 0.014, abs(r - 0.992));',
            '  vec3 dore = vec3(0.79, 0.65, 0.30);',
            '  vec3 c = vec3(0.02, 0.05, 0.1) * (1.0 - r) + dore * (anneau * 0.28 + rayon * 0.12 + trainee * 0.42 + bord * 0.55);',
            '  c += vec3(1.0, 0.92, 0.7) * (1.0 - smoothstep(0.0, 0.035, d)) * 0.5 * step(0.04, r);',
            '  gl_FragColor = vec4(c, 1.0);',
            '}'
        ].join('\n'),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    disque.rotation.x = -Math.PI / 2; groupe.add(disque);
    const sprite = spriteRond();
    // Signaux : points sur le disque (coordonnées polaires, dans le même repère que le balayage).
    const NB = 44, pos = new Float32Array(NB * 3), col = new Float32Array(NB * 3), signaux = [];
    for (let i = 0; i < NB; i++) {
        const r = Math.sqrt(alea(0.03, 0.9)), a = alea(-Math.PI, Math.PI);
        pos[i * 3] = r * R * Math.cos(a); pos[i * 3 + 1] = 0.02; pos[i * 3 + 2] = -r * R * Math.sin(a);
        signaux.push({ a: a, r: r, vu: -10 });
    }
    const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gP.setAttribute('color', new THREE.BufferAttribute(col, 3));
    groupe.add(new THREE.Points(gP, new THREE.PointsMaterial({ size: 0.34, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    // Menaces : un signal plus fort, une colonne qui monte, une onde, parfois le nom de la source.
    const menaces = [3, 9, 15, 22, 30, 37].map(function (i, k) {
        const s = signaux[i], x = pos[i * 3], z = pos[i * 3 + 2], hMax = alea(0.9, 1.9);
        const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, hMax, z)]);
        const ligne = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xE4CD8A, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); groupe.add(ligne);
        const tete = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xFFE7A6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); tete.position.set(x, hMax, z); groupe.add(tete);
        const onde = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.32, 48), new THREE.MeshBasicMaterial({ color: 0xE4CD8A, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        onde.rotation.x = -Math.PI / 2; onde.position.set(x, 0.03, z); groupe.add(onde);
        let nom = null;
        if (k < SOURCES.length) { nom = new THREE.Sprite(new THREE.SpriteMaterial({ map: textureDepuis(dessinerSource(SOURCES[k])), transparent: true, depthWrite: false, depthTest: false })); nom.center.set(0, 0.5); nom.position.set(x + 0.25, hMax + 0.05, z); nom.renderOrder = 5; groupe.add(nom); }
        return { s: s, ligne: ligne, tete: tete, onde: onde, nom: nom, hMax: hMax };
    });
    const pivot = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xE4CD8A })); pivot.position.y = 0.2; groupe.add(pivot);
    const TOUR = 4.6, or = new THREE.Color(0xC9A54C), vif = new THREE.Color(0xFFE7A6), tmp = new THREE.Color();
    let echelleNom = 1;
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 7.2, recul(11, 7.6, a) * 0.95); camera.lookAt(0, -0.4, 0); camera.updateProjectionMatrix(); echelleNom = a < 1 ? 1.15 : 1; },
        maj: function (t, souris, defil) {
            const angle = (t / TOUR) * Math.PI * 2 - Math.PI;
            disque.material.uniforms.uAngle.value = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
            signaux.forEach(function (s, i) {
                // d : angle parcouru depuis le dernier passage du balayage sur ce signal.
                const d = ((angle - s.a) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
                s.vu = t - d / (2 * Math.PI) * TOUR;
                const eclat = Math.exp(-d * 1.6);
                tmp.copy(or).multiplyScalar(0.28).lerp(vif, eclat);
                col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
            });
            gP.attributes.color.needsUpdate = true;
            menaces.forEach(function (m) {
                const vie = t - m.s.vu, monte = sortie(lisse(0, 0.6, vie)) * (1 - lisse(3.2, 4.2, vie));
                m.ligne.scale.y = Math.max(0.001, monte); m.ligne.material.opacity = 0.8 * monte;
                m.tete.position.y = m.hMax * monte; m.tete.material.opacity = monte; m.tete.scale.setScalar(0.42 + Math.sin(t * 6) * 0.04);
                const o = lisse(0, 1.4, vie); m.onde.scale.setScalar(1 + o * 3.2); m.onde.material.opacity = (1 - o) * (vie < 1.4 ? 0.8 : 0);
                if (m.nom) { const n = lisse(0.3, 0.7, vie) * (1 - lisse(2.6, 3.2, vie)); m.nom.material.opacity = n; m.nom.visible = n > 0.01; m.nom.position.y = m.hMax * monte + 0.05; m.nom.scale.set(1.9 * echelleNom, 0.356 * echelleNom, 1); }
            });
            pivot.rotation.y = t * 0.8;
            groupe.rotation.y = souris.x * 0.25 + Math.sin(t * 0.2) * 0.08 + defil * 0.5;
            groupe.rotation.x = souris.y * 0.06;
        }
    };
}

// ---- 15 · Relief : un paysage de signaux agité, qui s'apaise ; la ligne d'or reste droite ----
function sceneRelief() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const groupe = new THREE.Group(); scene.add(groupe);
    const RANGS = 48, COLS = 150, X0 = -15, X1 = 15, Z0 = -12, Z1 = 3.5, OR_RANG = 36;
    const lignes = [];
    for (let r = 0; r < RANGS; r++) {
        const z = Z0 + (Z1 - Z0) * r / (RANGS - 1), pos = new Float32Array(COLS * 3);
        for (let c = 0; c < COLS; c++) { pos[c * 3] = X0 + (X1 - X0) * c / (COLS - 1); pos[c * 3 + 2] = z; }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const estOr = r === OR_RANG, loin = r / (RANGS - 1);
        const m = new THREE.LineBasicMaterial({ color: estOr ? 0xB8912F : 0x1A355F, transparent: true, opacity: estOr ? 1 : 0.1 + 0.42 * loin * loin });
        const l = new THREE.Line(g, m); groupe.add(l);
        lignes.push({ g: g, pos: pos, z: z, or: estOr });
    }
    const vise = new THREE.Vector3(), plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), rayon = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let bosse = 0, bx = 0, bz = 0;
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) {
            const a = w / h; camera.aspect = a;
            if (a >= 1) { camera.position.set(0, 3.6, 9.5); camera.lookAt(0, -0.4, -3); } else { camera.position.set(0, 5.2, 10); camera.lookAt(0, -2.6, -4); }
            camera.updateProjectionMatrix();
        },
        maj: function (t, souris, defil, pointeur) {
            // L'agitation retombe au fil des secondes ; le défilement la relance un peu.
            const A = 0.22 + 1.5 * Math.exp(-t * 0.32) + defil * 0.5;
            if (pointeur.dedans) {
                ndc.set(pointeur.x, pointeur.y); rayon.setFromCamera(ndc, camera);
                if (rayon.ray.intersectPlane(plan, vise)) { bx += (vise.x - groupe.position.x - bx) * 0.1; bz += (vise.z - bz) * 0.1; bosse += (1 - bosse) * 0.06; }
            } else bosse *= 0.95;
            lignes.forEach(function (l) {
                const p = l.pos, z = l.z, k = l.or ? 0.35 : 1;
                for (let c = 0; c < COLS; c++) {
                    const x = p[c * 3];
                    let y = A * k * (Math.sin(x * 0.42 + t * 0.55 + z * 0.22) * 0.6 + Math.sin(x * 0.93 - z * 0.71 + t * 0.85) * 0.34 + Math.sin(x * 1.71 + z * 1.27 - t * 1.25) * 0.16);
                    if (bosse > 0.01) { const dx = x - bx, dz = z - bz; y += bosse * 0.9 * Math.exp(-(dx * dx + dz * dz) / 2.2); }
                    p[c * 3 + 1] = y;
                }
                l.g.attributes.position.needsUpdate = true;
            });
            groupe.rotation.y = souris.x * 0.08;
            groupe.rotation.x = souris.y * 0.03;
        }
    };
}

// ---- 16 · Textes : les références de droit tournent en anneaux autour de l'emblème ----
const REFERENCES = [
    'CODE CIVIL, ART. 9 · RESPECT DE LA VIE PRIVÉE',
    'LOI DU 29 JUILLET 1881, ART. 29 · DIFFAMATION ET INJURE',
    'RGPD, ART. 17 · DROIT À L’EFFACEMENT',
    'CODE CIVIL, ART. 1240 · DÉNIGREMENT',
    'RÈGLEMENT (UE) 2022/2065 · SERVICES NUMÉRIQUES',
    'CODE PÉNAL, ART. 226-4-1 · USURPATION D’IDENTITÉ'
];
function dessinerAnneau(debut) {
    const c = document.createElement('canvas'); c.width = 4096; c.height = 72;
    const x = c.getContext('2d');
    x.fillStyle = '#E4CD8A'; x.font = '500 34px "Albert Sans", sans-serif'; espacer(x, '6px'); x.textBaseline = 'middle';
    let px = 20, i = debut;
    while (px < 4096) { const t = REFERENCES[i % REFERENCES.length]; x.fillText(t, px, 38); px += x.measureText(t).width + 30; x.fillText('✦', px, 36); px += 70; i++; }
    return c;
}
function sceneTextes(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xdfe6f5, 0x1a1a24, 0.45));
    const cle = new THREE.DirectionalLight(0xfff3e0, 1.4); cle.position.set(3, 5, 8); scene.add(cle);
    const contre = new THREE.PointLight(0xE4CD8A, 50, 30, 1.6); contre.position.set(-5, 2, -4); scene.add(contre);
    const groupe = new THREE.Group(); scene.add(groupe);
    const or = matOr(0.2);
    const embleme = new THREE.Group(); groupe.add(embleme);
    embleme.add(bouclierMassif(1 / 52, 0.32, 0.1, matNuit(), or));
    const a = lettreA(1 / 52, 0.1, or); a.position.z = 0.16 + 0.1 + 0.05; embleme.add(a);
    const anneaux = [[-1.25, 3.3, 0.1, 0], [-0.42, 3.55, -0.06, 2], [0.42, 3.55, 0.05, 4], [1.25, 3.3, -0.09, 1]].map(function (p, i) {
        const tex = textureDepuis(dessinerAnneau(p[3])); tex.wrapS = THREE.RepeatWrapping;
        const geo = new THREE.CylinderGeometry(p[1], p[1], 0.36, 160, 1, true);
        const g = new THREE.Group(); g.position.y = p[0]; g.rotation.z = p[2]; g.rotation.x = p[2] * 0.6; groupe.add(g);
        const avant = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.FrontSide, toneMapped: false }));
        const arriere = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.BackSide, toneMapped: false }));
        arriere.renderOrder = 0; avant.renderOrder = 2;
        g.add(arriere, avant);
        return { g: g, sens: i % 2 ? -1 : 1, vitesse: 0.06 + i * 0.012 };
    });
    const poudre = poussiere(220, 7, 0.1, 0xE4CD8A, 0.5); scene.add(poudre);
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 2.2, recul(8.4, 6.4, a)); camera.lookAt(0, -0.1, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const e = sortie(lisse(0, 1.6, t));
            anneaux.forEach(function (n, i) {
                const d = sortie(lisse(0.2 + i * 0.15, 1.6 + i * 0.15, t));
                n.g.scale.setScalar(0.6 + 0.4 * d);
                n.g.children.forEach(function (m) { m.material.opacity = (m.material.side === THREE.BackSide ? 0.22 : 1) * d; });
                n.g.rotation.y = n.sens * (t * n.vitesse + (1 - d) * 1.2) + defil * n.sens * 0.8;
            });
            embleme.scale.setScalar(0.7 + 0.3 * e);
            embleme.rotation.y = Math.sin(t * 0.45) * 0.45 + souris.x * 0.4;
            embleme.rotation.x = -souris.y * 0.15;
            groupe.rotation.x = 0.05 + souris.y * 0.05;
            poudre.rotation.y = t * 0.02;
        }
    };
}

const SCENES = { 12: sceneDossier, 13: scenePalais, 14: sceneRadar, 15: sceneRelief, 16: sceneTextes };

if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const horloge = new THREE.Clock();
    const souris = new THREE.Vector2(), sourisL = new THREE.Vector2(), zero = new THREE.Vector2();
    const pointeur = { x: 0, y: 0, dedans: false, cx: -1, cy: -1 };
    window.addEventListener('pointermove', function (e) { souris.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight * 2 - 1)); pointeur.cx = e.clientX; pointeur.cy = e.clientY; }, { passive: true });
    let actuelle = null, debut = 0, visible = true, premiere = false;
    const liberer = function (s) {
        s.scene.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) [].concat(o.material).forEach(function (m) { Object.values(m).forEach(function (v) { if (v && v.isTexture) v.dispose(); }); m.dispose(); });
        });
    };
    const taille = function () {
        const w = boite.clientWidth, h = boite.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        if (actuelle) actuelle.dimension(w, h);
    };
    const construire = function (n) {
        if (actuelle) { liberer(actuelle); actuelle = null; }
        canvas.classList.remove('pret'); premiere = false;
        if (!SCENES[n]) return;
        const lancer = function () {
            actuelle = SCENES[n](env);
            debut = horloge.getElapsedTime();
            requestAnimationFrame(taille);
        };
        // Les textures dessinent du texte : on attend les polices utilisées.
        const polices = ['400 28px "Libre Baskerville"', 'italic 400 16px "Libre Baskerville"', '400 15px "Source Sans 3"', '600 14px "Source Sans 3"', '700 24px "Source Sans 3"', '600 70px "Cinzel"', '500 30px "Geist Mono"', '500 34px "Albert Sans"'];
        if (document.fonts && document.fonts.load) Promise.all(polices.map(function (f) { return document.fonts.load(f).catch(function () {}); })).then(function () { if (window.AE_MAQUETTE === n) lancer(); });
        else lancer();
    };
    new ResizeObserver(taille).observe(boite);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(boite);
    document.addEventListener('maquette', function (e) { construire(e.detail); });
    if (window.AE_MAQUETTE) construire(window.AE_MAQUETTE);
    (function boucle() {
        requestAnimationFrame(boucle);
        if (!actuelle || !visible) return;
        const t = reduit ? 14 : horloge.getElapsedTime() - debut;
        sourisL.lerp(reduit ? zero : souris, 0.05);
        const r = boite.getBoundingClientRect();
        pointeur.dedans = !reduit && pointeur.cx >= r.left && pointeur.cx <= r.right && pointeur.cy >= r.top && pointeur.cy <= r.bottom;
        if (pointeur.dedans) { pointeur.x = (pointeur.cx - r.left) / r.width * 2 - 1; pointeur.y = -((pointeur.cy - r.top) / r.height * 2 - 1); }
        const defil = Math.min(1, window.scrollY / Math.max(1, r.height + 300));
        actuelle.maj(t, sourisL, defil, pointeur);
        renderer.render(actuelle.scene, actuelle.camera);
        if (!premiere) { premiere = true; canvas.classList.add('pret'); }
    })();
}
