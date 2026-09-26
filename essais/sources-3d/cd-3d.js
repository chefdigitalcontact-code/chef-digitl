// Scènes 3D de l'ouverture (Three.js) : une par maquette, reconstruite à chaque changement.
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
const doux = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const alea = (a, b) => a + Math.random() * (b - a);

// ---- Dessins pour les textures (sites d'exemple, écran de téléphone, ombres) ----
function rondRect(x, px, py, l, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + l, py, px + l, py + h, r); x.arcTo(px + l, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + l, py, r); x.closePath(); }
const SITES = [
    { nom: 'Pizzeria Bella Napoli', sous: 'Pizza napolitaine au feu de bois, depuis 1998', fond: '#FFFAF3', texte: '#241A12', accent: '#C0392B', police: '"Playfair Display", Georgia, serif', bouton: 'Voir la carte' },
    { nom: 'Le Bistrot de la Place', sous: 'Une cuisine généreuse et authentique', fond: '#1C1210', texte: '#F3E6D8', accent: '#B0413E', police: 'italic 600 "Cormorant Garamond", Georgia, serif', bouton: 'Découvrir la carte' },
    { nom: 'Le Comptoir Burger', sous: 'Burgers gourmets, viande fraîche hachée sur place', fond: '#FFFFFF', texte: '#111827', accent: '#EF4444', police: '"Montserrat", Arial, sans-serif', bouton: 'Commander en ligne' },
    { nom: 'LE BISTROT DE LA PLACE', sous: 'Une cuisine généreuse et authentique', fond: '#C0392B', texte: '#FFFFFF', accent: '#FFFFFF', surAccent: '#C0392B', police: '"Montserrat", Arial, sans-serif', bouton: 'Voir la carte' },
    { nom: 'Sakura Sushi', sous: 'Sushis et sashimis préparés minute', fond: '#121212', texte: '#F1ECE4', accent: '#D64545', police: '600 "Cormorant Garamond", Georgia, serif', bouton: 'Voir la carte' },
    { nom: 'Le Bistrot de la Place', sous: 'Une cuisine généreuse et authentique', fond: '#1A1614', texte: '#F2E8DC', accent: '#C0392B', police: '"Playfair Display", Georgia, serif', bouton: 'Voir la carte' },
    { nom: 'La Brasserie du Marché', sous: 'Brasserie traditionnelle, produits frais du marché', fond: '#14110D', texte: '#F5EDE0', accent: '#B8860B', police: '600 "Cormorant Garamond", Georgia, serif', bouton: 'Réserver une table' },
    { nom: 'Le Bistrot de la Place', sous: 'Une cuisine généreuse et authentique', fond: '#17110F', texte: '#F3EAE0', accent: '#E0503C', police: '"Montserrat", Arial, sans-serif', bouton: 'Voir la carte' }
];
function policeTitre(s, taille) {
    const p = s.police;
    if (/^italic/.test(p)) return p.replace(/^italic (\d+) /, 'italic $1 ' + taille + 'px ');
    if (/^\d/.test(p)) return p.replace(/^(\d+) /, '$1 ' + taille + 'px ');
    return '700 ' + taille + 'px ' + p;
}
function dessinerSite(s) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
    const x = c.getContext('2d');
    x.fillStyle = '#EEE8E2'; x.fillRect(0, 0, 1024, 46);
    ['#F87171', '#FBBF24', '#34D399'].forEach(function (col, i) { x.fillStyle = col; x.beginPath(); x.arc(26 + i * 22, 23, 7, 0, Math.PI * 2); x.fill(); });
    x.fillStyle = '#FFFFFF'; rondRect(x, 382, 11, 260, 24, 12); x.fill();
    x.fillStyle = '#6B605B'; x.font = '500 14px "Manrope", sans-serif'; x.textAlign = 'center'; x.fillText('votre-restaurant.fr', 512, 28);
    x.fillStyle = s.fond; x.fillRect(0, 46, 1024, 594);
    const g = x.createRadialGradient(780, 190, 20, 780, 190, 520); g.addColorStop(0, s.accent + '44'); g.addColorStop(1, s.accent + '00'); x.fillStyle = g; x.fillRect(0, 46, 1024, 594);
    x.textAlign = 'left'; x.fillStyle = s.texte; x.font = policeTitre(s, 26); x.fillText(s.nom, 44, 104);
    x.globalAlpha = 0.35; for (let i = 0; i < 3; i++) { rondRect(x, 640 + i * 70, 94, 46, 6, 3); x.fill(); } x.globalAlpha = 1;
    x.fillStyle = s.accent; rondRect(x, 866, 80, 116, 36, 18); x.fill();
    x.fillStyle = s.surAccent || '#FFFFFF'; x.font = '700 15px "Manrope", sans-serif'; x.textAlign = 'center'; x.fillText('Réserver', 924, 103);
    x.fillStyle = s.accent; x.font = '700 15px "Manrope", sans-serif'; x.fillText('R E S T A U R A N T', 512, 212);
    x.fillStyle = s.texte; let t = 74; x.font = policeTitre(s, t);
    while (x.measureText(s.nom).width > 900 && t > 30) { t -= 4; x.font = policeTitre(s, t); }
    x.fillText(s.nom, 512, 300);
    x.globalAlpha = 0.75; x.font = '400 22px "Manrope", sans-serif'; x.fillText(s.sous, 512, 350); x.globalAlpha = 1;
    x.fillStyle = s.accent; rondRect(x, 422, 382, 180, 48, 24); x.fill();
    x.fillStyle = s.surAccent || '#FFFFFF'; x.font = '700 17px "Manrope", sans-serif'; x.fillText(s.bouton, 512, 412);
    for (let i = 0; i < 3; i++) {
        const gi = x.createLinearGradient(0, 470, 0, 610); gi.addColorStop(0, s.accent + 'AA'); gi.addColorStop(1, s.texte + '33');
        x.fillStyle = gi; rondRect(x, 44 + i * 318, 470, 300, 150, 14); x.fill();
    }
    return c;
}
function textureOmbre(force) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(40,20,15,' + force + ')'); g.addColorStop(0.55, 'rgba(40,20,15,' + (force * 0.4) + ')'); g.addColorStop(1, 'rgba(40,20,15,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
}
function ombreSol(taille, force) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(taille, taille), new THREE.MeshBasicMaterial({ map: textureOmbre(force), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
}
function textureDepuis(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return t;
}
function spriteRond() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}

