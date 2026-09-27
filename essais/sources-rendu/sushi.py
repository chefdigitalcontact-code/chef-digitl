# Plateau de sushis photoréaliste (Blender + Cycles). Usage : python sushi.py <test|galerie> [dossier]
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import *

decor(table_couleur=(0.02, 0.018, 0.017), fond_couleur=(0.012, 0.01, 0.01), bokeh=((1.0, 0.55, 0.6), (1.0, 0.75, 0.55)), nb_bokeh=10, hdri='studio.exr', hdri_force=0.35)
lumiere('cle', 'AREA', 650, (1.0, 0.93, 0.86), (-5, -5, 7), 5)
lumiere('contre', 'AREA', 1100, (1.0, 0.8, 0.8), (4, 6, 6.2), 1.6)
lumiere('appoint', 'AREA', 150, (0.85, 0.9, 1.0), (7, -5, 2.5), 6)

# ---- Ardoise ----
def mat_ardoise():
    m, nt, p = noeuds('ardoise')
    co = coords_objet(nt)
    n = bruit(nt, 3, 8, 0.6, 0, co)
    r = rampe(nt, [(0.3, srgb(0.10, 0.10, 0.11)), (0.7, srgb(0.17, 0.17, 0.18))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    rug = nt.nodes.new('ShaderNodeMapRange'); rug.inputs['To Min'].default_value = 0.45; rug.inputs['To Max'].default_value = 0.8
    nt.links.new(bruit(nt, 9, 6, 0.6, 0, co).outputs['Fac'], rug.inputs['Value']); nt.links.new(rug.outputs['Result'], p.inputs['Roughness'])
    w = nt.nodes.new('ShaderNodeTexWave'); w.inputs['Scale'].default_value = 2; w.inputs['Distortion'].default_value = 12; w.inputs['Detail'].default_value = 8
    nt.links.new(co, w.inputs['Vector'])
    relief(nt, p, w.outputs['Fac'], 0.3, 0.02, False)
    return m

ard = maillage('ardoise', lambda bm: bmesh.ops.create_cube(bm, size=1))
ard.scale = (8.4, 4.4, 0.18); ard.location = (0, 0, 0.09)
bv = ard.modifiers.new('bev', 'BEVEL'); bv.width = 0.05; bv.segments = 3
ard.data.materials.append(mat_ardoise()); sur_plateau(ard)
Z0 = 0.18

# ---- Riz : des grains instanciés sur une forme ----
def mat_riz():
    m, nt, p = noeuds('riz')
    p.inputs['Base Color'].default_value = srgb(0.96, 0.95, 0.91) + (1,)
    p.inputs['Roughness'].default_value = 0.32
    p.inputs['Subsurface Weight'].default_value = 0.8; p.inputs['Subsurface Radius'].default_value = (1, 0.95, 0.85); p.inputs['Subsurface Scale'].default_value = 0.04
    p.inputs['Coat Weight'].default_value = 0.2; p.inputs['Coat Roughness'].default_value = 0.2
    return m
mriz = mat_riz()
grain = maillage('grain', lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1))
grain.scale = (0.075, 0.034, 0.03); grain.location = (0, 0, -50); grain.data.materials.append(mriz)

def riz(nom, forme, nombre, graine):
    # forme : objet maillage (caché au rendu) qui porte les grains
    ps = forme.modifiers.new('grains', 'PARTICLE_SYSTEM').particle_system
    ps.seed = graine
    st = ps.settings
    st.type = 'EMITTER'; st.count = nombre; st.frame_start = 1; st.frame_end = 1; st.lifetime = 10000
    st.emit_from = 'FACE'; st.use_emit_random = True; st.distribution = 'RAND'
    st.physics_type = 'NO'; st.render_type = 'OBJECT'; st.instance_object = grain
    st.particle_size = 1.0; st.size_random = 0.25
    st.use_rotations = True; st.rotation_mode = 'NOR'; st.phase_factor_random = 2.0; st.rotation_factor_random = 0.25
    forme.data.materials.append(mriz)
    return forme

# ---- Poisson : tranche drapée sur le riz, gras en veines, translucide ----
def mat_poisson(nom, base, veines, densite, rugo=0.22, vernis=0.45, pos=(0.72, 0.9)):
    m, nt, p = noeuds(nom)
    co = coords_objet(nt)
    w = nt.nodes.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.bands_direction = 'DIAGONAL'; w.wave_profile = 'SAW'
    w.inputs['Scale'].default_value = densite; w.inputs['Distortion'].default_value = 6; w.inputs['Detail'].default_value = 4
    w.inputs['Detail Scale'].default_value = 1.5
    nt.links.new(co, w.inputs['Vector'])
    # Le gras n'a pas partout la même netteté : un bruit lent module les veines.
    mod = bruit(nt, 1.8, 3, 0.5, 0, co)
    fac = nt.nodes.new('ShaderNodeMath'); fac.operation = 'MULTIPLY_ADD'
    nt.links.new(mod.outputs['Fac'], fac.inputs[0]); fac.inputs[1].default_value = 0.35
    nt.links.new(w.outputs['Fac'], fac.inputs[2])
    r = rampe(nt, [(0.0, base[0]), (pos[0], base[1]), (pos[1], veines), (1.0, veines)])
    nt.links.new(fac.outputs['Value'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rugo
    p.inputs['Coat Weight'].default_value = vernis; p.inputs['Coat Roughness'].default_value = 0.12
    p.inputs['Subsurface Weight'].default_value = 0.85; p.inputs['Subsurface Radius'].default_value = (1, 0.45, 0.3); p.inputs['Subsurface Scale'].default_value = 0.12
    relief(nt, p, w.outputs['Fac'], 0.12, 0.01)
    return m
msaumon = mat_poisson('saumon', (srgb(0.93, 0.42, 0.22), srgb(0.98, 0.53, 0.30)), srgb(0.98, 0.84, 0.74), 2.6, 0.26, 0.35, (0.8, 1.02))
mthon = mat_poisson('thon', (srgb(0.38, 0.045, 0.06), srgb(0.50, 0.085, 0.095)), srgb(0.56, 0.17, 0.17), 1.6, 0.4, 0.1, (0.86, 1.15))

def tranche(nom, mat):
    def c(bm):
        nx, ny = 30, 12
        L, l, e = 2.3, 0.95, 0.13
        g = [[None] * (ny + 1) for _ in range(nx + 1)]
        for i in range(nx + 1):
            for j in range(ny + 1):
                x = (i / nx - 0.5) * L; y = (j / ny - 0.5) * l
                g[i][j] = (x, y)
        verts_h, verts_b = {}, {}
        for i in range(nx + 1):
            for j in range(ny + 1):
                x, y = g[i][j]
                chute = 0.42 * (x / (L / 2)) ** 2 + 0.12 * (y / (l / 2)) ** 2
                bord = 1 - 0.35 * abs(y / (l / 2)) ** 4
                verts_h[i, j] = bm.verts.new((x, y * (1 - 0.1 * (x / (L / 2)) ** 2), -chute + e * bord))
                verts_b[i, j] = bm.verts.new((x, y * (1 - 0.1 * (x / (L / 2)) ** 2), -chute))
        for i in range(nx):
            for j in range(ny):
                bm.faces.new((verts_h[i, j], verts_h[i + 1, j], verts_h[i + 1, j + 1], verts_h[i, j + 1]))
                bm.faces.new((verts_b[i, j], verts_b[i, j + 1], verts_b[i + 1, j + 1], verts_b[i + 1, j]))
        for i in range(nx):
            for j in (0, ny):
                a, b = (verts_h[i, j], verts_h[i + 1, j]), (verts_b[i, j], verts_b[i + 1, j])
                bm.faces.new((a[0], b[0], b[1], a[1]) if j == 0 else (a[0], a[1], b[1], b[0]))
        for j in range(ny):
            for i in (0, nx):
                a, b = (verts_h[i, j], verts_h[i, j + 1]), (verts_b[i, j], verts_b[i, j + 1])
                bm.faces.new((a[0], a[1], b[1], b[0]) if i == 0 else (a[0], b[0], b[1], a[1]))
    o = maillage(nom, c)
    lisser(o, 2)
    o.data.materials.append(mat)
    return o

def nigiri(nom, x, y, rot, mat, graine):
    groupe = bpy.data.objects.new(nom, None); lier(groupe); sur_plateau(groupe)
    groupe.location = (x, y, Z0); groupe.rotation_euler.z = math.radians(rot)
    coeur = maillage(nom + '_coeur', lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1))
    coeur.scale = (1.0, 0.48, 0.34); coeur.location = (0, 0, 0.28); coeur.parent = groupe
    coeur.data.materials.append(mriz)
    forme = maillage(nom + '_forme', lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1))
    forme.scale = (1.04, 0.52, 0.38); forme.location = (0, 0, 0.28); forme.parent = groupe
    forme.hide_render = False
    riz(nom + '_riz', forme, 700, graine)
    forme.show_instancer_for_render = False
    t = tranche(nom + '_poisson', mat); t.parent = groupe; t.location = (0, 0, 0.62)
    return groupe

nigiri('nigiri1', -2.4, 0.55, 8, msaumon, 1)
nigiri('nigiri2', -0.2, 0.7, -6, mthon, 2)
nigiri('nigiri3', 1.9, 0.6, 4, msaumon, 3)

# ---- Makis ----
def mat_nori():
    m, nt, p = noeuds('nori')
    co = coords_objet(nt)
    n = bruit(nt, 25, 8, 0.7, 0.5, co)
    fibres = nt.nodes.new('ShaderNodeMapping'); fibres.inputs['Scale'].default_value = (1.0, 1.0, 9.0)
    nt.links.new(co, fibres.inputs['Vector'])
    f = bruit(nt, 40, 6, 0.7, 1.5, fibres.outputs['Vector'])
    r = rampe(nt, [(0.25, srgb(0.03, 0.04, 0.03)), (0.55, srgb(0.06, 0.08, 0.055)), (0.8, srgb(0.10, 0.12, 0.08))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    rug = nt.nodes.new('ShaderNodeMapRange'); rug.inputs['To Min'].default_value = 0.35; rug.inputs['To Max'].default_value = 0.7
    nt.links.new(f.outputs['Fac'], rug.inputs['Value']); nt.links.new(rug.outputs['Result'], p.inputs['Roughness'])
    p.inputs['Sheen Weight'].default_value = 0.12; p.inputs['Sheen Tint'].default_value = (0.4, 0.55, 0.4, 1)
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    nt.links.new(n.outputs['Fac'], add.inputs[0]); nt.links.new(f.outputs['Fac'], add.inputs[1])
    relief(nt, p, add.outputs['Value'], 0.5, 0.012, False)
    return m
mnori = mat_nori(); mavocat = mat_simple('avocat', srgb(0.55, 0.68, 0.24), 0.4, sss=0.4)
for i, (x, y) in enumerate([(-2.3, -1.2), (-1.1, -1.25), (0.1, -1.2)]):
    g = bpy.data.objects.new('maki%d' % i, None); lier(g); sur_plateau(g); g.location = (x, y, Z0); g.rotation_euler.z = random.uniform(0, 3)
    n = tourner_profil('nori%d' % i, [(0.515, 0.0), (0.52, 0.2), (0.522, 0.4), (0.515, 0.605)], 96)
    for v in n.data.vertices: v.co.z = min(v.co.z, 0.605)
    n.parent = g
    ep = n.modifiers.new('ep', 'SOLIDIFY'); ep.thickness = 0.018; ep.offset = 1
    deplacer(n, 'CLOUDS', 0.2, 0.02)
    n.data.materials.append(mnori)
    # dessus de riz, garni de saumon et d'avocat
    disque = tourner_profil('dessus%d' % i, [(0.2, 0.0), (0.3, 0.012), (0.4, 0.008), (0.49, -0.01)], 48)
    disque.location = (0, 0, 0.6); disque.parent = g
    riz('riz%d' % i, disque, 360, 10 + i); disque.show_instancer_for_render = False
    corps = maillage('corps%d' % i, lambda bm: bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=0.49, radius2=0.49, depth=0.58))
    corps.location = (0, 0, 0.31); corps.parent = g; corps.data.materials.append(mriz)
    for k, (dx, dy, sx, sy, mat) in enumerate([(-0.06, 0.0, 0.24, 0.32, msaumon), (0.13, 0.02, 0.13, 0.28, mavocat)]):
        c = maillage('garni%d%d' % (i, k), lambda bm: bmesh.ops.create_cube(bm, size=1))
        c.scale = (sx, sy, 0.1); c.location = (dx, dy, 0.565); c.parent = g
        bv_ = c.modifiers.new('bev', 'BEVEL'); bv_.width = 0.03; bv_.segments = 3
        c.data.materials.append(mat)

# ---- Coupelle de soja, wasabi, gingembre ----
coupelle = tourner_profil('coupelle', [(0, 0), (0.55, 0), (0.62, 0.04), (0.74, 0.22), (0.78, 0.26), (0.74, 0.27), (0.66, 0.11), (0, 0.08)], 72)
lisser(coupelle, 2); coupelle.data.materials.append(mat_simple('porcelaine', srgb(0.95, 0.94, 0.92), 0.12))
coupelle.location = (3.3, -0.8, Z0); sur_plateau(coupelle)
soja = maillage('soja', lambda bm: bmesh.ops.create_circle(bm, cap_ends=True, segments=64, radius=0.66))
soja.location = (3.3, -0.8, Z0 + 0.17); soja.data.materials.append(mat_simple('soja', srgb(0.10, 0.04, 0.015), 0.12)); sur_plateau(soja)
wasabi = maillage('wasabi', lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=4, radius=0.28))
for v in wasabi.data.vertices:
    rad = math.hypot(v.co.x, v.co.y)
    if v.co.z > 0: v.co.z *= 1 + 0.9 * math.exp(-(rad / 0.13) ** 2)
    else: v.co.z *= 0.3
wasabi.scale = (1.15, 1.0, 0.8); wasabi.location = (1.3, -1.05, Z0 + 0.06)
deplacer(wasabi, 'CLOUDS', 0.1, 0.07, 3); deplacer(wasabi, 'VORONOI', 0.05, 0.04, 2)
mwas = mat_simple('wasabi', srgb(0.62, 0.70, 0.32), 0.7, sss=0.2)
mwn = mwas.node_tree; relief(mwn, mwn.nodes['Principled BSDF'], bruit(mwn, 40, 6, 0.7).outputs['Fac'], 0.6, 0.01, False)
wasabi.data.materials.append(mwas); sur_plateau(wasabi)
mging = mat_simple('gingembre', srgb(0.92, 0.64, 0.57), 0.25, sss=0.9)
mging.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = 0.3
for k in range(5):
    s_ = maillage('gingembre%d' % k, lambda bm: bmesh.ops.create_circle(bm, cap_ends=True, segments=40, radius=0.3))
    for v in s_.data.vertices: v.co.z = 0.08 * (v.co.x ** 2 + v.co.y ** 2) * 4 + 0.03 * math.sin(v.co.x * 12)
    s_.scale = (1.4, 1.0, 1); s_.modifiers.new('ep', 'SOLIDIFY').thickness = 0.01; lisser(s_, 2)
    s_.location = (2.05 + 0.1 * k, -1.55 + 0.06 * k, Z0 + 0.05 + 0.03 * k); s_.rotation_euler = (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(0, 3))
    s_.data.materials.append(mging); sur_plateau(s_)

# ---- Baguettes laquées et pétales de cerisier ----
mlaque = mat_simple('laque', srgb(0.06, 0.03, 0.02), 0.18)
mlaque.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value = 1.0
for k, dy in enumerate((-0.07, 0.07)):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.055, radius2=0.03, depth=5.2, location=(0, 0, 0))
    b = bpy.context.active_object; b.name = 'baguette%d' % k
    b.rotation_euler = (0, math.radians(90), math.radians(-12)); b.location = (0.6, 1.85 + dy, Z0 + 0.09)
    b.data.materials.append(mlaque); sur_plateau(b)
