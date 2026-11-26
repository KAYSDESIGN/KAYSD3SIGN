# MOTOFORGE — Architecture

## Vue d'ensemble

```
┌─────────────────────────── App (cible iOS, SwiftUI) ───────────────────────────┐
│  Features/  Home · Garage · Catalog · Projects · Menu · Workshop (atelier)     │
│  Vues SwiftUI  ←  ViewModels @Observable (MVVM)  ←  AppEnvironment (DI)        │
└───────────────┬───────────────┬───────────────┬───────────────┬────────────────┘
                │               │               │               │
        MFDesignSystem     MFEngine        MFCatalog       MFPersistence      MFAI
        tokens, glass,     configuration,  dépôts, JSON    SwiftData +        protocole
        boutons, badges    undo/redo,      embarqué,       mémoire            fournisseur,
                           plan de rendu,  validation                         « indisponible »
                           couleurs,
                           budget, homolog.
                \               \               |               /              /
                 └───────────────┴──────── MFDomain ───────────┴──────────────┘
                              modèles purs, Codable, Sendable, IDs stables
```

Règle de dépendance : tout dépend de `MFDomain` ; `MFDomain` ne dépend de rien. Seuls `MFDesignSystem`, `MFPersistence` (partie SwiftData) et l'app importent des frameworks Apple UI/persistance. `MFDomain`, `MFEngine`, `MFCatalog`, `MFAI` compilent et se testent aussi sous Linux.

## Modèles de données (§14 du cahier des charges)

| Exigence | Type | Fichier |
|---|---|---|
| MotorcycleBrand / Model / Generation / Variant | `struct` | `MFDomain/Vehicle/Motorcycle.swift` |
| MotorcycleView, ComponentMask | `struct` (+ `ViewAngle` : 6 angles) | idem |
| MotorcycleComponent | `struct` + `ComponentKind` + `CustomizationMode` | `MFDomain/Vehicle/MotorcycleComponent.swift` |
| Material, PaintEffect (23 finitions) | `MFDomain/Materials/Material.swift` |
| PaintColor | `MFDomain/Materials/PaintColor.swift` |
| WrapDesign | `MFDomain/Materials/WrapDesign.swift` |
| AccessoryCategory (19), Accessory, AccessoryVariant, AccessoryCompatibility, AccessoryVisualAsset, MerchantOffer | `MFDomain/Catalog/Accessory.swift` |
| HomologationRecord (4 statuts) | `MFDomain/Catalog/Homologation.swift` |
| UserGarage, CustomizationProject, ProjectConfiguration, ProjectBudget, ShoppingListItem | `MFDomain/Project/Project.swift` |

Transverses : `Identifier<T>` (slugs stables), `Verification` (source + date + statut), `Money` (`Decimal` + ISO 4217), `PriceKind` (vérifié / estimation / saisi), `FeatureAvailability` (disponible / prévu).

## Moteur de personnalisation hybride (§11)

| Couche | Rôle | Implémentation |
|---|---|---|
| 1. Visuels de référence | Une photo/rendu par angle | `MotorcycleView.baseImageAsset` + licence `Verification` |
| 2. Masques | Un masque niveaux de gris par composant et par angle | `ComponentMask` (asset, bornes, zIndex) |
| 3. Matériaux | Couleur + finition, ombres/reflets conservés | `Material` → compositeur Core Image (phase 3) |
| 4. Accessoires | Ancrage, échelle, orientation, masquage de la pièce d'origine, occultations | `AccessoryVisualAsset` + `RenderPlanBuilder` |
| 5. IA | Suggestions, segmentation, rendus illustratifs | `MFAI.AIProvider` via backend |

**Source de vérité unique** : `ProjectConfiguration` ne contient aucune image. `RenderPlanBuilder.plan(for:angle:)` produit, pour chaque angle, une liste ordonnée de `RenderLayer` (base → effacements → composants/accessoires triés par zIndex → occultants). Changer d'angle = recalculer un plan à partir de la même configuration ; la configuration n'est jamais modifiée (test `switchingAnglesNeverChangesConfiguration`).

**Compositeur (phase 3, à venir)** : pour chaque `.component`, le masque délimite la zone ; la couleur est appliquée en conservant la luminance de la photo d'origine (mode de fusion « couleur » + courbe de luminance), puis gloss/rugosité modulent les hautes lumières extraites de la photo. Calcul 100 % local (Core Image, Metal si nécessaire). Les effets dépendant de l'éclairage sont étiquetés « Simulation » (`PaintEffect.isLightingSimulation`). Les finitions non rendues sont « Bientôt disponible » (`PaintEffect.renderAvailability`).

