// Scènes 3D des maquettes client (Three.js) : une par maquette, construite à partir des données du
// restaurant. Chaque scène sert aussi de studio photo : les images de la galerie en sont tirées.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
const sortie = x => 1 - Math.pow(1 - x, 3);
const rebond = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const alea = (a, b) => a + Math.random() * (b - a);
const TAN = Math.tan(THREE.MathUtils.degToRad(15));
const prixCourt = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : String(v); };

function rondRect(x, px, py, l, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + l, py, px + l, py + h, r); x.arcTo(px + l, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + l, py, r); x.closePath(); }
function toile(l, h) { const c = document.createElement('canvas'); c.width = l; c.height = h; return c; }
function textureDepuis(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return t;
}
function spriteRond() {
    const c = toile(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}
function ombreSol(taille, force, teinte) {
    const c = toile(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128), t = teinte || '30,18,10';
    g.addColorStop(0, 'rgba(' + t + ',' + force + ')'); g.addColorStop(0.55, 'rgba(' + t + ',' + (force * 0.4) + ')'); g.addColorStop(1, 'rgba(' + t + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(taille, taille), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
}
function geoFeuille(echelle, courbure) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.bezierCurveTo(0.44, 0.2, 0.42, 0.78, 0, 1.18); s.bezierCurveTo(-0.42, 0.78, -0.44, 0.2, 0, 0);
    const g = new THREE.ShapeGeometry(s, 16), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -x * x * courbure + Math.sin(y * 2.6) * 0.04); }
    g.scale(echelle, echelle, echelle); g.computeVertexNormals();
    return g;
}
// Bruit déterministe léger pour déformer les surfaces (croûte, steak, mousse).
const bruit = (x, y, z) => Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 0.5 + Math.sin(x * 4.1 - z * 5.3 + y * 2.7) * 0.3 + Math.sin(z * 9.7 + x * 3.1) * 0.2;
function deformer(geo, f) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); f(v); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    return geo;
}
function bois(l, h, base, fonce) {
    const c = toile(l, h), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, l, h);
    for (let i = 0; i < 70; i++) { x.strokeStyle = 'rgba(' + fonce + ',' + alea(0.05, 0.16).toFixed(2) + ')'; x.lineWidth = alea(1, 3); x.beginPath(); const y = alea(0, h); x.moveTo(0, y); x.bezierCurveTo(l * 0.3, y + alea(-12, 12), l * 0.7, y + alea(-12, 12), l, y + alea(-8, 8)); x.stroke(); }
    return textureDepuis(c);
}
function boisRond(taille, base, fonce) {
    const c = toile(taille, taille), x = c.getContext('2d'), m = taille / 2;
    x.fillStyle = base; x.fillRect(0, 0, taille, taille);
    for (let r = 6; r < m; r += alea(5, 12)) { x.strokeStyle = 'rgba(' + fonce + ',' + alea(0.06, 0.18).toFixed(2) + ')'; x.lineWidth = alea(1, 2.5); x.beginPath(); x.ellipse(m + alea(-3, 3), m + alea(-3, 3), r, r * alea(0.96, 1.04), alea(0, 3), 0, Math.PI * 2); x.stroke(); }
    return textureDepuis(c);
}
function limiter(x, texte, largeur) { if (x.measureText(texte).width <= largeur) return texte; let t = texte; while (t.length > 3 && x.measureText(t + '…').width > largeur) t = t.slice(0, -1); return t.trim() + '…'; }

