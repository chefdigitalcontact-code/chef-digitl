# Table de bouchon lyonnais photoréaliste : ardoise écrite à la craie, verre de rouge, pot
# lyonnais, part de tarte aux pralines, torchon à carreaux (Blender + Cycles).
# Usage : python bistrot.py <test|tour|galerie> [dossier]
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio import *

ICI = os.path.dirname(os.path.abspath(__file__))
POLICE = os.environ.get('POLICE_CRAIE', os.path.join(ICI, '..', 'polices', 'package', '700Bold', 'Caveat_700Bold.ttf'))

REGLAGES['avance'] = 0.4
decor(table_couleur=(0.03, 0.02, 0.014), fond_couleur=(0.05, 0.03, 0.018),
      bokeh=((1.0, 0.6, 0.28), (1.0, 0.7, 0.4), (1.0, 0.5, 0.2)), nb_bokeh=16, hdri='interior.exr', hdri_force=0.3)
bpy.data.objects['table'].location.z = -0.6
lumiere('cle', 'AREA', 620, (1.0, 0.84, 0.66), (-6.5, -5.5, 7), 5, (0, 0.5, 1))
contre = lumiere('fenetre', 'AREA', 900, (1.0, 0.9, 0.78), (4.5, 4.0, 4.5), 3.5, (-1.2, 1.4, 2.2))
lumiere('ardoise', 'AREA', 260, (1.0, 0.86, 0.7), (2.9, 1.5, 9), 4, (2.9, 7, 3.5))
lumiere('appoint', 'AREA', 140, (0.85, 0.9, 1.0), (7.5, -6, 3), 6, (0, 0, 1))

