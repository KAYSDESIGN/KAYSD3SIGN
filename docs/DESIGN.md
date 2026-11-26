# MOTOFORGE — Design

Maquettes validées : `docs/mockups/` (référence officielle). Captures actuelles de la PWA : générées par Playwright dans `web/e2e-shots/` (artefact CI `web-screenshots`).

## Tokens
| Rôle | Valeur | Web (Tailwind `@theme`) |
|---|---|---|
| Fond | `#F5F5F7` | `bg-bg` |
| Texte principal | `#17171C` | `text-ink` |
| Texte secondaire | `#777780` | `text-ink-2` |
| Accent | `#7938F5` | `accent` |
| Graphite | `#202124` | `graphite` |

Police système (SF Pro sur iPhone), icônes Lucide (web) / SF Symbols (iOS). Composants partagés : `web/src/ui/kit.tsx` (Btn, WideBtn, Card, Segmented, Chip, Header, Sheet, Badge, Empty, Slider…).

## Principes
- Boutons compacts, espacements généreux, cartes arrondies, ombres discrètes.
- Barre de navigation flottante en verre (dock) ; verre réservé à la navigation et aux commandes de l'atelier.
- **Liquid glass web** : réfraction réelle (SVG `feDisplacementMap`, skill `liquid-glass-web`) dans Chromium. Safari/iOS : repli `backdrop-filter` teinté (`.glass`, blanc 72 %) — ce n'est pas de la réfraction, et ce n'est pas présenté comme tel.
- Scène de la moto **neutre** (gris clair, aucune teinte d'accent) pour juger les couleurs.
- Interdits : dégradés décoratifs, glows, gros boutons, empilement de cartes, faux Liquid Glass.
- Badges honnêtes : « Simulation » (finitions non calculées physiquement), « Estimation » (prix non vérifié), « Prix non publié », « Non vérifié » (homologation).

## Écrans (web)
Accueil · Garage (+ ajout de moto) · Atelier (6 vues, rotation, zoom, annuler/rétablir, sélection, peinture, covering, accessoires, avant/après) · Catalogue · Fiche produit · Mes projets (comparaison, favoris) · Budget / liste d'achat · Menu.
