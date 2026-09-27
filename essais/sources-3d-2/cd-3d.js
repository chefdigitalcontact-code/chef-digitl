// Scènes 3D de l'ouverture (Three.js), maquettes 12 à 16 : une par maquette, reconstruite à chaque changement.
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
const sortie = x => 1 - Math.pow(1 - x, 3);
const rebond = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const alea = (a, b) => a + Math.random() * (b - a);
const TAN = Math.tan(THREE.MathUtils.degToRad(17.5));

function rondRect(x, px, py, l, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + l, py, px + l, py + h, r); x.arcTo(px + l, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + l, py, r); x.closePath(); }
function textureDepuis(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return t;
}
function ombreSol(taille, force) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(40,20,15,' + force + ')'); g.addColorStop(0.55, 'rgba(40,20,15,' + (force * 0.4) + ')'); g.addColorStop(1, 'rgba(40,20,15,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(taille, taille), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
}
// Point visé par le pointeur sur le plan z = 0 de la scène.
const rayon = new THREE.Raycaster(), planZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ndc = new THREE.Vector2();
function pointSurPlan(camera, pointeur, cible) {
    ndc.set(pointeur.x, pointeur.y);
    rayon.setFromCamera(ndc, camera);
    return rayon.ray.intersectPlane(planZ, cible);
}

// Vrai QR code (vers chefdigital.fr), 25 × 25 modules.
const QR = '1111111001100000101111111|1000001001111001001000001|1011101011100011101011101|1011101011100111101011101|1011101010101100101011101|1000001011100011101000001|1111111010101010101111111|0000000010000001000000000|1011111001101100001111100|1110000011110100100100010|1111001100011111100111011|0001110001000000101000001|0000111000110111011010111|1010010100001000100101010|1000101110100111111111011|1010100000001001011110001|1001101100101110111110100|0000000010100011100011000|1111111000011100101010111|1000001011010000100011000|1011101010010001111110111|1011101011001101011011111|1011101011000110000001101|1000001001001101111111001|1111111011001010000111111'.split('|');

