# Burger photoréaliste pour les maquettes (Blender + Cycles).
# Usage : python burger.py <mode> <variante> [dossier]
#   mode : test | tour | galerie      variante : dani | comptoir
import bpy, bmesh, math, os, sys, random, time
from mathutils import Vector

MODE = sys.argv[1] if len(sys.argv) > 1 else 'test'
VARIANTE = sys.argv[2] if len(sys.argv) > 2 else 'dani'
SORTIE = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sortie')
os.makedirs(SORTIE, exist_ok=True)
DANI = VARIANTE == 'dani'
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.use_denoising = True
sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 8
sc.cycles.caustics_reflective = False
sc.cycles.caustics_refractive = False
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    try: sc.view_settings.look = 'Medium High Contrast'
    except Exception: pass
sc.render.image_settings.file_format = 'JPEG'
sc.render.image_settings.quality = 86
sc.view_settings.exposure = -0.35

# ---------- Outils ----------
def srgb(r, g, b):
    # Les rampes de couleur de Blender sont en linéaire : on convertit les teintes pensées en sRGB.
    return tuple(c ** 2.2 for c in (r, g, b))

def lier(o):
    sc.collection.objects.link(o)
    return o

def noeuds(nom):
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(p.outputs['BSDF'], nt.nodes['Material Output'].inputs['Surface'])
    return m, nt, p

def rampe(nt, couleurs):
    r = nt.nodes.new('ShaderNodeValToRGB')
    el = r.color_ramp.elements
    el[0].position, el[0].color = couleurs[0][0], couleurs[0][1] + (1,)
    el[1].position, el[1].color = couleurs[-1][0], couleurs[-1][1] + (1,)
    for pos, col in couleurs[1:-1]:
        e = el.new(pos); e.color = col + (1,)
    return r

def bruit(nt, echelle, detail=6, rugo=0.55, dist=0.0, coords=None):
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = echelle
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rugo
    n.inputs['Distortion'].default_value = dist
    if coords is not None: nt.links.new(coords, n.inputs['Vector'])
    return n

def relief(nt, p, hauteur, force, distance=0.02):
    b = nt.nodes.new('ShaderNodeBump')
    b.inputs['Strength'].default_value = force
    b.inputs['Distance'].default_value = distance
    nt.links.new(hauteur, b.inputs['Height'])
    nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    nt.links.new(b.outputs['Normal'], p.inputs['Coat Normal'])
    return b

def coords_objet(nt):
    return nt.nodes.new('ShaderNodeTexCoord').outputs['Object']

def hauteur_objet(nt):
    s = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coords_objet(nt), s.inputs['Vector'])
    return s.outputs['Z']

def deplacer(o, type_tex, echelle, force, profondeur=2, milieu=0.5, nom=None):
    t = bpy.data.textures.new(nom or (o.name + type_tex), type=type_tex)
    if hasattr(t, 'noise_scale'): t.noise_scale = echelle
    if hasattr(t, 'noise_depth'): t.noise_depth = profondeur
    m = o.modifiers.new('d' + type_tex, 'DISPLACE')
    m.texture = t; m.strength = force; m.mid_level = milieu; m.texture_coords = 'LOCAL'
    return m

def lisser(o, niveaux=2):
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = niveaux; m.render_levels = niveaux
    for f in o.data.polygons: f.use_smooth = True
    return m

def tourner_profil(nom, profil, pas=96):
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in profil]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=pas, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nom, me)
    for f in me.polygons: f.use_smooth = True
    return lier(o)

plateau = bpy.data.objects.new('plateau', None); lier(plateau)
def sur_plateau(o):
    o.parent = plateau
    return o