// ---- 7 · La cloche se soulève et sert le site du restaurant ----
function sceneCloche(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x6b4a3a, 0.7));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.6); soleil.position.set(4, 9, 6); scene.add(soleil);
    const groupe = new THREE.Group(); scene.add(groupe);
    const ombre = ombreSol(10, 0.3); ombre.position.y = -0.01; groupe.add(ombre);
    const profil = [[0, 0.1], [2.2, 0.1], [2.5, 0.15], [3.1, 0.33], [3.5, 0.42], [3.64, 0.41], [3.66, 0.36], [3.45, 0.3], [2.9, 0.14], [2.45, 0.03], [2.25, 0], [2.05, 0.04], [0, 0.05]].map(p => new THREE.Vector2(p[0], p[1]));
    const assiette = new THREE.Mesh(new THREE.LatheGeometry(profil, 96), new THREE.MeshPhysicalMaterial({ color: 0xFBF7F1, roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.15, side: THREE.DoubleSide }));
    groupe.add(assiette);
    const filet = new THREE.Mesh(new THREE.TorusGeometry(3.28, 0.025, 8, 160), new THREE.MeshStandardMaterial({ color: 0x9B1B30, roughness: 0.4 }));
    filet.rotation.x = -Math.PI / 2; filet.position.y = 0.37; groupe.add(filet);
    const carte = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.125), new THREE.MeshStandardMaterial({ map: textureDepuis(dessinerSite(SITES[1])), roughness: 0.55 }));
    face.position.z = 0.036;
    const dos = new THREE.Mesh(new RoundedBoxGeometry(3.52, 2.24, 0.06, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.6 }));
    carte.add(dos, face); groupe.add(carte);
    const courbe = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI / 2; courbe.push(new THREE.Vector2(Math.cos(a) * 3.35, Math.sin(a) * 2.55)); }
    courbe.unshift(new THREE.Vector2(3.5, 0), new THREE.Vector2(3.5, 0.06));
    const metal = new THREE.MeshStandardMaterial({ color: 0xEDE4D6, metalness: 1, roughness: 0.14, side: THREE.DoubleSide });
    const cloche = new THREE.Group();
    cloche.add(new THREE.Mesh(new THREE.LatheGeometry(courbe, 96), metal));
    const bouton = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), new THREE.MeshStandardMaterial({ color: 0xC89A4A, metalness: 1, roughness: 0.25 }));
    bouton.position.y = 2.82; cloche.add(bouton);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 24), metal); col.position.y = 2.6; cloche.add(col);
    cloche.position.y = 0.38; groupe.add(cloche);
    const vapeur = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0.9, map: spriteRond(), transparent: true, opacity: 0.35, depthWrite: false, color: 0xFFFFFF }));
    const nbV = 18, posV = new Float32Array(nbV * 3), vitV = [];
    for (let i = 0; i < nbV; i++) { posV[i * 3] = alea(-1.2, 1.2); posV[i * 3 + 1] = alea(0.5, 4); posV[i * 3 + 2] = alea(-0.8, 0.8); vitV.push(alea(0.25, 0.6)); }
    vapeur.geometry.setAttribute('position', new THREE.BufferAttribute(posV, 3)); groupe.add(vapeur);
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { camera.aspect = w / h; camera.position.set(0, 5.4, w / h < 1 ? 17 : 14.5); camera.lookAt(0, 1, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const p = lisse(0.7, 2.6, t);
            cloche.position.set(0, 0.38 + doux(p) * 10, -p * 2);
            cloche.rotation.x = -p * 0.55;
            const q = lisse(1.5, 3.1, t);
            carte.rotation.x = -Math.PI / 2 + q * 1.1;
            carte.position.set(0, 0.26 + q * 1.25 + Math.sin(t * 1.1) * 0.06 * q, q * 0.55);
            const pv = vapeur.geometry.attributes.position.array;
            for (let i = 0; i < nbV; i++) { pv[i * 3 + 1] += vitV[i] * 0.012; pv[i * 3] += Math.sin(t + i) * 0.003; if (pv[i * 3 + 1] > 4.5) pv[i * 3 + 1] = 0.6; }
            vapeur.geometry.attributes.position.needsUpdate = true;
            vapeur.material.opacity = 0.3 * lisse(2, 3.5, t);
            groupe.rotation.y = souris.x * 0.28 + Math.sin(t * 0.3) * 0.06 + defil * 0.7;
            groupe.rotation.x = -souris.y * 0.05;
        }
    };
}

