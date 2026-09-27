# Pizza napolitaine photoréaliste (Blender + Cycles). Usage : python pizza.py <test|tour|galerie> [dossier]
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import *

decor(table_couleur=(0.03, 0.022, 0.016), fond_couleur=(0.025, 0.012, 0.006), bokeh=((1.0, 0.45, 0.12), (1.0, 0.6, 0.2), (1.0, 0.35, 0.08)), nb_bokeh=18, hdri='interior.exr', hdri_force=0.3)
lumiere('cle', 'AREA', 700, (1.0, 0.84, 0.66), (-6, -5, 7), 5)
lumiere('four', 'AREA', 1400, (1.0, 0.45, 0.15), (2, 9, 3), 5)
lumiere('appoint', 'AREA', 160, (0.85, 0.9, 1.0), (7, -6, 3), 6)

# ---- La pelle en bois farinée ----
def mat_bois_clair():
    m, nt, p = noeuds('pelle')
    co = coords_objet(nt)
    # Fil du bois : un bruit très étiré le long de la planche donne des veines longues et fines.
    etire = nt.nodes.new('ShaderNodeMapping'); etire.inputs['Scale'].default_value = (4.0, 0.12, 1.0)
    nt.links.new(co, etire.inputs['Vector'])
    w = bruit(nt, 6, 8, 0.62, 0.6, etire.outputs['Vector'])
    r = rampe(nt, [(0.0, srgb(0.62, 0.43, 0.25)), (0.5, srgb(0.74, 0.55, 0.34)), (1.0, srgb(0.80, 0.63, 0.42))])
    nt.links.new(w.outputs['Fac'], r.inputs['Fac'])
    farine = bruit(nt, 4, 8, 0.7, 0, co)
    masque = rampe(nt, [(0.55, (0, 0, 0)), (0.68, (1, 1, 1))]); nt.links.new(farine.outputs['Fac'], masque.inputs['Fac'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(masque.outputs['Color'], mix.inputs['Factor']); nt.links.new(r.outputs['Color'], mix.inputs[6])
    mix.inputs[7].default_value = srgb(0.95, 0.93, 0.88) + (1,)
    nt.links.new(mix.outputs[2], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.7
    relief(nt, p, w.outputs['Fac'], 0.05, 0.01, False)
    return m

pelle = maillage('pelle', lambda bm: bmesh.ops.create_circle(bm, cap_ends=True, segments=128, radius=3.75))
sol = pelle.modifiers.new('ep', 'SOLIDIFY'); sol.thickness = 0.12
bv = pelle.modifiers.new('bev', 'BEVEL'); bv.width = 0.03; bv.segments = 3
pelle.location.z = 0.12
manche = maillage('manche', lambda bm: bmesh.ops.create_cube(bm, size=1))
manche.scale = (0.7, 4.2, 0.12); manche.location = (0, 5.6, 0.06)
bv2 = manche.modifiers.new('bev', 'BEVEL'); bv2.width = 0.04; bv2.segments = 3
mb_ = mat_bois_clair()
for o in (pelle, manche): o.data.materials.append(mb_); sur_plateau(o)

# ---- La pâte : fond fin, bord gonflé et léopardé ----
def mat_pate():
    m, nt, p = noeuds('pate')
    co = coords_objet(nt)
    rr = rayon_objet(nt)
    bord = nt.nodes.new('ShaderNodeMapRange'); bord.inputs['From Min'].default_value = 2.35; bord.inputs['From Max'].default_value = 2.7
    nt.links.new(rr, bord.inputs['Value'])
    z = composante(nt, 'Z')
    dore = nt.nodes.new('ShaderNodeMapRange'); dore.inputs['From Min'].default_value = 0.08; dore.inputs['From Max'].default_value = 0.62
    nt.links.new(z, dore.inputs['Value'])
    base = bruit(nt, 2.5, 6, 0.6, 0.3, co)
    t = math_noeud(nt, 'MULTIPLY_ADD', base.outputs['Fac'], 0.35)
    nt.links.new(dore.outputs['Result'], t.node.inputs[2])
    r = rampe(nt, [(0.15, srgb(0.93, 0.83, 0.62)), (0.45, srgb(0.88, 0.66, 0.38)), (0.75, srgb(0.74, 0.46, 0.20)), (1.0, srgb(0.56, 0.30, 0.12))])
    nt.links.new(t, r.inputs['Fac'])
    # Taches de cuisson du four à bois : des cloques irrégulières, brunes au bord et noires au cœur,
    # surtout sur le haut du bord gonflé.
    v = voronoi(nt, 4.2, co)
    cloques = bruit(nt, 7, 10, 0.68, 0.6, co)
    haut = nt.nodes.new('ShaderNodeMapRange'); haut.inputs['From Min'].default_value = 0.3; haut.inputs['From Max'].default_value = 0.6
    nt.links.new(z, haut.inputs['Value'])
    m1 = math_noeud(nt, 'MULTIPLY', bord.outputs['Result'], haut.outputs['Result'])
    m2 = math_noeud(nt, 'MULTIPLY_ADD', cloques.outputs['Fac'], 1.0)
    nt.links.new(m1, m2.node.inputs[2]); m2.node.inputs[2].default_value = 0
    m3 = math_noeud(nt, 'MULTIPLY', cloques.outputs['Fac'], m1)
    halo = rampe(nt, [(0.43, (0, 0, 0)), (0.5, (1, 1, 1))]); nt.links.new(m3, halo.inputs['Fac'])
    coeur = rampe(nt, [(0.51, (0, 0, 0)), (0.56, (1, 1, 1))]); nt.links.new(m3, coeur.inputs['Fac'])
    brun = nt.nodes.new('ShaderNodeMix'); brun.data_type = 'RGBA'
    nt.links.new(halo.outputs['Color'], brun.inputs['Factor']); nt.links.new(r.outputs['Color'], brun.inputs[6])
    brun.inputs[7].default_value = srgb(0.46, 0.25, 0.10) + (1,)
    mul2 = coeur.outputs['Color']
    r = brun
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(mul2, mix.inputs['Factor']); nt.links.new(r.outputs[2], mix.inputs[6])
    mix.inputs[7].default_value = srgb(0.12, 0.07, 0.04) + (1,)
    nt.links.new(mix.outputs[2], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.72
    p.inputs['Subsurface Weight'].default_value = 0.25; p.inputs['Subsurface Radius'].default_value = (1, 0.6, 0.3); p.inputs['Subsurface Scale'].default_value = 0.08
    h = math_noeud(nt, 'ADD', bruit(nt, 40, 5, 0.6, 0, co).outputs['Fac'], v.outputs['Distance'])
    relief(nt, p, h, 0.35, 0.03, False)
    return m

profil = [(0, 0.0), (2.45, 0.0), (2.62, 0.02), (2.78, 0.1), (2.92, 0.26), (3.02, 0.38), (3.08, 0.34), (3.1, 0.2), (3.06, 0.06), (2.95, -0.02), (0, -0.04)]
pate = tourner_profil('pate2', [(0, 0.12), (2.25, 0.12), (2.42, 0.16), (2.58, 0.34), (2.76, 0.56), (2.95, 0.66), (3.12, 0.6), (3.22, 0.4), (3.2, 0.16), (3.08, 0.02), (2.85, 0), (0, 0)], 180)
lisser(pate, 2)
vg = pate.vertex_groups.new(name='bord')
for v in pate.data.vertices:
    r = math.hypot(v.co.x, v.co.y)
    vg.add([v.index], min(1.0, max(0.0, (r - 2.2) / 0.35)), 'REPLACE')
for m_ in (deplacer(pate, 'CLOUDS', 0.4, 0.22, 3), deplacer(pate, 'CLOUDS', 1.2, 0.16, 2, 0.5, 'bord'), deplacer(pate, 'CLOUDS', 0.12, 0.05, 2, 0.5, 'cloques')):
    m_.vertex_group = 'bord'

pate.data.materials.append(mat_pate()); pate.location.z = 0.12; sur_plateau(pate)
pizza = pate

# ---- Sauce tomate ----
def mat_sauce():
    m, nt, p = noeuds('sauce')
    co = coords_objet(nt)
    n = bruit(nt, 5, 8, 0.65, 0.5, co)
    r = rampe(nt, [(0.3, srgb(0.50, 0.07, 0.035)), (0.55, srgb(0.66, 0.14, 0.06)), (0.8, srgb(0.78, 0.26, 0.10))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac'])
    # Zones cuites plus sombres et flaques d'huile orangée (huile d'olive et gras de la mozzarella).
    cuit = bruit(nt, 1.3, 5, 0.6, 0, co)
    mc = rampe(nt, [(0.35, (0, 0, 0)), (0.62, (1, 1, 1))]); nt.links.new(cuit.outputs['Fac'], mc.inputs['Fac'])
    fonce = nt.nodes.new('ShaderNodeMix'); fonce.data_type = 'RGBA'; fonce.blend_type = 'MULTIPLY'
    nt.links.new(mc.outputs['Color'], fonce.inputs['Factor']); nt.links.new(r.outputs['Color'], fonce.inputs['A'])
    fonce.inputs['B'].default_value = srgb(0.62, 0.45, 0.40) + (1,)
    huile = bruit(nt, 2.4, 4, 0.5, 0, co)
    mh = rampe(nt, [(0.6, (0, 0, 0)), (0.72, (1, 1, 1))]); nt.links.new(huile.outputs['Fac'], mh.inputs['Fac'])
    orange = nt.nodes.new('ShaderNodeMix'); orange.data_type = 'RGBA'
    nt.links.new(mh.outputs['Color'], orange.inputs['Factor']); nt.links.new(fonce.outputs['Result'], orange.inputs['A'])
    orange.inputs['B'].default_value = srgb(0.86, 0.36, 0.08) + (1,)
    nt.links.new(orange.outputs['Result'], p.inputs['Base Color'])
    rug = nt.nodes.new('ShaderNodeMapRange'); rug.inputs['From Min'].default_value = 0.0; rug.inputs['From Max'].default_value = 1.0
    rug.inputs['To Min'].default_value = 0.45; rug.inputs['To Max'].default_value = 0.12
    nt.links.new(mh.outputs['Color'], rug.inputs['Value']); nt.links.new(rug.outputs['Result'], p.inputs['Roughness'])
    p.inputs['Coat Weight'].default_value = 0.12; p.inputs['Coat Roughness'].default_value = 0.2
    p.inputs['Subsurface Weight'].default_value = 0.4; p.inputs['Subsurface Scale'].default_value = 0.04
    # Morceaux de tomate écrasée sous la surface.
    v = voronoi(nt, 9, co)
    h = nt.nodes.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'
    nt.links.new(v.outputs['Distance'], h.inputs[0]); h.inputs[1].default_value = -0.6
    nt.links.new(bruit(nt, 22, 6, 0.6, 0, co).outputs['Fac'], h.inputs[2])
    relief(nt, p, h.outputs['Value'], 0.35, 0.025)
    return m

def disque_irregulier(bm, rayon, segments, anneaux, graine):
    rnd = random.Random(graine)
    ph = [rnd.uniform(0, 6) for _ in range(4)]
    grille = []
    centre = bm.verts.new((0, 0, 0))
    for j in range(1, anneaux + 1):
        ligne = []
        for k in range(segments):
            a = k / segments * math.tau
            r = rayon * j / anneaux * (1 + 0.035 * math.sin(a * 5 + ph[0]) + 0.02 * math.sin(a * 13 + ph[1]) + 0.01 * math.sin(a * 29 + ph[2]))
            ligne.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, 0)))
        grille.append(ligne)
    for k in range(segments):
        bm.faces.new((centre, grille[0][k], grille[0][(k + 1) % segments]))
        for j in range(anneaux - 1):
            bm.faces.new((grille[j][k], grille[j + 1][k], grille[j + 1][(k + 1) % segments], grille[j][(k + 1) % segments]))

sauce = maillage('sauce', lambda bm: disque_irregulier(bm, 2.36, 128, 24, 4))
s2 = sauce.modifiers.new('ep', 'SOLIDIFY'); s2.thickness = 0.04; s2.offset = 1
lisser(sauce, 2); deplacer(sauce, 'CLOUDS', 0.35, 0.07, 3); deplacer(sauce, 'CLOUDS', 0.08, 0.02, 2, 0.5, 'grain')
sauce.data.materials.append(mat_sauce()); sauce.location.z = 0.245; sur_plateau(sauce)

# ---- Mozzarella di bufala fondue (métaboules) ----
def mat_mozza():
    m, nt, p = noeuds('mozza')
    co = coords_objet(nt)
    n = bruit(nt, 3.5, 5, 0.55, 0, co)
    r = rampe(nt, [(0.25, srgb(0.95, 0.93, 0.86)), (0.45, srgb(0.93, 0.87, 0.74)), (0.6, srgb(0.86, 0.70, 0.44)), (0.72, srgb(0.70, 0.48, 0.24))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.38
    p.inputs['Coat Weight'].default_value = 0.12; p.inputs['Coat Roughness'].default_value = 0.2
    p.inputs['Subsurface Weight'].default_value = 0.6; p.inputs['Subsurface Radius'].default_value = (1, 0.92, 0.82); p.inputs['Subsurface Scale'].default_value = 0.15
    relief(nt, p, bruit(nt, 18, 4, 0.5, 0, co).outputs['Fac'], 0.1, 0.02)
    return m

mb = bpy.data.metaballs.new('mozza'); mb.resolution = 0.06; mb.render_resolution = 0.03; mb.threshold = 0.6
rnd = random.Random(21)
positions = []
for i in range(7):
    for _ in range(60):
        a = rnd.uniform(0, math.tau); r = math.sqrt(rnd.uniform(0.0, 1.0)) * 1.75
        x, y = math.cos(a) * r, math.sin(a) * r
        if all(math.hypot(x - px, y - py) > 1.25 for px, py in positions): break
    positions.append((x, y))
    e = mb.elements.new(); e.type = 'ELLIPSOID'; e.co = (x, y, 0); e.radius = 1.0
    t = rnd.uniform(0.62, 0.85); e.size_x = t * rnd.uniform(0.9, 1.3); e.size_y = t; e.size_z = 0.06
    e.rotation = (math.cos(rnd.uniform(0, 3)), 0, 0, math.sin(rnd.uniform(0, 3)))
    for k in range(3):
        d = mb.elements.new(); d.type = 'BALL'; d.radius = t * rnd.uniform(0.35, 0.55)
        aa = rnd.uniform(0, math.tau); d.co = (x + math.cos(aa) * t * 0.7, y + math.sin(aa) * t * 0.7, 0.0)
moz = lier(bpy.data.objects.new('mozza', mb)); mb.materials.append(mat_mozza())
moz.scale = (1, 1, 0.45); moz.location.z = 0.28; sur_plateau(moz)

# ---- Basilic ----
def mat_basilic():
    m, nt, p = noeuds('basilic')
    co = nt.nodes.new('ShaderNodeTexCoord').outputs['UV']
    n = bruit(nt, 6, 4, 0.5)
    r = rampe(nt, [(0.3, srgb(0.09, 0.27, 0.04)), (0.7, srgb(0.19, 0.44, 0.08))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.38
    p.inputs['Coat Weight'].default_value = 0.2; p.inputs['Coat Roughness'].default_value = 0.2
    p.inputs['Subsurface Weight'].default_value = 0.4; p.inputs['Subsurface Scale'].default_value = 0.02
    p.inputs['Subsurface Radius'].default_value = (0.4, 1.0, 0.3)
    w = nt.nodes.new('ShaderNodeTexWave'); w.inputs['Scale'].default_value = 9; w.inputs['Distortion'].default_value = 3; w.inputs['Detail'].default_value = 4
    nt.links.new(co, w.inputs['Vector'])
    relief(nt, p, w.outputs['Fac'], 0.45, 0.01)
    return m

def feuille(bm, longueur, largeur, pli, courbe, torsion=0.0):
    # Feuille de basilic : ovale pointu, légèrement creusée le long de la nervure, bords ondulés.
    nu, nv = 14, 28
    grille = []
    for j in range(nv + 1):
        v = j / nv
        w = largeur * (math.sin(math.pi * v) ** 0.9) * (1.1 - 0.35 * v)
        ligne = []
        for i in range(nu + 1):
            u = (i / nu - 0.5) * 2
            x = u * w; y = v * longueur
            z = pli * (u * u) * w * 0.6 + courbe * (v - 0.35) ** 2 + 0.015 * math.sin(v * 18 + u * 3) * abs(u) + torsion * u * v
            ligne.append(bm.verts.new((x, y, z)))
        grille.append(ligne)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((grille[j][i], grille[j][i + 1], grille[j + 1][i + 1], grille[j + 1][i]))

mbas = mat_basilic()
for i, (x, y, rot, t) in enumerate([(0.3, 0.2, 40, 1.35), (-1.0, 0.9, 160, 1.2), (1.1, -0.8, 250, 1.1), (-0.9, -1.1, 320, 1.3), (1.2, 1.0, 110, 1.0)]):
    f = maillage('basilic%d' % i, lambda bm: feuille(bm, 0.95 * t, 0.36 * t, 0.35, 0.12 + 0.06 * (i % 2), 0.05 * (1 if i % 2 else -1)))
    f.modifiers.new('ep', 'SOLIDIFY').thickness = 0.012
    lisser(f, 1)
    bpy.context.view_layer.objects.active = f
    f.data.uv_layers.new(name='UVMap')
    f.location = (x, y, 0.42); f.rotation_euler = (math.radians(4), math.radians(-3), math.radians(rot))
    f.data.materials.append(mbas); sur_plateau(f)

# ---- Farine et semoule sur la pelle ----
mfar = mat_simple('farine', srgb(0.95, 0.93, 0.88), 0.8)
for i in range(60):
    c = maillage('grain%d' % i, lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1))
    a = random.uniform(0, math.tau); r = random.uniform(3.2, 3.7); t = random.uniform(0.01, 0.025)
    c.scale = (t, t, t * 0.5); c.location = (math.cos(a) * r, math.sin(a) * r, 0.125)
    c.data.materials.append(mfar); sur_plateau(c)

executer(
    test=((0, -10.5, 6.4), (0, 0, 0.3), 60, 3.5, 20),
    tour=((0, -10.5, 6.4), (0, 0, 0.3), 60, 4.0),
    vues=[
        ('hero', (1.5, -10.5, 6.2), (0.2, 0.3, 0.2), 55, 3.2, 20, None),
        ('photo_0', (5.5, -8.5, 5.5), (0, 0, 0.2), 60, 3.2, 10, None),
        ('photo_1', (0.01, -0.2, 13), (0, 0, 0), 50, 5.6, 0, None),
        ('photo_2', (3.2, -5.2, 2.0), (1.6, -1.6, 0.5), 100, 2.0, 30, None),
        ('photo_3', (0, -9, 2.2), (0, 0, 0.5), 70, 2.8, -10, None),
        ('photo_4', (1.5, -4.0, 3.2), (0.3, -0.4, 0.45), 100, 2.0, 60, None),
        ('photo_5', (-7, -7, 5.5), (0, 0.5, 0.3), 45, 4.0, 45, None),
        ('photo_6', (2.2, -3.4, 5.2), (0.9, -0.7, 0.4), 90, 2.4, 120, None),
        ('photo_7', (6, -3.5, 2.6), (1.4, 0.2, 0.4), 85, 2.2, 200, None),
    ])