// ---- 12 · La carte du restaurant, pliée en trois, qui s'ouvre ----
const VIN = '#9B1B30', ENCRE = '#231815', GRIS = '#6A5B51';
function dessinerVolet(role) {
    const c = document.createElement('canvas'); c.width = 600; c.height = 846;
    const x = c.getContext('2d');
    x.textAlign = 'center';
    if (role.indexOf('dos') === 0) {
        x.fillStyle = '#7E1627'; x.fillRect(0, 0, 600, 846);
        for (let i = 0; i < 1600; i++) { x.fillStyle = 'rgba(0,0,0,' + alea(0.02, 0.07).toFixed(3) + ')'; x.fillRect(alea(0, 600), alea(0, 846), 2, 2); }
        x.strokeStyle = 'rgba(232,196,128,.85)'; x.lineWidth = 2; x.strokeRect(30, 30, 540, 786); x.lineWidth = 1; x.strokeRect(40, 40, 520, 766);
        x.fillStyle = '#E8C480';
        if (role === 'dos-droite') {
            x.font = 'italic 400 34px "Libre Caslon Text", Georgia, serif'; x.fillText('Le Bistrot', 300, 350);
            x.font = '400 66px "Libre Caslon Display", Georgia, serif'; x.fillText('de la Place', 300, 424);
            x.fillRect(250, 458, 100, 1.5);
            x.font = '700 16px "Mulish", sans-serif'; x.fillText('L A   C A R T E', 300, 504);
        } else if (role === 'dos-centre') {
            x.font = '600 18px "Mulish", sans-serif'; x.fillText('votre-restaurant.fr', 300, 760);
        }
        return c;
    }
    x.fillStyle = '#FBF6EC'; x.fillRect(0, 0, 600, 846);
    x.strokeStyle = VIN; x.lineWidth = 2; x.strokeRect(26, 26, 548, 794); x.lineWidth = 1; x.strokeRect(34, 34, 532, 778);
    const rubrique = function (t, y) {
        x.textAlign = 'center'; x.fillStyle = VIN; x.font = 'italic 400 34px "Libre Caslon Text", Georgia, serif'; x.fillText(t, 300, y);
        x.fillStyle = '#B8862E'; x.fillRect(266, y + 16, 68, 1.5);
    };
    const plat = function (nom, detail, prix, y) {
        x.textAlign = 'left'; x.fillStyle = ENCRE; x.font = '700 21px "Mulish", sans-serif'; x.fillText(nom, 70, y);
        const l = x.measureText(nom).width;
        x.textAlign = 'right'; x.fillText(prix, 530, y);
        const lp = x.measureText(prix).width;
        x.fillStyle = 'rgba(35,24,21,.35)';
        for (let px = 70 + l + 12; px < 530 - lp - 10; px += 9) x.fillRect(px, y - 4, 2, 2);
        x.textAlign = 'left'; x.fillStyle = GRIS; x.font = 'italic 400 17px "Libre Caslon Text", Georgia, serif'; x.fillText(detail, 70, y + 27);
    };
    if (role === 'gauche') {
        rubrique('Entrées', 124);
        plat('Œuf mayonnaise', 'Œufs fermiers, mayonnaise maison', '7,00 €', 214);
        plat('Poireaux vinaigrette', 'Noisettes torréfiées, ciboulette', '8,50 €', 296);
        plat('Terrine de campagne', 'Cornichons, pain de campagne', '9,00 €', 378);
        rubrique('Salades', 500);
        plat('Chèvre chaud', 'Miel de lavande, noix', '14,00 €', 590);
        plat('Salade lyonnaise', 'Lardons, croûtons, œuf poché', '13,50 €', 672);
    } else if (role === 'centre') {
        x.textAlign = 'center';
        x.fillStyle = VIN; x.font = 'italic 400 28px "Libre Caslon Text", Georgia, serif'; x.fillText('Le Bistrot', 300, 116);
        x.fillStyle = ENCRE; x.font = '400 54px "Libre Caslon Display", Georgia, serif'; x.fillText('de la Place', 300, 172);
        x.fillStyle = GRIS; x.font = '700 13px "Mulish", sans-serif'; x.fillText('CUISINE DE MARCHÉ  ·  DEPUIS 1998', 300, 208);
        rubrique('Plats', 300);
        plat('Bœuf bourguignon', 'Carottes fondantes, purée maison', '19,00 €', 390);
        plat('Filet de bar', 'Beurre blanc, légumes du marché', '22,00 €', 472);
        plat('Blanquette de veau', 'Riz pilaf, champignons', '18,50 €', 554);
        plat('Risotto aux cèpes', 'Parmesan affiné 24 mois', '17,00 €', 636);
        x.textAlign = 'center'; x.fillStyle = GRIS; x.font = 'italic 400 18px "Libre Caslon Text", Georgia, serif'; x.fillText('Tous nos plats sont faits maison', 300, 748);
    } else if (role === 'droite') {
        rubrique('Desserts', 124);
        plat('Crème brûlée', 'Vanille de Madagascar', '8,00 €', 214);
        plat('Tarte Tatin', 'Crème crue de Normandie', '8,50 €', 296);
        plat('Mousse au chocolat', 'Chocolat noir 70 %', '7,50 €', 378);
        const m = 6, ox = 300 - 12.5 * m, oy = 470;
        x.fillStyle = '#FFFFFF'; x.fillRect(ox - 14, oy - 14, 25 * m + 28, 25 * m + 28);
        x.fillStyle = ENCRE;
        QR.forEach(function (r, j) { for (let i = 0; i < 25; i++) if (r[i] === '1') x.fillRect(ox + i * m, oy + j * m, m, m); });
        x.textAlign = 'center'; x.fillStyle = VIN; x.font = 'italic 400 24px "Libre Caslon Text", Georgia, serif'; x.fillText('Réservez en ligne', 300, 700);
        x.fillStyle = GRIS; x.font = '700 16px "Mulish", sans-serif'; x.fillText('votre-restaurant.fr', 300, 734);
    }
    return c;
}
function sceneCarte(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x7a5a4a, 0.62));
    const soleil = new THREE.DirectionalLight(0xfff8ee, 1.3); soleil.position.set(-3, 6, 8); scene.add(soleil);
    const L = 2.2, H = 3.1, E = 0.025;
    const tranche = new THREE.MeshStandardMaterial({ color: 0xEFE5D3, roughness: 0.9 });
    const volet = function (face, dos) {
        const mats = [tranche, tranche, tranche, tranche,
            new THREE.MeshStandardMaterial({ map: textureDepuis(dessinerVolet(face)), roughness: 0.85, envMapIntensity: 0.35 }),
            new THREE.MeshStandardMaterial({ map: textureDepuis(dessinerVolet(dos)), roughness: 0.7, envMapIntensity: 0.5 })];
        return new THREE.Mesh(new THREE.BoxGeometry(L, H, E), mats);
    };
    const carte = new THREE.Group(); scene.add(carte);
    carte.add(volet('centre', 'dos-centre'));
    // Les deux volets pivotent sur leur charnière ; fermés, ils se rabattent devant le volet central.
    const pivotG = new THREE.Group(); pivotG.position.set(-L / 2, 0, E * 1.2); carte.add(pivotG);
    const gauche = volet('gauche', 'dos-gauche'); gauche.position.x = -L / 2; pivotG.add(gauche);
    const pivotD = new THREE.Group(); pivotD.position.set(L / 2, 0, E * 3.6); carte.add(pivotD);
    const droite = volet('droite', 'dos-droite'); droite.position.x = L / 2; pivotD.add(droite);
    const ombre = ombreSol(8, 0.3); ombre.scale.y = 0.45; ombre.position.y = -H / 2 - 0.55; scene.add(ombre);
    const fermeG = Math.PI - 0.012, fermeD = Math.PI - 0.03, ouvert = 0.4;
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 0.6, Math.max(10.6, 8 / (2 * TAN * a))); camera.lookAt(0, -0.1, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const oD = doux(lisse(0.7, 1.7, t)), oG = doux(lisse(1.55, 2.55, t));
            pivotD.rotation.y = -fermeD + oD * (fermeD - ouvert);
            pivotG.rotation.y = fermeG - oG * (fermeG - ouvert);
            const e = sortie(lisse(0, 1.3, t));
            carte.position.y = (1 - e) * -3 + Math.sin(t * 0.8) * 0.06;
            carte.rotation.y = (1 - e) * 0.9 - 0.16 + Math.sin(t * 0.35) * 0.07 + souris.x * 0.3 + defil * 0.6;
            carte.rotation.x = -0.06 - souris.y * 0.1;
            ombre.material.opacity = e;
        }
    };
}