// ---- 8 · Le téléphone du restaurateur : la carte, et un prix modifié en direct ----
function dessinerEcran(c, etat) {
    const x = c.getContext('2d'), W = c.width, H = c.height;
    x.clearRect(0, 0, W, H);
    x.save(); rondRect(x, 0, 0, W, H, 70); x.clip();
    x.fillStyle = '#F7F1EA'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#1B1113'; x.font = '700 26px "Outfit", sans-serif'; x.textAlign = 'left'; x.fillText('9:41', 56, 62); x.textAlign = 'right'; x.fillText('● ● ●', W - 50, 62);
    x.fillStyle = '#9B1B30'; x.fillRect(0, 96, W, 170);
    x.fillStyle = 'rgba(255,255,255,.75)'; x.textAlign = 'left'; x.font = '600 22px "Outfit", sans-serif'; x.fillText('CHEZ MARCEL', 48, 160);
    x.fillStyle = '#FFFFFF'; x.font = '400 54px "DM Serif Display", Georgia, serif'; x.fillText('Ma carte', 48, 224);
    const plats = [['Salade lyonnaise', 'Entrée', '12,00 €'], ['Quenelle de brochet', 'Plat', etat.prix], ['Saucisson brioché', 'Plat', '19,00 €'], ['Tarte aux pralines', 'Dessert', '8,50 €'], ['Cervelle de canut', 'Fromage', '7,00 €']];
    plats.forEach(function (p, i) {
        const y = 300 + i * 150;
        x.fillStyle = i === 1 && etat.surligne ? '#FFE9E2' : '#FFFFFF'; rondRect(x, 30, y, W - 60, 128, 26); x.fill();
        x.fillStyle = '#1B1113'; x.font = '700 30px "Outfit", sans-serif'; x.textAlign = 'left'; x.fillText(p[0], 62, y + 56);
        x.fillStyle = '#7A6661'; x.font = '400 24px "Outfit", sans-serif'; x.fillText(p[1], 62, y + 94);
        x.textAlign = 'right'; x.fillStyle = '#1B1113'; x.font = '600 30px "IBM Plex Mono", monospace'; x.fillText(p[2], W - 62, y + 74);
        if (i === 1 && etat.edition) { x.strokeStyle = '#E0503C'; x.lineWidth = 4; rondRect(x, W - 250, y + 34, 200, 60, 14); x.stroke(); }
    });
    if (etat.toast) {
        x.fillStyle = '#1B1113'; rondRect(x, 40, H - 170, W - 80, 104, 26); x.fill();
        x.fillStyle = '#E3B461'; x.beginPath(); x.arc(100, H - 118, 24, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#1B1113'; x.font = '700 28px "Outfit", sans-serif'; x.textAlign = 'center'; x.fillText('✓', 100, H - 108);
        x.fillStyle = '#FFFFFF'; x.textAlign = 'left'; x.font = '600 30px "Outfit", sans-serif'; x.fillText('Site mis à jour', 144, H - 108);
    }
    x.restore();
}
function sceneTelephone(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const cle = new THREE.DirectionalLight(0xfff0e6, 1.2); cle.position.set(3, 4, 8); scene.add(cle);
    const vin = new THREE.PointLight(0xff3050, 80, 30, 1.6); vin.position.set(-5, 2, 3); scene.add(vin);
    const laiton = new THREE.PointLight(0xE3B461, 60, 30, 1.6); laiton.position.set(5, -3, 4); scene.add(laiton);
    const tel = new THREE.Group(); scene.add(tel);
    tel.add(new THREE.Mesh(new RoundedBoxGeometry(3.1, 6.3, 0.36, 8, 0.46), new THREE.MeshPhysicalMaterial({ color: 0x1D1517, metalness: 0.75, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 })));
    const c = document.createElement('canvas'); c.width = 620; c.height = 1300;
    const etat = { prix: '22,00 €', surligne: false, edition: false, toast: false };
    dessinerEcran(c, etat);
    const tex = textureDepuis(c);
    const ecran = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 6.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    ecran.position.z = 0.185; tel.add(ecran);
    const encoche = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.22, 0.02, 3, 0.1), new THREE.MeshBasicMaterial({ color: 0x050304 }));
    encoche.position.set(0, 2.78, 0.2); tel.add(encoche);
    const nb = 70, pos = new Float32Array(nb * 3), col = new Float32Array(nb * 3), teintes = [new THREE.Color(0xE3B461), new THREE.Color(0x9B1B30), new THREE.Color(0xff8a6a)];
    for (let i = 0; i < nb; i++) { pos[i * 3] = alea(-9, 9); pos[i * 3 + 1] = alea(-6, 6); pos[i * 3 + 2] = alea(-12, -3); const t = teintes[i % 3]; col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const bokeh = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, map: spriteRond(), vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(bokeh);
    let phase = -1;
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { camera.aspect = w / h; camera.position.set(0, 0, w / h < 1 ? 17 : 15.5); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const e = doux(lisse(0, 1.6, t));
            tel.position.y = (1 - e) * -6 + Math.sin(t * 0.9) * 0.12;
            tel.rotation.y = (1 - e) * 1.4 - 0.32 + Math.sin(t * 0.5) * 0.1 + souris.x * 0.3 + defil * 0.9;
            tel.rotation.x = 0.06 - souris.y * 0.12;
            tel.rotation.z = 0.05;
            bokeh.rotation.z = t * 0.02;
            // Démonstration : un prix changé depuis le téléphone, toutes les 6 s.
            const cycle = Math.floor(Math.max(0, t - 2) % 6 / 0.75);
            if (cycle !== phase && t > 2) {
                phase = cycle;
                etat.surligne = cycle >= 1 && cycle <= 6; etat.edition = cycle >= 2 && cycle <= 3;
                etat.prix = cycle >= 3 && cycle <= 6 ? '23,50 €' : '22,00 €'; etat.toast = cycle >= 4 && cycle <= 6;
                dessinerEcran(c, etat); tex.needsUpdate = true;
            }
        }
    };
}

