import sys
# Assemble les pages de maquettes client : python3 assembler.py <dossier> clients|dani
G = sys.argv[1]
ESSAIS = '/home/user/chef-digitl/essais/'
def lire(p): return open(G + '/' + p, encoding='utf-8').read()
POLICES = 'https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Anton&family=Barlow:wght@400;500;600;700&family=Caveat:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Fraunces:opsz,wght@9..144,500..700&family=Jost:wght@400;500;600;700&family=Karla:wght@400;500;600;700&family=Nunito+Sans:opsz,wght@6..12,400..800&family=Prata&family=Shippori+Mincho:wght@600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap'
def assembler(donnees, sortie, titre):
    html = ('<title>' + titre + '</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="' + POLICES + '">\n'
        '<style>\n' + lire('clients-themes.css') + '\n' + lire('selecteur.css') + '\n.selecteur { width: max-content; }\n.sel-fleche { flex: none; }\n</style>\n\n'
        '<div class="site" id="site"></div>\n'
        '<div class="boite-attente"><div class="scene-3d" id="boite-3d" aria-hidden="true" hidden><canvas id="scene-3d"></canvas></div></div>\n'
        '<div class="rideau" id="rideau" aria-hidden="true"></div>\n'
        + lire('selecteur.html') +
        '<script>\n' + lire(donnees) + '</script>\n'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>\n'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>\n'
        '<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>\n'
        '<script>\n' + lire('clients-page.js') + '</script>\n'
        '<script type="importmap">\n{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/" } }\n</script>\n'
        '<script type="module">\n' + lire('clients-3d.js') + '</script>\n')
    open(sortie, 'w', encoding='utf-8').write(html)
    print(sortie, len(html))
if sys.argv[2] == 'clients': assembler('clients-donnees.js', ESSAIS + 'maquettes-clients-3d.html', 'Maquettes client 3D')
if sys.argv[2] == 'dani': assembler('dani-donnees.js', ESSAIS + 'maquette-chez-dani.html', 'Maquette Chez Dani')
