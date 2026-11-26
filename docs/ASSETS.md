# MOTOFORGE — Ressources et licences

| Ressource | Origine | Licence / statut |
|---|---|---|
| `web/public/models/cb125r-jc91.glb` | Modèle procédural original, `tools/bike3d/cb125r_jc91.py` (cotes officielles Honda) | Création du projet. Pas d'élément graphique Honda (logos, photos). |
| Accessoires 3D (dans le GLB) | Même script, modélisés d'après les dimensions publiées | Création du projet, représentation simplifiée |
| `web/public/stickers/*.png` | `tools/stickers/make_stickers.py`, formes originales, police DejaVu Sans Bold | Création du projet ; DejaVu : licence libre |
| `web/public/icons/*`, `favicon.svg` | `web/scripts/make_icons.py` | Création du projet |
| `web/src/lib/liquid-glass.js` | Skill liquid-glass-web (gentpan/liquidglass) | MIT (`.claude/skills/liquid-glass-web/LICENSE`) |
| Skill frontend-design | anthropics/skills | Apache-2.0 |
| three.js, @react-three/fiber, drei, React, Zustand, Dexie, Lucide, Vite, Tailwind, Workbox | npm | MIT / ISC / Apache-2.0 (vérifier `npm ls` avant ajout) |
| Playwright, @playwright/mcp | Microsoft | Apache-2.0 |
| Rendus iOS `App/Resources/` | Blender, même modèle | Création du projet |
| Photos personnelles `App/PrivatePhotos/`, packs photo | Propriétaire | **Privées, jamais committées ni déployées** ; importées sur l'appareil uniquement |
| Photos Honda (vue studio consultée pour le contrôle) | Honda Motor Europe | Tous droits réservés : consultées comme référence, jamais copiées dans le dépôt ni l'app |

## Règles
- Une image publique n'est pas libre de droits par défaut : pas d'ajout sans licence identifiée et notée ici.
- Photos produits fabricants : non utilisées (droits réservés) ; la fiche renvoie au site officiel.
- Images générées par IA (Pollinations, clé de l'utilisateur hors dépôt) : « Aperçu illustratif » uniquement, jamais dans le catalogue.
- Aucune génération graphique locale : pas de GPU ni de ComfyUI connectés dans l'environnement de développement.