// ---- 9 · Le QR code (réel, vers chefdigital.fr) sur son chevalet de table ----
const QR = '1111111001100000101111111|1000001001111001001000001|1011101011100011101011101|1011101011100111101011101|1011101010101100101011101|1000001011100011101000001|1111111010101010101111111|0000000010000001000000000|1011111001101100001111100|1110000011110100100100010|1111001100011111100111011|0001110001000000101000001|0000111000110111011010111|1010010100001000100101010|1000101110100111111111011|1010100000001001011110001|1001101100101110111110100|0000000010100011100011000|1111111000011100101010111|1000001011010000100011000|1011101010010001111110111|1011101011001101011011111|1011101011000110000001101|1000001001001101111111001|1111111011001010000111111'.split('|');
function sceneQR(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a5a, 0.8));
    const soleil = new THREE.DirectionalLight(0xffffff, 1.3); soleil.position.set(5, 8, 7); scene.add(soleil);
    const chevalet = new THREE.Group(); scene.add(chevalet);
    const carton = new THREE.MeshStandardMaterial({ color: 0xF7F1E7, roughness: 0.75 });
    const faire = function (sens) { const pivot = new THREE.Group(); pivot.position.y = 5.3; pivot.rotation.x = -0.26 * sens; const m = new THREE.Mesh(new RoundedBoxGeometry(4.4, 5.6, 0.08, 3, 0.07), carton); m.position.y = -2.8; pivot.add(m); chevalet.add(pivot); return m; };
    const avant = faire(1); faire(-1);
    const bord = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0x9B1B30, roughness: 0.5 }));
    bord.position.set(0, -2.35, 0.06); avant.add(bord);
    const N = QR.length, cote = 0.13, cibles = [];
    QR.forEach(function (r, y) { for (let x = 0; x < N; x++) if (r[x] === '1') cibles.push(new THREE.Vector3((x - (N - 1) / 2) * cote, ((N - 1) / 2 - y) * cote + 0.35, 0.04 + cote / 2)); });
    const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(cote * 0.98, cote * 0.98, cote), new THREE.MeshStandardMaterial({ color: 0x4A0B16, roughness: 0.45, metalness: 0.1 }), cibles.length);
    cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    avant.add(cubes);
    const departs = cibles.map(function () { return new THREE.Vector3(alea(-3, 3), alea(-2, 3), alea(2, 6)); });
    const delais = cibles.map(function (c) { return 0.3 + c.length() * 0.35 + alea(0, 0.3); });
    const rots = cibles.map(function () { return new THREE.Vector3(alea(-4, 4), alea(-4, 4), alea(-4, 4)); });
    const ombre = ombreSol(9, 0.28); ombre.position.y = 0.01; chevalet.add(ombre);
    const m = new THREE.Object3D();
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { camera.aspect = w / h; camera.position.set(0, 2.8, w / h < 1 ? 19 : 16.5); camera.lookAt(0, 2.4, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            for (let i = 0; i < cibles.length; i++) {
                let p = lisse(delais[i], delais[i] + 1.1, t); p = 1 - Math.pow(1 - p, 3);
                m.position.lerpVectors(departs[i], cibles[i], p);
                m.rotation.set(rots[i].x * (1 - p), rots[i].y * (1 - p), rots[i].z * (1 - p));
                m.updateMatrix(); cubes.setMatrixAt(i, m.matrix);
            }
            cubes.instanceMatrix.needsUpdate = true;
            chevalet.rotation.y = -0.42 + Math.sin(t * 0.35) * 0.16 + souris.x * 0.35 + defil * 0.8;
            chevalet.position.y = Math.sin(t * 0.8) * 0.05;
        }
    };
}

