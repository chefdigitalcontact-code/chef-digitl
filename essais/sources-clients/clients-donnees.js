// Données des maquettes client : les restaurants d'exemple de chef-digital-sites (worker/index.js,
// DONNEES_EXEMPLE et EXEMPLES_PAR_GABARIT), tels que les aperçus de gabarits les affichent.
window.CLIENTS = {
    titre: 'Maquettes client',
    cle: 'maquette-client-3d',
    designs: [
        { n: 1, style: 'ardoise', nom: 'Ardoise', type: 'Bistrot, ardoise et vin', resto: {
            nom: 'Le Bistrot de la Place',
            accroche: 'Une cuisine généreuse et authentique au cœur de la ville',
            adresse: '12 Place des Terreaux, 69001 Lyon', tel: '04 78 00 00 00',
            horaires: ['Mar-Sam 12h-14h30 / 19h-22h30'],
            bouton: 'RÉSERVER UNE TABLE',
            categories: [
                { nom: 'Entrées', plats: [
                    { nom: 'Salade Lyonnaise', desc: 'Lardons fumés, croûtons dorés, œuf poché', prix: '12.00' },
                    { nom: 'Pâté en croûte maison', desc: "Confiture d'oignons rouges, moutarde à l'ancienne", prix: '14.00' }] },
                { nom: 'Plats', plats: [
                    { nom: 'Quenelle de brochet', desc: 'Sauce Nantua maison, riz pilaf', prix: '22.00' },
                    { nom: "Bavette à l'échalote", desc: 'Frites maison, salade verte', prix: '19.50' }] },
                { nom: 'Desserts', plats: [
                    { nom: 'Tarte aux pralines', desc: 'Spécialité lyonnaise, crème fraîche', prix: '8.00' }] }
            ]
        } },
        { n: 2, style: 'four', nom: 'Four à bois', type: 'Pizzeria, four à bois', resto: {
            nom: 'Pizzeria Bella Napoli',
            accroche: 'Pizza napolitaine au feu de bois, depuis 1998',
            adresse: '5 Cours Vitton, 69006 Lyon', tel: '04 78 90 00 00',
            horaires: ['Mar-Dim 18h30-23h'],
            bouton: 'RÉSERVER UNE TABLE',
            categories: [
                { nom: 'Pizze', plats: [
                    { nom: 'Margherita', desc: 'Tomate San Marzano, mozzarella di bufala, basilic', prix: '11.00' },
                    { nom: 'Diavola', desc: 'Salami piquant, tomate, mozzarella', prix: '13.50' }] },
                { nom: 'Desserts', plats: [
                    { nom: 'Tiramisu maison', desc: 'Recette traditionnelle italienne', prix: '6.50' }] }
            ]
        } },
        { n: 3, style: 'sakura', nom: 'Sakura', type: 'Sushi, plateau', resto: {
            nom: 'Sakura Sushi',
            accroche: 'Sushis et sashimis préparés minute par notre chef japonais',
            adresse: '20 Rue Victor Hugo, 69002 Lyon', tel: '04 78 40 00 00',
            horaires: ['Mar-Dim 12h-14h / 19h-22h'],
            bouton: 'RÉSERVER UNE TABLE',
            categories: [
                { nom: 'Sushis', plats: [
                    { nom: 'Saumon (6 pièces)', desc: 'Saumon frais, riz vinaigré', prix: '9.50' },
                    { nom: 'California roll', desc: 'Avocat, surimi, tobiko', prix: '10.50' }] },
                { nom: 'Plats', plats: [
                    { nom: 'Chirashi saumon', desc: 'Riz vinaigré, saumon, avocat, edamame', prix: '18.00' }] }
            ]
        } },
        { n: 4, style: 'smash', nom: 'Smash', type: 'Burger, comptoir', resto: {
            nom: 'Le Comptoir Burger',
            accroche: 'Burgers gourmets, viande fraîche hachée sur place',
            adresse: '8 Rue de la République, 69002 Lyon', tel: '04 72 00 00 00',
            horaires: ['Lun-Dim 11h30-22h30'],
            bouton: 'COMMANDER EN LIGNE',
            categories: [
                { nom: 'Burgers', plats: [
                    { nom: 'Le Classique', desc: 'Bœuf fermier, cheddar affiné, sauce maison', prix: '13.50' },
                    { nom: 'Le Bacon Melt', desc: 'Bacon fumé, oignons caramélisés, comté', prix: '15.00' }] },
                { nom: 'Accompagnements', plats: [
                    { nom: 'Frites maison', desc: 'Coupe épaisse, sel de Guérande', prix: '5.00' }] }
            ]
        } },
        { n: 5, style: 'pression', nom: 'Pression', type: 'Brasserie, pression', resto: {
            nom: 'La Brasserie du Marché',
            accroche: 'Brasserie traditionnelle, produits frais du marché',
            adresse: '3 Place des Célestins, 69002 Lyon', tel: '04 78 30 00 00',
            horaires: ['Lun-Sam 12h-14h30 / 19h-23h'],
            bouton: 'RÉSERVER UNE TABLE',
            categories: [
                { nom: 'Entrées', plats: [
                    { nom: 'Œuf mayonnaise', desc: 'Recette de grand-mère', prix: '7.00' }] },
                { nom: 'Plats', plats: [
                    { nom: 'Steak frites', desc: 'Bœuf français, frites maison', prix: '21.00' },
                    { nom: 'Sole meunière', desc: 'Beurre noisette, pommes vapeur', prix: '26.00' }] }
            ]
        } }
    ]
};