repose = maillage('repose', lambda bm: bmesh.ops.create_cube(bm, size=1)); repose.scale = (0.25, 0.5, 0.12)
repose.location = (2.55, 1.35, Z0 + 0.06); bv3 = repose.modifiers.new('bev', 'BEVEL'); bv3.width = 0.04; bv3.segments = 3
repose.data.materials.append(mat_simple('repose', srgb(0.62, 0.1, 0.1), 0.3)); sur_plateau(repose)
mpet = mat_simple('petale', srgb(0.97, 0.68, 0.77), 0.4, sss=0.9)
mpet.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = 0.25
def petale(bm):
    pts = []
    for k in range(24):
        a = k / 24 * math.tau
        r = 0.24 * (1 - 0.2 * math.cos(a)) * (1 - 0.35 * math.exp(-((a - math.pi / 2) / 0.25) ** 2))
        pts.append(bm.verts.new((math.cos(a) * r * 0.8, math.sin(a) * r, 0)))
    bm.faces.new(pts)
for k in range(5):
    p_ = maillage('petale%d' % k, petale)
    bmesh_ = None
    for v in p_.data.vertices: v.co.z = 0.1 * (v.co.x ** 2 + v.co.y ** 2) * 3
    p_.modifiers.new('ep', 'SOLIDIFY').thickness = 0.006; lisser(p_, 2)
    a = random.uniform(0, math.tau)
    p_.location = (random.uniform(-3.8, 3.8), random.uniform(-2, 2), Z0 + 0.02); p_.rotation_euler = (random.uniform(-0.2, 0.2), random.uniform(-0.2, 0.2), a)
    p_.data.materials.append(mpet); sur_plateau(p_)

