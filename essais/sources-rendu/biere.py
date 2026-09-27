# Demi pression photoréaliste sur un zinc de brasserie (Blender + Cycles).
# Usage : python biere.py <test|tour|galerie> [dossier]
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import *

REGLAGES['avance'] = 0.72
decor(table_couleur=(0.03, 0.025, 0.02), fond_couleur=(0.018, 0.014, 0.01),
      bokeh=((1.0, 0.62, 0.28), (1.0, 0.72, 0.4), (0.55, 0.75, 0.45), (1.0, 0.5, 0.2)), nb_bokeh=22, hdri='interior.exr', hdri_force=0.3)
bpy.data.objects['table'].location.z = -0.6
lumiere('cle', 'AREA', 520, (1.0, 0.88, 0.74), (-6, -6, 6.5), 4.5, (0, 0, 1.5))
# Le contre-jour fait briller la bière : c'est lui qui donne la couleur dorée.
contre = lumiere('contre', 'AREA', 620, (1.0, 0.88, 0.7), (0.6, 9.0, 2.4), 10.0, (0, 0, 1.6))
lumiere('dessus', 'AREA', 480, (1.0, 0.95, 0.88), (-0.5, -1.5, 8.5), 3.0, (0, 0, 3))
bande = lumiere('bande', 'AREA', 380, (0.95, 0.96, 1.0), (6.5, -2.5, 2.5), 1.0, (0, 0, 1.6))
bande.data.shape = 'RECTANGLE'; bande.data.size = 0.5; bande.data.size_y = 6.0
lumiere('appoint', 'AREA', 120, (0.85, 0.9, 1.0), (-7, 1, 3), 5, (0, 0, 1.2))

