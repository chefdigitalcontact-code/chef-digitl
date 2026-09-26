// Scènes 3D de l'ouverture d'Aegis (Three.js) : une par maquette, reconstruite à chaque changement.
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
const alea = (a, b) => a + Math.random() * (b - a);
const OR = 0xD4AF5A, NUIT = 0x0B1B33;
const matOr = (r) => new THREE.MeshStandardMaterial({ color: OR, metalness: 1, roughness: r === undefined ? 0.22 : r });
const matNuit = () => new THREE.MeshPhysicalMaterial({ color: NUIT, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });

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

// ---- 7 · Bouclier : l'emblème en relief, face bleu nuit laquée, tranche et « A » en or ----
function sceneBouclier(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xdfe6f5, 0x1a1a24, 0.4));
    const cle = new THREE.DirectionalLight(0xfff3e0, 1.4); cle.position.set(3, 5, 8); scene.add(cle);
    const contre = new THREE.PointLight(0xE4CD8A, 60, 30, 1.6); contre.position.set(-6, 3, -3); scene.add(contre);
    const groupe = new THREE.Group(); scene.add(groupe);
    const or = matOr(0.2);
    const k = 1 / 40, prof = 0.45, biseau = 0.14;
    const bouclier = bouclierMassif(k, prof, biseau, matNuit(), or);
    const a = lettreA(k, 0.13, or); a.position.z = prof / 2 + biseau + 0.06;
    const embleme = new THREE.Group(); embleme.add(bouclier, a); groupe.add(embleme);
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.018, 12, 200), matOr(0.3)); groupe.add(anneau);
    const nbP = 72, points = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), matOr(0.3), nbP), m = new THREE.Object3D();
    for (let i = 0; i < nbP; i++) { const t = i / nbP * Math.PI * 2; m.position.set(Math.cos(t) * 4.4, Math.sin(t) * 4.4, 0); m.updateMatrix(); points.setMatrixAt(i, m.matrix); }
    groupe.add(points);
    const poudre = poussiere(260, 9, 0.12, 0xE4CD8A, 0.55); scene.add(poudre);
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { camera.aspect = w / h; camera.position.set(0, 0, w / h < 0.8 ? 21 : 17); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const e = lisse(0, 1.8, t);
            embleme.scale.setScalar(0.6 + 0.4 * e);
            embleme.rotation.y = (1 - e) * -1.4 + Math.sin(t * 0.4) * 0.32 + souris.x * 0.45 + defil * 0.9;
            embleme.rotation.x = -souris.y * 0.2 + Math.sin(t * 0.3) * 0.05;
            embleme.position.y = Math.sin(t * 0.8) * 0.08;
            anneau.rotation.set(1.15 + souris.y * 0.1, 0.25 + souris.x * 0.2, t * 0.1);
            points.rotation.set(1.15, -0.2, -t * 0.06);
            poudre.rotation.y = t * 0.02;
        }
    };
}