// ---- 13 · L'enseigne au néon s'allume sur le mur de briques ----
function textureBriques() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#120A0B'; x.fillRect(0, 0, 1024, 512);
    const bh = 32, bw = 96;
    for (let r = 0; r < 512 / bh; r++) {
        const dec = r % 2 ? bw / 2 : 0;
        for (let k = -1; k < 1024 / bw + 1; k++) {
            const px = k * bw + dec, py = r * bh, l = alea(0.7, 1.12);
            x.fillStyle = 'rgb(' + Math.round(62 * l) + ',' + Math.round(28 * l) + ',' + Math.round(26 * l) + ')';
            x.fillRect(px + 3, py + 3, bw - 6, bh - 6);
            for (let s = 0; s < 7; s++) { x.fillStyle = 'rgba(0,0,0,' + alea(0.05, 0.2).toFixed(2) + ')'; x.fillRect(px + alea(4, bw - 16), py + alea(4, bh - 10), alea(4, 14), alea(2, 6)); }
        }
    }
    const t = textureDepuis(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.4, 3.6);
    return t;
}
function dessinerNeon(l, h, couleur, coeur, trace) {
    const c = document.createElement('canvas'); c.width = l; c.height = h;
    const x = c.getContext('2d');
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineCap = 'round';
    x.fillStyle = x.strokeStyle = x.shadowColor = couleur;
    x.shadowBlur = 70; trace(x); x.shadowBlur = 26; trace(x);
    x.fillStyle = x.strokeStyle = coeur; x.shadowBlur = 8; trace(x);
    return c;
}
function textureHalo(couleur) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, couleur + '.5)'); g.addColorStop(0.45, couleur + '.16)'); g.addColorStop(1, couleur + '0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
}
function sceneNeon(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.05));
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(60, 34), new THREE.MeshStandardMaterial({ map: textureBriques(), roughness: 0.95, envMapIntensity: 0.15 })));
    const enseigne = new THREE.Group(); scene.add(enseigne);
    const lumRose = new THREE.PointLight(0xff3d6e, 36, 14, 1.7); lumRose.position.set(0, 0.8, 2.4); enseigne.add(lumRose);
    const lumLaiton = new THREE.PointLight(0xffb547, 12, 10, 1.7); lumLaiton.position.set(0, -1.6, 2); enseigne.add(lumLaiton);
    const plaque = new THREE.Mesh(new RoundedBoxGeometry(8.4, 4.8, 0.1, 4, 0.22), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.06, clearcoat: 1, depthWrite: false }));
    plaque.position.z = 0.72; enseigne.add(plaque);
    const metal = new THREE.MeshStandardMaterial({ color: 0xd8ccbe, metalness: 1, roughness: 0.28 });
    [[-3.8, 2.05], [3.8, 2.05], [-3.8, -2.05], [3.8, -2.05]].forEach(function (p) {
        const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.74, 16), metal); tige.rotation.x = Math.PI / 2; tige.position.set(p[0], p[1], 0.37); enseigne.add(tige);
        const tete = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 24), metal); tete.rotation.x = Math.PI / 2; tete.position.set(p[0], p[1], 0.8); enseigne.add(tete);
    });
    const neon = function (c, l, h, y) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(l, h), new THREE.MeshBasicMaterial({ map: textureDepuis(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        m.position.set(0, y, 0.84); enseigne.add(m); return m.material;
    };
    const matOuvert = neon(dessinerNeon(2048, 700, '#FF3D6E', '#FFE6EC', function (x) { x.font = '400 420px "Yellowtail", cursive'; x.fillText('Ouvert', 1024, 330); }), 7.6, 2.6, 0.62);
    const matCadre = neon(dessinerNeon(2048, 1170, '#FFB547', '#FFF4DE', function (x) {
        x.lineWidth = 9; rondRect(x, 40, 40, 1968, 1090, 90); x.stroke();
        x.font = '600 124px "Big Shoulders Display", "Arial Narrow", sans-serif'; try { x.letterSpacing = '22px'; } catch (e) {}
        x.fillText('RÉSERVEZ EN LIGNE', 1024, 900);
    }), 8.4, 4.8, 0);
    const haloRose = new THREE.Mesh(new THREE.PlaneGeometry(19, 12), new THREE.MeshBasicMaterial({ map: textureHalo('rgba(255,61,110,'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    haloRose.position.set(0, 0.5, 0.03); enseigne.add(haloRose);
    // Allumage : quelques ratés au démarrage, puis un petit grésillement de temps en temps.
    const sequence = [0, 1, 0, 0, 1, 1, 0, 1, 0.3, 1, 1, 0, 1, 1, 1, 1];
    const allumage = function (t) {
        if (t < 0.55) return 0;
        if (t < 1.7) return sequence[Math.floor((t - 0.55) * 14) % sequence.length];
        const c = t % 7.3;
        return c > 6.8 && c < 7.05 ? (Math.sin(t * 90) > 0 ? 1 : 0.35) : 1;
    };
    const cadre = function (t) { return t < 1.9 ? 0 : t < 2.15 ? Math.floor(t * 30) % 2 : 1; };
    const vise = new THREE.Vector3();
    let base = { x: 0, y: 0, z: 17 };
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) {
            const a = w / h; camera.aspect = a; camera.updateProjectionMatrix();
            if (a >= 1.15) {
                const z = Math.max(17, 9.8 / (TAN * a));
                enseigne.scale.setScalar(1); enseigne.position.set(4.5, 0.5, 0); base = { x: 0, y: 0, z: z };
            } else {
                const z = 17, vh = 2 * z * TAN, vw = vh * a, s = Math.min(1, vw * 0.9 / 8.4);
                enseigne.scale.setScalar(s); enseigne.position.set(0, vh / 2 - 2.4 * s - vh * 0.05, 0); base = { x: 0, y: 0, z: z };
            }
        },
        maj: function (t, souris, defil) {
            const o = allumage(t), f = cadre(t);
            matOuvert.opacity = 0.05 + 0.95 * o;
            matCadre.opacity = 0.05 + 0.95 * f;
            haloRose.material.opacity = o;
            lumRose.intensity = 36 * o; lumLaiton.intensity = 12 * f;
            camera.position.set(base.x + souris.x * 0.9, base.y + souris.y * 0.5 - defil * 1.5, base.z - defil * 2);
            vise.set(0, 0, 0);
            camera.lookAt(vise);
            enseigne.rotation.y = Math.sin(t * 0.3) * 0.02;
        }
    };
}

// ---- 14 · Les ingrédients en apesanteur, qui s'écartent sous le pointeur ----
function textureCitron() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#EDB92A'; x.beginPath(); x.arc(128, 128, 127, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#FFF4D2'; x.beginPath(); x.arc(128, 128, 113, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 10; i++) {
        const a0 = i / 10 * Math.PI * 2 + 0.05, a1 = (i + 1) / 10 * Math.PI * 2 - 0.05, am = (a0 + a1) / 2;
        const g = x.createRadialGradient(128, 128, 10, 128, 128, 104); g.addColorStop(0, '#FBE7A0'); g.addColorStop(1, '#F4CF4B');
        x.fillStyle = g; x.beginPath(); x.moveTo(128 + Math.cos(am) * 12, 128 + Math.sin(am) * 12); x.arc(128, 128, 102, a0, a1); x.closePath(); x.fill();
    }
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.5;
    for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, r = alea(25, 95); x.beginPath(); x.moveTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); x.lineTo(128 + Math.cos(a) * (r + 8), 128 + Math.sin(a) * (r + 8)); x.stroke(); }
    return textureDepuis(c);
}
function geoFeuille(echelle, courbure) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.bezierCurveTo(0.44, 0.2, 0.42, 0.78, 0, 1.18); s.bezierCurveTo(-0.42, 0.78, -0.44, 0.2, 0, 0);
    const g = new THREE.ShapeGeometry(s, 18), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -x * x * courbure + Math.sin(y * 2.6) * 0.04); }
    g.scale(echelle, echelle, echelle); g.computeVertexNormals();
    return g;
}
function sceneApesanteur(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9b8a8, 0.9));
    const soleil = new THREE.DirectionalLight(0xfff3e6, 1.5); soleil.position.set(4, 6, 7); scene.add(soleil);
    const groupe = new THREE.Group(); scene.add(groupe);
    const vert = new THREE.MeshStandardMaterial({ color: 0x3F8A35, roughness: 0.5, side: THREE.DoubleSide });
    const geoTomate = new THREE.SphereGeometry(0.42, 40, 28); geoTomate.scale(1, 0.88, 1);
    const matTomate = new THREE.MeshPhysicalMaterial({ color: 0xD5301E, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
    const geoCalice = geoFeuille(0.3, 0.6), geoBasilic = geoFeuille(1, 0.9);
    geoBasilic.translate(0, -0.55, 0);
    const tomate = function () {
        const g = new THREE.Group(); g.add(new THREE.Mesh(geoTomate, matTomate));
        for (let k = 0; k < 5; k++) { const bras = new THREE.Group(); bras.position.y = 0.34; bras.rotation.y = k / 5 * Math.PI * 2; const f = new THREE.Mesh(geoCalice, vert); f.rotation.x = -Math.PI / 2 - 0.45; bras.add(f); g.add(bras); }
        const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.16, 8), vert); tige.position.y = 0.42; g.add(tige);
        return g;
    };
    const texCitron = textureCitron(), matZeste = new THREE.MeshStandardMaterial({ color: 0xEDB92A, roughness: 0.55 }), matPulpe = new THREE.MeshPhysicalMaterial({ map: texCitron, roughness: 0.35, clearcoat: 0.6 });
    const geoCitron = new THREE.CylinderGeometry(0.62, 0.62, 0.1, 48);
    const citron = function () { return new THREE.Mesh(geoCitron, [matZeste, matPulpe, matPulpe]); };
    const objets = [];
    const ajouter = function (o, taille, rang, nb) {
        const u = (rang + 0.5) / nb, phi = Math.acos(1 - 2 * u), theta = rang * 2.39996;
        const r = alea(0.55, 1);
        const maison = new THREE.Vector3(Math.sin(phi) * Math.cos(theta) * 4.1 * r, Math.cos(phi) * 2.5 * r, Math.sin(phi) * Math.sin(theta) * 2 * r);
        o.scale.setScalar(0.001); groupe.add(o);
        objets.push({ o: o, taille: taille, maison: maison, rot: new THREE.Vector3(alea(0, 6), alea(0, 6), alea(0, 6)), vit: new THREE.Vector3(alea(-0.5, 0.5), alea(-0.6, 0.6), alea(-0.4, 0.4)), phase: alea(0, 6.28), retard: alea(0, 0.45), ecart: new THREE.Vector3() });
    };
    const liste = [];
    for (let i = 0; i < 7; i++) liste.push([tomate(), 1]);
    for (let i = 0; i < 7; i++) liste.push([new THREE.Mesh(geoBasilic, vert), 1]);
    for (let i = 0; i < 3; i++) liste.push([citron(), 1]);
    const matPoivre = new THREE.MeshStandardMaterial({ color: 0x2E211A, roughness: 0.75 }), geoPoivre = new THREE.IcosahedronGeometry(0.075, 1);
    for (let i = 0; i < 22; i++) liste.push([new THREE.Mesh(geoPoivre, matPoivre), 1]);
    const matSel = new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.15, clearcoat: 1 }), geoSel = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < 16; i++) liste.push([new THREE.Mesh(geoSel, matSel), 0.9]);
    liste.sort(function () { return Math.random() - 0.5; }).forEach(function (e, i) { ajouter(e[0], e[1], i, liste.length); });
    const vise = new THREE.Vector3(), tmp = new THREE.Vector3(), d = new THREE.Vector3(), qInv = new THREE.Quaternion();
    let dernier = 0;
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { const a = w / h; camera.aspect = a; camera.position.set(0, 0, Math.max(11, 10.2 / (2 * TAN * a))); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil, pointeur) {
            const dt = Math.min(0.05, Math.max(0, t - dernier)); dernier = t;
            const dedans = pointeur.dedans && pointSurPlan(camera, pointeur, vise);
            groupe.rotation.y = Math.sin(t * 0.15) * 0.25 + souris.x * 0.2 + defil * 0.8;
            groupe.rotation.x = souris.y * 0.1;
            groupe.updateMatrixWorld();
            qInv.copy(groupe.quaternion).invert();
            const etal = 1 + defil * 0.7;
            objets.forEach(function (b) {
                const p = rebond(lisse(0.1 + b.retard, 1.5 + b.retard, t));
                tmp.copy(b.maison).multiplyScalar(p * etal);
                tmp.x += Math.sin(t * 0.7 + b.phase) * 0.16; tmp.y += Math.cos(t * 0.55 + b.phase) * 0.22; tmp.z += Math.sin(t * 0.45 + b.phase * 2) * 0.12;
                // Le pointeur écarte les ingrédients (calcul dans le repère du groupe).
                let cible = 0;
                if (dedans) {
                    d.copy(tmp); groupe.localToWorld(d); d.sub(vise); d.z = 0;
                    const l = d.length();
                    if (l < 2.2 && l > 0.0001) { cible = (2.2 - l) / 2.2; d.multiplyScalar(cible * 1.3 / l).applyQuaternion(qInv); }
                }
                if (cible) b.ecart.lerp(d, 0.12); else b.ecart.multiplyScalar(0.92);
                b.o.position.copy(tmp).add(b.ecart);
                b.rot.addScaledVector(b.vit, dt);
                b.o.rotation.set(b.rot.x, b.rot.y, b.rot.z);
                b.o.scale.setScalar(Math.max(0.001, sortie(lisse(0.1 + b.retard, 1 + b.retard, t))) * b.taille);
            });
        }
    };
}