# ---- Le zinc : métal brossé, patiné, avec des traces ----
def mat_zinc():
    m, nt, p = noeuds('zinc')
    co = coords_objet(nt)
    p.inputs['Metallic'].default_value = 1.0
    sep = nt.nodes.new('ShaderNodeMapping'); sep.inputs['Scale'].default_value = (0.08, 6.0, 1.0)
    nt.links.new(co, sep.inputs['Vector'])
    brosse = bruit(nt, 60, 4, 0.6, 0, sep.outputs['Vector'])
    patine = bruit(nt, 0.9, 8, 0.65, 0, co)
    r = rampe(nt, [(0.35, srgb(0.50, 0.51, 0.52)), (0.6, srgb(0.66, 0.67, 0.68)), (0.8, srgb(0.72, 0.72, 0.71))])
    nt.links.new(patine.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    rug = nt.nodes.new('ShaderNodeMapRange'); rug.inputs['To Min'].default_value = 0.18; rug.inputs['To Max'].default_value = 0.42
    tache = bruit(nt, 2.5, 6, 0.6, 0, co)
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'FLOAT'; mix.inputs['Factor'].default_value = 0.5
    nt.links.new(brosse.outputs['Fac'], mix.inputs['A']); nt.links.new(tache.outputs['Fac'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], rug.inputs['Value']); nt.links.new(rug.outputs['Result'], p.inputs['Roughness'])
    relief(nt, p, brosse.outputs['Fac'], 0.08, 0.01, vernis=False)
    return m

zinc = maillage('zinc', lambda bm: bmesh.ops.create_cube(bm, size=1))
zinc.scale = (16, 7, 0.3); zinc.location = (0, 1.2, -0.15)
b = zinc.modifiers.new('bev', 'BEVEL'); b.width = 0.12; b.segments = 6
zinc.data.materials.append(mat_zinc())

# ---- Le sous-bock en carton imprimé ----
def mat_carton():
    m, nt, p = noeuds('carton')
    co = coords_objet(nt)
    s = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(co, s.inputs['Vector'])
    ax = math_noeud(nt, 'ABSOLUTE', s.outputs['X']); ay = math_noeud(nt, 'ABSOLUTE', s.outputs['Y'])
    carre = math_noeud(nt, 'MAXIMUM', ax, ay)
    # Filet bordeaux imprimé à 7 mm du bord.
    bord = nt.nodes.new('ShaderNodeMapRange'); bord.interpolation_type = 'SMOOTHSTEP'
    nt.links.new(carre, bord.inputs['Value'])
    r = rampe(nt, [(0.0, srgb(0.92, 0.88, 0.80)), (0.855, srgb(0.92, 0.88, 0.80)), (0.86, srgb(0.42, 0.08, 0.10)), (0.885, srgb(0.42, 0.08, 0.10)), (0.89, srgb(0.92, 0.88, 0.80)), (1.0, srgb(0.90, 0.86, 0.78))])
    bord.inputs['From Max'].default_value = 1.0
    nt.links.new(bord.outputs['Result'], r.inputs['Fac'])
    # Auréole humide laissée par le verre et quelques gouttes bues par le carton.
    rr = rayon_objet(nt)
    hum = nt.nodes.new('ShaderNodeMapRange'); hum.inputs['From Min'].default_value = 0.6; hum.inputs['From Max'].default_value = 0.78
    tremble = bruit(nt, 6, 4, 0.6, 0, co)
    decal = nt.nodes.new('ShaderNodeMath'); decal.operation = 'MULTIPLY_ADD'
    nt.links.new(tremble.outputs['Fac'], decal.inputs[0]); decal.inputs[1].default_value = 0.12
    nt.links.new(rr, decal.inputs[2])
    nt.links.new(decal.outputs['Value'], hum.inputs['Value'])
    inv = math_noeud(nt, 'SUBTRACT', 1.0, hum.outputs['Result'])
    mouille = nt.nodes.new('ShaderNodeMix'); mouille.data_type = 'RGBA'; mouille.blend_type = 'MULTIPLY'
    nt.links.new(inv, mouille.inputs['Factor'])
    nt.links.new(r.outputs['Color'], mouille.inputs['A']); mouille.inputs['B'].default_value = srgb(0.78, 0.72, 0.62) + (1,)
    nt.links.new(mouille.outputs['Result'], p.inputs['Base Color'])
    rug = nt.nodes.new('ShaderNodeMapRange'); rug.inputs['To Min'].default_value = 0.45; rug.inputs['To Max'].default_value = 0.85
    nt.links.new(hum.outputs['Result'], rug.inputs['Value']); nt.links.new(rug.outputs['Result'], p.inputs['Roughness'])
    p.inputs['Subsurface Weight'].default_value = 0.2; p.inputs['Subsurface Scale'].default_value = 0.02
    relief(nt, p, bruit(nt, 55, 6, 0.7, 0, co).outputs['Fac'], 0.25, 0.01, vernis=False)
    return m

sb = maillage('sous_bock', lambda bm: bmesh.ops.create_cube(bm, size=1))
sb.scale = (2.4, 2.4, 0.045); sb.location = (0, 0, 0.0225)
b = sb.modifiers.new('bev', 'BEVEL'); b.width = 0.02; b.segments = 3
b2 = sb.modifiers.new('coins', 'BEVEL'); b2.affect = 'VERTICES'; b2.width = 0.18; b2.segments = 8
sb.rotation_euler.z = math.radians(9)
sb.data.materials.append(mat_carton()); sur_plateau(sb)
police = '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'
for texte, taille, y in (('BRASSERIE DU MARCHÉ', 0.135, -0.93), ('depuis la halle', 0.09, -0.78)):
    tx = bpy.data.curves.new('t', 'FONT'); tx.body = texte; tx.align_x = 'CENTER'; tx.align_y = 'CENTER'; tx.size = taille
    if os.path.exists(police): tx.font = bpy.data.fonts.load(police)
    to = lier(bpy.data.objects.new(texte, tx))
    to.location = (0, y, 0.0455); to.data.materials.append(mat_simple('encre', srgb(0.40, 0.07, 0.09), 0.7))
    to.parent = sb; to.matrix_parent_inverse = sb.matrix_world.inverted()
    to.scale = (1 / 2.4, 1 / 2.4, 1); to.location = (0, y / 2.4, 0.505)

# ---- Le verre (pinte à renflement) : profil extérieur puis intérieur ----
ext = [(0.0, 0.0), (0.6, 0.0), (0.63, 0.03), (0.645, 0.1), (0.78, 2.35), (0.86, 2.58), (0.86, 2.66), (0.82, 2.8), (0.855, 3.02), (0.848, 3.04)]
inte = [(0.822, 3.04), (0.815, 3.02), (0.79, 2.8), (0.83, 2.66), (0.83, 2.58), (0.752, 2.35), (0.62, 0.3), (0.3, 0.26), (0.0, 0.25)]
verre = tourner_profil('verre', ext + inte, 160)
lisser(verre, 1)
verre.data.materials.append(mat_verre('verre', (1.0, 1.0, 1.0), 0.0)); sur_plateau(verre)
verre.location.z = 0.046

def rayon_int(z):
    pts = sorted([(zz, r) for r, zz in inte if zz > 0.29])
    for (z0, r0), (z1, r1) in zip(pts, pts[1:]):
        if z0 <= z <= z1: return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return pts[0][1] if z < pts[0][0] else pts[-1][1]

NIVEAU = 2.46
prof = [(0.0, 0.262)]
for k in range(28):
    z = 0.3 + (NIVEAU - 0.3) * k / 27
    prof.append((rayon_int(z) - 0.003, z))
prof[1] = (0.3, 0.262)
prof.append((0.0, NIVEAU))
biere = tourner_profil('biere', prof, 128)
for f in biere.data.polygons: f.use_smooth = True
biere.data.materials.append(mat_liquide('biere', (1.0, 0.8, 0.1), 1.4, 1.34, 0.0)); sur_plateau(biere)
biere.location.z = 0.046

# La mousse : un col dense, légèrement bombé et plus haut que le bord.
def mat_mousse():
    m, nt, p = noeuds('mousse')
    co = coords_objet(nt)
    v = voronoi(nt, 70, co); v2 = voronoi(nt, 190, co)
    r = rampe(nt, [(0.3, srgb(0.93, 0.89, 0.80)), (0.8, srgb(0.98, 0.96, 0.91))])
    nt.links.new(bruit(nt, 5, 4, 0.5, 0, co).outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.35
    p.inputs['Subsurface Weight'].default_value = 1.0
    p.inputs['Subsurface Radius'].default_value = (1.0, 0.92, 0.75); p.inputs['Subsurface Scale'].default_value = 0.25
    p.inputs['Coat Weight'].default_value = 0.15; p.inputs['Coat Roughness'].default_value = 0.2
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'MULTIPLY_ADD'
    nt.links.new(v2.outputs['Distance'], add.inputs[0]); add.inputs[1].default_value = 0.5
    nt.links.new(v.outputs['Distance'], add.inputs[2])
    relief(nt, p, add.outputs['Value'], 0.55, 0.02)
    return m
mp = []
for k in range(14):
    z = NIVEAU + 0.004 + (3.0 - NIVEAU) * k / 13
    mp.append((rayon_int(min(z, 3.0)) - 0.004, z))
for k in range(1, 9):
    t = k / 8
    mp.append(((rayon_int(3.0) - 0.004) * math.cos(t * math.pi / 2) ** 0.8, 3.0 + 0.1 * math.sin(t * math.pi / 2)))
mp = [(0.0, NIVEAU + 0.004)] + mp
mousse = tourner_profil('mousse', mp, 128)
lisser(mousse, 1); deplacer(mousse, 'CLOUDS', 0.12, 0.018, 2)
mousse.data.materials.append(mat_mousse()); sur_plateau(mousse)
mousse.location.z = 0.046

# Les bulles montent en chapelets depuis le fond.
mb = mat_verre('bulle', (1, 1, 1), 0.0); mb.node_tree.nodes['Principled BSDF'].inputs['IOR'].default_value = 0.75
bulles = []
for c in range(9):
    a = random.uniform(0, math.tau); r0 = random.uniform(0.05, 0.5)
    x0, y0 = math.cos(a) * r0, math.sin(a) * r0
    z = 0.33
    while z < NIVEAU - 0.05:
        rb = 0.005 + 0.009 * (z / NIVEAU)
        o = maillage('bulle', lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rb))
        o.location = (x0 + random.gauss(0, 0.006), y0 + random.gauss(0, 0.006), z + 0.046)
        o.data.materials.append(mb); sur_plateau(o); bulles.append(o)
        z += 0.05 + 0.1 * (z / NIVEAU) * random.uniform(0.7, 1.3)
for i in range(60):
    a = random.uniform(0, math.tau); z = random.uniform(0.4, NIVEAU - 0.05); rr = rayon_int(z) - 0.012
    o = maillage('bulle_paroi', lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=2, radius=random.uniform(0.004, 0.009)))
    o.location = (math.cos(a) * rr, math.sin(a) * rr, z + 0.046); o.data.materials.append(mb); sur_plateau(o)