// ---- 10 · Vapeur de cuisine : bruit fractal qui monte, sur tout le haut de page ----
function sceneVapeur() {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uSouris: { value: new THREE.Vector2() } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: [
            'uniform float uT; uniform vec2 uRes; uniform vec2 uSouris; varying vec2 vUv;',
            'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
            'float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }',
            'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*n(p); p = p*2.02 + 11.3; a *= 0.5; } return v; }',
            'void main(){',
            '  vec2 p = (vUv - 0.5) * vec2(uRes.x/uRes.y, 1.0);',
            '  vec2 q = p * 1.6 + vec2(0.0, -uT * 0.07);',
            '  vec2 d = vec2(fbm(q + uT * 0.03), fbm(q + 5.2 - uT * 0.02));',
            '  vec2 m = uSouris * vec2(uRes.x/uRes.y, 1.0) * 0.5;',
            '  float tourb = exp(-3.0 * length(p - m));',
            '  float v = fbm(q + 1.8 * d + tourb * 0.6);',
            '  float colonne = smoothstep(1.1, 0.0, abs(p.x * 0.8)) * smoothstep(-0.7, 0.4, p.y + 0.2);',
            '  float fumee = smoothstep(0.38, 0.9, v) * (0.45 + 0.55 * colonne);',
            '  vec3 creme = vec3(0.984, 0.957, 0.925);',
            '  vec3 rose = vec3(0.949, 0.84, 0.79);',
            '  vec3 laiton = vec3(0.89, 0.72, 0.45);',
            '  vec3 vin = vec3(0.608, 0.106, 0.188);',
            '  vec3 c = creme;',
            '  c = mix(c, rose, smoothstep(0.25, 0.85, v) * 0.75);',
            '  c = mix(c, laiton, fumee * 0.28);',
            '  c = mix(c, vin, smoothstep(0.7, 1.0, v) * 0.16);',
            '  c = mix(c, vec3(1.0), fumee * 0.35);',
            '  c += (h(vUv * uRes + uT) - 0.5) * 0.012;',
            '  gl_FragColor = vec4(c, 1.0);',
            '}'
        ].join('\n'),
        depthTest: false, depthWrite: false
    });
    const plan = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); plan.frustumCulled = false; scene.add(plan);
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { mat.uniforms.uRes.value.set(w, h); },
        maj: function (t, souris) { mat.uniforms.uT.value = t; mat.uniforms.uSouris.value.copy(souris); }
    };
}