// ---- 8 · Constellation : un réseau de sources surveillées, des signaux qui circulent ----
function sceneConstellation() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const groupe = new THREE.Group(); scene.add(groupe);
    const N = 240, noeuds = [];
    for (let i = 0; i < N; i++) {
        const d = new THREE.Vector3(alea(-1, 1), alea(-1, 1), alea(-1, 1)).normalize();
        noeuds.push(d.multiplyScalar(alea(4, 9)).multiply(new THREE.Vector3(1, 0.7, 1)));
    }
    const voisins = noeuds.map(function () { return []; }), paires = [];
    noeuds.forEach(function (a, i) {
        const proches = noeuds.map(function (b, j) { return { j: j, d: a.distanceTo(b) }; }).filter(function (o) { return o.j !== i && o.d < 3.1; }).sort(function (x, y) { return x.d - y.d; }).slice(0, 3);
        proches.forEach(function (o) { if (voisins[i].indexOf(o.j) < 0) { voisins[i].push(o.j); voisins[o.j].push(i); paires.push(i, o.j); } });
    });
    const posL = new Float32Array(paires.length * 3);
    paires.forEach(function (idx, k) { posL[k * 3] = noeuds[idx].x; posL[k * 3 + 1] = noeuds[idx].y; posL[k * 3 + 2] = noeuds[idx].z; });
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(posL, 3));
    groupe.add(new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: 0xC9A54C, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })));
    const posN = new Float32Array(N * 3); noeuds.forEach(function (v, i) { posN[i * 3] = v.x; posN[i * 3 + 1] = v.y; posN[i * 3 + 2] = v.z; });
    const gn = new THREE.BufferGeometry(); gn.setAttribute('position', new THREE.BufferAttribute(posN, 3));
    const sprite = spriteRond();
    groupe.add(new THREE.Points(gn, new THREE.PointsMaterial({ size: 0.22, map: sprite, color: 0xE4CD8A, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
    const M = 46, signaux = [], posS = new Float32Array(M * 3);
    for (let s = 0; s < M; s++) { let a = Math.floor(Math.random() * N); while (!voisins[a].length) a = Math.floor(Math.random() * N); signaux.push({ a: a, b: voisins[a][Math.floor(Math.random() * voisins[a].length)], p: Math.random(), v: alea(0.35, 0.9) }); }
    const gs = new THREE.BufferGeometry(); gs.setAttribute('position', new THREE.BufferAttribute(posS, 3));
    groupe.add(new THREE.Points(gs, new THREE.PointsMaterial({ size: 0.55, map: sprite, color: 0xFFF1C2, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })));
    let dernier = 0;
    const tmp = new THREE.Vector3();
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) {
            camera.aspect = w / h; camera.updateProjectionMatrix();
            groupe.position.set(w / h >= 1 ? 5.5 : 0, w / h >= 1 ? 0 : 3.5, 0);
        },
        maj: function (t, souris, defil) {
            const dt = Math.min(0.05, Math.max(0, t - dernier)); dernier = t;
            signaux.forEach(function (s, i) {
                s.p += dt * s.v;
                if (s.p >= 1) { s.p = 0; s.a = s.b; const vs = voisins[s.a]; s.b = vs[Math.floor(Math.random() * vs.length)]; }
                tmp.lerpVectors(noeuds[s.a], noeuds[s.b], s.p);
                posS[i * 3] = tmp.x; posS[i * 3 + 1] = tmp.y; posS[i * 3 + 2] = tmp.z;
            });
            gs.attributes.position.needsUpdate = true;
            groupe.rotation.y = t * 0.05 + souris.x * 0.25;
            groupe.rotation.x = souris.y * 0.12 + 0.1;
            camera.position.set(0, 0, 17 - defil * 6);
        }
    };
}

// ---- 9 · Globe : points dorés, et une atteinte qui se propage d'un point à l'autre ----
function sceneGlobe() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const groupe = new THREE.Group(); scene.add(groupe);
    const R = 4, N = 2200, pos = new Float32Array(N * 3), or = Math.PI * (3 - Math.sqrt(5));
    const surface = [];
    for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = or * i;
        const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(R);
        surface.push(v); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sprite = spriteRond();
    groupe.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.15, map: sprite, color: 0xE4CD8A, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
    const villes = []; for (let i = 0; i < 26; i++) villes.push(surface[Math.floor(Math.random() * N)]);
    const pv = new Float32Array(villes.length * 3); villes.forEach(function (v, i) { pv[i * 3] = v.x * 1.005; pv[i * 3 + 1] = v.y * 1.005; pv[i * 3 + 2] = v.z * 1.005; });
    const gv = new THREE.BufferGeometry(); gv.setAttribute('position', new THREE.BufferAttribute(pv, 3));
    groupe.add(new THREE.Points(gv, new THREE.PointsMaterial({ size: 0.42, map: sprite, color: 0xFFE7A6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.14, 64, 48), new THREE.ShaderMaterial({
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec3 vN; void main(){ float i = pow(clamp(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0) * 0.55; gl_FragColor = vec4(0.45, 0.62, 0.95, 1.0) * i; }',
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    scene.add(halo);
    // Corps du globe : masque la face cachée et donne du volume aux points.
    groupe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 64, 48), new THREE.MeshBasicMaterial({ color: 0x0A1A36 })));
    const arcs = [];
    for (let k = 0; k < 12; k++) {
        let a, b; do { a = villes[Math.floor(Math.random() * villes.length)]; b = villes[Math.floor(Math.random() * villes.length)]; } while (a === b || a.angleTo(b) < 0.5);
        const milieu = a.clone().add(b).normalize().multiplyScalar(R * (1.2 + a.angleTo(b) * 0.25));
        const pts = new THREE.QuadraticBezierCurve3(a, milieu, b).getPoints(64);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const ligne = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xE4CD8A, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        groupe.add(ligne);
        arcs.push({ geo: geo, decal: k * 0.55 });
    }
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { camera.aspect = w / h; camera.position.set(0, 0, Math.max(17, 11 / (w / h) / 0.573)); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            groupe.rotation.y = t * 0.12 + souris.x * 0.35 + defil * 1.2;
            groupe.rotation.x = 0.35 + souris.y * 0.1;
            halo.scale.setScalar(1 + Math.sin(t * 0.8) * 0.01);
            arcs.forEach(function (a) {
                const c = ((t + a.decal) % 4.4) / 4.4;
                const tete = Math.min(65, Math.floor(lisse(0, 0.45, c) * 65)), queue = Math.floor(lisse(0.55, 1, c) * 65);
                a.geo.setDrawRange(queue, Math.max(0, tete - queue));
            });
        }
    };
}

// ---- 10 · Sceau : une pièce d'or frappée de l'emblème, qui tourne lentement ----
function sceneSceau(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a5a, 0.5));
    const cle = new THREE.DirectionalLight(0xffffff, 1.5); cle.position.set(4, 6, 8); scene.add(cle);
    const groupe = new THREE.Group(); scene.add(groupe);
    const piece = new THREE.Group(); groupe.add(piece);
    const profil = [[0, 0.2], [2.45, 0.2], [2.55, 0.24], [2.62, 0.31], [2.95, 0.31], [3.05, 0.24], [3.08, 0.1], [3.08, -0.1], [3.05, -0.24], [2.95, -0.31], [2.62, -0.31], [2.55, -0.24], [2.45, -0.2], [0, -0.2]].map(p => new THREE.Vector2(p[0], p[1]));
    const corps = new THREE.LatheGeometry(profil, 128); corps.rotateX(Math.PI / 2);
    piece.add(new THREE.Mesh(corps, new THREE.MeshStandardMaterial({ color: OR, metalness: 1, roughness: 0.2, side: THREE.DoubleSide })));
    const relief = matOr(0.38);
    [1, -1].forEach(function (face) {
        const cote = new THREE.Group();
        const b = bouclierMassif(1 / 62, 0.05, 0.03, relief, relief); cote.add(b);
        const a = lettreA(1 / 62, 0.06, relief); a.position.z = 0.08; cote.add(a);
        const nb = 64, perles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 10, 8), relief, nb), m = new THREE.Object3D();
        for (let i = 0; i < nb; i++) { const t = i / nb * Math.PI * 2; m.position.set(Math.cos(t) * 2.2, Math.sin(t) * 2.2, 0); m.updateMatrix(); perles.setMatrixAt(i, m.matrix); }
        cote.add(perles);
        cote.position.z = face * 0.22; if (face < 0) cote.rotation.y = Math.PI;
        piece.add(cote);
    });
    const ombre = ombreSol(6, 2.2, 0.28); ombre.position.y = -3.7; groupe.add(ombre);
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { camera.aspect = w / h; camera.position.set(0, 0.6, w / h < 0.8 ? 17 : 13.5); camera.lookAt(0, -0.2, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const e = lisse(0, 1.6, t);
            piece.position.y = (1 - e) * 4 + Math.sin(t * 0.9) * 0.12;
            piece.rotation.y = t * 0.45 + (1 - e) * 2 + souris.x * 0.4 + defil * 1.5;
            piece.rotation.x = -souris.y * 0.15;
            ombre.material.opacity = 0.7 + Math.sin(t * 0.9) * 0.15;
        }
    };
}