# La buée : des milliers de gouttelettes sur la paroi froide, plus grosses en bas.
emet = tourner_profil('buee', [(0.648 + (0.78 - 0.648) * (z - 0.12) / 2.23 + 0.001, z) for z in [0.12 + k * 0.1 for k in range(23)]], 160)
emet.location.z = 0.046; sur_plateau(emet)
eau = mat_verre('eau', (1, 1, 1), 0.0); eau.node_tree.nodes['Principled BSDF'].inputs['IOR'].default_value = 1.33
def gouttes(nom, nombre, taille, alea, graine):
    g = maillage(nom, lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1))
    g.location = (0, 0, -60); g.data.materials.append(eau)
    ps = emet.modifiers.new(nom, 'PARTICLE_SYSTEM').particle_system
    ps.seed = graine
    s = ps.settings
    s.type = 'EMITTER'; s.count = nombre; s.frame_start = 1; s.frame_end = 1; s.lifetime = 10000
    s.physics_type = 'NO'; s.render_type = 'OBJECT'; s.instance_object = g; s.particle_size = taille; s.size_random = alea
    s.emit_from = 'FACE'; s.use_emit_random = True; s.use_even_distribution = True; s.distribution = 'RAND'
    s.use_rotations = True; s.rotation_mode = 'NOR'
    return ps