// ---- 1 · Ardoise : le plat du jour s'écrit à la craie, un verre de rouge à côté ----
function dessinerCraie(r) {
    const W = 1024, H = 720, c = toile(W, H), x = c.getContext('2d');
    x.fillStyle = x.strokeStyle = '#FBF6EE';
    x.textAlign = 'center'; x.font = '700 86px "Caveat", cursive'; x.fillText('Ardoise du jour', W / 2, 112);
    x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(W / 2 - 210, 138); x.bezierCurveTo(W / 2 - 80, 126, W / 2 + 60, 152, W / 2 + 210, 134); x.stroke();
    const plats = [];
    r.categories.forEach(function (cat) { if (cat.plats[0]) plats.push(cat.plats[0]); });
    r.categories.forEach(function (cat) { cat.plats.slice(1).forEach(function (p) { plats.push(p); }); });
    const lignes = [{ y0: 30, y1: 160 }];
    plats.slice(0, 4).forEach(function (p, i) {
        const y = 250 + i * 120, prix = prixCourt(p.prix);
        x.font = '600 58px "Caveat", cursive';
        const lp = x.measureText(prix).width;
        x.textAlign = 'right'; x.fillText(prix, W - 90, y);
        x.textAlign = 'left'; x.fillText(limiter(x, p.nom, W - 250 - lp), 90, y);
        x.globalAlpha = 0.72; x.font = '500 36px "Caveat", cursive'; x.fillText(limiter(x, p.desc, W - 190), 98, y + 44); x.globalAlpha = 1;
        lignes.push({ y0: y - 62, y1: y + 60 });
    });
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 26000; i++) { x.fillStyle = 'rgba(0,0,0,' + alea(0.15, 0.8).toFixed(2) + ')'; x.fillRect(Math.random() * W, Math.random() * H, alea(1, 2.4), alea(1, 2.4)); }
    x.globalCompositeOperation = 'source-over';
    return { plein: c, lignes: lignes };
}
function fondArdoise() {
    const c = toile(1024, 720), x = c.getContext('2d');
    x.fillStyle = '#2A302E'; x.fillRect(0, 0, 1024, 720);
    for (let i = 0; i < 46; i++) { const g = x.createRadialGradient(alea(0, 1024), alea(0, 720), 0, alea(0, 1024), alea(0, 720), alea(80, 260)); g.addColorStop(0, 'rgba(255,255,255,' + alea(0.02, 0.05).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 1024, 720); }
    x.strokeStyle = 'rgba(255,255,255,.04)'; x.lineWidth = 18; x.lineCap = 'round';
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(alea(0, 1024), alea(0, 720)); x.bezierCurveTo(alea(0, 1024), alea(0, 720), alea(0, 1024), alea(0, 720), alea(0, 1024), alea(0, 720)); x.stroke(); }
    return c;
}
function sceneArdoise(env, r) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xfff0dc, 0x3a2a20, 0.55));
    const cle = new THREE.DirectionalLight(0xfff3e2, 1.25); cle.position.set(-4, 6, 7); scene.add(cle);
    const rouge = new THREE.PointLight(0xff6a4a, 22, 12, 1.6); rouge.position.set(4, 1, 3); scene.add(rouge);
    const groupe = new THREE.Group(); scene.add(groupe);
    const tableau = new THREE.Group(); tableau.position.set(-0.5, 0.45, 0); tableau.rotation.y = 0.16; groupe.add(tableau);
    const craie = dessinerCraie(r), fond = fondArdoise(), aff = toile(1024, 720), ax = aff.getContext('2d');
    ax.drawImage(fond, 0, 0);
    const tex = textureDepuis(aff);
    tableau.add(new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, envMapIntensity: 0.3 })));
    const cadre = new THREE.MeshStandardMaterial({ map: bois(512, 64, '#6B4A32', '30,18,10'), roughness: 0.7 });
    [[0, 1.65, 4.8, 0.22], [0, -1.65, 4.8, 0.22], [-2.3, 0, 0.22, 3.1], [2.3, 0, 0.22, 3.1]].forEach(function (b) { const m = new THREE.Mesh(new THREE.BoxGeometry(b[2], b[3], 0.16), cadre); m.position.set(b[0], b[1], 0.02); tableau.add(m); });
    const dos = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.3, 0.06), new THREE.MeshStandardMaterial({ color: 0x1B1512, roughness: 0.9 })); dos.position.z = -0.05; tableau.add(dos);
    const pied = new THREE.MeshStandardMaterial({ color: 0x5B3D29, roughness: 0.7 });
    [[-1.5, 0.18], [1.5, 0.18]].forEach(function (p) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 10), pied); l.position.set(p[0], -2.55, p[1]); l.rotation.x = -0.12; tableau.add(l); });
    const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xF4F0E8, roughness: 0.95 }));
    baton.rotation.z = 1.2; tableau.add(baton);
    // Le verre de vin rouge
    const verre = new THREE.Group(); verre.position.set(2.55, -1.55, 1.05); groupe.add(verre);
    const profilVerre = [[0, 0], [0.46, 0], [0.47, 0.03], [0.06, 0.07], [0.04, 0.12], [0.035, 0.92], [0.07, 0.98], [0.3, 1.1], [0.45, 1.34], [0.49, 1.6], [0.46, 1.9], [0.41, 2.18]].map(p => new THREE.Vector2(p[0], p[1]));
    verre.add(new THREE.Mesh(new THREE.LatheGeometry(profilVerre, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.2, clearcoat: 1, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false })));
    const profilVin = [[0, 1.0], [0.24, 1.04], [0.4, 1.2], [0.46, 1.4], [0.47, 1.52], [0, 1.52]].map(p => new THREE.Vector2(p[0], p[1]));
    const vin = new THREE.Mesh(new THREE.LatheGeometry(profilVin, 64), new THREE.MeshPhysicalMaterial({ color: 0x5A0B1C, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.94 }));
    verre.add(vin);
    const ombre = ombreSol(3, 0.45); ombre.position.set(2.55, -1.54, 1.05); groupe.add(ombre);
    const nb = 40, pos = new Float32Array(nb * 3), vit = [];
    for (let i = 0; i < nb; i++) { pos[i * 3] = alea(-3, 3); pos[i * 3 + 1] = alea(-2, 2.5); pos[i * 3 + 2] = alea(-0.5, 2); vit.push(alea(0.05, 0.16)); }
    const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const poussiere = new THREE.Points(gp, new THREE.PointsMaterial({ size: 0.05, map: spriteRond(), color: 0xFFFFFF, transparent: true, opacity: 0.45, depthWrite: false }));
    groupe.add(poussiere);
    let dernier = -1;
    const ecrire = function (p) {
        const k = Math.round(p * 240);
        if (k === dernier) return;
        dernier = k;
        ax.drawImage(fond, 0, 0);
        const n = craie.lignes.length;
        let tete = null;
        craie.lignes.forEach(function (l, i) {
            const local = Math.min(1, Math.max(0, p * n - i));
            if (!local) return;
            const larg = 70 + 884 * local;
            ax.save(); ax.beginPath(); ax.rect(0, l.y0, larg, l.y1 - l.y0); ax.clip(); ax.drawImage(craie.plein, 0, 0); ax.restore();
            if (local < 1) tete = { x: larg, y: (l.y0 + l.y1) / 2 };
        });
        tex.needsUpdate = true;
        if (tete) baton.position.set(-2.2 + 4.4 * tete.x / 1024, 1.55 - 3.1 * tete.y / 720, 0.14);
        else baton.position.set(1.6, -1.49, 0.12);
    };
    return {
        scene: scene, camera: camera, fondPhoto: '#16120E',
        photos: [
            { pos: [4, 1.4, 10], cible: [0.3, 0.1, 0] }, { pos: [4.4, -0.3, 3.8], cible: [2.5, -0.7, 1], fov: 36 },
            { pos: [0, 0.5, 8.4], cible: [-0.45, 0.45, 0] }, { pos: [-1.3, 1.3, 4], cible: [-1.2, 0.9, 0] },
            { pos: [1.5, -2.3, 7], cible: [0.5, 0, 0] }, { pos: [2.6, 2.4, 3.4], cible: [2.55, -0.6, 1] },
            { pos: [-5, 1, 8], cible: [0.4, 0, 0] }, { pos: [0.9, -0.5, 4], cible: [0.5, -0.7, 0] }
        ],
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 0.6, Math.max(11, 7.6 / (2 * TAN * a))); camera.lookAt(0.3, -0.1, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            ecrire(Math.min(1, Math.max(0, (t - 0.9) / 4.5)));
            const e = sortie(lisse(0, 1.2, t));
            groupe.position.y = (1 - e) * -2;
            groupe.rotation.y = -0.1 + souris.x * 0.25 + Math.sin(t * 0.3) * 0.05 + defil * 0.5;
            groupe.rotation.x = -souris.y * 0.06;
            vin.rotation.z = Math.sin(t * 1.3) * 0.015;
            for (let i = 0; i < nb; i++) { pos[i * 3 + 1] = -2 + ((t * vit[i] + i * 0.37) % 4.5); }
            gp.attributes.position.needsUpdate = true;
        }
    };
}

