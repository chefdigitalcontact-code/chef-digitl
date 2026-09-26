import sys, re
G = sys.argv[1]
def lire(p): return open(p, encoding='utf-8').read()

def assembler(ancien, sortie, titre, polices, themes, page_js, js3d, marque_base, marque_sel, insertion_scene):
    s = lire(ancien)
    css = s[s.index('<style>') + len('<style>'):s.index('</style>')]
    base = css[:css.index(marque_base)]
    sel = css[css.index(marque_sel):]
    markup = s[s.index('<div class="site m1" id="site">'):s.index('<nav class="selecteur"')]
    markup = markup.replace('<div class="site m1" id="site">', '<div class="site m7" id="site">', 1)
    avant, apres = insertion_scene
    assert markup.count(avant) == 1, avant
    markup = markup.replace(avant, avant + apres, 1)
    selecteur = s[s.index('<nav class="selecteur"'):s.index('<script>')]
    html = ('<title>' + titre + '</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="' + polices + '">\n'
        '<style>' + base + lire(G + '/' + themes) + '\n' + sel + '</style>\n\n'
        + markup + selecteur +
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>\n'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>\n'
        '<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>\n'
        '<script>\n' + lire(G + '/' + page_js) + '</script>\n'
        '<script type="importmap">\n{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/" } }\n</script>\n'
        '<script type="module">\n' + lire(G + '/' + js3d) + '</script>\n')
    open(sortie, 'w', encoding='utf-8').write(html)
    print(sortie, len(html))

cible = sys.argv[2]
if cible == 'cd':
    assembler('/home/user/chef-digitl/essais/maquettes-chef-digital.html', '/home/user/chef-digitl/essais/maquettes-chef-digital-3d.html', 'Chef Digital Maquettes 3D',
        'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=DM+Serif+Display:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&family=Gloock&family=IBM+Plex+Mono:wght@500;600&family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Montserrat:wght@700;800&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap',
        'cd-themes.css', 'cd-page.js', 'cd-3d.js',
        '/* ---- Apparitions au défilement', '/* ==========================================================================\n   Sélecteur de maquette',
        ('<section class="hero">', '\n            <div class="scene-3d" aria-hidden="true"><canvas id="scene-3d"></canvas></div>'))

if cible == 'ae':
    assembler('/home/user/chef-digitl/essais/maquettes-aegis.html', '/home/user/chef-digitl/essais/maquettes-aegis-3d.html', 'Aegis Maquettes 3D',
        'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=EB+Garamond:ital,wght@0,400..600;1,400..500&family=Figtree:wght@400;500;600&family=Gilda+Display&family=Hanken+Grotesk:wght@400;500;600&family=Karla:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..500&family=Public+Sans:wght@400;500;600&family=Spectral:ital,wght@0,500;1,500&family=Work+Sans:wght@400;500;600&display=swap',
        'ae-themes.css', 'ae-page.js', 'ae-3d.js',
        '/* ==========================================================================\n   1 · CLASSIQUE', '/* ---- Sélecteur de maquette',
        ('<div class="hero-art" aria-hidden="true">', '\n                    <div class="scene-3d"><canvas id="scene-3d"></canvas></div>'))
