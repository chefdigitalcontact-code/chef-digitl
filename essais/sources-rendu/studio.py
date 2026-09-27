# Studio photo commun (Blender + Cycles) : réglages de rendu, matières utiles, décor sombre,
# lumières, appareil photo avec vrai flou de profondeur, rendu d'un tour complet et de la galerie.
# Échelle : 1 unité = 5 cm (un burger fait environ 2,6 unités de large).
import bpy, bmesh, math, os, sys, random, time
from mathutils import Vector

MODE = sys.argv[1] if len(sys.argv) > 1 else 'test'
SORTIE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sortie')
os.makedirs(SORTIE, exist_ok=True)
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.use_denoising = True
sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 10
sc.cycles.transmission_bounces = 12
sc.cycles.caustics_reflective = False
sc.cycles.caustics_refractive = False
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.view_settings.exposure = -0.35
sc.render.image_settings.file_format = 'JPEG'
sc.render.image_settings.quality = 86
if os.environ.get('FILS'):
    sc.render.threads_mode = 'FIXED'; sc.render.threads = int(os.environ['FILS'])

def srgb(r, g, b):
    return tuple(c ** 2.2 for c in (r, g, b))

def lier(o):
    sc.collection.objects.link(o)
    return o

def noeuds(nom):
    m = bpy.data.materials.new(nom); m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(p.outputs['BSDF'], nt.nodes['Material Output'].inputs['Surface'])
    return m, nt, p

def rampe(nt, couleurs):
    r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
    el[0].position, el[0].color = couleurs[0][0], couleurs[0][1] + (1,)
    el[1].position, el[1].color = couleurs[-1][0], couleurs[-1][1] + (1,)
    for pos, col in couleurs[1:-1]:
        e = el.new(pos); e.color = col + (1,)
    return r

def bruit(nt, echelle, detail=6, rugo=0.55, dist=0.0, coords=None):
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = echelle; n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rugo; n.inputs['Distortion'].default_value = dist
    if coords is not None: nt.links.new(coords, n.inputs['Vector'])
    return n

def voronoi(nt, echelle, coords=None):
    v = nt.nodes.new('ShaderNodeTexVoronoi'); v.inputs['Scale'].default_value = echelle
    if coords is not None: nt.links.new(coords, v.inputs['Vector'])
    return v

def relief(nt, p, hauteur, force, distance=0.02, vernis=True):
    b = nt.nodes.new('ShaderNodeBump')
    b.inputs['Strength'].default_value = force; b.inputs['Distance'].default_value = distance
    nt.links.new(hauteur, b.inputs['Height'])
    nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    if vernis: nt.links.new(b.outputs['Normal'], p.inputs['Coat Normal'])
    return b

def coords_objet(nt):
    return nt.nodes.new('ShaderNodeTexCoord').outputs['Object']

def composante(nt, axe):
    s = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(coords_objet(nt), s.inputs['Vector'])
    return s.outputs[axe]

def rayon_objet(nt):
    # Distance à l'axe vertical de l'objet (utile pour les objets ronds).
    s = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(coords_objet(nt), s.inputs['Vector'])
    c = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(s.outputs['X'], c.inputs['X']); nt.links.new(s.outputs['Y'], c.inputs['Y'])
    l = nt.nodes.new('ShaderNodeVectorMath'); l.operation = 'LENGTH'; nt.links.new(c.outputs['Vector'], l.inputs[0])
    return l.outputs['Value']

def math_noeud(nt, op, a, b=None, v1=None):
    m = nt.nodes.new('ShaderNodeMath'); m.operation = op
    if hasattr(a, 'is_linked') or hasattr(a, 'node'): nt.links.new(a, m.inputs[0])
    else: m.inputs[0].default_value = a
    if b is not None:
        if hasattr(b, 'node'): nt.links.new(b, m.inputs[1])
        else: m.inputs[1].default_value = b
    return m.outputs['Value']

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

