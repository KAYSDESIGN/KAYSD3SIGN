# MOTOFORGE — Projet

> Imagine. Personnalise. Roule.

Personnalisation virtuelle de motos avec des pièces **réellement commercialisées et compatibles**. v1 : Honda CB125R JC91 uniquement. Utilisateur actuel : le propriétaire du dépôt (usage personnel).

## Deux applications, un catalogue
| | Web (PWA) — **priorité actuelle** | iOS natif — en pause |
|---|---|---|
| Dossier | `web/` | `App/`, `Packages/MotoForgeKit/` |
| Rendu | Modèle 3D unique (three.js/R3F), rotation libre | Rendus Blender pré-calculés + masques, Core Image |
| Données | IndexedDB (Dexie), hors ligne | SwiftData |
| Déploiement | https://motoforge.homehub-28saz.workers.dev (Cloudflare Workers, gratuit) | GitHub Actions macOS (compilation, tests) |

Le catalogue (`catalog.json`) est commun aux deux : voir `docs/CATALOG.md` et `docs/SOURCES.md`.

## Critères de réussite (web)
Ouvrir sur iPhone · ajouter à l'écran d'accueil · sélectionner la CB125R · la voir sous 6 angles et en rotation libre · recolorer chaque élément indépendamment · choisir une finition · parcourir les pièces vérifiées · essayer une pièce sur la moto · enregistrer des projets · voir le budget · retrouver ses données après fermeture. État : voir `docs/PROGRESS.md`.

## Règles
`CLAUDE.md` (règles absolues : aucune donnée inventée, aucun secret, aucun service payant sans accord, aucun bouton factice).