// ---- 11 · Balance : la balance de la justice, qui oscille puis trouve son équilibre ----
function sceneBalance(env) {
    const scene = new THREE.Scene(); scene.environment = env;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x77808f, 0.55));
    const cle = new THREE.DirectionalLight(0xffffff, 1.4); cle.position.set(5, 8, 7); scene.add(cle);
    const groupe = new THREE.Group(); scene.add(groupe);
    const or = matOr(0.2), nuit = matNuit();
    const socle = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.85, 0.36, 64), nuit); socle.position.y = 0.18; groupe.add(socle);
    const bague = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.04, 12, 96), or); bague.rotation.x = Math.PI / 2; bague.position.y = 0.36; groupe.add(bague);
    const colonne = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 5, 32), or); colonne.position.y = 2.86; groupe.add(colonne);
    const sommet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 24), or); sommet.position.y = 5.62; groupe.add(sommet);
    const pivot = new THREE.Group(); pivot.position.y = 5.25; groupe.add(pivot);
    const fleau = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 6.4, 24), or); fleau.rotation.z = Math.PI / 2; pivot.add(fleau);
    const moyeu = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), or); pivot.add(moyeu);
    const coupeProfil = [[0, -0.14], [0.8, -0.12], [1.12, -0.02], [1.25, 0.08], [1.22, 0.1], [1.08, 0.01], [0.78, -0.07], [0, -0.09]].map(p => new THREE.Vector2(p[0], p[1]));
    const plateaux = [-1, 1].map(function (s) {
        const bout = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), or); bout.position.x = s * 3.2; pivot.add(bout);
        const coupe = new THREE.Mesh(new THREE.LatheGeometry(coupeProfil, 64), new THREE.MeshStandardMaterial({ color: OR, metalness: 1, roughness: 0.22, side: THREE.DoubleSide }));
        groupe.add(coupe);
        const chaines = [0, 1, 2].map(function () { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xB8923F })); groupe.add(l); return g; });
        return { s: s, coupe: coupe, chaines: chaines };
    });
    const ombre = ombreSol(7, 7, 0.22); ombre.position.y = 0.01; groupe.add(ombre);
    const bout = new THREE.Vector3();
    return {
        scene: scene, camera: camera,
        dimension: function (w, h) { camera.aspect = w / h; camera.position.set(0, 3.4, Math.max(17.5, 10.2 / (w / h) / 0.536)); camera.lookAt(0, 2.9, 0); camera.updateProjectionMatrix(); },
        maj: function (t, souris, defil) {
            const theta = Math.sin(t * 1.1) * 0.2 * Math.exp(-t * 0.12) + Math.sin(t * 0.55) * 0.025 + souris.x * 0.06;
            pivot.rotation.z = theta;
            plateaux.forEach(function (p) {
                bout.set(p.s * 3.2 * Math.cos(theta), p.s * 3.2 * Math.sin(theta) + 5.25, 0);
                p.coupe.position.set(bout.x, bout.y - 2.35, 0);
                p.chaines.forEach(function (g, i) {
                    const a = i / 3 * Math.PI * 2 + 0.4, arr = g.attributes.position.array;
                    arr[0] = bout.x; arr[1] = bout.y; arr[2] = 0;
                    arr[3] = bout.x + Math.cos(a) * 1.15; arr[4] = bout.y - 2.3; arr[5] = Math.sin(a) * 1.15;
                    g.attributes.position.needsUpdate = true;
                });
            });
            groupe.rotation.y = Math.sin(t * 0.25) * 0.35 + souris.x * 0.35 + defil * 0.6;
        }
    };
}

const SCENES = { 7: sceneBouclier, 8: sceneConstellation, 9: sceneGlobe, 10: sceneSceau, 11: sceneBalance };

if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const horloge = new THREE.Clock();
    const souris = new THREE.Vector2(), sourisL = new THREE.Vector2(), zero = new THREE.Vector2();
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
        actuelle = SCENES[n](env);
        debut = horloge.getElapsedTime();
        requestAnimationFrame(taille);
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
        const defil = Math.min(1, window.scrollY / Math.max(1, boite.getBoundingClientRect().height + 300));
        actuelle.maj(t, sourisL, defil);
        renderer.render(actuelle.scene, actuelle.camera);
        if (!premiere) { premiere = true; canvas.classList.add('pret'); }
    })();
}