// ---- 2 · Four à bois : la pizza se garnit sur sa pelle, devant les braises ----
function textureSauce() {
    const c = toile(512, 512), x = c.getContext('2d');
    x.beginPath();
    for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, r = 236 + Math.sin(a * 7) * 6 + Math.sin(a * 13 + 1) * 4; x.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); }
    x.closePath();
    const g = x.createRadialGradient(256, 256, 20, 256, 256, 240); g.addColorStop(0, '#C73A24'); g.addColorStop(1, '#A92A1A');
    x.fillStyle = g; x.fill(); x.save(); x.clip();
    for (let i = 0; i < 260; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(120,20,10,.25)' : 'rgba(240,110,60,.22)'; x.beginPath(); x.ellipse(alea(20, 492), alea(20, 492), alea(4, 18), alea(3, 10), alea(0, 3), 0, Math.PI * 2); x.fill(); }
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,190,90,.25)'; x.beginPath(); x.arc(alea(40, 472), alea(40, 472), alea(2, 6), 0, Math.PI * 2); x.fill(); }
    x.restore();
    return textureDepuis(c);
}
function scenePizza(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffe2c0, 0x3a1a0a, 0.75));
    const cle = new THREE.DirectionalLight(0xfff0dc, 1.6); cle.position.set(-3, 7, 5); scene.add(cle);
    const four = new THREE.PointLight(0xff7a2a, 60, 16, 1.5); four.position.set(0, 1.6, -3.5); scene.add(four);
    const groupe = new THREE.Group(); scene.add(groupe);
    const pelle = new THREE.Group(); groupe.add(pelle);
    const texBois = boisRond(512, '#C99A63', '70,40,15');
    const plateau = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.06, 72), [new THREE.MeshStandardMaterial({ color: 0xB88A55, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: texBois, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: texBois, roughness: 0.7 })]);
    plateau.position.y = -0.03; pelle.add(plateau);
    const manche = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 2.6), new THREE.MeshStandardMaterial({ map: bois(64, 512, '#C99A63', '70,40,15'), roughness: 0.7 }));
    manche.position.set(0, -0.03, -3.25); pelle.add(manche);
    pelle.rotation.y = 0.55;
    const pizza = new THREE.Group(); groupe.add(pizza);
    const profil = [[0, 0.035], [1.34, 0.035], [1.46, 0.07], [1.56, 0.15], [1.66, 0.18], [1.73, 0.13], [1.74, 0.05], [1.66, 0], [0, 0]].map(p => new THREE.Vector2(p[0], p[1]));
    const geoPate = new THREE.LatheGeometry(profil, 120), pp = geoPate.attributes.position, couleurs = new Float32Array(pp.count * 3), cp = new THREE.Color();
    for (let i = 0; i < pp.count; i++) {
        const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), rr = Math.hypot(x, z), a = Math.atan2(z, x);
        const tache = rr > 1.4 && (Math.sin(a * 23 + rr * 7) * Math.sin(a * 11 - 3) > 0.55);
        cp.set(rr > 1.4 ? 0xE9C17F : 0xF0D6A8).multiplyScalar(tache ? 0.42 : (0.92 + y * 0.6));
        couleurs[i * 3] = cp.r; couleurs[i * 3 + 1] = cp.g; couleurs[i * 3 + 2] = cp.b;
    }
    geoPate.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
    pizza.add(new THREE.Mesh(geoPate, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
    const sauce = new THREE.Mesh(new THREE.CircleGeometry(1.42, 72), new THREE.MeshStandardMaterial({ map: textureSauce(), transparent: true, roughness: 0.4 }));
    sauce.rotation.x = -Math.PI / 2; sauce.position.y = 0.045; pizza.add(sauce);
    const geoMozza = new THREE.SphereGeometry(0.26, 24, 16), matMozza = new THREE.MeshPhysicalMaterial({ color: 0xFFF7E6, roughness: 0.42, clearcoat: 0.25 });
    const mozzas = [];
    for (let i = 0; i < 15; i++) { const a = i * 2.39996, rr = 0.25 + Math.sqrt((i + 0.5) / 15) * 0.9; const m = new THREE.Mesh(geoMozza, matMozza); m.userData = { x: Math.cos(a) * rr, z: Math.sin(a) * rr, debut: 1.8 + i * 0.07 }; pizza.add(m); mozzas.push(m); }
    const geoBasilic = geoFeuille(0.42, 0.7), matBasilic = new THREE.MeshStandardMaterial({ color: 0x2F7A2C, roughness: 0.45, side: THREE.DoubleSide });
    const basilics = [];
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.4, rr = 0.35 + (i % 3) * 0.3; const b = new THREE.Mesh(geoBasilic, matBasilic); b.userData = { x: Math.cos(a) * rr, z: Math.sin(a) * rr, rot: a * 2, debut: 3.0 + i * 0.08 }; pizza.add(b); basilics.push(b); }
    const sprite = spriteRond();
    const nbB = 130, posB = new Float32Array(nbB * 3), infoB = [];
    for (let i = 0; i < nbB; i++) infoB.push({ x: alea(-5, 5), z: alea(-6, -2), v: alea(0.3, 0.9), ph: Math.random() * 6 });
    const gB = new THREE.BufferGeometry(); gB.setAttribute('position', new THREE.BufferAttribute(posB, 3));
    scene.add(new THREE.Points(gB, new THREE.PointsMaterial({ size: 0.09, map: sprite, color: 0xFFA040, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
    const nbV = 18, posV = new Float32Array(nbV * 3), infoV = [];
    for (let i = 0; i < nbV; i++) infoV.push({ x: alea(-0.9, 0.9), z: alea(-0.9, 0.9), v: alea(0.25, 0.5), ph: Math.random() * 3 });
    const gV = new THREE.BufferGeometry(); gV.setAttribute('position', new THREE.BufferAttribute(posV, 3));
    const vapeur = new THREE.Points(gV, new THREE.PointsMaterial({ size: 0.9, map: sprite, color: 0xFFFFFF, transparent: true, opacity: 0, depthWrite: false }));
    pizza.add(vapeur);
    return {
        scene: scene, camera: camera, fondPhoto: '#1B110B',
        photos: [
            { pos: [3.4, 3.1, 5.4], cible: [0, 0, 0] }, { pos: [0, 8.2, 0.01], cible: [0, 0, 0], fov: 32 },
            { pos: [2.3, 1.1, 2.1], cible: [1.0, 0.1, 0.4] }, { pos: [0, 1.3, 5.6], cible: [0, 0.2, 0] },
            { pos: [0.5, 2.3, 1.7], cible: [0.2, 0, 0] }, { pos: [-4, 3, 6.4], cible: [0, 0.3, -1] },
            { pos: [1.3, 4.2, 1.3], cible: [0.6, 0, 0.3] }, { pos: [4.2, 2.1, 3.2], cible: [0.8, 0, 0.8] }
        ],
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 4.3, Math.max(6.3, 5.4 / (2 * TAN * a))); camera.lookAt(0, -0.25, 0.2); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const e = sortie(lisse(0, 1.1, t));
            groupe.position.x = (1 - e) * 5;
            groupe.rotation.y = -(1 - e) * 1.4 + souris.x * 0.3 + defil * 0.6;
            groupe.rotation.x = -souris.y * 0.08 + defil * 0.25;
            pizza.rotation.y = Math.max(0, t - 4.2) * 0.12;
            const s = sortie(lisse(0.9, 1.9, t));
            sauce.scale.setScalar(Math.max(0.001, s)); sauce.rotation.z = (1 - s) * 2;
            mozzas.forEach(function (m) {
                const d = m.userData, p = lisse(d.debut, d.debut + 0.45, t), fonte = lisse(d.debut + 0.5, d.debut + 2.8, t);
                m.visible = t > d.debut;
                m.position.set(d.x, 0.08 + (1 - rebond(p)) * 2.4, d.z);
                m.scale.set(0.9 + 0.38 * fonte, 0.42 - 0.24 * fonte, 0.9 + 0.38 * fonte);
            });
            basilics.forEach(function (b) {
                const d = b.userData, p = sortie(lisse(d.debut, d.debut + 0.6, t));
                b.visible = t > d.debut;
                b.position.set(d.x, 0.13 + (1 - p) * 1.8, d.z);
                b.rotation.set(-Math.PI / 2 + 0.15, 0, d.rot + (1 - p) * 3);
            });
            for (let i = 0; i < nbB; i++) { const b = infoB[i], y = ((t * b.v + b.ph) % 5); posB[i * 3] = b.x + Math.sin(t + b.ph) * 0.3; posB[i * 3 + 1] = -1.5 + y; posB[i * 3 + 2] = b.z; }
            gB.attributes.position.needsUpdate = true;
            for (let i = 0; i < nbV; i++) { const v = infoV[i], y = ((t * v.v + v.ph) % 2.4); posV[i * 3] = v.x + Math.sin(t * 0.8 + v.ph) * 0.15; posV[i * 3 + 1] = 0.3 + y; posV[i * 3 + 2] = v.z; }
            gV.attributes.position.needsUpdate = true;
            vapeur.material.opacity = lisse(3.6, 5.2, t) * 0.18;
            four.intensity = 60 + Math.sin(t * 7) * 6 + Math.sin(t * 13) * 4;
        }
    };
}

// ---- 3 · Sakura : le plateau de sushis se dresse, des pétales tombent ----
function textureRiz() {
    const c = toile(256, 256), x = c.getContext('2d');
    x.fillStyle = '#F2EEE4'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.9)' : 'rgba(205,195,175,.55)'; x.beginPath(); x.ellipse(alea(0, 256), alea(0, 256), alea(5, 8), alea(2.4, 3.6), alea(0, 3.14), 0, Math.PI * 2); x.fill(); }
    return c;
}
function texturePoisson(base, filet) {
    const c = toile(256, 128), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 256, 128);
    g.addColorStop(0, base[0]); g.addColorStop(1, base[1]); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    x.strokeStyle = filet; x.lineWidth = 5;
    for (let i = -2; i < 9; i++) { x.beginPath(); x.moveTo(i * 34, 128); x.bezierCurveTo(i * 34 + 20, 80, i * 34 + 30, 40, i * 34 + 60, 0); x.stroke(); }
    return textureDepuis(c);
}
function textureMaki() {
    const c = toile(256, 256), x = c.getContext('2d');
    x.fillStyle = '#1B2A1E'; x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill();
    x.drawImage(textureRiz(), 0, 0, 256, 256, 14, 14, 228, 228);
    x.globalCompositeOperation = 'destination-in'; x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over';
    x.strokeStyle = '#1B2A1E'; x.lineWidth = 14; x.beginPath(); x.arc(128, 128, 121, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#F07A4F'; x.beginPath(); x.ellipse(118, 124, 44, 34, 0.4, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#8DB33A'; x.beginPath(); x.ellipse(160, 150, 22, 16, -0.4, 0, Math.PI * 2); x.fill();
    return textureDepuis(c);
}
function sceneSushi(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xfff4ec, 0x201010, 0.5));
    const cle = new THREE.DirectionalLight(0xffffff, 1.35); cle.position.set(-3, 7, 5); scene.add(cle);
    const rouge = new THREE.PointLight(0xff3040, 18, 12, 1.6); rouge.position.set(3, 2, -2); scene.add(rouge);
    const groupe = new THREE.Group(); scene.add(groupe);
    const ardoise = new THREE.Mesh(new RoundedBoxGeometry(5, 0.14, 2.7, 4, 0.05), new THREE.MeshStandardMaterial({ color: 0x1D1D1F, roughness: 0.75, metalness: 0.1 }));
    ardoise.position.y = -0.07; groupe.add(ardoise);
    const riz = textureRiz(), texRiz = textureDepuis(riz);
    const matRiz = new THREE.MeshStandardMaterial({ map: texRiz, bumpMap: new THREE.CanvasTexture(riz), bumpScale: 0.6, roughness: 0.85 });
    const geoRiz = new THREE.SphereGeometry(1, 32, 20); geoRiz.scale(0.5, 0.2, 0.26);
    const geoPoisson = deformer(new THREE.BoxGeometry(1.08, 0.08, 0.5, 24, 1, 8), function (v) { v.y -= 0.2 * Math.pow(v.x / 0.54, 2) + 0.05 * Math.pow(v.z / 0.25, 2); });
    const saumon = new THREE.MeshPhysicalMaterial({ map: texturePoisson(['#F58A5A', '#E8683E'], 'rgba(255,238,225,.75)'), roughness: 0.3, clearcoat: 0.7 });
    const thon = new THREE.MeshPhysicalMaterial({ map: texturePoisson(['#B2263B', '#8E1A2C'], 'rgba(255,190,190,.18)'), roughness: 0.3, clearcoat: 0.7 });
    const pieces = [];
    const poser = function (o, x, z, rot) { o.userData = { x: x, z: z }; o.rotation.y = rot || 0; groupe.add(o); pieces.push(o); };
    [[-1.65, 0.5, saumon, 0.1], [-0.6, 0.55, thon, -0.08], [0.45, 0.5, saumon, 0.06]].forEach(function (n) {
        const g = new THREE.Group(); const b = new THREE.Mesh(geoRiz, matRiz); b.position.y = 0.2; g.add(b);
        const p = new THREE.Mesh(geoPoisson, n[2]); p.position.y = 0.43; g.add(p); poser(g, n[0], n[1], n[3]);
    });
    const nori = new THREE.MeshStandardMaterial({ color: 0x1B2A1E, roughness: 0.55 }), dessus = new THREE.MeshStandardMaterial({ map: textureMaki(), roughness: 0.8 });
    [[-1.55, -0.6], [-0.85, -0.62], [-0.15, -0.6]].forEach(function (m) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 40), [nori, dessus, dessus]); k.position.y = 0.17; const g = new THREE.Group(); g.add(k); poser(g, m[0], m[1]); });
    const coupelle = new THREE.Group();
    coupelle.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.32, 0], [0.38, 0.04], [0.44, 0.15], [0.46, 0.17], [0.43, 0.17], [0.37, 0.07], [0, 0.05]].map(p => new THREE.Vector2(p[0], p[1])), 48), new THREE.MeshPhysicalMaterial({ color: 0xF5F2EC, roughness: 0.2, clearcoat: 1 })));
    const soja = new THREE.Mesh(new THREE.CircleGeometry(0.36, 40), new THREE.MeshPhysicalMaterial({ color: 0x2A1006, roughness: 0.05, clearcoat: 1 })); soja.rotation.x = -Math.PI / 2; soja.position.y = 0.1; coupelle.add(soja);
    poser(coupelle, 1.6, 0.35);
    const wasabi = new THREE.Mesh(deformer(new THREE.IcosahedronGeometry(0.17, 3), function (v) { v.multiplyScalar(1 + bruit(v.x * 5, v.y * 5, v.z * 5) * 0.12); v.y *= 0.8; }), new THREE.MeshStandardMaterial({ color: 0x8DB33A, roughness: 0.8 }));
    wasabi.position.y = 0.13; const gw = new THREE.Group(); gw.add(wasabi); poser(gw, 1.15, -0.6);
    const gingembre = new THREE.Group(), matG = new THREE.MeshStandardMaterial({ color: 0xF4C0B2, roughness: 0.4, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(geoFeuille(0.34, 0.5), matG); f.rotation.set(-Math.PI / 2 + 0.3, 0, i * 0.8); f.position.set(i * 0.08, 0.05 + i * 0.03, 0); gingembre.add(f); }
    poser(gingembre, 1.75, -0.7);
    const baguettes = new THREE.Group(), laque = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.2, clearcoat: 1 }), vermillon = new THREE.MeshStandardMaterial({ color: 0xB91C1C, roughness: 0.3 });
    [-0.07, 0.07].forEach(function (dz) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.017, 3.1, 12), laque); b.rotation.z = Math.PI / 2; b.position.set(0, 0.16, dz); baguettes.add(b); const bague = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.12, 12), vermillon); bague.rotation.z = Math.PI / 2; bague.position.set(1.2, 0.16, dz); baguettes.add(bague); });
    const repose = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.1, 0.36, 2, 0.03), vermillon); repose.position.set(0.95, 0.05, 0); baguettes.add(repose);
    baguettes.rotation.y = 0.25; groupe.add(baguettes);
    // Pétales de cerisier
    const petale = new THREE.Shape(); petale.moveTo(0, 0); petale.bezierCurveTo(0.12, 0.05, 0.16, 0.2, 0.08, 0.3); petale.lineTo(0, 0.25); petale.lineTo(-0.08, 0.3); petale.bezierCurveTo(-0.16, 0.2, -0.12, 0.05, 0, 0);
    const NP = 110, petales = new THREE.InstancedMesh(new THREE.ShapeGeometry(petale, 6), new THREE.MeshStandardMaterial({ color: 0xF6B7C8, roughness: 0.5, side: THREE.DoubleSide }), NP);
    const infoP = []; for (let i = 0; i < NP; i++) infoP.push({ x: alea(-4.5, 4.5), z: alea(-3, 2.5), v: alea(0.35, 0.7), ph: Math.random(), f: alea(0.6, 1.4), rs: new THREE.Vector3(alea(-2, 2), alea(-2, 2), alea(-2, 2)) });
    scene.add(petales);
    const m = new THREE.Object3D();
    return {
        scene: scene, camera: camera, fondPhoto: '#0E0C0B',
        photos: [
            { pos: [3.5, 2.6, 5], cible: [0, 0, 0] }, { pos: [-0.7, 1.1, 2.2], cible: [-1.0, 0.3, 0.4] },
            { pos: [0, 7.6, 0.01], cible: [0, 0, 0] }, { pos: [0, 0.8, 5], cible: [0, 0.3, 0] },
            { pos: [-0.8, 1.4, 1.3], cible: [-0.8, 0.2, -0.6] }, { pos: [2.7, 1.4, 2], cible: [1.4, 0.1, 0] },
            { pos: [-4, 2.5, 6], cible: [0, 0.8, 0] }, { pos: [3, 1, 2.6], cible: [1.2, 0.1, 0.6] }
        ],
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 3.9, Math.max(7.6, 6.2 / (2 * TAN * a))); camera.lookAt(0, -0.1, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const e = sortie(lisse(0, 0.9, t));
            groupe.scale.setScalar(0.85 + 0.15 * e);
            groupe.rotation.y = -0.25 + souris.x * 0.3 + Math.sin(t * 0.25) * 0.06 + defil * 0.6;
            groupe.rotation.x = -souris.y * 0.06;
            pieces.forEach(function (o, i) {
                const d = 0.9 + i * 0.16, p = lisse(d, d + 0.5, t);
                o.visible = t > d;
                o.position.set(o.userData.x, (1 - rebond(p)) * 2.6, o.userData.z);
            });
            const b = sortie(lisse(2.6, 3.4, t));
            baguettes.position.set(1.3 + (1 - b) * 3, 0, 0.95);
            const apparition = lisse(0.6, 1.6, t);
            for (let i = 0; i < NP; i++) {
                const p = infoP[i], y = 4.5 - ((t * p.v + p.ph * 7) % 7);
                m.position.set(p.x + Math.sin(t * p.f + p.ph * 6) * 0.5, y, p.z);
                m.rotation.set(t * p.rs.x + p.ph, t * p.rs.y, t * p.rs.z);
                m.scale.setScalar(apparition);
                m.updateMatrix(); petales.setMatrixAt(i, m.matrix);
            }
            petales.instanceMatrix.needsUpdate = true;
        }
    };
}

