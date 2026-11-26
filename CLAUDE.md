# MOTOFORGE — Règles permanentes du projet

> Imagine. Personnalise. Roule.
> Application iOS native de personnalisation virtuelle de motos, basée sur des pièces réellement commercialisées et compatibles.

Ce fichier est la référence permanente pour tout travail sur ce dépôt. Il prime sur les habitudes par défaut.

## 1. Règles absolues

1. **Ne jamais inventer de données** : références, prix, avis, compatibilités, homologations, codes couleur constructeur ou RAL. Toute donnée catalogue doit avoir une **source** et une **date de vérification**. Sans source → statut `unverified`, jamais affichée comme vérifiée.
2. **Ne jamais déduire une homologation** à partir du nom d'un produit (« homologué », « E-mark », « CE »…). Seul un `HomologationRecord` sourcé, propre au pays + véhicule + configuration de montage, fait foi. Sinon : `Non vérifié`.
3. **Catalogue** : n'afficher que les pièces dont la compatibilité avec la moto sélectionnée est **vérifiée**.
4. **Pas de faux fonctionnement** : une fonctionnalité non disponible est clairement marquée « Bientôt disponible » (`FeatureAvailability.planned`). Pas de rotation 360° présentée comme réelle, pas de rendu IA présenté comme fidèle.
5. **Effets simulés** : tout effet dépendant de l'éclairage non calculé physiquement est marqué « Simulation ». Les rendus IA non vérifiés sont marqués « Aperçu illustratif ».
6. **Aucun secret dans l'app** : pas de clé API privée dans le binaire, le dépôt ou `Info.plist`. Les appels IA/payants passent par un backend (fonction serveur) qui détient les clés. Données sensibles locales → Keychain.
7. **Aucun service payant** activé ou souscrit sans accord explicite de l'utilisateur.
8. **Aucun bouton sans comportement défini.**
9. **Maquettes validées = référence officielle.** Ne pas réinterpréter. Les maquettes vivent dans `docs/mockups/`. Tant qu'un écran n'a pas de maquette, ne pas inventer son design final : construire la structure et le signaler.
10. **Périmètre v1** : uniquement **Honda CB125R JC91**. Pas de voitures. Pas d'évolutions futures (3D, AR, 360°, communauté, premium…) avant validation du prototype.

## 2. Identité visuelle (tokens dans `MFDesignSystem`)

| Token | Valeur |
|---|---|
| Fond | `#F5F5F7` |
| Texte principal | `#17171C` |
| Texte secondaire | `#777780` |
| Accent | `#7938F5` |
| Graphite | `#202124` |