# ---- Table en chêne sombre, en planches ----
def mat_chene():
    m, nt, p = noeuds('chene')
    co = coords_objet(nt)
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(co, sep.inputs['Vector'])
    etire = nt.nodes.new('ShaderNodeMapping'); etire.inputs['Scale'].default_value = (0.15, 1.0, 1.0)
    nt.links.new(co, etire.inputs['Vector'])
    fil = nt.nodes.new('ShaderNodeTexWave'); fil.wave_type = 'BANDS'; fil.bands_direction = 'Y'
    fil.inputs['Scale'].default_value = 1.2; fil.inputs['Distortion'].default_value = 7; fil.inputs['Detail'].default_value = 8
    nt.links.new(etire.outputs['Vector'], fil.inputs['Vector'])
    r = rampe(nt, [(0.0, srgb(0.16, 0.09, 0.05)), (0.5, srgb(0.28, 0.17, 0.09)), (1.0, srgb(0.38, 0.24, 0.13))])
    nt.links.new(fil.outputs['Fac'], r.inputs['Fac'])
    # Joints entre les planches (tous les 9 cm).
    y = math_noeud(nt, 'DIVIDE', sep.outputs['Y'], 1.8)
    fr = math_noeud(nt, 'FRACT', y)
    d = math_noeud(nt, 'ABSOLUTE', math_noeud(nt, 'SUBTRACT', fr, 0.5))
    joint = nt.nodes.new('ShaderNodeMapRange'); joint.inputs['From Min'].default_value = 0.47; joint.inputs['From Max'].default_value = 0.495
    nt.links.new(d, joint.inputs['Value'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(joint.outputs['Result'], mix.inputs['Factor']); nt.links.new(r.outputs['Color'], mix.inputs['A'])
    mix.inputs['B'].default_value = srgb(0.05, 0.03, 0.02) + (1,)
    nt.links.new(mix.outputs['Result'], p.inputs['Base Color'])
    rug = nt.nodes.new('ShaderNodeMapRange'); rug.inputs['To Min'].default_value = 0.3; rug.inputs['To Max'].default_value = 0.55
    nt.links.new(bruit(nt, 1.5, 6, 0.6, 0, co).outputs['Fac'], rug.inputs['Value']); nt.links.new(rug.outputs['Result'], p.inputs['Roughness'])
    p.inputs['Coat Weight'].default_value = 0.25; p.inputs['Coat Roughness'].default_value = 0.25
    h = nt.nodes.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'
    nt.links.new(fil.outputs['Fac'], h.inputs[0]); h.inputs[1].default_value = 0.3
    inv = math_noeud(nt, 'MULTIPLY', joint.outputs['Result'], -1.0)
    nt.links.new(inv, h.inputs[2])
    relief(nt, p, h.outputs['Value'], 0.4, 0.02)
    return m

tab = maillage('plateau_table', lambda bm: bmesh.ops.create_cube(bm, size=1))
tab.scale = (18, 11, 0.4); tab.location = (0, 1.5, -0.2)
b = tab.modifiers.new('bev', 'BEVEL'); b.width = 0.08; b.segments = 4
tab.data.materials.append(mat_chene())

# ---- L'ardoise du jour, cadre en bois, écrite à la craie ----
def mat_tableau():
    m, nt, p = noeuds('tableau')
    co = coords_objet(nt)
    traces = bruit(nt, 0.9, 6, 0.6, 1.2, co)
    r = rampe(nt, [(0.35, srgb(0.10, 0.115, 0.11)), (0.62, srgb(0.16, 0.17, 0.165)), (0.8, srgb(0.26, 0.27, 0.26))])
    nt.links.new(traces.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.85
    relief(nt, p, bruit(nt, 80, 4, 0.6, 0, co).outputs['Fac'], 0.1, 0.01, False)
    return m

def mat_craie():
    m = bpy.data.materials.new('craie'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Base Color'].default_value = srgb(0.9, 0.9, 0.87) + (1,); p.inputs['Roughness'].default_value = 0.95
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    co = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    n1 = bruit(nt, 120, 6, 0.7, 0, co); n2 = bruit(nt, 14, 4, 0.6, 0, co)
    mixf = nt.nodes.new('ShaderNodeMath'); mixf.operation = 'MULTIPLY_ADD'
    nt.links.new(n1.outputs['Fac'], mixf.inputs[0]); mixf.inputs[1].default_value = 0.7
    nt.links.new(n2.outputs['Fac'], mixf.inputs[2])
    # La craie accroche mal : le trait laisse passer le tableau par endroits.
    seuil = rampe(nt, [(0.5, (0, 0, 0)), (0.66, (1, 1, 1))])
    nt.links.new(mixf.outputs['Value'], seuil.inputs['Fac'])
    ms = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(seuil.outputs['Color'], ms.inputs['Fac']); nt.links.new(tr.outputs['BSDF'], ms.inputs[1]); nt.links.new(p.outputs['BSDF'], ms.inputs[2])
    nt.links.new(ms.outputs['Shader'], nt.nodes['Material Output'].inputs['Surface'])
    return m

TB_Y, TB_Z, TB_L, TB_H = 7.2, 1.0, 7.6, 5.0
TB_X = 2.9
tableau = maillage('tableau', lambda bm: bmesh.ops.create_cube(bm, size=1))
tableau.scale = (TB_L, 0.08, TB_H); tableau.location = (TB_X, TB_Y, TB_Z + TB_H / 2)
tableau.data.materials.append(mat_tableau())
mcadre = mat_simple('cadre', srgb(0.30, 0.18, 0.09), 0.45)
mcn = mcadre.node_tree; relief(mcn, mcn.nodes['Principled BSDF'], bruit(mcn, 30, 6, 0.6).outputs['Fac'], 0.3, 0.01, False)
for sx, sz, dx, dz in ((TB_L + 0.5, 0.25, 0, TB_H / 2 + 0.125), (TB_L + 0.5, 0.25, 0, -TB_H / 2 - 0.125),
                       (0.25, TB_H, TB_L / 2 + 0.125, 0), (0.25, TB_H, -TB_L / 2 - 0.125, 0)):
    c = maillage('cadre', lambda bm: bmesh.ops.create_cube(bm, size=1))
    c.scale = (sx, 0.16, sz); c.location = (TB_X + dx, TB_Y, TB_Z + TB_H / 2 + dz)
    bv = c.modifiers.new('bev', 'BEVEL'); bv.width = 0.03; bv.segments = 3
    c.data.materials.append(mcadre)

mcr = mat_craie()
police = bpy.data.fonts.load(POLICE) if os.path.exists(POLICE) else None
def craie(texte, taille, x, z, aligne='LEFT', rot=0.0):
    tx = bpy.data.curves.new('craie', 'FONT'); tx.body = texte; tx.size = taille; tx.align_x = aligne; tx.align_y = 'CENTER'
    if police: tx.font = police
    o = lier(bpy.data.objects.new('craie', tx)); o.data.materials.append(mcr)
    # Posé juste devant la face avant du tableau.
    o.rotation_euler = (math.radians(90), math.radians(rot), 0)
    o.location = (TB_X + x, TB_Y - 0.04 - 0.004, TB_Z + TB_H / 2 + z)
    return o
craie('Ardoise du jour', 0.78, 0, 1.75, 'CENTER', -1.5)
trait = craie('~~~~~~~~~~', 0.4, 0, 1.18, 'CENTER')
lignes = [('Salade lyonnaise', '12'), ('Pâté en croûte maison', '14'), ('Quenelle de brochet', '22'), ('   sauce Nantua, riz pilaf', ''), ('Tarte aux pralines', '8')]
for i, (plat, prix) in enumerate(lignes):
    z = 0.62 - i * 0.62
    craie(plat, 0.5 if prix else 0.38, -3.3, z, 'LEFT', random.uniform(-0.8, 0.8))
    if prix: craie(prix + ' €', 0.5, 3.35, z, 'RIGHT')

# ---- Torchon à carreaux rouges ----
def mat_torchon():
    m, nt, p = noeuds('torchon')
    # Damier à plat : on écrase la hauteur, sinon les plis du tissu traversent les cases en 3D.
    plat = nt.nodes.new('ShaderNodeMapping'); plat.inputs['Scale'].default_value = (1.0, 1.0, 0.0)
    nt.links.new(coords_objet(nt), plat.inputs['Vector'])
    uv = plat.outputs['Vector']
    ch = nt.nodes.new('ShaderNodeTexChecker'); ch.inputs['Scale'].default_value = 2.6
    ch.inputs['Color1'].default_value = srgb(0.62, 0.06, 0.07) + (1,); ch.inputs['Color2'].default_value = srgb(0.93, 0.91, 0.86) + (1,)
    nt.links.new(uv, ch.inputs['Vector'])
    # Le carreau rouge « bave » sur le blanc : les fils se croisent.
    tr = nt.nodes.new('ShaderNodeTexWave'); tr.bands_direction = 'X'; tr.inputs['Scale'].default_value = 60; tr.inputs['Distortion'].default_value = 0.3
    ch2 = nt.nodes.new('ShaderNodeTexWave'); ch2.bands_direction = 'Y'; ch2.inputs['Scale'].default_value = 60; ch2.inputs['Distortion'].default_value = 0.3
    nt.links.new(uv, tr.inputs['Vector']); nt.links.new(uv, ch2.inputs['Vector'])
    nt.links.new(ch.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.85
    p.inputs['Sheen Weight'].default_value = 0.6; p.inputs['Sheen Roughness'].default_value = 0.4
    p.inputs['Subsurface Weight'].default_value = 0.2; p.inputs['Subsurface Scale'].default_value = 0.02
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    nt.links.new(tr.outputs['Fac'], add.inputs[0]); nt.links.new(ch2.outputs['Fac'], add.inputs[1])
    relief(nt, p, add.outputs['Value'], 0.35, 0.004, False)
    return m

def torchon_mesh(bm):
    bmesh.ops.create_grid(bm, x_segments=90, y_segments=90, size=1.8, calc_uvs=True)
    for v in bm.verts:
        x, y = v.co.x, v.co.y
        v.co.z = (0.03 * math.sin(x * 4.1 + y * 1.3) * math.sin(y * 3.3 - x) + 0.02 * math.sin(x * 11 + y * 7)
                  + 0.22 * max(0.0, (x + y) - 1.9) ** 1.5 + 0.05 * math.exp(-((x - 0.3 * y - 0.2) / 0.08) ** 2))
tor = maillage('torchon', torchon_mesh)
tor.modifiers.new('ep', 'SOLIDIFY').thickness = 0.02; lisser(tor, 1)
tor.location = (-3.4, -1.3, 0.03); tor.rotation_euler.z = math.radians(-14)
tor.data.materials.append(mat_torchon()); sur_plateau(tor)

# ---- Assiette en porcelaine, part de tarte aux pralines, crème fraîche ----
porcelaine = mat_simple('porcelaine', srgb(0.95, 0.94, 0.91), 0.08)
porcelaine.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value = 0.4
ass = tourner_profil('assiette', [(0, 0.06), (1.3, 0.06), (1.45, 0.02), (1.5, 0.0), (1.55, 0.06), (1.7, 0.12), (2.3, 0.3), (2.36, 0.33), (2.3, 0.35), (1.68, 0.17), (1.35, 0.11), (0, 0.11)], 128)
lisser(ass, 2); ass.data.materials.append(porcelaine); ass.location = (0.9, -0.6, 0.0); sur_plateau(ass)

def part(nom, profil, angle, pas=30):
    me = bpy.data.meshes.new(nom); bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in profil]
    f = bm.faces.new(vs)
    bmesh.ops.spin(bm, geom=vs + list(f.edges) + [f], cent=(0, 0, 0), axis=(0, 0, 1), angle=angle, steps=pas)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = lier(bpy.data.objects.new(nom, me))
    for p_ in me.polygons: p_.use_smooth = False
    return o

def mat_pate_sucree():
    m, nt, p = noeuds('pate_sucree')
    co = coords_objet(nt)
    n = bruit(nt, 6, 6, 0.6, 0, co)
    r = rampe(nt, [(0.3, srgb(0.70, 0.46, 0.22)), (0.6, srgb(0.84, 0.62, 0.36)), (0.85, srgb(0.90, 0.72, 0.46))])
    nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.7
    p.inputs['Subsurface Weight'].default_value = 0.2; p.inputs['Subsurface Scale'].default_value = 0.02
    v = voronoi(nt, 45, co)
    h = nt.nodes.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'
    nt.links.new(v.outputs['Distance'], h.inputs[0]); h.inputs[1].default_value = 0.6
    nt.links.new(bruit(nt, 90, 4, 0.6, 0, co).outputs['Fac'], h.inputs[2])
    relief(nt, p, h.outputs['Value'], 0.6, 0.012, False)
    return m

def mat_praline():
    m, nt, p = noeuds('praline')
    co = coords_objet(nt)
    v = voronoi(nt, 11, co)
    n = bruit(nt, 4, 5, 0.6, 0, co)
    r0 = rampe(nt, [(0.0, srgb(0.90, 0.40, 0.50)), (0.18, srgb(0.74, 0.08, 0.22)), (1.0, srgb(0.56, 0.03, 0.13))])
    nt.links.new(v.outputs['Distance'], r0.inputs['Fac'])
    r = nt.nodes.new('ShaderNodeMix'); r.data_type = 'RGBA'; r.blend_type = 'MULTIPLY'; r.inputs['Factor'].default_value = 0.35
    nt.links.new(r0.outputs['Color'], r.inputs['A']); nt.links.new(n.outputs['Color'], r.inputs['B'])
    nt.links.new(r.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.22
    p.inputs['Coat Weight'].default_value = 0.8; p.inputs['Coat Roughness'].default_value = 0.06
    p.inputs['Subsurface Weight'].default_value = 0.6; p.inputs['Subsurface Radius'].default_value = (1.0, 0.2, 0.3); p.inputs['Subsurface Scale'].default_value = 0.05
    h = nt.nodes.new('ShaderNodeMath'); h.operation = 'MULTIPLY_ADD'
    nt.links.new(v.outputs['Distance'], h.inputs[0]); h.inputs[1].default_value = -0.5
    nt.links.new(bruit(nt, 30, 4, 0.5, 0, co).outputs['Fac'], h.inputs[2])
    relief(nt, p, h.outputs['Value'], 0.35, 0.02)
    return m

R = 2.0; ANG = math.radians(48)
tarte = bpy.data.objects.new('tarte', None); lier(tarte); sur_plateau(tarte)
tarte.location = (-0.35, -1.25, 0.11); tarte.rotation_euler.z = math.radians(-8)
pate = part('pate', [(0, 0), (R, 0), (R + 0.04, 0.07), (R + 0.05, 0.46), (R + 0.02, 0.52), (R - 0.08, 0.54), (R - 0.14, 0.5), (R - 0.15, 0.1), (0.02, 0.1)], ANG, 36)
bv = pate.modifiers.new('bev', 'BEVEL'); bv.width = 0.02; bv.segments = 2; bv.limit_method = 'ANGLE'
deplacer(pate, 'CLOUDS', 0.25, 0.015, 2)
pate.data.materials.append(mat_pate_sucree()); pate.parent = tarte
garn = part('garniture', [(0.02, 0.1), (R - 0.15, 0.1), (R - 0.14, 0.44), (R - 0.22, 0.5), (R - 0.7, 0.52), (0.03, 0.49)], ANG, 36)
bv = garn.modifiers.new('bev', 'BEVEL'); bv.width = 0.03; bv.segments = 3; bv.limit_method = 'ANGLE'
garn.data.materials.append(mat_praline()); garn.parent = tarte
mpral = mat_praline()
for i in range(9):
    o = maillage('eclat', lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1))
    t = random.uniform(0.04, 0.08); o.scale = (t * 1.3, t, t * 0.7)
    a = random.uniform(-0.6, 1.8); r = random.uniform(1.0, 1.9)
    o.location = (0.9 + math.cos(a) * r, -0.6 + math.sin(a) * r - 0.4, 0.14); o.rotation_euler = (random.uniform(0, 3), random.uniform(0, 3), random.uniform(0, 3))
    o.data.materials.append(mpral); sur_plateau(o)
creme = maillage('creme', lambda bm: bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1))
for v in creme.data.vertices:
    v.co.z = max(v.co.z, -0.2) + 0.08 * math.sin(math.atan2(v.co.y, v.co.x) * 3 + v.co.z * 4)
creme.scale = (0.5, 0.3, 0.22); creme.location = (1.95, 0.35, 0.16); creme.rotation_euler.z = math.radians(30)
lisser(creme, 1)
mcr_ = mat_simple('creme_fraiche', srgb(0.97, 0.95, 0.89), 0.3, sss=0.7)
mcr_.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value = 0.3
creme.data.materials.append(mcr_); sur_plateau(creme)

# ---- Verre à pied (ballon) et pot lyonnais, de rouge tous les deux ----
def verre_ballon():
    ext = [(0, 0), (0.72, 0), (0.74, 0.02), (0.72, 0.05), (0.14, 0.12), (0.075, 0.32), (0.065, 1.8), (0.13, 2.0), (0.55, 2.28), (0.88, 2.78), (0.95, 3.3), (0.87, 3.9), (0.69, 4.4), (0.68, 4.42)]
    inte = [(0.665, 4.42), (0.672, 4.4), (0.85, 3.9), (0.93, 3.3), (0.86, 2.8), (0.53, 2.31), (0.1, 2.06), (0, 2.05)]
    o = tourner_profil('ballon', ext + inte, 128); lisser(o, 1)
    o.data.materials.append(mat_verre('verre_vin', (1, 1, 1), 0.0))
    return o, inte

def interieur(inte, z0, z1, n=22, retrait=0.004):
    pts = sorted([(z, r) for r, z in inte])
    def rz(z):
        for (za, ra), (zb, rb) in zip(pts, pts[1:]):
            if za <= z <= zb: return ra + (rb - ra) * (z - za) / max(1e-6, zb - za)
        return pts[0][1] if z < pts[0][0] else pts[-1][1]
    prof = [(0.0, z0)] + [(max(0.0, rz(z0 + (z1 - z0) * k / (n - 1)) - retrait), z0 + (z1 - z0) * k / (n - 1)) for k in range(n)] + [(0.0, z1)]
    return prof

vin = mat_liquide('vin', (0.78, 0.03, 0.07), 3.0, 1.34, 0.0)
bal, inte = verre_ballon(); bal.location = (-1.9, 1.7, 0.0); sur_plateau(bal)
v1 = tourner_profil('vin_verre', interieur(inte, 2.065, 2.98), 96)
v1.data.materials.append(vin); v1.location = bal.location; sur_plateau(v1)

pot_ext = [(0, 0), (0.76, 0), (0.79, 0.04), (0.8, 0.2), (0.8, 3.8), (0.74, 4.2), (0.4, 4.75), (0.31, 5.1), (0.34, 5.2), (0.33, 5.27), (0.3, 5.3)]
pot_int = [(0.25, 5.3), (0.25, 5.1), (0.34, 4.75), (0.68, 4.2), (0.75, 3.8), (0.75, 0.75), (0.55, 0.64), (0, 0.6)]
pot = tourner_profil('pot', pot_ext + pot_int, 128); lisser(pot, 1)
pot.data.materials.append(mat_verre('verre_pot', (0.9, 0.97, 0.93), 0.0)); pot.location = (-4.4, 3.4, 0.0); sur_plateau(pot)
v2 = tourner_profil('vin_pot', interieur(pot_int, 0.605, 2.7), 96)
v2.data.materials.append(vin); v2.location = pot.location; sur_plateau(v2)
# Étiquette du bouchon sur le pot : une bande de papier.
et = tourner_profil('etiquette', [(0.805, 1.7), (0.805, 2.6)], 96)
et.modifiers.new('ep', 'SOLIDIFY').thickness = 0.006
et.data.materials.append(mat_simple('papier_et', srgb(0.92, 0.88, 0.78), 0.8)); et.location = pot.location; sur_plateau(et)

executer(
    test=((1.6, -11.5, 4.6), (0.4, 2.0, 2.2), 45, 4.5, 0),
    tour=((1.6, -11.5, 4.6), (0.4, 2.0, 2.2), 45, 4.5),
    vues=[
        ('hero', (1.6, -11.5, 4.6), (0.4, 2.0, 2.2), 45, 4.5, 0, None),
        ('photo_0', (2.8, -5.5, 2.6), (0.5, -0.6, 0.35), 90, 2.8, 0, None),
        ('photo_1', (0.4, -2.0, 4.6), (0.4, 7.2, 3.5), 55, 5.6, 0, None),
        ('photo_2', (-0.3, -4.2, 3.4), (-1.3, 1.9, 2.8), 85, 2.8, 0, None),
        ('photo_3', (0.9, -0.62, 12), (0.9, -0.6, 0), 50, 5.6, 0, None),
        ('photo_4', (-6.5, -7.5, 3.4), (-2.2, 2.0, 1.8), 55, 3.2, 0, None),
        ('photo_5', (4.5, -6.5, 1.2), (0.5, -0.4, 0.6), 80, 2.8, 0, None),
        ('photo_6', (-3.2, -5.2, 1.5), (-0.8, 0.3, 1.1), 65, 3.2, 0, None),
        ('photo_7', (5.5, -9.5, 5.5), (-0.6, 2.2, 2.4), 40, 4.0, 0, None),
    ])