// ---- 4 · Smash (et Chez Dani) : le burger se monte couche par couche, puis s'éclate au défilement ----
function textureTomate() {
    const c = toile(256, 256), x = c.getContext('2d');
    x.fillStyle = '#C8281C'; x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#E2452E'; x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; x.fillStyle = '#F07A52'; x.beginPath(); x.ellipse(128 + Math.cos(a) * 58, 128 + Math.sin(a) * 58, 36, 22, a, 0, Math.PI * 2); x.fill(); for (let k = 0; k < 7; k++) { x.fillStyle = '#F6E3A0'; x.beginPath(); x.ellipse(128 + Math.cos(a) * alea(44, 72), 128 + Math.sin(a) * alea(44, 72), 4, 2.5, a, 0, Math.PI * 2); x.fill(); } }
    x.fillStyle = '#D93A28'; x.beginPath(); x.arc(128, 128, 22, 0, Math.PI * 2); x.fill();
    return textureDepuis(c);
}
function textureSauceHerbes() {
    const c = toile(256, 256), x = c.getContext('2d');
    x.beginPath(); for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2, r = 118 + Math.sin(a * 6) * 7; x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } x.closePath();
    x.fillStyle = '#EDE6C8'; x.fill(); x.save(); x.clip();
    for (let i = 0; i < 180; i++) { x.fillStyle = Math.random() < 0.7 ? '#3F7A2A' : '#6FA048'; x.fillRect(alea(0, 256), alea(0, 256), alea(2, 6), alea(1.5, 3)); }
    x.restore();
    return textureDepuis(c);
}
function dessinerFanion(nom, fond, encre, police) {
    const c = toile(512, 256), x = c.getContext('2d');
    x.fillStyle = fond; x.fillRect(0, 0, 512, 256);
    x.fillStyle = encre; x.textAlign = 'center'; x.textBaseline = 'middle';
    let taille = 110; x.font = police.replace('#', taille);
    while (x.measureText(nom).width > 440 && taille > 40) { taille -= 6; x.font = police.replace('#', taille); }
    x.fillText(nom, 256, 134);
    return textureDepuis(c);
}
function sceneBurger(env, r, dani) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xfff4e6, dani ? 0x2a2018 : 0xa08060, dani ? 0.5 : 0.8));
    const cle = new THREE.DirectionalLight(0xfff2e0, 1.4); cle.position.set(-4, 7, 6); scene.add(cle);
    const contre = new THREE.PointLight(dani ? 0xD4AF37 : 0xffc070, dani ? 40 : 20, 14, 1.6); contre.position.set(4, 3, -3); scene.add(contre);
    const groupe = new THREE.Group(); scene.add(groupe);
    const planche = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.16, 72), [new THREE.MeshStandardMaterial({ color: dani ? 0x3B2A1E : 0xB98A58, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: boisRond(512, dani ? '#4A3526' : '#CFA271', '60,35,15'), roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: 0x3B2A1E })]);
    planche.position.y = -0.08; groupe.add(planche);
    const ombre = ombreSol(6.5, dani ? 0.6 : 0.3); ombre.position.y = -0.17; groupe.add(ombre);
    const burger = new THREE.Group(); groupe.add(burger);
    const couches = [];
    let haut = 0;
    const empiler = function (o, h) { o.userData.base = haut; couches.push(o); burger.add(o); haut += h; };
    const pain = new THREE.MeshPhysicalMaterial({ color: dani ? 0xB8662A : 0xD08A3E, roughness: 0.45, clearcoat: dani ? 0.8 : 0.4, clearcoatRoughness: 0.3 });
    const dessous = new THREE.Group();
    dessous.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [1.05, 0], [1.2, 0.06], [1.26, 0.2], [1.23, 0.32], [1.16, 0.36], [0, 0.36]].map(p => new THREE.Vector2(p[0], p[1])), 64), pain));
    const mie = new THREE.Mesh(new THREE.CircleGeometry(1.15, 64), new THREE.MeshStandardMaterial({ color: 0xF0D29E, roughness: 0.9 })); mie.rotation.x = -Math.PI / 2; mie.position.y = 0.362; dessous.add(mie);
    empiler(dessous, 0.36);
    if (dani) {
        const sauce = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshStandardMaterial({ map: textureSauceHerbes(), transparent: true, roughness: 0.3 })); sauce.rotation.x = -Math.PI / 2;
        const gs = new THREE.Group(); sauce.position.y = 0.01; gs.add(sauce); empiler(gs, 0.02);
    } else {
        const salade = new THREE.Mesh(deformer(new THREE.RingGeometry(0.01, 1.5, 120, 5), function (v) { const rr = Math.hypot(v.x, v.y), a = Math.atan2(v.y, v.x); const f = 1 + Math.sin(a * 9) * 0.05; v.x *= f; v.y *= f; v.z = 0.07 * Math.sin(a * 16) * Math.pow(rr / 1.5, 1.5) - 0.08 * Math.pow(Math.max(0, rr - 1.1), 2); }), new THREE.MeshStandardMaterial({ color: 0x6BB23E, roughness: 0.55, side: THREE.DoubleSide }));
        salade.rotation.x = -Math.PI / 2; const gsal = new THREE.Group(); salade.position.y = 0.03; gsal.add(salade); empiler(gsal, 0.06);
        const tomates = new THREE.Group(), texT = textureTomate(), cote = new THREE.MeshStandardMaterial({ color: 0xC8281C, roughness: 0.4 }), face = new THREE.MeshStandardMaterial({ map: texT, roughness: 0.35 });
        [-0.45, 0.48].forEach(function (x, i) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.09, 40), [cote, face, face]); tr.position.set(x, 0.045, i ? 0.1 : -0.1); tomates.add(tr); });
        empiler(tomates, 0.09);
    }
    const steak = new THREE.Mesh(deformer(new THREE.CylinderGeometry(1.3, 1.28, 0.42, 72, 6), function (v) { const a = Math.atan2(v.z, v.x), rr = Math.hypot(v.x, v.z); const n = bruit(Math.cos(a) * 3, v.y * 4, Math.sin(a) * 3); if (rr > 0.01) { const f = 1 + n * 0.035; v.x *= f; v.z *= f; } if (Math.abs(v.y) > 0.2) v.y += n * 0.03 * Math.sign(v.y); }), new THREE.MeshStandardMaterial({ color: 0x4E2C1B, roughness: 0.95 }));
    steak.position.y = 0.21; const gst = new THREE.Group(); gst.add(steak); empiler(gst, 0.42);
    // Le fromage : cheddar carré pour le Comptoir, Saint-Marcellin coulant pour Chez Dani.
    const geoFromage = dani ? new THREE.RingGeometry(0.01, 1.4, 128, 14) : new THREE.PlaneGeometry(2.4, 2.4, 36, 36);
    if (dani) geoFromage.rotateX(-Math.PI / 2); else { geoFromage.rotateX(-Math.PI / 2); geoFromage.rotateY(Math.PI / 4); }
    const baseFromage = geoFromage.attributes.position.array.slice();
    const fromage = new THREE.Mesh(geoFromage, new THREE.MeshPhysicalMaterial({ color: dani ? 0xF0DCA4 : 0xF2A516, roughness: dani ? 0.3 : 0.35, clearcoat: 0.4, side: THREE.DoubleSide }));
    const gfr = new THREE.Group(); fromage.position.y = 0.02; gfr.add(fromage); empiler(gfr, 0.04);
    const oignons = new THREE.Group();
    if (dani) {
        const cara = new THREE.MeshPhysicalMaterial({ color: 0x8A4B1C, roughness: 0.3, clearcoat: 0.8 });
        for (let i = 0; i < 16; i++) { const o = new THREE.Mesh(new THREE.TorusGeometry(alea(0.18, 0.3), 0.04, 8, 24, alea(1.6, 3)), cara); const a = i * 2.4, rr = Math.sqrt(i / 16) * 0.95; o.position.set(Math.cos(a) * rr, 0.04, Math.sin(a) * rr); o.rotation.set(-Math.PI / 2 + alea(-0.3, 0.3), 0, alea(0, 6)); oignons.add(o); }
    } else {
        const violet = new THREE.MeshStandardMaterial({ color: 0xB06A9C, roughness: 0.4 });
        [[0.3, 0.2, 0.46], [-0.4, -0.25, 0.4], [0.1, -0.5, 0.34], [-0.2, 0.45, 0.3]].forEach(function (o) { const m = new THREE.Mesh(new THREE.TorusGeometry(o[2], 0.045, 8, 36), violet); m.rotation.x = -Math.PI / 2; m.position.set(o[0], 0.04, o[1]); oignons.add(m); });
    }
    empiler(oignons, 0.08);
    const dessus = new THREE.Group();
    const profilDome = [[0, 0], [1.2, 0], [1.3, 0.1], [1.28, 0.35], [1.15, 0.65], [0.85, 0.9], [0.45, 1.02], [0, 1.05]];
    dessus.add(new THREE.Mesh(new THREE.LatheGeometry(profilDome.map(p => new THREE.Vector2(p[0], p[1])), 64), pain));
    if (!dani) {
        const NS = 70, sesame = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xF6E8C4, roughness: 0.6 }), NS), mm = new THREE.Object3D();
        for (let i = 0; i < NS; i++) {
            const u = Math.random() * 0.8 + 0.1, k = Math.min(profilDome.length - 2, Math.floor(u * 3) + 3), a = Math.random() * Math.PI * 2;
            const p0 = profilDome[k], p1 = profilDome[k + 1], f = Math.random();
            const rr = p0[0] + (p1[0] - p0[0]) * f, y = p0[1] + (p1[1] - p0[1]) * f;
            mm.position.set(Math.cos(a) * rr * 1.01, y + 0.01, Math.sin(a) * rr * 1.01); mm.scale.set(0.055, 0.032, 0.022); mm.lookAt(0, -2, 0); mm.rotateZ(alea(0, 3));
            mm.updateMatrix(); sesame.setMatrixAt(i, mm.matrix);
        }
        dessus.add(sesame);
    }
    empiler(dessus, 1.05);
    const fanion = new THREE.Group();
    const pique = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0xD9B98A, roughness: 0.6 })); pique.position.y = 0.85; fanion.add(pique);
    const nomFanion = r.nom;
    const geoFanion = new THREE.PlaneGeometry(1.1, 0.55, 12, 1); geoFanion.translate(0.55, 0, 0);
    const baseFanion = geoFanion.attributes.position.array.slice();
    const drapeau = new THREE.Mesh(geoFanion, new THREE.MeshStandardMaterial({ map: dani ? dessinerFanion(nomFanion, '#0F0E0C', '#D4AF37', 'italic 600 #px "Cormorant Garamond", serif') : dessinerFanion(nomFanion.toUpperCase(), '#EF4444', '#FFFFFF', '400 #px "Anton", sans-serif'), side: THREE.DoubleSide, roughness: 0.7 }));
    drapeau.position.set(0.02, 1.38, 0); fanion.add(drapeau);
    // Au revers, le même nom, remis à l'endroit.
    const texRevers = drapeau.material.map.clone(); texRevers.repeat.x = -1; texRevers.offset.x = 1; texRevers.needsUpdate = true;
    drapeau.material.side = THREE.FrontSide;
    const revers = new THREE.Mesh(geoFanion, new THREE.MeshStandardMaterial({ map: texRevers, side: THREE.BackSide, roughness: 0.7 }));
    revers.position.copy(drapeau.position); fanion.add(revers);
    burger.add(fanion);
    const fonteMax = dani ? 1 : 0.8;
    return {
        scene: scene, camera: camera, fondPhoto: dani ? '#0F0E0C' : '#FFF3D6',
        photos: [
            { pos: [3.3, 2.4, 5.2], cible: [0, 1.1, 0] }, { pos: [0.6, 1.9, 6.2], cible: [0, 1.3, 0] },
            { pos: [4, 2.6, 6.2], cible: [0, 1.9, 0], defil: 0.9 }, { pos: [0, 6.4, 0.01], cible: [0, 1, 0] },
            { pos: [1.7, 1.3, 2.2], cible: [0.5, 1.0, 0.4] }, { pos: [0, 0.4, 5], cible: [0, 1.2, 0] },
            { pos: [0.9, 3.6, 2.2], cible: [0, 2.7, 0] }, { pos: [-4, 3, 5], cible: [0, 0.8, 0] }
        ],
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 2.9, Math.max(8.6, 6 / (2 * TAN * a))); camera.lookAt(0, 1.15, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const e = sortie(lisse(0, 0.8, t));
            groupe.scale.setScalar(0.9 + 0.1 * e);
            groupe.rotation.y = t * 0.22 + souris.x * 0.4;
            groupe.rotation.x = -souris.y * 0.06;
            let debutFromage = 0;
            couches.forEach(function (o, i) {
                const debut = 0.25 + i * 0.3, p = lisse(debut, debut + 0.5, t);
                if (o === gfr) debutFromage = debut;
                o.visible = t > debut;
                const ecrase = 1 - 0.16 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - debut - 0.42) / 0.25)));
                o.position.y = o.userData.base + (1 - rebond(p)) * 4.5 + i * defil * 0.55;
                o.scale.set(1, ecrase, 1);
            });
            // Le fromage fond : les bords retombent (et coulent, pour le Saint-Marcellin).
            const fonte = lisse(debutFromage + 0.5, debutFromage + 3.4, t) * fonteMax;
            const pos = geoFromage.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                const x = baseFromage[i], z = baseFromage[i + 2], rr = Math.hypot(x, z);
                let chute = fonte * Math.pow(Math.max(0, rr - (dani ? 1.08 : 1.05)), 2) * (dani ? 0.9 : 1.2);
                if (dani) chute *= 1 + 2.2 * Math.pow(Math.max(0, Math.sin(Math.atan2(z, x) * 5 + 1)), 4);
                pos[i + 1] = baseFromage[i + 1] - chute;
            }
            geoFromage.attributes.position.needsUpdate = true; geoFromage.computeVertexNormals();
            const f = sortie(lisse(0.25 + couches.length * 0.3 + 0.3, 0.25 + couches.length * 0.3 + 0.9, t));
            fanion.visible = f > 0.01; fanion.scale.setScalar(Math.max(0.001, f));
            fanion.position.y = haut - 0.35 + (couches.length - 1) * defil * 0.55;
            const pf = geoFanion.attributes.position.array;
            for (let i = 0; i < pf.length; i += 3) pf[i + 2] = baseFanion[i + 2] + Math.sin(baseFanion[i] * 4 - t * 4) * 0.05 * baseFanion[i];
            geoFanion.attributes.position.needsUpdate = true;
        }
    };
}