- SF Pro (police système), SF Symbols uniquement.
- Boutons compacts, espacements généreux, cartes arrondies, ombres discrètes.
- Barre de navigation flottante. **Liquid Glass natif** (`glassEffect`, `TabView` système iOS 26+) réservé à la navigation et aux commandes pertinentes. Sur iOS < 26 : matériaux système Apple, jamais un flou maison présenté comme du Liquid Glass.
- Interdits : dégradés omniprésents, glows, gros boutons, empilement de cartes, surcharge, faux Liquid Glass.
- L'UI autour de la moto doit être **neutre** : aucune teinte d'interface ne doit altérer la perception des couleurs de la moto (pas d'accent ni de tint derrière le rendu).
- Ne jamais coder une couleur/espacement/rayon en dur dans une vue : passer par `MFColor`, `MFSpacing`, `MFRadius`, `MFTypography`.

## 3. Architecture

Voir `docs/ARCHITECTURE.md`. Résumé :

- `App/` : cible iOS (SwiftUI, point d'entrée, injection des dépendances, écrans par feature).
- `Packages/MotoForgeKit/` : package Swift modulaire.
  - `MFDomain` — modèles métier purs (`Codable`, `Sendable`, `Hashable`), identifiants stables. **Aucune dépendance UI.**
  - `MFEngine` — logique pure : configuration centrale, commandes, undo/redo, plan de rendu par angle, couleurs (RGB/HEX/HSB), budget, homologation, compatibilité, comparaison.
  - `MFCatalog` — dépôts catalogue (local JSON embarqué, distant Supabase plus tard), validation stricte des données.
  - `MFAI` — abstraction fournisseur IA (protocoles + fournisseur « indisponible » par défaut).
  - `MFPersistence` — SwiftData (iOS) + implémentation mémoire (tests).
  - `MFDesignSystem` — tokens et composants SwiftUI réutilisables.
- MVVM : vues SwiftUI ← `@Observable` ViewModels ← services/protocoles du package.
- **La configuration (`ProjectConfiguration`) est la source de vérité, indépendante des images.** Chaque angle est rendu à partir de la même configuration. Changer d'angle ne modifie jamais la configuration.
- Modifications simples (couleur, finition) calculées **localement** (Core Image / Metal). L'IA n'est jamais appelée pour régénérer toute la moto à chaque modification.

## 4. Conventions de code

- Swift 6, concurrence stricte. Types de domaine en `struct`/`enum`, `Sendable`.
- Identifiants stables sous forme de slugs lisibles : `honda`, `honda.cb125r`, `honda.cb125r.jc91`, `honda.cb125r.jc91.tank`… (type `Identifier<Tag>`).
- Montants : `Money` (`Decimal` + code devise ISO 4217). Jamais `Double` pour l'argent.
- Toute donnée externe porte une `Verification` (source, URL, date, statut).
- Code et identifiants en anglais ; textes UI en français via String Catalog (`Localizable.xcstrings`).
- Accessibilité : chaque contrôle a un `accessibilityLabel` ; support Dynamic Type ; aucune information portée par la couleur seule.
- Toute vue gère ses états : chargement, vide, erreur, contenu.
- Pas de `print` en production → `Logger` (os).

## 5. Tests

- `swift test` dans `Packages/MotoForgeKit` (fonctionne aussi sous Linux pour `MFDomain`, `MFEngine`, `MFCatalog`, `MFAI`).
- Tests UI (XCUITest) dans la cible app, à exécuter sur Mac (simulateur puis iPhone).
- Tout nouveau calcul (budget, couleurs, homologation, compatibilité, historique) doit être couvert par un test.

## 6. Build iOS

Le projet Xcode est généré par **XcodeGen** depuis `project.yml` :

```sh
brew install xcodegen   # une fois
xcodegen generate
open MotoForge.xcodeproj
```

Ne pas committer `MotoForge.xcodeproj` (généré).

## 7. Pipelines de données et de visuels

- **Visuels moto** : `tools/bike3d/cb125r_jc91.py` (Blender 4.2 LTS, cotes officielles Honda) → `install_assets.py` (asset catalog + contrôles de cohérence) → `tools/catalog/build_catalog.py` (vues et masques dans `catalog.json`). Voir `docs/visuals/README.md`.
- **Accessoires 3D** : `--accessory <id>` (moto en holdout = occultations exactes), `--cleanplate <pièce>` pour les pièces remplacées, puis `install_accessories.py`.
- **Catalogue** : toute donnée est saisie dans `tools/catalog/build_catalog.py` avec sa source et sa date ; `catalog_report.py` régénère `docs/CATALOG.md`. Ne jamais éditer `catalog.json` à la main.
- **CI** : `.github/workflows/ios.yml` (runners macOS gratuits, dépôt public) compile, lance tous les tests et exporte les captures d'écran (`ScreenshotTests`). `scripts/ci_fetch_artifact.sh <url signée>` récupère les erreurs.

## 8. Compte rendu

Après chaque étape : fonctionnalités terminées, tests effectués, problèmes rencontrés, éléments restants. Tenir `docs/ROADMAP.md` à jour.

## 9. Application web (PWA) — priorité actuelle

- Dossier `web/` : React + TypeScript strict + Vite + Tailwind + Zustand + Dexie + three/R3F/drei + vite-plugin-pwa. L'app iOS reste dans le dépôt, en pause.
- Lire d'abord `docs/PROGRESS.md` (état + prochaine tâche), puis le skill utile : `motoforge-pwa`, `motoforge-design`, `motoforge-catalog`, `motoforge-graphics`, `motoforge-token-optimizer`.
- Toutes les règles ci-dessus s'appliquent au web (tokens via le thème Tailwind, aucune donnée inventée, aucun bouton factice, badges « Simulation » / « Estimation » / « Prix non publié »).
- Avant tout commit web : `npm test`, `npm run build`, `npx playwright test --trace off`.
- Déploiement gratuit uniquement (`npm run deploy`, Cloudflare Workers). Aucun plan payant.
- Mettre à jour `docs/PROGRESS.md` avant chaque arrêt ou compaction.