executer(
    test=((0, -10.5, 5.6), (0, 0, 0.6), 60, 3.5, 0),
    tour=((0, -10.5, 5.6), (0, 0, 0.6), 60, 4.0),
    vues=[
        ('hero', (2.5, -10.5, 5.2), (0.2, 0, 0.5), 55, 3.2, 0, None),
        ('photo_0', (5.5, -8.5, 5.0), (0, 0, 0.5), 60, 3.2, 8, None),
        ('photo_1', (-1.2, -3.8, 1.8), (-2.2, 0.5, 0.7), 100, 2.0, 0, None),
        ('photo_2', (0.01, -0.2, 13), (0, 0, 0), 45, 5.6, 0, None),
        ('photo_3', (0, -8, 1.5), (0, 0, 0.6), 70, 2.8, 0, None),
        ('photo_4', (-0.4, -4.4, 2.8), (-1.2, -1.1, 0.7), 100, 2.2, 0, None),
        ('photo_5', (5.0, -4.5, 2.4), (2.6, -1.0, 0.4), 90, 2.4, 0, None),
        ('photo_6', (-6.5, -6.5, 5), (0, 0.3, 0.5), 45, 4.0, 0, None),
        ('photo_7', (1.2, -2.6, 2.4), (-0.2, 0.7, 0.8), 105, 2.0, 0, None),
    ])