// ---- 5 · Pression : la bière se sert, la mousse monte, les bulles filent ----
function dessinerSousBock(r) {
    const c = toile(512, 512), x = c.getContext('2d');
    x.fillStyle = '#F2E6CF'; x.beginPath(); x.arc(256, 256, 256, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#B8860B'; x.lineWidth = 10; x.beginPath(); x.arc(256, 256, 232, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 2; x.beginPath(); x.arc(256, 256, 214, 0, Math.PI * 2); x.stroke();
    const mots = r.nom.split(' '), coupe = Math.ceil(mots.length / 2);
    const lignes = mots.length > 2 ? [mots.slice(0, coupe).join(' '), mots.slice(coupe).join(' ')] : [r.nom];
    x.fillStyle = '#2A1F12'; x.textAlign = 'center'; x.textBaseline = 'middle';
    lignes.forEach(function (l, i) { let t = 58; x.font = '400 ' + t + 'px "Prata", serif'; while (x.measureText(l).width > 370 && t > 26) { t -= 4; x.font = '400 ' + t + 'px "Prata", serif'; } x.fillText(l, 256, 236 + (i - (lignes.length - 1) / 2) * 70); });
    const ville = (r.adresse.split(' ').pop() || '').toUpperCase();
    x.fillStyle = '#B8860B'; x.font = '500 22px "Jost", sans-serif'; try { x.letterSpacing = '8px'; } catch (e) {}
    x.fillText(ville, 256, 360);
    return textureDepuis(c);
}
function sceneBiere(env, r) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffe8c8, 0x2a1a0a, 0.5));
    const cle = new THREE.DirectionalLight(0xfff0dc, 1.2); cle.position.set(-3, 6, 6); scene.add(cle);
    const chaud = new THREE.PointLight(0xffa040, 40, 14, 1.6); chaud.position.set(2.5, 2, -2); scene.add(chaud);
    const groupe = new THREE.Group(); scene.add(groupe);
    const sousBock = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.05, 64), [new THREE.MeshStandardMaterial({ color: 0xE8D8B8, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: dessinerSousBock(r), roughness: 0.85 }), new THREE.MeshStandardMaterial({ color: 0xE8D8B8 })]);
    sousBock.position.y = -0.025; groupe.add(sousBock);
    const PROFIL = [[0, 0], [0.6, 0], [0.63, 0.04], [0.64, 0.3], [0.66, 1.6], [0.74, 2.3], [0.8, 2.55], [0.78, 2.8], [0.75, 3.05]];
    const rayonA = function (y) { for (let i = 1; i < PROFIL.length; i++) if (y <= PROFIL[i][1]) { const a = PROFIL[i - 1], b = PROFIL[i], f = (y - a[1]) / (b[1] - a[1] || 1); return a[0] + (b[0] - a[0]) * f; } return PROFIL[PROFIL.length - 1][0]; };
    const verre = new THREE.Mesh(new THREE.LatheGeometry(PROFIL.map(p => new THREE.Vector2(p[0], p[1])), 72), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }));
    verre.renderOrder = 3; groupe.add(verre);
    const niveau = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const biere = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.06], [0.57, 0.06], [0.6, 0.3], [0.62, 1.6], [0.7, 2.3], [0.745, 2.5], [0, 2.5]].map(p => new THREE.Vector2(p[0], p[1])), 72), new THREE.MeshPhysicalMaterial({ color: 0xD98A1A, roughness: 0.12, transparent: true, opacity: 0.9, emissive: 0x6A3300, emissiveIntensity: 0.35, clippingPlanes: [niveau] }));
    groupe.add(biere);
    const mousse = new THREE.Mesh(deformer(new THREE.LatheGeometry([[0, 0], [1, 0], [1.02, 0.1], [0.97, 0.24], [0.7, 0.33], [0, 0.36]].map(p => new THREE.Vector2(p[0], p[1])), 64, 0, Math.PI * 2), function (v) { v.y += Math.max(0, v.y - 0.05) * bruit(v.x * 4, 0, v.z * 4) * 0.35; }), new THREE.MeshStandardMaterial({ color: 0xFFF6E2, roughness: 0.95 }));
    groupe.add(mousse);
    const filet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1, 12), new THREE.MeshPhysicalMaterial({ color: 0xE6A030, transparent: true, opacity: 0.8, roughness: 0.1, emissive: 0x6A3300, emissiveIntensity: 0.3 }));
    groupe.add(filet);
    const sprite = spriteRond();
    const NB = 170, posB = new Float32Array(NB * 3), infoB = [];
    for (let i = 0; i < NB; i++) { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.5; infoB.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, v: alea(0.35, 0.9), ph: Math.random() * 3 }); }
    const gB = new THREE.BufferGeometry(); gB.setAttribute('position', new THREE.BufferAttribute(posB, 3));
    const bulles = new THREE.Points(gB, new THREE.PointsMaterial({ size: 0.045, map: sprite, color: 0xFFF3D0, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    groupe.add(bulles);
    const ND = 130, gouttes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.4, clearcoat: 1 }), ND), md = new THREE.Object3D();
    for (let i = 0; i < ND; i++) { const y = alea(0.2, 2.25), a = Math.random() * Math.PI * 2, rr = rayonA(y) + 0.012; md.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); md.scale.setScalar(alea(0.012, 0.03)); md.scale.y *= 1.3; md.updateMatrix(); gouttes.setMatrixAt(i, md.matrix); }
    groupe.add(gouttes);
    const NK = 60, posK = new Float32Array(NK * 3);
    for (let i = 0; i < NK; i++) { posK[i * 3] = alea(-7, 7); posK[i * 3 + 1] = alea(-1, 5); posK[i * 3 + 2] = alea(-8, -3); }
    const gK = new THREE.BufferGeometry(); gK.setAttribute('position', new THREE.BufferAttribute(posK, 3));
    scene.add(new THREE.Points(gK, new THREE.PointsMaterial({ size: 0.55, map: sprite, color: 0xE9B04A, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })));
    return {
        scene: scene, camera: camera, fondPhoto: '#14110D',
        photos: [
            { pos: [2.5, 2.2, 5.5], cible: [0, 1.4, 0] }, { pos: [0.9, 3.4, 2.1], cible: [0, 2.6, 0] },
            { pos: [-3, 2, 7], cible: [0, 1.5, 0] }, { pos: [0, 5.2, 1.6], cible: [0, 0.2, 0] },
            { pos: [0, 1.2, 2.7], cible: [0, 1.2, 0] }, { pos: [0, 0.3, 4.6], cible: [0, 1.2, 0] },
            { pos: [1.8, 1.2, 1.9], cible: [0.4, 1.1, 0.4] }, { pos: [3, 1.5, 7], cible: [0, 1.8, -1] }
        ],
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 2.2, Math.max(8.4, 4.6 / (2 * TAN * a))); camera.lookAt(0, 1.45, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const service = sortie(lisse(0.5, 3.4, t)), y = 0.06 + 2.3 * service;
            niveau.constant = y;
            const epaisseur = 0.05 + 0.3 * lisse(1.2, 3.6, t), rr = rayonA(y) * 0.99;
            mousse.scale.set(rr, epaisseur / 0.36, rr); mousse.position.y = y - 0.02;
            mousse.visible = service > 0.02;
            const coule = t > 0.4 && t < 3.3;
            filet.visible = coule;
            if (coule) { const h = 4.6 - y; filet.scale.y = h; filet.position.set(0.05, y + h / 2, 0); filet.material.opacity = 0.8 * (1 - lisse(3.0, 3.3, t)); }
            for (let i = 0; i < NB; i++) { const b = infoB[i], k = Math.max(0.01, y - 0.12), yy = 0.1 + ((t * b.v + b.ph) % k); const lim = rayonA(yy) * 0.8 / 0.6; posB[i * 3] = b.x * lim; posB[i * 3 + 1] = yy; posB[i * 3 + 2] = b.z * lim; }
            gB.attributes.position.needsUpdate = true;
            bulles.visible = service > 0.05;
            gouttes.visible = t > 2.2; gouttes.material.opacity = 0.4 * lisse(2.2, 4.2, t);
            groupe.rotation.y = Math.sin(t * 0.3) * 0.35 + souris.x * 0.35 + defil * 0.7;
            groupe.rotation.x = -souris.y * 0.05;
        }
    };
}

