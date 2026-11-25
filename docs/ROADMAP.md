# MOTOFORGE — Feuille de route v1 (Honda CB125R JC91)

Légende : ✅ terminé · 🟡 en cours · ⛔ bloqué (ressource manquante) · ⏳ à faire

## Étapes (§18)

| # | Étape | Statut | Notes |
|---|---|---|---|
| 1 | Examiner le projet existant | ✅ | |
| 2 | Vérifier l'environnement | ✅ | Linux + Swift 6.1 (tests du cœur), Blender 4.2 (visuels), **GitHub Actions macOS (Xcode 26) pour compiler l'app** — gratuit, dépôt public. |
| 3 | Examiner les maquettes | ✅ | `docs/mockups/` ; écarts documentés. |
| 4 | CLAUDE.md | ✅ | |
| 5 | Architecture + design system | ✅ | 7 modules (dont `MFRendering`). |
| 6 | Écrans | ✅ | 8 écrans maquettés + Menu, Peinture avancée, Covering, Ajout de moto conçus dans le même langage visuel. Compilés et testés en CI. |
| 7 | Moteur de personnalisation local | ✅ | Peinture (6 finitions rendues, 17 « bientôt »), bicolore, covering multicalque, accessoires avec occultations et plaques propres, aperçu en direct. |
| 8 | Ressources visuelles CB125R | ✅ | Modèle 3D aux cotes Honda, 6 angles, 87 masques exacts (`docs/visuals/`). |
| 9 | Catalogue vérifié | ✅ | 30 références sourcées (`docs/CATALOG.md`), 7 avec représentation 3D montée. |
| 10 | Projets & budget | ✅ | Projets, comparaison, partage, budget, liste d'achat, inspirations. |
| 11 | Services IA | ⏳ | Abstraction prête ; aucun fournisseur activé (aucune dépense sans accord). |
| 12 | Tests simulateur / iPhone | 🟡 | Simulateur : CI (tests unitaires + UI + captures). iPhone physique : nécessite un compte Apple Developer et une signature. |

## Limites réelles (non automatisables ici)

1. **Photos réelles de la JC91** : aucune source libre de droits ; les visuels sont un modèle 3D simplifié (assumé et signalé dans l'app).
2. **Photos produits** : protégées par les fabricants ; l'app montre la pièce en 3D sur la moto ou renvoie au site officiel.
3. **Puig / R&G** : leurs sites bloquent la lecture automatisée ; données issues de revendeurs.
4. **Nuancier RAL** : sous licence RAL gGmbH.
5. **Installation sur iPhone** : signature avec un compte Apple Developer (99 €/an pour la distribution ; un compte gratuit permet l'installation personnelle depuis Xcode).

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