def maillage(nom, construire):
    me = bpy.data.meshes.new(nom); bm = bmesh.new(); construire(bm); bm.to_mesh(me); bm.free()
    o = lier(bpy.data.objects.new(nom, me))
    for f in me.polygons: f.use_smooth = True
    return o

def tourner_profil(nom, profil, pas=96):
    def c(bm):
        verts = [bm.verts.new((r, 0, z)) for r, z in profil]
        edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
        bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=pas, use_merge=True)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        # Normales vers l'extérieur : indispensable pour le verre, les liquides et la diffusion sous la surface.
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return maillage(nom, c)

def mat_simple(nom, couleur, rugo=0.5, emission=0.0, sss=0.0):
    m, nt, p = noeuds(nom)
    p.inputs['Base Color'].default_value = couleur + (1,)
    p.inputs['Roughness'].default_value = rugo
    if sss: p.inputs['Subsurface Weight'].default_value = sss; p.inputs['Subsurface Scale'].default_value = 0.05
    if emission:
        p.inputs['Emission Color'].default_value = couleur + (1,); p.inputs['Emission Strength'].default_value = emission
    return m

def ombre_transparente(m):
    # Sans caustiques, Cycles traite le verre comme opaque pour la lumière directe : ce qui est
    # dedans (mousse, glaçons, gouttes) resterait noir. Les rayons d'ombre traversent donc le verre.
    nt = m.node_tree; sortie = nt.nodes['Material Output']
    lien = sortie.inputs['Surface'].links[0]; src = lien.from_socket
    lp = nt.nodes.new('ShaderNodeLightPath'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Shadow Ray'], mx.inputs['Fac'])
    nt.links.new(src, mx.inputs[1]); nt.links.new(tr.outputs['BSDF'], mx.inputs[2])
    nt.links.new(mx.outputs['Shader'], sortie.inputs['Surface'])
    return m

def mat_verre(nom='verre', teinte=(1, 1, 1), rugo=0.02):
    m, nt, p = noeuds(nom)
    p.inputs['Base Color'].default_value = teinte + (1,)
    p.inputs['Roughness'].default_value = rugo
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['IOR'].default_value = 1.5
    return ombre_transparente(m)

def mat_liquide(nom, couleur, densite=1.0, ior=1.34, rugo=0.02):
    # Liquide transparent teinté dans la masse (absorption en volume).
    m, nt, p = noeuds(nom)
    p.inputs['Base Color'].default_value = (1, 1, 1, 1)
    p.inputs['Roughness'].default_value = rugo
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['IOR'].default_value = ior
    v = nt.nodes.new('ShaderNodeVolumeAbsorption')
    v.inputs['Color'].default_value = couleur + (1,); v.inputs['Density'].default_value = densite
    nt.links.new(v.outputs['Volume'], nt.nodes['Material Output'].inputs['Volume'])
    return ombre_transparente(m)

plateau = bpy.data.objects.new('plateau', None); lier(plateau)
def sur_plateau(o):
    o.parent = plateau
    return o

def lumiere(nom, type_l, puissance, couleur, loc, taille=2.0, vise=(0, 0, 1)):
    l = bpy.data.lights.new(nom, type_l); l.energy = puissance; l.color = couleur
    if type_l == 'AREA': l.size = taille
    o = lier(bpy.data.objects.new(nom, l)); o.location = loc
    d = Vector(vise) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o

def decor(table_couleur=(0.035, 0.028, 0.022), fond_couleur=(0.02, 0.016, 0.012), bokeh=((1.0, 0.65, 0.32),), nb_bokeh=14, hdri='interior.exr', hdri_force=0.35):
    t = maillage('table', lambda bm: bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40))
    t.data.materials.append(mat_simple('table', table_couleur, 0.6))
    f = maillage('fond', lambda bm: bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40))
    f.rotation_euler = (math.radians(90), 0, 0); f.location = (0, 16, 0)
    f.data.materials.append(mat_simple('fond', fond_couleur, 0.9))
    rnd = random.Random(3)
    for i in range(nb_bokeh):
        b = maillage('bokeh%d' % i, lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rnd.uniform(0.25, 0.45)))
        b.location = (rnd.uniform(-13, 13), rnd.uniform(12, 15), rnd.uniform(1.5, 7.5))
        c = bokeh[i % len(bokeh)]
        b.data.materials.append(mat_simple('bk%d' % i, c, 0.5, rnd.uniform(2, 5)))
    w = bpy.data.worlds.new('monde'); sc.world = w; w.use_nodes = True
    env = w.node_tree.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(os.path.dirname(bpy.__file__), '..', '..', '..', 'datafiles', 'studiolights', 'world', hdri))
    w.node_tree.links.new(env.outputs['Color'], w.node_tree.nodes['Background'].inputs['Color'])
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = hdri_force

