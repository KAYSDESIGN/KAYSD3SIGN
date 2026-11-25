# Maquettes validées

Référence visuelle stricte (CLAUDE.md §1.9 et §2).

| Fichier | Contenu |
|---|---|
| `00-planche-v1.png` | Planche de 8 écrans : Accueil, Mon garage, Catalogue, Détail produit, Atelier, Mes projets, Budget projet, Liste d'achat |

## Correspondance écran → code

| Maquette | Vue |
|---|---|
| Accueil | `App/Sources/Features/Home/HomeView.swift` |
| Mon garage | `App/Sources/Features/Garage/GarageView.swift` (+ `AddMotorcycleView`) |
| Catalogue | `App/Sources/Features/Catalog/CatalogView.swift` |
| Détail produit | `App/Sources/Features/Catalog/ProductDetailView.swift` |
| Atelier | `App/Sources/Features/Workshop/WorkshopView.swift` (+ `PaintStudioView`) |
| Mes projets | `App/Sources/Features/Projects/ProjectsView.swift` |
| Budget projet | `App/Sources/Features/Projects/BudgetView.swift` |
| Liste d'achat | `App/Sources/Features/Projects/ShoppingListView.swift` |
| Barre flottante | `MFFloatingTabBar` (MFDesignSystem) |
| Menu | pas de maquette → liste système sobre (`MenuView`) |

## Écarts imposés par le cahier des charges (à valider)

| Maquette | Implémentation | Règle |
|---|---|---|
| Peugeot 307 dans le garage | Absente | §6 « Ne pas intégrer de voitures » |
| Note « 4,8 (56 avis) » | Absente | §10 « Ne jamais inventer d'avis clients » |
| Produits et prix d'exemple (MIVV, PUIG, K&N…) | Non repris : le catalogue n'affiche que des références sourcées | §10, CLAUDE.md §1.1 |
| « Ajouter au panier » (fiche produit) | « Ajouter au projet » (la liste d'achat tient lieu de panier, aucun paiement intégré) | §10 actions disponibles |
| « Ajouter au panier (2) » (liste d'achat) | « Commander chez les vendeurs (2) » → liens vendeurs | Pas de paiement in-app |
| Fiche produit courte | Complétée sous le bloc maquette : référence, homologation, compatibilité/adaptateurs, vendeurs, sources | §10 fiche produit |
| Catégories budget « Équipements », « Formation / Admin », « Moto (achat) » | Pièces et accessoires, Peinture, Covering, Main-d'œuvre, Livraison | §13 |
| Filtres « Tous / En cours / Terminés » | + « Favoris » | §4 « Mes projets et favoris » |
| Atelier « Personnaliser / Configurer » | Personnaliser = maquette ; Configurer = liste des éléments, modes, historique, budget | §7 |
| Photos de motos | Emplacements neutres « Visuel à venir » tant que les visuels sous licence ne sont pas fournis | §3 ressources autorisées |
| Galerie « Inspirations » | Carte « Bientôt disponible » | Aucun visuel autorisé disponible |