const SCENES = { ardoise: sceneArdoise, four: scenePizza, sakura: sceneSushi, smash: function (env, r) { return sceneBurger(env, r, false); }, pression: sceneBiere, dani: function (env, r) { return sceneBurger(env, r, true); } };

if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.localClippingEnabled = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const horloge = new THREE.Clock();
    const souris = new THREE.Vector2(), sourisL = new THREE.Vector2(), zero = new THREE.Vector2();
    const pointeur = { x: 0, y: 0, dedans: false, cx: -1, cy: -1 }, pointeurNul = { x: 0, y: 0, dedans: false };
    window.addEventListener('pointermove', function (e) { souris.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight * 2 - 1)); pointeur.cx = e.clientX; pointeur.cy = e.clientY; }, { passive: true });
    let actuelle = null, design = null, debut = 0, visible = true, premiere = false, jeton = 0;

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
    // Studio photo : on rend la scène sous d'autres angles, dans le même canevas, entre deux images.
    const photographier = function (s, n) {
        if (!s.photos) return;
        const W = 960, H = 720, avant = new THREE.Vector2(); renderer.getSize(avant);
        const ratio = renderer.getPixelRatio(), fond = s.scene.background, cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 200), urls = [];
        s.scene.background = new THREE.Color(s.fondPhoto);
        renderer.setPixelRatio(1); renderer.setSize(W, H, false);
        s.photos.forEach(function (p) {
            s.maj(p.t || 12, zero, p.defil || 0, pointeurNul);
            cam.fov = p.fov || 30; cam.position.fromArray(p.pos); cam.lookAt(p.cible[0], p.cible[1], p.cible[2]); cam.updateProjectionMatrix();
            renderer.render(s.scene, cam);
            urls.push(canvas.toDataURL('image/jpeg', 0.84));
        });
        s.scene.background = fond;
        renderer.setPixelRatio(ratio); renderer.setSize(avant.x || 1, avant.y || 1, false);
        document.dispatchEvent(new CustomEvent('photos', { detail: { n: n, urls: urls } }));
    };
    const construire = function (d) {
        if (actuelle) { liberer(actuelle); actuelle = null; }
        canvas.classList.remove('pret'); premiere = false;
        const fabrique = SCENES[d.style];
        if (!fabrique) return;
        const mien = ++jeton;
        const lancer = function () {
            if (mien !== jeton) return;
            actuelle = fabrique(env, d.resto);
            design = d;
            debut = horloge.getElapsedTime();
            requestAnimationFrame(taille);
            setTimeout(function () { if (mien === jeton && actuelle) photographier(actuelle, d.n); }, 350);
        };
        // Les textures dessinent du texte : on attend les polices utilisées.
        const polices = ['700 80px "Caveat"', '600 56px "Caveat"', '500 36px "Caveat"', '400 60px "Anton"', '400 50px "Prata"', '500 22px "Jost"', 'italic 600 60px "Cormorant Garamond"'];
        if (document.fonts && document.fonts.load) Promise.all(polices.map(function (f) { return document.fonts.load(f).catch(function () {}); })).then(lancer);
        else lancer();
    };
    new ResizeObserver(taille).observe(boite);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(boite);
    document.addEventListener('maquette', function (e) { construire(e.detail); });
    if (window.CLIENT_DESIGN) construire(window.CLIENT_DESIGN);

    (function boucle() {
        requestAnimationFrame(boucle);
        if (!actuelle || !visible) return;
        const t = reduit ? 12 : horloge.getElapsedTime() - debut;
        sourisL.lerp(reduit ? zero : souris, 0.05);
        const r = boite.getBoundingClientRect();
        pointeur.dedans = !reduit && pointeur.cx >= r.left && pointeur.cx <= r.right && pointeur.cy >= r.top && pointeur.cy <= r.bottom;
        if (pointeur.dedans) { pointeur.x = (pointeur.cx - r.left) / r.width * 2 - 1; pointeur.y = -((pointeur.cy - r.top) / r.height * 2 - 1); }
        const defil = Math.min(1, window.scrollY / Math.max(1, r.height + 200));
        actuelle.maj(t, sourisL, defil, pointeur);
        renderer.render(actuelle.scene, actuelle.camera);
        if (!premiere) { premiere = true; canvas.classList.add('pret'); }
    })();
}