**Sélection directe sur le visuel** : `ComponentHitTester` (bornes + test pixel du masque).

**Pas de 360°** : seuls les 6 angles existent (`ViewAngle`). `MotorcycleVariant.availableAngles` ne liste que les angles dont les visuels existent.

## Données catalogue & intégrité

- `CatalogSnapshot` versionné (`schemaVersion`, `revision`) : même format pour le JSON embarqué et le futur export Supabase.
- `CatalogRepository` (protocole) : `BundledCatalogRepository` (hors ligne) aujourd'hui ; `RemoteCatalogRepository` (Supabase, lecture seule, clé *anon* publique + RLS) et cache disque prévus.
- `CatalogValidator` : refuse toute fiche sans source/date, toute référence vide, toute compatibilité non vérifiée, tout statut d'homologation non sourcé, tout prix sans date. Exécuté dans les tests.
- Le catalogue n'expose que les références dont la compatibilité est vérifiée (`compatibleAccessories(for:)`).
- `HomologationResolver` : pays + véhicule + configuration de montage ; sans enregistrement sourcé → « Non vérifié ». Aucune inférence par le nom.

## Persistance & hors ligne

- `ProjectStore` (protocole) : `SwiftDataProjectStore` (`@ModelActor`) en production, `InMemoryProjectStore` pour tests/aperçus.
- Les projets sont stockés en JSON versionné dans un `@Model` (colonnes indexées dupliquées) → le domaine évolue sans migration SwiftData.
- Sauvegarde automatique : le ViewModel de l'atelier enregistre après chaque modification (debounce), `updatedAt` mis à jour par le store.
- Undo/redo : `History<ProjectConfiguration>` (instantanés), journal des modifications lisible.

## IA (§11 couche 5)

- L'app parle à **notre** backend (fonction serveur) ; le backend détient les clés du fournisseur. Changer de fournisseur = changer le backend.
- `AIPreservationConstraints` transmet véhicule, angle, configuration et zone modifiable : l'IA ne doit toucher que ce qui est demandé.
- Toute sortie générative est `isIllustrative = true` → badge « Aperçu illustratif ».
- v1 : `UnavailableAIProvider` (aucun service payant activé).

## Sécurité

- Aucun secret dans le dépôt ni le binaire (`.gitignore` couvre `.env`, `Secrets.xcconfig`).
- Clé Supabase *anon* uniquement (publique par conception), protégée par RLS ; aucune clé *service_role* côté app.
- Jetons de session utilisateur (synchro future) → Keychain.

## Build

- `project.yml` (XcodeGen) génère `MotoForge.xcodeproj` (non versionné).
- Cible iOS 17+ ; Liquid Glass natif à partir d'iOS 26 (`mfGlass`, `TabView` système), matériaux système Apple en dessous.

## Application web (PWA) — `web/`

Priorité actuelle ; l'app iOS reste intacte. Mêmes principes : la configuration est la source de vérité, indépendante de l'angle de vue.

```
src/domain   types, couleurs, finitions, historique, catalogue (compatibilité, homologation, offres), budget — logique pure, Vitest
src/data     catalog.json (copié depuis MFCatalog par scripts/sync-catalog.mjs), visuels (angles, PART_RENDERS), inspirations
src/store    Zustand (useApp) + Dexie/IndexedDB (bikes, projects, kv) ; nav.ts = onglets + pile synchronisés avec l'historique navigateur
src/engine   three.js / R3F : BikeViewer (Canvas unique, OrbitControls, Decal), materials (PBR + motifs shader), scene (index du GLB, application de la configuration), snapshot (rendu hors écran partagé pour les vignettes)
src/ui       kit de composants, Glass (liquid glass), icônes
src/screens  Accueil, Garage, Atelier, Peinture, Covering, Catalogue, Produit, Projets, Budget, Menu
```

- Un seul modèle 3D (`public/models/cb125r-jc91.glb`) pour tous les angles ; nœuds `cmp~`/`acc~`/`stock~`/`fixed~`.
- three/R3F chargés à la demande (atelier en `lazy`), `frameloop="demand"`, reprise après perte de contexte WebGL.
- Hors ligne : vite-plugin-pwa (Workbox, précache versionné, `cleanupOutdatedCaches`).
- Déploiement : `scripts/deploy-worker.mjs` → Cloudflare Workers gratuit ; CI `.github/workflows/web.yml`.
- Tests : Vitest (`src/**/*.test.ts`), Playwright (`e2e/`, 4 tailles iPhone Chromium + WebKit, `E2E_URL` pour tester la prod).