cible = bpy.data.objects.new('cible', None); lier(cible)
net = bpy.data.objects.new('net', None); lier(net)
cam = lier(bpy.data.objects.new('camera', bpy.data.cameras.new('camera')))
sc.camera = cam
tc = cam.constraints.new('TRACK_TO'); tc.target = cible; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
cam.data.dof.use_dof = True

# Distance entre le point visé et le plan net, vers l'appareil (réglable par scène).
REGLAGES = {'avance': 1.15}

def cadrer(loc, vise, focale=70, ouverture=2.8, net_sur=None, avance=None):
    if avance is None: avance = REGLAGES['avance']
    cam.location = loc; cible.location = vise
    cam.data.lens = focale
    # La scène est environ 20 fois plus grande qu'en vrai : on divise l'ouverture d'autant.
    cam.data.dof.aperture_fstop = max(0.1, ouverture / 20)
    v = Vector(vise); d = (Vector(loc) - v); d.z = 0
    net.location = net_sur if net_sur else (v + d.normalized() * avance if d.length > 0.3 else v)
    cam.data.dof.focus_object = net

def rendre(nom, l, h, echantillons):
    if os.environ.get('REPRISE') and os.path.exists(os.path.join(SORTIE, nom)): return
    sc.render.resolution_x, sc.render.resolution_y = l, h
    sc.cycles.samples = echantillons
    sc.render.filepath = os.path.join(SORTIE, nom)
    t = time.time(); bpy.ops.render.render(write_still=True); print('rendu', nom, round(time.time() - t, 1), 's', flush=True)

def executer(test, tour, vues, avant_vue=None):
    """test : (loc, vise, focale, f, rotation) ; tour : (loc, vise, focale, f) ; vues : liste de
    (nom, loc, vise, focale, f, rotation, parametre)."""
    L = int(os.environ.get('LARGEUR', '960')); H = int(os.environ.get('HAUTEUR', '720')); E = int(os.environ.get('ECH', '48'))
    if MODE == 'test':
        loc, vise, focale, f, rot = test
        cadrer(loc, vise, focale, f); plateau.rotation_euler.z = math.radians(rot)
        rendre('test.jpg', L, H, E)
    elif MODE == 'tour':
        n = int(os.environ.get('IMAGES', '36'))
        loc, vise, focale, f = tour
        cadrer(loc, vise, focale, f)
        for k in range(n):
            plateau.rotation_euler.z = math.tau * k / n
            rendre('tour_%02d.jpg' % k, L, H, E)
    elif MODE == 'galerie':
        choix = os.environ.get('VUES')
        for nom, loc, vise, focale, f, rot, param in vues:
            if choix and nom not in choix.split(','): continue
            if avant_vue: avant_vue(param)
            plateau.rotation_euler.z = math.radians(rot)
            cadrer(loc, vise, focale, f)
            rendre(nom + '.jpg', L, H, E)
