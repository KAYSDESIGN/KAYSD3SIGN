# MOTOFORGE — Feuille de route v1 (Honda CB125R JC91)

Légende : ✅ terminé · 🟡 en cours · ⛔ bloqué (ressource manquante) · ⏳ à faire

## Étapes (§18)

| # | Étape | Statut | Notes |
|---|---|---|---|
| 1 | Examiner le projet existant | ✅ | Dépôt vide (README seul). |
| 2 | Vérifier l'environnement | ✅ | Conteneur Linux sans Xcode. Toolchain Swift 6.1 Linux installée pour tester le cœur métier. Build iOS / simulateur / iPhone : **nécessite un Mac** avec Xcode 26. |
| 3 | Examiner les maquettes | ✅ | Planche de 8 écrans reçue (`docs/mockups/00-planche-v1.png`). Écarts avec le cahier des charges listés dans `docs/mockups/README.md`. |
| 4 | CLAUDE.md | ✅ | Règles permanentes. |
| 5 | Architecture + design system | ✅ | Package `MotoForgeKit` (6 modules), tokens, composants de base, coquille de navigation 5 onglets. |
| 6 | Écrans fidèles aux maquettes | 🟡 | 8 écrans + barre flottante + menu écrits. **Non compilés** (pas de Mac) : à valider sur Xcode 26 / simulateur. |
| 7 | Moteur de personnalisation local | 🟡 | Logique pure testée. Compositeur Core Image écrit (`MFRendering`) : brillant/satiné/mat/métallisé/nacré/candy, bicolore. **Non validé** faute de visuels et masques. |
| 8 | Ressources visuelles CB125R | ⛔ | 6 visuels de référence sous licence + masques par composant à produire/obtenir. |
| 9 | Catalogue vérifié | ⛔ | 30 références à sourcer (fabricant, référence, compatibilité, prix daté, homologation). |
| 10 | Projets & budget | 🟡 | Logique testée + écrans (projets, comparaison, partage texte, budget, liste d'achat). Export d'images : après intégration des visuels. |
| 11 | Services IA | ⏳ | Abstraction prête, aucun fournisseur (aucun service payant). |
| 12 | Tests simulateur / iPhone | ⏳ | Nécessite un Mac. |

## Ressources manquantes (bloquantes)

1. **Maquettes manquantes** : Menu/paramètres, studio de peinture avancé, studio covering, ajout de moto, états vides. Construits pour l'instant avec des composants système sobres.
2. **Visuels de référence CB125R JC91** : 6 angles cohérents (même éclairage, même fond neutre, même résolution, idéalement ≥ 2400 px), avec droits d'usage commercial écrits. Options : shooting photo d'une moto réelle (recommandé), rendus 3D sous licence, ou visuels presse Honda avec autorisation.
3. **Masques par composant et par angle** (PNG niveaux de gris, même taille que la base). Peuvent être préparés semi-automatiquement (segmentation) puis retouchés.
4. **Données véhicule sourcées** : années couvertes par JC91, versions commercialisées en France, coloris d'origine avec codes Honda.
5. **Catalogue** : 30 références avec source fabricant ; visuels d'accessoires détourés par angle (droits).
6. **Références RAL** : la correspondance sRGB des teintes RAL est sous licence RAL gGmbH ; à obtenir via une source autorisée avant d'afficher des teintes RAL comme « références ».
7. **Compte Apple Developer** (signature iPhone) et **Mac avec Xcode 26** pour compiler l'app.

## Décisions à valider

- Cible minimale **iOS 17** (SwiftData) avec Liquid Glass natif à partir d'iOS 26. Alternative : iOS 26 minimum (plus simple, base d'utilisateurs plus restreinte).
- Pays d'homologation par défaut : **FR**.
- Devise par défaut : **EUR**.
- Supabase (offre gratuite) pour le catalogue distant — pas encore créé.

## Fonctionnalités marquées « Bientôt disponible » en v1

- Finitions avancées non rendues (`PaintEffect.renderAvailability == .planned`) : caméléon, iridescent, holographique, chromé, anodisé, carbone, fluorescent, etc.
- Intégration des catalogues de films de covering (`WrapFilmProduct`).
- Toutes les fonctions IA.
- Synchronisation cloud.
