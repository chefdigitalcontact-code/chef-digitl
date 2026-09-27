// Chez Dani : contenu repris de la maquette existante (chef-digital-app/public/demo-chezdani.html),
// présenté avec les 6 pages des sites clients actuels. Voir les remarques de cohérence dans le message.
window.CLIENTS = {
    titre: 'Chez Dani',
    cle: 'maquette-chez-dani',
    designs: [
        { n: 1, style: 'dani', nom: 'Chez Dani', type: 'Le Lyonnais en 3D', resto: {
            nom: 'Chez Dani',
            surtitre: 'Lyon · Burger artisanal',
            accroche: 'Le burger artisanal lyonnais qui régale depuis 2015',
            stats: [{ v: '4.7', l: 'Note Google sur 5' }, { v: '100%', l: 'Produits locaux' }],
            histoireTitre: 'Une passion transmise de génération en génération',
            histoire: "Le burger artisanal lyonnais qui régale depuis 2015. Chaque assiette qui sort de notre cuisine est l'expression d'un savoir-faire hérité, revisité avec les produits des marchés lyonnais. Nous travaillons directement avec nos producteurs locaux pour vous offrir ce qu'il y a de meilleur.",
            badge: 'Coup de cœur',
            piedTexte: "Un restaurant authentique au cœur de Lyon, où chaque plat raconte l'histoire d'un terroir.",
            adresse: '12 rue de la République, 69001 Lyon', tel: '04 78 12 34 56',
            horaires: ['Mardi – Vendredi : 12h–14h30', 'Mardi – Samedi : 19h–23h', 'Dimanche : 12h–15h', 'Lundi : Fermé'],
            bouton: 'RÉSERVER UNE TABLE',
            categories: [
                { nom: 'Burgers Signature', plats: [
                    { nom: 'Le Lyonnais', desc: 'Steak 180g, Saint-Marcellin coulant, oignons caramélisés, sauce aux herbes', prix: '14.90' },
                    { nom: 'Le Dani Classic', desc: 'Steak 180g, cheddar affiné, tomates confites, roquette, sauce maison', prix: '13.50' },
                    { nom: 'Le Végétarien', desc: 'Galette quinoa-lentilles, chèvre frais, légumes grillés, pesto basilic', prix: '12.90' },
                    { nom: 'Le BBQ Pulled', desc: 'Porc effiloché 12h, sauce BBQ fumée, coleslaw croquant, oignons frits', prix: '14.50' }] },
                { nom: 'Accompagnements', plats: [
                    { nom: 'Frites maison', desc: 'Pommes de terre fraîches coupées sur place', prix: '4.50' },
                    { nom: 'Frites de patates douces', desc: 'Servies avec sauce curry-miel', prix: '5.50' },
                    { nom: 'Salade verte', desc: 'Mesclun frais, vinaigrette balsamique', prix: '4.00' },
                    { nom: 'Onion rings', desc: "Rondelles d'oignons panées croustillantes", prix: '5.00' }] },
                { nom: 'Boissons', plats: [
                    { nom: 'Bières artisanales', desc: 'Sélection locale (33cl)', prix: '5.50' },
                    { nom: 'Sodas maison', desc: 'Citronnade, thé glacé pêche', prix: '4.50' },
                    { nom: 'Eaux', desc: 'Plate ou gazeuse (50cl)', prix: '3.00' }] },
                { nom: 'Desserts', plats: [
                    { nom: 'Brownie maison', desc: 'Chocolat noir, noix de pécan, glace vanille', prix: '6.50' },
                    { nom: 'Cheese-cake', desc: 'Coulis fruits rouges maison', prix: '6.00' }] }
            ]
        } }
    ]
};