// ---- 11 · Galerie : les sites d'exemple flottent en cercle autour de la caméra ----
function sceneGalerie() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0F0B0C, 7, 17);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const groupe = new THREE.Group(); scene.add(groupe);
    const R = 12.5, liste = SITES.concat(SITES);
    liste.forEach(function (s, i) {
        const a = i / liste.length * Math.PI * 2;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.25), new THREE.MeshBasicMaterial({ map: textureDepuis(dessinerSite(s)), side: THREE.DoubleSide }));
        m.position.set(Math.sin(a) * R, (i % 2 ? 1.1 : -0.9), -Math.cos(a) * R);
        m.lookAt(0, m.position.y, 0);
        groupe.add(m);
        const cadre = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.45), new THREE.MeshBasicMaterial({ color: 0xE3A857, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
        cadre.position.copy(m.position); cadre.quaternion.copy(m.quaternion); cadre.translateZ(-0.02); groupe.add(cadre);
    });
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { camera.aspect = w / h; camera.position.set(0, 0, 3); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            groupe.rotation.y = t * 0.05 + souris.x * 0.18 + defil * 1.4;
            groupe.rotation.x = -0.05 + souris.y * 0.05;
            camera.position.y = souris.y * 0.3;
            camera.lookAt(camera.aspect >= 1 ? 4.5 : 0, 0, -10);
        }
    };
}

const SCENES = { 7: sceneCloche, 8: sceneTelephone, 9: sceneQR, 10: sceneVapeur, 11: sceneGalerie };

if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const horloge = new THREE.Clock();
    const souris = new THREE.Vector2(), sourisL = new THREE.Vector2();
    window.addEventListener('pointermove', function (e) { souris.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight * 2 - 1)); }, { passive: true });
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
        // Les textures dessinent du texte : on attend les polices du site d'exemple.
        if (document.fonts && document.fonts.load) Promise.all(['700 40px "Playfair Display"', '600 40px "Cormorant Garamond"', 'italic 600 40px "Cormorant Garamond"', '700 40px "Montserrat"', '400 40px "Outfit"', '400 40px "DM Serif Display"', '500 20px "Manrope"'].map(function (f) { return document.fonts.load(f).catch(function () {}); })).then(function () { if (window.CD_MAQUETTE === n) lancer(); });
        else lancer();
    };
    new ResizeObserver(taille).observe(boite);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(boite);
    document.addEventListener('maquette', function (e) { construire(e.detail); });
    if (window.CD_MAQUETTE) construire(window.CD_MAQUETTE);

    (function boucle() {
        requestAnimationFrame(boucle);
        if (!actuelle || !visible) return;
        const t = reduit ? 12 : horloge.getElapsedTime() - debut;
        sourisL.lerp(reduit ? new THREE.Vector2() : souris, 0.05);
        const defil = Math.min(1, window.scrollY / Math.max(1, boite.getBoundingClientRect().height + 200));
        actuelle.maj(t, sourisL, defil);
        renderer.render(actuelle.scene, actuelle.camera);
        if (!premiere) { premiere = true; canvas.classList.add('pret'); }
    })();
}