// ---- 15 · Le plan de salle : les tables se réservent une à une ----
function textureParquet() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 716; const x = c.getContext('2d');
    x.fillStyle = '#E4D2B8'; x.fillRect(0, 0, 1024, 716);
    const lh = 36;
    for (let r = 0; r < 716 / lh; r++) {
        let px = -alea(0, 200);
        while (px < 1024) { const l = alea(160, 320), k = alea(0.93, 1.05); x.fillStyle = 'rgb(' + Math.round(228 * k) + ',' + Math.round(208 * k) + ',' + Math.round(182 * k) + ')'; x.fillRect(px + 1, r * lh + 1, l - 2, lh - 2); px += l; }
    }
    return textureDepuis(c);
}
function dessinerTableau(c, n) {
    const x = c.getContext('2d');
    x.fillStyle = '#6B4A32'; x.fillRect(0, 0, 512, 256);
    x.fillStyle = '#26302B'; x.fillRect(12, 12, 488, 232);
    x.fillStyle = 'rgba(255,255,255,.9)'; x.textAlign = 'center';
    x.font = '400 64px "Yellowtail", cursive'; x.fillText('Ce soir', 256, 104);
    x.font = '600 36px "JetBrains Mono", monospace';
    x.fillText(n + (n > 1 ? ' réservations' : ' réservation'), 256, 176);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(150, 196, 212, 2);
}
function dessinerEtiquette(c, titre, detail) {
    const x = c.getContext('2d');
    x.clearRect(0, 0, 512, 168);
    x.fillStyle = 'rgba(27,26,23,.18)'; rondRect(x, 10, 16, 492, 138, 28); x.fill();
    x.fillStyle = '#FFFFFF'; rondRect(x, 6, 6, 492, 138, 28); x.fill();
    x.fillStyle = '#9B1B30'; x.beginPath(); x.arc(76, 75, 38, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#FFFFFF'; x.lineWidth = 8; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(58, 76); x.lineTo(71, 89); x.lineTo(95, 62); x.stroke();
    x.textAlign = 'left'; x.fillStyle = '#1B1A17'; x.font = '700 40px "Schibsted Grotesk", sans-serif'; x.fillText(titre, 134, 68);
    x.fillStyle = '#5C5750'; x.font = '500 28px "JetBrains Mono", monospace'; x.fillText(detail, 134, 112);
}
function scenePlan(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a58f, 0.9));
    const soleil = new THREE.DirectionalLight(0xfff4e6, 1.7); soleil.position.set(-5, 12, 7);
    soleil.castShadow = true; soleil.shadow.mapSize.set(1024, 1024); soleil.shadow.bias = -0.0008; soleil.shadow.normalBias = 0.02;
    Object.assign(soleil.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); soleil.shadow.camera.updateProjectionMatrix();
    scene.add(soleil);
    const salle = new THREE.Group(); scene.add(salle);
    const ajout = function (geo, mat, px, py, pz, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; (parent || salle).add(m); return m; };
    const bois = new THREE.MeshStandardMaterial({ color: 0xC9AE8C, roughness: 0.8 });
    ajout(new THREE.BoxGeometry(10, 0.3, 7), [bois, bois, new THREE.MeshStandardMaterial({ map: textureParquet(), roughness: 0.7 }), bois, bois, bois], 0, 0, 0);
    const mur = new THREE.MeshStandardMaterial({ color: 0xF1E9DD, roughness: 0.95 }), soubassement = new THREE.MeshStandardMaterial({ color: 0x9B1B30, roughness: 0.7 });
    ajout(new THREE.BoxGeometry(10.2, 1.9, 0.2), mur, 0, 1.1, -3.6);
    ajout(new THREE.BoxGeometry(0.2, 1.9, 7.2), mur, -5.1, 1.1, 0);
    ajout(new THREE.BoxGeometry(10.24, 0.55, 0.24), soubassement, 0, 0.43, -3.6);
    ajout(new THREE.BoxGeometry(0.24, 0.55, 7.24), soubassement, -5.1, 0.43, 0);
    // Ardoise « Ce soir » au mur, mise à jour à chaque réservation.
    const cTableau = document.createElement('canvas'); cTableau.width = 512; cTableau.height = 256; dessinerTableau(cTableau, 0);
    const texTableau = textureDepuis(cTableau);
    const tableau = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.15), new THREE.MeshStandardMaterial({ map: texTableau, roughness: 0.9 }));
    tableau.position.set(-2.4, 1.35, -3.49); salle.add(tableau);
    // Le comptoir, ses tabourets et l'étagère à bouteilles
    const sombre = new THREE.MeshStandardMaterial({ color: 0x4E3223, roughness: 0.6 }), clair = new THREE.MeshStandardMaterial({ color: 0xEADBC4, roughness: 0.5 });
    ajout(new THREE.BoxGeometry(3.8, 0.95, 0.75), sombre, 2.6, 0.63, -2.75);
    ajout(new THREE.BoxGeometry(4.0, 0.07, 0.9), clair, 2.6, 1.14, -2.75);
    const laiton = new THREE.MeshStandardMaterial({ color: 0xC08A2E, metalness: 1, roughness: 0.3 });
    [1.1, 2.1, 3.1, 4.1].forEach(function (px) { ajout(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 24), sombre, px, 0.82, -2.0); ajout(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8), laiton, px, 0.47, -2.0); });
    ajout(new THREE.BoxGeometry(3.4, 0.05, 0.3), clair, 2.6, 1.62, -3.35);
    const verres = [0x2F5D3A, 0x6B2A1E, 0x2F5D3A, 0xC9A55A, 0x6B2A1E, 0x2F5D3A, 0x3B3B3B];
    verres.forEach(function (col, i) { ajout(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 12), new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.1 }), 1.2 + i * 0.47, 1.86, -3.35); });
    // Plantes
    const pot = new THREE.MeshStandardMaterial({ color: 0xB5653B, roughness: 0.8 }), feuillage = new THREE.MeshStandardMaterial({ color: 0x5E8B4A, roughness: 0.8, flatShading: true });
    [[-4.4, -2.9], [4.4, 2.9]].forEach(function (p) { ajout(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 20), pot, p[0], 0.36, p[1]); ajout(new THREE.IcosahedronGeometry(0.46, 1), feuillage, p[0], 0.95, p[1]); });
    // Tables et chaises
    const nappe = 0xFBF8F2, reservee = new THREE.Color(0x9B1B30), libre = new THREE.Color(nappe);
    const chaise = new THREE.MeshStandardMaterial({ color: 0x2B2422, roughness: 0.6 });
    const PLAN = [[-3.5, -0.9, 'rond'], [-1.3, -0.9, 'rond'], [1.1, -0.6, 'carre'], [3.5, -0.6, 'carre'], [-3.5, 1.8, 'carre'], [-1.1, 1.8, 'carre'], [1.3, 2.0, 'rond'], [3.4, 2.0, 'rond']];
    const HEURES = ['19h30', '20h00', '20h15', '20h30', '20h45', '21h00'];
    const tables = PLAN.map(function (p, i) {
        const g = new THREE.Group(); g.position.set(p[0], 0.15, p[1]); salle.add(g);
        const mat = new THREE.MeshStandardMaterial({ color: nappe, roughness: 0.75 });
        const dessus = ajout(p[2] === 'rond' ? new THREE.CylinderGeometry(0.52, 0.52, 0.07, 40) : new THREE.BoxGeometry(1.05, 0.07, 1.05), mat, 0, 0.78, 0, g);
        ajout(new THREE.CylinderGeometry(0.05, 0.05, 0.74, 10), chaise, 0, 0.4, 0, g);
        ajout(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 20), chaise, 0, 0.03, 0, g);
        const places = p[2] === 'rond' ? [[0.82, 0], [-0.82, 0]] : [[0.84, 0], [-0.84, 0], [0, 0.84], [0, -0.84]];
        places.forEach(function (q) {
            const c = new THREE.Group(); c.position.set(q[0], 0, q[1]); c.rotation.y = Math.atan2(q[0], q[1]); g.add(c);
            ajout(new THREE.BoxGeometry(0.42, 0.06, 0.42), chaise, 0, 0.5, 0, c);
            ajout(new THREE.BoxGeometry(0.42, 0.46, 0.06), chaise, 0, 0.76, 0.19, c);
            ajout(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 8), chaise, 0, 0.25, 0, c);
        });
        const cE = document.createElement('canvas'); cE.width = 512; cE.height = 168;
        const texE = textureDepuis(cE);
        const etiquette = new THREE.Sprite(new THREE.SpriteMaterial({ map: texE, transparent: true, depthTest: false }));
        etiquette.center.set(0.5, 0); etiquette.position.set(0, 1.35, 0); etiquette.renderOrder = 10; etiquette.visible = false; g.add(etiquette);
        return { mat: mat, etiquette: etiquette, cE: cE, texE: texE, couverts: places.length, numero: i + 1, reservee: false, debut: -10 };
    });
    let prochain = 1.1, compte = 0, taille = 1;
    const reserver = function (t) {
        const libres = tables.filter(function (b) { return !b.reservee; });
        if (!libres.length) {
            if (t > prochain + 2.4) { tables.forEach(function (b) { b.reservee = false; b.debut = t; }); compte = 0; dessinerTableau(cTableau, 0); texTableau.needsUpdate = true; prochain = t + 1; }
            return;
        }
        const b = libres[Math.floor(Math.random() * libres.length)];
        b.reservee = true; b.debut = t; compte++;
        dessinerEtiquette(b.cE, 'Table ' + b.numero, HEURES[Math.floor(Math.random() * HEURES.length)] + ' · ' + b.couverts + ' couverts'); b.texE.needsUpdate = true;
        dessinerTableau(cTableau, compte); texTableau.needsUpdate = true;
        prochain = t + 1.5;
    };
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) {
            const a = w / h, vue = Math.max(8.8, 13.8 / a);
            Object.assign(camera, { left: -vue * a / 2, right: vue * a / 2, top: vue / 2, bottom: -vue / 2 });
            camera.position.set(10, 9.5, 10); camera.lookAt(0, 0.3, 0); camera.updateProjectionMatrix();
            taille = vue / 8.4;
        },
        maj: function (t, souris, defil) {
            if (t > prochain) reserver(t);
            tables.forEach(function (b) {
                const k = lisse(b.debut, b.debut + 0.45, t);
                b.mat.color.copy(libre).lerp(reservee, b.reservee ? k : 1 - k);
                const vie = t - b.debut, e = b.etiquette;
                e.visible = b.reservee && vie < 2.9;
                if (e.visible) { const s = vie < 0.5 ? rebond(lisse(0, 0.5, vie)) : 1 - lisse(2.5, 2.9, vie); e.scale.set(2.3 * s * taille, 0.755 * s * taille, 1); }
            });
            salle.rotation.y = Math.sin(t * 0.2) * 0.06 + souris.x * 0.12 + defil * 0.25;
            salle.position.y = -0.2 + Math.sin(t * 0.6) * 0.03;
        }
    };
}