gouttes('gouttelette', 3500, 0.016, 0.6, 1)
gouttes('goutte', 300, 0.034, 0.5, 2)
emet.show_instancer_for_render = False
# Deux coulées plus longues le long du verre.
for i, a in enumerate((math.radians(-70), math.radians(-115))):
    for k in range(9):
        z = 0.25 + k * 0.1 + i * 0.3
        rr = 0.648 + (0.78 - 0.648) * (z - 0.12) / 2.23
        o = maillage('coulee', lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1))
        t = 0.02 + 0.012 * math.sin(k * 1.3)
        o.scale = (t, t, t * 2.2); o.location = (math.cos(a) * rr, math.sin(a) * rr, z + 0.046)
        o.data.materials.append(eau); sur_plateau(o)

# ---- Un second verre à moitié bu, flou, au fond du comptoir ----
for o in (verre, biere, mousse):
    c = o.copy(); lier(c); c.parent = None
    c.location = (-3.6, 4.8, o.location.z + 0.0)
    if o is biere: c.scale.z = 0.62
    if o is mousse: c.scale = (0.97, 0.97, 0.35); c.location.z = 0.046 + 2.46 * 0.62 - 2.46 * 0.35 + 0.02
# Une coupelle de cacahuètes, pour le comptoir.
cp = tourner_profil('coupelle', [(0, 0), (0.55, 0), (0.62, 0.04), (0.9, 0.42), (0.86, 0.45), (0.58, 0.1), (0, 0.08)], 96)
lisser(cp, 2); cp.data.materials.append(mat_simple('faience', srgb(0.93, 0.92, 0.88), 0.15)); cp.location = (2.7, 2.2, 0)
mc = mat_simple('cacahuete', srgb(0.72, 0.50, 0.28), 0.55)
mcn = mc.node_tree; relief(mcn, mcn.nodes['Principled BSDF'], bruit(mcn, 30, 4, 0.5).outputs['Fac'], 0.4, 0.01, False)
for i in range(40):
    o = maillage('cac', lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1))
    a = random.uniform(0, math.tau); r = random.uniform(0, 0.6) ** 0.7
    o.scale = (0.11, 0.075, 0.07); o.rotation_euler = (random.uniform(0, 3), random.uniform(0, 3), random.uniform(0, 3))
    o.location = (2.7 + math.cos(a) * r, 2.2 + math.sin(a) * r, 0.14 + 0.25 * (r / 0.7) ** 2 + random.uniform(0, 0.08) + (0.07 if i > 22 else 0))
    lisser(o, 1); o.data.materials.append(mc)

executer(
    test=((0.6, -9.5, 2.3), (0, 0, 1.55), 70, 3.2, 0),
    tour=((0, -9.5, 2.3), (0, 0, 1.55), 70, 3.5),
    vues=[
        ('hero', (1.4, -9.8, 2.2), (0.35, 0, 1.6), 62, 2.8, 0, None),
        ('photo_0', (0.8, -6.5, 2.0), (0, 0, 1.5), 80, 2.4, 0, None),
        ('photo_1', (0.6, -5.2, 4.7), (0, 0, 2.7), 70, 3.2, 0, None),
        ('photo_2', (2.2, -6.0, 0.75), (0, 0, 0.9), 65, 2.8, 30, None),
        ('photo_3', (-5.5, -7, 3.2), (-0.6, 1.2, 1.3), 55, 3.2, 0, None),
        ('photo_4', (0.01, -0.3, 9), (0, 0, 0), 60, 5.6, 0, None),
        ('photo_5', (0, -8.5, 0.6), (0, 0, 1.4), 60, 2.8, 20, None),
        ('photo_6', (3.5, -5.8, 4.2), (1.6, 1.2, 0.8), 70, 2.8, 0, None),
        ('photo_7', (-2.2, -5.0, 1.5), (0, 0, 1.2), 85, 2.2, 40, None),
    ])