# ---------- Matières ----------
def mat_brioche():
    m, nt, p = noeuds('brioche')
    z = hauteur_objet(nt)
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 1.05
    nt.links.new(z, mr.inputs['Value'])
    co = coords_objet(nt)
    taches = bruit(nt, 1.3, 8, 0.66, 0.5, co)
    mix = nt.nodes.new('ShaderNodeMath'); mix.operation = 'MULTIPLY_ADD'
    mix.inputs[1].default_value = 0.5; nt.links.new(taches.outputs['Fac'], mix.inputs[0]); nt.links.new(mr.outputs['Result'], mix.inputs[2])
    mix2 = nt.nodes.new('ShaderNodeMath'); mix2.operation = 'SUBTRACT'; mix2.inputs[1].default_value = 0.25
    nt.links.new(mix.outputs['Value'], mix2.inputs[0])
    if DANI: r = rampe(nt, [(0.0, srgb(0.93, 0.78, 0.55)), (0.1, srgb(0.86, 0.60, 0.30)), (0.28, srgb(0.70, 0.40, 0.14)), (0.6, srgb(0.52, 0.25, 0.07)), (1.0, srgb(0.36, 0.15, 0.04))])
    else: r = rampe(nt, [(0.0, srgb(0.95, 0.82, 0.58)), (0.12, srgb(0.90, 0.66, 0.36)), (0.35, srgb(0.80, 0.52, 0.22)), (0.7, srgb(0.66, 0.38, 0.13)), (1.0, srgb(0.54, 0.28, 0.08))])
    nt.links.new(mix2.outputs['Value'], r.inputs['Fac'])
    nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    rug = nt.nodes.new('ShaderNodeMapRange'); rug.inputs['To Min'].default_value = 0.32; rug.inputs['To Max'].default_value = 0.62
    nt.links.new(bruit(nt, 6, 4, 0.5, 0, co).outputs['Fac'], rug.inputs['Value']); nt.links.new(rug.outputs['Result'], p.inputs['Roughness'])
    p.inputs['Coat Weight'].default_value = 0.4 if DANI else 0.18
    p.inputs['Coat Roughness'].default_value = 0.14
    p.inputs['Subsurface Weight'].default_value = 0.18
    p.inputs['Subsurface Radius'].default_value = (1.0, 0.45, 0.2)
    p.inputs['Subsurface Scale'].default_value = 0.1
    fin = bruit(nt, 260, 3, 0.75, 0, co)
    moyen = bruit(nt, 24, 6, 0.62, 0.2, co)
    h = nt.nodes.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'; h.inputs[1].default_value = 0.6
    nt.links.new(moyen.outputs['Fac'], h.inputs[0]); nt.links.new(fin.outputs['Fac'], h.inputs[2])
    relief(nt, p, h.outputs['Value'], 0.5, 0.035)
    return m