// ---- 16 · Métamorphose : des milliers de points dessinent la toque, l'assiette, le site, les avis, le logo ----
function echantillonner(dessin, n, profondeur) {
    const T = 220, c = document.createElement('canvas'); c.width = c.height = T;
    const x = c.getContext('2d');
    x.fillStyle = x.strokeStyle = '#FFFFFF';
    dessin(x);
    const d = x.getImageData(0, 0, T, T).data, pts = [];
    for (let i = 0; i < T * T; i++) if (d[i * 4 + 3] > 128) pts.push(i);
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const p = pts[Math.floor(Math.random() * pts.length)];
        out[i * 3] = ((p % T) + Math.random() - T / 2) / (T / 2) * 3.2;
        out[i * 3 + 1] = -(Math.floor(p / T) + Math.random() - T / 2) / (T / 2) * 3.2;
        out[i * 3 + 2] = alea(-1, 1) * profondeur;
    }
    return out;
}
function etoile(x, cx, cy, r) {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.44 : r; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
    x.closePath(); x.fill();
}
const FORMES = [
    // La toque
    function (x) {
        [[74, 90, 33], [110, 66, 42], [146, 90, 33], [92, 76, 30], [128, 76, 30]].forEach(function (c) { x.beginPath(); x.arc(c[0], c[1], c[2], 0, Math.PI * 2); x.fill(); });
        x.fillRect(72, 90, 76, 62);
        rondRect(x, 66, 150, 88, 26, 6); x.fill();
        x.globalCompositeOperation = 'destination-out';
        [88, 110, 132].forEach(function (px) { x.fillRect(px - 2, 108, 4, 38); });
        x.fillRect(66, 146, 88, 4);
        x.globalCompositeOperation = 'source-over';
    },
    // L'assiette, la fourchette et le couteau
    function (x) {
        x.beginPath(); x.arc(110, 110, 58, 0, Math.PI * 2); x.fill();
        x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(110, 110, 45, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over';
        x.lineWidth = 3; x.beginPath(); x.arc(110, 110, 33, 0, Math.PI * 2); x.stroke();
        rondRect(x, 25, 96, 9, 92, 4); x.fill();
        rondRect(x, 18, 66, 23, 36, 9); x.fill();
        for (let k = 0; k < 4; k++) x.fillRect(18.5 + k * 6.2, 30, 3.4, 44);
        x.beginPath(); x.moveTo(186, 28); x.quadraticCurveTo(203, 64, 195, 108); x.lineTo(185, 108); x.closePath(); x.fill();
        rondRect(x, 183, 106, 11, 82, 5); x.fill();
    },
    // Le site du restaurant, sur téléphone
    function (x) {
        rondRect(x, 68, 14, 84, 192, 18); x.fill();
        x.globalCompositeOperation = 'destination-out'; rondRect(x, 75, 28, 70, 164, 6); x.fill(); x.globalCompositeOperation = 'source-over';
        x.fillRect(82, 36, 30, 7); rondRect(x, 122, 35, 17, 9, 4); x.fill();
        rondRect(x, 82, 52, 56, 46, 5); x.fill();
        x.fillRect(82, 106, 46, 7); x.fillRect(82, 118, 34, 4);
        for (let r = 0; r < 3; r++) { rondRect(x, 82, 132 + r * 18, 56, 12, 3); x.fill(); }
        rondRect(x, 96, 198, 28, 4, 2); x.fill();
    },
    // Les avis cinq étoiles
    function (x) {
        for (let k = 0; k < 5; k++) etoile(x, 30 + k * 40, 102, 20);
        x.fillRect(46, 146, 128, 5); x.fillRect(66, 160, 88, 5);
    },
    // Le logo
    function (x) {
        x.lineWidth = 9; x.beginPath(); x.arc(110, 110, 78, 0, Math.PI * 2); x.stroke();
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '600 76px "Unbounded", "Arial Black", sans-serif'; x.fillText('CD', 110, 114);
    }
];
function sceneMetamorphose() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const groupe = new THREE.Group(); scene.add(groupe);
    const N = window.innerWidth < 700 ? 3600 : 5600;
    const cibles = FORMES.map(function (f, i) { return echantillonner(f, N, i === 1 ? 0.5 : 0.35); });
    const pos = new Float32Array(N * 3), couleur = new Float32Array(N * 3), taille = new Float32Array(N);
    const retard = new Float32Array(N), phase = new Float32Array(N), elan = new Float32Array(N * 3);
    const or = new THREE.Color(0xE9BD6E), creme = new THREE.Color(0xFFF0D2), rose = new THREE.Color(0xE0536B);
    for (let i = 0; i < N; i++) {
        const r = Math.random(), c = r < 0.7 ? or : r < 0.88 ? creme : rose;
        couleur[i * 3] = c.r; couleur[i * 3 + 1] = c.g; couleur[i * 3 + 2] = c.b;
        taille[i] = alea(0.04, 0.09); retard[i] = Math.random() * 0.4; phase[i] = Math.random() * 6.28;
        const v = new THREE.Vector3(alea(-1, 1), alea(-1, 1), alea(-1, 1)).normalize().multiplyScalar(alea(0.6, 2.2));
        elan[i * 3] = v.x; elan[i * 3 + 1] = v.y; elan[i * 3 + 2] = v.z;
        // Départ : un nuage diffus qui se rassemble en toque.
        pos[i * 3] = alea(-7, 7); pos[i * 3 + 1] = alea(-5, 5); pos[i * 3 + 2] = alea(-4, 3);
    }
    const depart = pos.slice();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('couleur', new THREE.BufferAttribute(couleur, 3));
    geo.setAttribute('taille', new THREE.BufferAttribute(taille, 1));
    const mat = new THREE.ShaderMaterial({
        uniforms: { uEchelle: { value: 500 } },
        vertexShader: 'attribute vec3 couleur; attribute float taille; uniform float uEchelle; varying vec3 vC; void main(){ vC = couleur; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = taille * uEchelle / -mv.z; gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; float a = smoothstep(0.5, 0.05, r); gl_FragColor = vec4(vC * a, a); }',
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat); points.frustumCulled = false; groupe.add(points);
    const TENUE = 2.5, PASSAGE = 1.5, CYCLE = TENUE + PASSAGE;
    const vise = new THREE.Vector3();
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) {
            const a = w / h; camera.aspect = a; camera.position.set(0, 0, Math.max(12, 8 / (2 * TAN * a))); camera.updateProjectionMatrix();
            mat.uniforms.uEchelle.value = h * renderer.getPixelRatio() / (2 * TAN);
        },
        maj: function (t, souris, defil, pointeur) {
            // Étape en cours : on tient la forme, puis on passe à la suivante (la première arrive du nuage).
            const tt = Math.max(0, t - 0.3), etape = Math.floor(tt / CYCLE), local = tt - etape * CYCLE;
            const de = etape === 0 && local < PASSAGE ? depart : cibles[(etape - 1 + FORMES.length) % FORMES.length];
            const vers = local < PASSAGE ? cibles[etape % FORMES.length] : null;
            const fixe = cibles[etape % FORMES.length];
            const dedans = pointeur.dedans && pointSurPlan(camera, pointeur, vise);
            for (let i = 0; i < N; i++) {
                const j = i * 3;
                let x, y, z;
                if (vers) {
                    const p = doux(lisse(retard[i], retard[i] + PASSAGE - 0.4, local)), s = Math.sin(Math.PI * p);
                    x = de[j] + (vers[j] - de[j]) * p + elan[j] * s; y = de[j + 1] + (vers[j + 1] - de[j + 1]) * p + elan[j + 1] * s; z = de[j + 2] + (vers[j + 2] - de[j + 2]) * p + elan[j + 2] * s;
                } else { x = fixe[j]; y = fixe[j + 1]; z = fixe[j + 2]; }
                x += Math.sin(t * 1.3 + phase[i]) * 0.025; y += Math.cos(t * 1.1 + phase[i]) * 0.025;
                if (dedans) {
                    const dx = x - vise.x, dy = y - vise.y, l = Math.sqrt(dx * dx + dy * dy);
                    if (l < 1.3 && l > 0.0001) { const f = (1.3 - l) / 1.3 * 0.9 / l; x += dx * f; y += dy * f; }
                }
                pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
            }
            geo.attributes.position.needsUpdate = true;
            groupe.rotation.y = Math.sin(t * 0.4) * 0.32 + souris.x * 0.25;
            groupe.rotation.x = -souris.y * 0.12;
            groupe.position.y = -defil * 1.5;
        }
    };
}

const SCENES = { 12: sceneCarte, 13: sceneNeon, 14: sceneApesanteur, 15: scenePlan, 16: sceneMetamorphose };

if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const horloge = new THREE.Clock();
    const souris = new THREE.Vector2(), sourisL = new THREE.Vector2(), zero = new THREE.Vector2();
    const pointeur = { x: 0, y: 0, dedans: false, cx: -1, cy: -1 };
    window.addEventListener('pointermove', function (e) { souris.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight * 2 - 1)); pointeur.cx = e.clientX; pointeur.cy = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', function () { pointeur.cx = -1; });
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
        const polices = ['400 40px "Libre Caslon Display"', 'italic 400 30px "Libre Caslon Text"', '700 20px "Mulish"', '400 60px "Yellowtail"', '600 60px "Big Shoulders Display"', '700 40px "Schibsted Grotesk"', '500 28px "JetBrains Mono"', '600 36px "JetBrains Mono"', '600 60px "Unbounded"'];
        if (document.fonts && document.fonts.load) Promise.all(polices.map(function (f) { return document.fonts.load(f).catch(function () {}); })).then(function () { if (window.CD_MAQUETTE === n) lancer(); });
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
