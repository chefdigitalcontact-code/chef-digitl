import sys
# Assemble une page de maquettes animées à partir de la page d'origine (même balisage, mêmes textes)
# et des fichiers de ce dossier : thèmes CSS, script de page, scènes 3D.
# Usage : python3 assembler.py <dossier> cd|ae
G = sys.argv[1]
ESSAIS = '/home/user/chef-digitl/essais/'
def lire(p): return open(p, encoding='utf-8').read()

def assembler(ancien, sortie, titre, polices, themes, page_js, js3d, marque_base, marque_sel, insertion_scene, premiere):
    s = lire(ancien)
    css = s[s.index('<style>') + len('<style>'):s.index('</style>')]
    base = css[:css.index(marque_base)]
    sel = css[css.index(marque_sel):]
    markup = s[s.index('<div class="site m1" id="site">'):s.index('<nav class="selecteur"')]
    markup = markup.replace('<div class="site m1" id="site">', '<div class="site m' + str(premiere) + '" id="site">', 1)
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
    assembler(ESSAIS + 'maquettes-chef-digital.html', ESSAIS + 'maquettes-chef-digital-3d-2.html', 'Chef Digital Maquettes 12 à 16',
        'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=DM+Sans:opsz,wght@9..40,400..700&family=JetBrains+Mono:wght@500;600&family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;1,400&family=Manrope:wght@400;500;600;700&family=Montserrat:wght@700;800&family=Mulish:wght@400;500;600;700;800&family=Onest:wght@400;500;600;700&family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Schibsted+Grotesk:wght@400;500;600;700;800&family=Unbounded:wght@400;500;600&family=Yellowtail&family=Young+Serif&display=swap',
        'cd-themes.css', 'cd-page.js', 'cd-3d.js',
        '/* ---- Apparitions au défilement', '/* ==========================================================================\n   Sélecteur de maquette',
        ('<section class="hero">', '\n            <div class="scene-3d" aria-hidden="true"><canvas id="scene-3d"></canvas></div>'), 12)

if cible == 'ae':
    assembler(ESSAIS + 'maquettes-aegis.html', ESSAIS + 'maquettes-aegis-3d-2.html', 'Aegis Maquettes 12 à 16',
        'https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600&family=Castoro:ital@0;1&family=Cinzel:wght@500;600&family=Crimson+Pro:ital,wght@0,400..600;1,400..500&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Inter+Tight:wght@400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Marcellus&family=Nunito+Sans:opsz,wght@6..12,400..700&family=Petrona:ital,wght@0,400..600;1,400..500&family=Source+Sans+3:wght@400;500;600&display=swap',
        'ae-themes.css', 'ae-page.js', 'ae-3d.js',
        '/* ==========================================================================\n   1 · CLASSIQUE', '/* ---- Sélecteur de maquette',
        ('<div class="hero-art" aria-hidden="true">', '\n                    <div class="scene-3d"><canvas id="scene-3d"></canvas></div>'), 12)