def mat_mie():
    m, nt, p = noeuds('mie')
    v = nt.nodes.new('ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = 38
    n = bruit(nt, 6, 6, 0.6)
    r = rampe(nt, [(0.0, (0.80, 0.62, 0.36)), (0.5, (0.93, 0.82, 0.60)), (1.0, (0.97, 0.90, 0.74))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.85
    p.inputs['Subsurface Weight'].default_value = 0.3; p.inputs['Subsurface Scale'].default_value = 0.05
    relief(nt, p, v.outputs['Distance'], 0.6, 0.03)
    return m

def mat_steak():
    m, nt, p = noeuds('steak')
    co = coords_objet(nt)
    v = nt.nodes.new('ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = 26; nt.links.new(co, v.inputs['Vector'])
    n = bruit(nt, 9, 8, 0.65, 0.4, co)
    g = bruit(nt, 2.2, 4, 0.5, 0.0, co)
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    nt.links.new(n.outputs['Fac'], add.inputs[0]); nt.links.new(g.outputs['Fac'], add.inputs[1])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.5
    nt.links.new(add.outputs['Value'], mul.inputs[0])
    r = rampe(nt, [(0.28, (0.035, 0.018, 0.010)), (0.45, (0.12, 0.05, 0.022)), (0.6, (0.25, 0.11, 0.05)), (0.75, (0.36, 0.17, 0.08))])
    nt.links.new(mul.outputs['Value'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.48
    p.inputs['Coat Weight'].default_value = 0.25; p.inputs['Coat Roughness'].default_value = 0.3
    h = nt.nodes.new('ShaderNodeMath'); h.operation = 'ADD'
    nt.links.new(v.outputs['Distance'], h.inputs[0]); nt.links.new(n.outputs['Fac'], h.inputs[1])
    relief(nt, p, h.outputs['Value'], 0.9, 0.05)
    return m

def mat_fromage():
    m, nt, p = noeuds('fromage')
    n = bruit(nt, 5, 4, 0.5)
    if DANI: r = rampe(nt, [(0.3, srgb(0.90, 0.79, 0.52)), (0.7, srgb(0.95, 0.87, 0.64))])
    else: r = rampe(nt, [(0.3, srgb(0.97, 0.66, 0.16)), (0.7, srgb(0.99, 0.74, 0.24))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.3
    p.inputs['Coat Weight'].default_value = 0.35; p.inputs['Coat Roughness'].default_value = 0.15
    p.inputs['Subsurface Weight'].default_value = 0.6
    p.inputs['Subsurface Radius'].default_value = (1.0, 0.8, 0.5)
    p.inputs['Subsurface Scale'].default_value = 0.12
    relief(nt, p, bruit(nt, 30, 3, 0.5).outputs['Fac'], 0.08, 0.01)
    return m

def mat_oignon():
    m, nt, p = noeuds('oignon')
    n = bruit(nt, 12, 4, 0.5)
    if DANI: r = rampe(nt, [(0.25, srgb(0.50, 0.25, 0.08)), (0.55, srgb(0.70, 0.43, 0.16)), (0.8, srgb(0.82, 0.60, 0.30))])
    else: r = rampe(nt, [(0.3, (0.55, 0.22, 0.42)), (0.7, (0.92, 0.82, 0.88))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.25
    p.inputs['Coat Weight'].default_value = 0.6; p.inputs['Coat Roughness'].default_value = 0.1
    p.inputs['Subsurface Weight'].default_value = 0.5; p.inputs['Subsurface Scale'].default_value = 0.05
    if DANI:
        p.inputs['Subsurface Radius'].default_value = (1.0, 0.55, 0.25)
        p.inputs['Transmission Weight'].default_value = 0.15
    return m

def mat_sauce():
    m, nt, p = noeuds('sauce')
    v = nt.nodes.new('ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = 60
    r = rampe(nt, [(0.0, srgb(0.22, 0.42, 0.12)), (0.14, srgb(0.36, 0.55, 0.18)), (0.2, srgb(0.84, 0.84, 0.64)), (1.0, srgb(0.88, 0.87, 0.70))])
    nt.links.new(v.outputs['Distance'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.2
    p.inputs['Coat Weight'].default_value = 0.5
    p.inputs['Subsurface Weight'].default_value = 0.4; p.inputs['Subsurface Scale'].default_value = 0.05
    return m

def mat_salade():
    m, nt, p = noeuds('salade')
    n = bruit(nt, 8, 5, 0.6)
    r = rampe(nt, [(0.2, (0.20, 0.45, 0.06)), (0.8, (0.62, 0.82, 0.30))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.35
    p.inputs['Subsurface Weight'].default_value = 0.5; p.inputs['Subsurface Scale'].default_value = 0.04
    v = nt.nodes.new('ShaderNodeTexWave'); v.inputs['Scale'].default_value = 14; v.inputs['Distortion'].default_value = 6
    relief(nt, p, v.outputs['Fac'], 0.25, 0.02)
    return m

def mat_tomate():
    m, nt, p = noeuds('tomate')
    n = bruit(nt, 6, 4, 0.5)
    r = rampe(nt, [(0.2, (0.55, 0.04, 0.02)), (0.8, (0.85, 0.15, 0.06))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.15
    p.inputs['Subsurface Weight'].default_value = 0.7; p.inputs['Subsurface Scale'].default_value = 0.1
    return m

def mat_bois():
    m, nt, p = noeuds('bois')
    co = coords_objet(nt)
    w = nt.nodes.new('ShaderNodeTexWave'); w.wave_type = 'RINGS'; w.inputs['Scale'].default_value = 1.4; w.inputs['Distortion'].default_value = 7; w.inputs['Detail'].default_value = 6
    nt.links.new(co, w.inputs['Vector'])
    r = rampe(nt, [(0.0, (0.16, 0.08, 0.035)), (0.5, (0.30, 0.16, 0.07)), (1.0, (0.42, 0.24, 0.11))])
    nt.links.new(w.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.5
    relief(nt, p, bruit(nt, 40, 6, 0.6, 0, co).outputs['Fac'], 0.15, 0.01)
    return m

def mat_simple(nom, couleur, rugo=0.5, emission=0.0):
    m, nt, p = noeuds(nom)
    p.inputs['Base Color'].default_value = couleur + (1,)
    p.inputs['Roughness'].default_value = rugo
    if emission:
        p.inputs['Emission Color'].default_value = couleur + (1,)
        p.inputs['Emission Strength'].default_value = emission
    return m

# Nappe qui suit un bord arrondi puis tombe verticalement ; la longueur des coulures varie
# autour du disque. Les rayons sont dans le repère de la couche.
def nappe(nom, R0, rho, chutes, epaisseur, lissage=2, segments=160, anneaux=40, cercle_seul=False):
    me = bpy.data.meshes.new(nom); bm = bmesh.new()
    L_arc = math.pi * rho / 2
    grille = []
    for k in range(segments):
        a = k / segments * math.tau
        chute = chutes(a)
        s_max = R0 + L_arc + chute
        ligne = []
        for j in range(anneaux + 1):
            s = s_max * j / anneaux
            if s <= R0: rad, z = s, 0.0
            elif s <= R0 + L_arc:
                th = (s - R0) / rho; rad, z = R0 + rho * math.sin(th), -rho * (1 - math.cos(th))
            else: rad, z = R0 + rho + 0.02 * (s - R0 - L_arc), -rho - (s - R0 - L_arc)
            ligne.append(bm.verts.new((math.cos(a) * rad, math.sin(a) * rad, z)))
        grille.append(ligne)
    centre = bm.verts.new((0, 0, 0))
    for k in range(segments):
        l1, l2 = grille[k], grille[(k + 1) % segments]
        bm.faces.new((centre, l1[1], l2[1]))
        for j in range(1, anneaux):
            bm.faces.new((l1[j], l1[j + 1], l2[j + 1], l2[j]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(me); bm.free()
    o = lier(bpy.data.objects.new(nom, me))
    for f in me.polygons: f.use_smooth = True
    sol = o.modifiers.new('ep', 'SOLIDIFY'); sol.thickness = epaisseur; sol.offset = 1
    lisser(o, lissage)
    return o

def coulures(base, pics, force, graine):
    rnd = random.Random(graine)
    centres = [(rnd.uniform(0, math.tau), rnd.uniform(0.6, 1.0) * force, rnd.uniform(0.08, 0.16)) for _ in range(pics)]
    def f(a):
        v = base + 0.02 * math.sin(a * 11 + graine)
        for c, h, lg in centres:
            d = math.atan2(math.sin(a - c), math.cos(a - c))
            v += h * math.exp(-(d / lg) ** 2)
        return v
    return f

# ---------- Décor : table sombre, planche, lumières ----------
table = lier(bpy.data.objects.new('table', bpy.data.meshes.new('table')))
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); bm.to_mesh(table.data); bm.free()
table.data.materials.append(mat_simple('table', (0.035, 0.028, 0.022) if DANI else srgb(0.97, 0.90, 0.72), 0.6))
fond = lier(bpy.data.objects.new('fond', bpy.data.meshes.new('fond')))
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30); bm.to_mesh(fond.data); bm.free()
fond.rotation_euler = (math.radians(90), 0, 0); fond.location = (0, 14, 0)
fond.data.materials.append(mat_simple('fond', (0.02, 0.016, 0.012) if DANI else srgb(0.99, 0.92, 0.70), 0.9))
# Petites lampes floues au loin : le bokeh d'une salle de restaurant.
for i in range(14 if DANI else 0):
    b = lier(bpy.data.objects.new('bokeh%d' % i, bpy.data.meshes.new('bk%d' % i)))
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=random.uniform(0.25, 0.45)); bm.to_mesh(b.data); bm.free()
    b.location = (random.uniform(-12, 12), random.uniform(11, 13.5), random.uniform(1.5, 7))
    b.data.materials.append(mat_simple('bk%d' % i, (1.0, random.uniform(0.55, 0.75), random.uniform(0.25, 0.4)), 0.5, random.uniform(2, 5)))

def mat_ardoise():
    m, nt, p = noeuds('ardoise')
    co = coords_objet(nt)
    n = bruit(nt, 3, 8, 0.6, 0, co)
    r = rampe(nt, [(0.3, (0.035, 0.037, 0.04)), (0.7, (0.075, 0.078, 0.082))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    rug = nt.nodes.new('ShaderNodeMapRange'); rug.inputs['To Min'].default_value = 0.45; rug.inputs['To Max'].default_value = 0.8
    nt.links.new(bruit(nt, 9, 6, 0.6, 0, co).outputs['Fac'], rug.inputs['Value']); nt.links.new(rug.outputs['Result'], p.inputs['Roughness'])
    w = nt.nodes.new('ShaderNodeTexWave'); w.inputs['Scale'].default_value = 3; w.inputs['Distortion'].default_value = 12; w.inputs['Detail'].default_value = 8
    nt.links.new(co, w.inputs['Vector'])
    relief(nt, p, w.outputs['Fac'], 0.25, 0.02)
    return m

def mat_papier():
    m, nt, p = noeuds('papier')
    co = coords_objet(nt)
    v = nt.nodes.new('ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = 5; nt.links.new(co, v.inputs['Vector'])
    gras = bruit(nt, 1.6, 6, 0.6, 0, co)
    r = rampe(nt, [(0.52, (0.93, 0.90, 0.84)), (0.66, (0.80, 0.70, 0.52))])
    nt.links.new(gras.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.72
    p.inputs['Subsurface Weight'].default_value = 0.3; p.inputs['Subsurface Scale'].default_value = 0.02
    p.inputs['Transmission Weight'].default_value = 0.05
    relief(nt, p, v.outputs['Distance'], 0.35, 0.02)
    return m

ard = lier(bpy.data.objects.new('ardoise', bpy.data.meshes.new('ardoise')))
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bm.to_mesh(ard.data); bm.free()
ard.scale = (6.4, 4.4, 0.16); ard.location = (0, 0, 0.08)
bv = ard.modifiers.new('bev', 'BEVEL'); bv.width = 0.04; bv.segments = 3
ard.data.materials.append(mat_ardoise()); sur_plateau(ard)
pap = lier(bpy.data.objects.new('papier', bpy.data.meshes.new('papier')))
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=90, y_segments=90, size=1.75); bm.to_mesh(pap.data); bm.free()
for v in pap.data.vertices:
    x, y = v.co.x, v.co.y
    v.co.z = 0.018 * math.sin(x * 9 + y * 4) * math.sin(y * 7 - x * 3) + 0.05 * max(0, max(abs(x), abs(y)) - 1.35) ** 1.2
pap.rotation_euler.z = math.radians(20); pap.location = (0.1, -0.1, 0.205)
deplacer(pap, 'CLOUDS', 0.25, 0.02, 3)
pap.data.materials.append(mat_papier()); sur_plateau(pap)
for f in pap.data.polygons: f.use_smooth = True

def lumiere(nom, type_l, puissance, couleur, loc, taille=2.0, vise=(0, 0, 1)):
    l = bpy.data.lights.new(nom, type_l); l.energy = puissance; l.color = couleur
    if type_l == 'AREA': l.size = taille
    o = lier(bpy.data.objects.new(nom, l)); o.location = loc
    d = Vector(vise) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o

lumiere('cle', 'AREA', 650, (1.0, 0.86, 0.72), (-5.5, -5.5, 6.5), 4.5)
lumiere('contre', 'AREA', 1100, (1.0, 0.78, 0.5) if DANI else (1.0, 0.85, 0.65), (4.5, 5.0, 4.0), 3.0)
lumiere('appoint', 'AREA', 180, (0.9, 0.92, 1.0), (6.0, -6.0, 2.0), 5.0)
w = bpy.data.worlds.new('monde'); sc.world = w; w.use_nodes = True
env = w.node_tree.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(os.path.dirname(bpy.__file__), '..', '..', '..', 'datafiles', 'studiolights', 'world', 'interior.exr'))
w.node_tree.links.new(env.outputs['Color'], w.node_tree.nodes['Background'].inputs['Color'])
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35 if DANI else 0.7

# Quelques miettes de brioche et d'herbes sur le papier
mm = mat_mie(); mh = mat_simple('herbe', srgb(0.25, 0.42, 0.12), 0.5)
for i in range(26):
    c = lier(bpy.data.objects.new('miette%d' % i, bpy.data.meshes.new('mi%d' % i)))
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1); bm.to_mesh(c.data); bm.free()
    a = random.uniform(0, math.tau); r = random.uniform(1.45, 2.3)
    t = random.uniform(0.012, 0.035); c.scale = (t * random.uniform(0.8, 1.6), t, t * 0.6)
    c.location = (math.cos(a) * r, math.sin(a) * r - 0.1, 0.215); c.rotation_euler.z = random.uniform(0, 3)
    c.data.materials.append(mh if i % 5 == 0 else mm); sur_plateau(c)

# ---------- Le burger, couche par couche ----------
couches = []
def couche(o, z):
    o.location.z = z
    o['z0'] = z
    couches.append(o)
    return sur_plateau(o)

base = 0.2
# Pain du dessous
pd = tourner_profil('pain_dessous', [(0, 0), (1.05, 0), (1.18, 0.04), (1.25, 0.14), (1.26, 0.26), (1.22, 0.36), (1.12, 0.41), (0, 0.41)], 128)
lisser(pd, 2); deplacer(pd, 'CLOUDS', 0.35, 0.05)
pd.data.materials.append(mat_brioche())
couche(pd, base)
mie = tourner_profil('mie', [(0, 0), (1.1, 0), (1.1, 0.012), (0, 0.012)], 96)
mie.data.materials.append(mat_mie()); mie.parent = pd; mie.location = (0, 0, 0.405)
z = base + 0.41

# Sauce (Dani) ou salade et tomate (Comptoir)
if DANI:
    so = nappe('sauce', 1.08, 0.05, coulures(0.02, 6, 0.1, 3), 0.035, 2, 128, 24)
    so.data.materials.append(mat_sauce())
    couche(so, z + 0.005); z += 0.035
else:
    sal = lier(bpy.data.objects.new('salade', bpy.data.meshes.new('salade')))
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=180, radius=1.55)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=3, use_grid_fill=True)
    bm.to_mesh(sal.data); bm.free()
    for v in sal.data.vertices:
        rr = math.hypot(v.co.x, v.co.y); a = math.atan2(v.co.y, v.co.x)
        v.co.z = 0.07 * math.sin(a * 17) * (rr / 1.55) ** 1.4 - 0.12 * max(0, rr - 1.15) ** 2
    lisser(sal, 2); sal.modifiers.new('ep', 'SOLIDIFY').thickness = 0.02
    sal.data.materials.append(mat_salade()); couche(sal, z + 0.03); z += 0.06
    for i, (x, y) in enumerate([(-0.45, -0.1), (0.5, 0.12)]):
        bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.66, depth=0.1, location=(x, y, 0))
        t = bpy.context.active_object; t.name = 'tomate%d' % i
        for f in t.data.polygons: f.use_smooth = True
        t.data.materials.append(mat_tomate()); couche(t, z + 0.05)
    z += 0.1

# Steak haché : cylindre bosselé, bords irréguliers
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=1.34, depth=0.46, location=(0, 0, 0))
st = bpy.context.active_object; st.name = 'steak'
bev = st.modifiers.new('bev', 'BEVEL'); bev.width = 0.12; bev.segments = 5
lisser(st, 3)
deplacer(st, 'CLOUDS', 0.28, 0.14, 3)
deplacer(st, 'VORONOI', 0.06, 0.05, 2)
st.data.materials.append(mat_steak())
couche(st, z + 0.23); z += 0.46

# Fromage fondu : il nappe le steak, épouse son bord et coule en filets irréguliers
if DANI:
    fr = nappe('fromage', 1.18, 0.22, coulures(0.03, 8, 0.4, 11), 0.035, 2, 180, 44)
else:
    # Tranche de cheddar carrée : à plat sur le steak, les quatre coins fondent et retombent.
    fr = lier(bpy.data.objects.new('fromage', bpy.data.meshes.new('fromage')))
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=80, y_segments=80, size=1.36); bm.to_mesh(fr.data); bm.free()
    rnd = random.Random(5)
    ph = [rnd.uniform(0, 6) for _ in range(3)]
    for v in fr.data.vertices:
        x, y = v.co.x, v.co.y
        r = math.hypot(x, y); a = math.atan2(y, x)
        bord = 1.43 + 0.03 * math.sin(a * 7 + ph[0])
        d = max(0.0, r - bord)
        # Au-delà du bord du steak, la tranche se replie vers le bas en s'étirant.
        v.co.z = -min(d * 2.2, 0.55) - 0.4 * max(0.0, d - 0.25) + 0.012 * math.sin(x * 9 + ph[1]) * math.sin(y * 8 + ph[2])
        if d > 0: v.co.x, v.co.y = x * (bord + d * 0.6) / r, y * (bord + d * 0.6) / r
    fr.rotation_euler.z = math.radians(12)
    fr.modifiers.new('ep', 'SOLIDIFY').thickness = 0.028
    lisser(fr, 2)
fr.data.materials.append(mat_fromage())
deplacer(fr, 'CLOUDS', 0.35, 0.012, 2)
couche(fr, z + 0.075); z += 0.13

# Oignons : lamelles caramélisées (Dani) ou rondelles rouges (Comptoir)
mo = mat_oignon()
oignons = bpy.data.objects.new('oignons', None); lier(oignons)
for i in range(60 if DANI else 6):
    cu = bpy.data.curves.new('o%d' % i, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.008 if DANI else 0.03; cu.bevel_resolution = 3
    if DANI: cu.extrude = 0.022
    sp = cu.splines.new('BEZIER')
    n = 5
    sp.bezier_points.add(n - 1)
    rr = random.uniform(0.0, 0.5) if DANI else random.uniform(0.2, 0.7)
    a0 = random.uniform(0, math.tau); arc = random.uniform(1.2, 2.8) if DANI else math.tau * 0.98
    rayon = random.uniform(0.18, 0.35) if DANI else random.uniform(0.3, 0.45)
    cx, cy = math.cos(a0) * rr * 0.8, math.sin(a0) * rr * 0.8
    for k, bp in enumerate(sp.bezier_points):
        a = a0 + arc * k / (n - 1)
        px, py = cx + math.cos(a) * rayon, cy + math.sin(a) * rayon
        bp.co = (px, py, random.uniform(0.0, 0.06))
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    ob = bpy.data.objects.new('oignon%d' % i, cu); lier(ob); ob.parent = oignons
    cu.materials.append(mo)
if DANI:
    # D'autres lamelles débordent du pain et retombent sur le bord du fromage, comme dans
    # une vraie assiette : c'est ce qu'on voit du Lyonnais quand on le regarde de côté.
    def surface(rad):
        if rad <= 1.18: return 0.0
        if rad <= 1.40: return -0.22 * (1 - math.cos(math.asin(min(1.0, (rad - 1.18) / 0.22))))
        return -0.22 - (rad - 1.40) * 3.5
    grappes = [random.uniform(0, math.tau) for _ in range(6)]
    for i in range(42):
        cu = bpy.data.curves.new('ob%d' % i, 'CURVE'); cu.dimensions = '3D'
        cu.bevel_depth = 0.011; cu.bevel_resolution = 3; cu.extrude = random.uniform(0.03, 0.05)
        sp = cu.splines.new('BEZIER'); n = 6; sp.bezier_points.add(n - 1)
        ac = grappes[i % 6] + random.gauss(0, 0.22)
        rc = random.uniform(0.98, 1.16); rayon = random.uniform(0.16, 0.3)
        cx, cy = math.cos(ac) * rc, math.sin(ac) * rc
        a0 = ac + random.uniform(-1.4, 1.4); arc = random.uniform(1.3, 2.4) * random.choice((-1, 1))
        for k, bp in enumerate(sp.bezier_points):
            a = a0 + arc * k / (n - 1)
            px, py = cx + math.cos(a) * rayon, cy + math.sin(a) * rayon
            rad = math.hypot(px, py)
            if rad > 1.40: px, py = px * 1.40 / rad, py * 1.40 / rad; rad = 1.40
            # Lamelles posées à plat (tilt), empilées de façon irrégulière.
            bp.co = (px, py, -0.03 + surface(rad) + random.uniform(0.0, 0.04) + (0.04 if rad > 1.18 else 0.0) + 0.03 * (i // 14))
            bp.tilt = math.pi / 2 + random.uniform(-0.3, 0.3)
            bp.handle_left_type = bp.handle_right_type = 'AUTO'
        ob = bpy.data.objects.new('oignon_bord%d' % i, cu); lier(ob); ob.parent = oignons
        cu.materials.append(mo)
couche(oignons, z + 0.02); z += 0.08

# Pain du dessus : dôme brioché
pdes = tourner_profil('pain_dessus', [(0, 0), (1.18, 0), (1.3, 0.08), (1.34, 0.3), (1.24, 0.62), (0.98, 0.88), (0.55, 1.03), (0, 1.07)], 128)
lisser(pdes, 2); deplacer(pdes, 'CLOUDS', 0.5, 0.07); deplacer(pdes, 'CLOUDS', 1.4, 0.08, 2, 0.5, 'bosses')
pdes.data.materials.append(mat_brioche())
pdes.scale = (1.0, 0.965, 1.0); pdes.rotation_euler = (math.radians(2.5), math.radians(-1.5), 0)
couche(pdes, z)
if not DANI:
    graine = lier(bpy.data.objects.new('graine', bpy.data.meshes.new('graine')))
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1); bm.to_mesh(graine.data); bm.free()
    graine.scale = (0.042, 0.026, 0.016); graine.data.materials.append(mat_simple('sesame', srgb(0.91, 0.80, 0.58), 0.45))
    graine.location = (0, 0, -50)
    ps = pdes.modifiers.new('graines', 'PARTICLE_SYSTEM').particle_system.settings
    ps.type = 'HAIR'; ps.use_advanced_hair = True; ps.count = 300; ps.hair_length = 1; ps.render_type = 'OBJECT'; ps.instance_object = graine
    ps.particle_size = 1; ps.size_random = 0.3; ps.use_rotations = True; ps.rotation_mode = 'NOR'; ps.phase_factor_random = 2
    ps.emit_from = 'FACE'; ps.use_emit_random = True
    pdes.vertex_groups.new(name='haut')
    vg = pdes.vertex_groups['haut']
    vg.add([v.index for v in pdes.data.vertices if v.co.z > 0.45], 1.0, 'REPLACE')
    pdes.particle_systems[0].vertex_group_density = 'haut'
haut_burger = z + 1.07

# Pique et fanion au nom du restaurant
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.018, depth=1.5, location=(0.12, -0.05, 0))
pique = bpy.context.active_object; pique.name = 'pique'
pique.data.materials.append(mat_simple('pique', (0.78, 0.62, 0.42), 0.6)); couche(pique, haut_burger + 0.2)
drap = lier(bpy.data.objects.new('drapeau', bpy.data.meshes.new('drapeau')))
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=24, y_segments=6, size=0.5); bm.to_mesh(drap.data); bm.free()
drap.scale = (1.15, 0.55, 1); drap.rotation_euler = (math.radians(90), 0, math.radians(-8))
for v in drap.data.vertices: v.co.z = 0.04 * math.sin((v.co.x + 0.5) * 7) * (v.co.x + 0.5)
drap.modifiers.new('ep', 'SOLIDIFY').thickness = 0.006
drap.data.materials.append(mat_simple('drapeau', (0.02, 0.018, 0.015) if DANI else (0.85, 0.08, 0.06), 0.6))
couche(drap, haut_burger + 0.72); drap.location.x = 0.12 + 0.575; drap.location.y = -0.05
txt = bpy.data.curves.new('nom', 'FONT'); txt.body = 'Chez Dani' if DANI else 'LE COMPTOIR'
txt.align_x = 'CENTER'; txt.align_y = 'CENTER'; txt.size = 0.2 if DANI else 0.15; txt.extrude = 0.004
to = bpy.data.objects.new('nom', txt); lier(to)
to.data.materials.append(mat_simple('or', (0.83, 0.66, 0.24), 0.3) if DANI else mat_simple('blanc', (0.95, 0.95, 0.93), 0.5))
to.rotation_euler = (math.radians(90), 0, math.radians(-8)); to.parent = plateau
to.location = (0.12 + 0.575, -0.05 - 0.02, haut_burger + 0.72); to['z0'] = to.location.z; couches.append(to)
for o in (drap, to): o['z0'] = o.location.z

# ---------- Caméra ----------
cible = bpy.data.objects.new('cible', None); lier(cible); cible.location = (0, 0, 1.25)
cam = lier(bpy.data.objects.new('camera', bpy.data.cameras.new('camera')))
sc.camera = cam
tc = cam.constraints.new('TRACK_TO'); tc.target = cible; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
cam.data.dof.use_dof = True; cam.data.dof.focus_object = cible

net = bpy.data.objects.new('net', None); lier(net)
def cadrer(loc, vise, focale=70, ouverture=2.8, mise_au_point=None, net_sur=None):
    cam.location = loc; cible.location = vise
    cam.data.lens = focale; cam.data.dof.aperture_fstop = max(0.1, ouverture / 20)
    if mise_au_point is not None:
        cam.data.dof.focus_object = None; cam.data.dof.focus_distance = mise_au_point
    else:
        # Par défaut, le net est sur l'avant du burger, comme en photo culinaire.
        v = Vector(vise); d = (Vector(loc) - v); d.z = 0
        net.location = net_sur if net_sur else (v + d.normalized() * 1.15 if d.length > 0.3 else v)
        cam.data.dof.focus_object = net

def eclater(k):
    for i, o in enumerate(couches):
        o.location.z = o['z0'] + k * 0.42 * i

def rendre(nom, l, h, echantillons):
    if os.environ.get('REPRISE') and os.path.exists(os.path.join(SORTIE, nom)): return
    sc.render.resolution_x, sc.render.resolution_y = l, h
    sc.cycles.samples = echantillons
    sc.render.filepath = os.path.join(SORTIE, nom)
    t = time.time(); bpy.ops.render.render(write_still=True); print('rendu', nom, round(time.time() - t, 1), 's', flush=True)

if MODE == 'test':
    cadrer((3.6, -10.0, 2.4), (0, 0, 1.25), 75, float(os.environ.get('FSTOP', '3.5')))
    plateau.rotation_euler.z = math.radians(-20)
    rendre('test_%s.jpg' % VARIANTE, 960, 720, 48)
elif MODE == 'tour':
    n = int(os.environ.get('IMAGES', '48'))
    cadrer((0, -11.4, 2.6), (0, 0, 1.3), 75, 4.0)
    for k in range(n):
        plateau.rotation_euler.z = math.tau * k / n
        rendre('tour_%02d.jpg' % k, int(os.environ.get('LARGEUR', '1200')), int(os.environ.get('HAUTEUR', '1000')), int(os.environ.get('ECH', '40')))
elif MODE == 'galerie':
    vues = [
        ('hero', (3.6, -10.0, 2.4), (0, 0, 1.3), 70, 3.5, -20, 0),
        ('photo_0', (5.2, -9.2, 3.2), (0, 0, 1.2), 70, 2.8, -20, 0),
        ('photo_1', (1.8, -5.0, 2.3), (0.2, -0.6, 1.4), 100, 2.0, 15, 0),
        ('photo_2', (6.5, -9.5, 4.5), (0, 0, 2.2), 60, 4.0, -35, 1),
        ('photo_3', (0.01, -0.6, 11), (0, 0, 1), 50, 5.6, 0, 0),
        ('photo_4', (2.2, -3.8, 1.35), (0.5, -1.0, 1.05), 105, 1.8, 30, 0),
        ('photo_5', (0, -8.5, 0.9), (0, 0, 1.3), 60, 2.8, 10, 0),
        ('photo_6', (1.6, -4.2, 3.9), (0.4, -0.05, 3.2), 100, 2.2, -10, 0),
        ('photo_7', (-6.5, -8, 5), (0, 0, 0.9), 45, 4.0, 60, 0),
    ]
    choix = os.environ.get('VUES')
    for nom, loc, vise, focale, f, rot, ecl in vues:
        if choix and nom not in choix.split(','): continue
        eclater(ecl); plateau.rotation_euler.z = math.radians(rot)
        cadrer(loc, vise, focale, f)
        rendre(nom + '.jpg', int(os.environ.get('LARGEUR', '1200')), int(os.environ.get('HAUTEUR', '900')), int(os.environ.get('ECH', '64')))
    eclater(0)
