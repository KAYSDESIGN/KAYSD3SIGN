# Reconstruction 3D à partir de photographies réelles

Objectif : un modèle 3D texturé et photoréaliste de la moto exacte, dont **toutes les vues sortent de la même géométrie** (rotation 360° réelle), découpé en composants personnalisables, chargé dans Three.js.

## Étude des outils (26/11/2026)

| Outil | Rôle | Licence | Exécutable ici (4 CPU, 15 Go, sans GPU) | Verdict |
|---|---|---|---|---|
| **TRELLIS.2** (Microsoft, déc. 2025, 4B) | image → maillage texturé PBR | MIT (code + poids) | Non en local (CUDA, ≥ 24 Go VRAM). Oui via le Space Hugging Face gratuit (ZeroGPU) | **Retenu** |
| TRELLIS (v1) | image → 3D | MIT | Non (CUDA). Space officiel en erreur de configuration | Remplacé par TRELLIS.2 |
| TripoSG (VAST, 1.5B) | image → forme (+ texture séparée) | MIT | Non en local ; Space ZeroGPU (même quota) | Alternative |
| Hunyuan3D 2 / 2.1 / 2mv / Part | image(s) → 3D texturé | Tencent Hunyuan Community | — | **Exclu** : la licence « ne s'applique pas dans l'Union européenne, au Royaume-Uni et en Corée du Sud » |
| Meshroom / AliceVision | photogrammétrie | MPL-2.0 | Cartes de profondeur CUDA uniquement | Pour un futur jeu de 50–200 photos de la moto réelle, sur une machine avec GPU NVIDIA |
| SAM 2.1 | segmentation | Apache-2.0 | Oui (CPU) | Disponible ; le découpage 3D se fait ici par transfert géométrique (plus fiable sur un maillage) |
| Blender 4.2 LTS | alignement, découpe, rendus, export GLB | GPL (outil, pas de contrainte sur les fichiers produits) | Oui | **Utilisé** |
| three.js / R3F | affichage 360°, matériaux temps réel | MIT | Oui | **Utilisé** |

Calcul distant gratuit : Hugging Face ZeroGPU est le seul accès gratuit à un GPU assez gros pour TRELLIS.2 (Colab/Kaggle : T4 16 Go, insuffisant pour TRELLIS.2 ; Colab nécessite en plus une session navigateur).

## Pipeline (réutilisable pour toute moto)

```
photos réelles ──► reconstruct_trellis2.py (1 photo 3/4 gauche + 1 photo 3/4 droite)
               ──► run.sh <génération> <dossier> gauche.glb droite.glb
                     assemble.py (Blender) :
                       alignement sur le modèle de référence coté (cotes Honda), échelle, sol, ICP — jamais de miroir
                       fusion : côté gauche issu de la photo gauche, côté droit de la photo droite (asymétries réelles)
                       découpe en composants cmp~/stock~/fixed~ par transfert depuis la référence
                       luminance de texture par composant (repeinture qui garde l'ombrage photographié)
                       accessoires acc~ ajoutés (même repère → montés à leur vraie place)
                       export GLB + 6 rendus (0/45/90/180/225/270°) depuis la même géométrie
                     photoqc/qc.py sur les rendus + revue mécanique (disques, chaîne, échappement…)
               ──► app : Menu → Modèle 3D reconstruit (stocké sur l'appareil, jamais publié)
                     atelier : rotation libre, couleurs/finitions/accessoires en temps réel sur ce modèle
```

Nouvelle moto : un modèle de référence coté (même nommage de nœuds) + `tools/photoqc/specs/<génération>.json`.

## Vérifié ici

- Auto-test sans GPU (`make_selftest.py`) : maillage unique non étiqueté, tourné, réduit, bruité. Alignement retrouvé (écart médian 0 mm sans bruit, 6 mm avec 15 mm de bruit) ; composants retrouvés à 99,9 % (≈ 96 % avec bruit).
- Fusion gauche/droite, rendus 6 angles depuis une seule géométrie, contrôle qualité automatique.
- Dans l'app : import du GLB, rotation libre, réservoir repeint en rouge en conservant la texture, changement d'angle sans changer la configuration.
- Le contrôle détecte que le modèle simplifié actuel a des profils trop hauts (rapport 1,43 contre 1,67 sur la vue officielle Honda).

## Bloqué — ressource manquante précise

**Quota GPU ZeroGPU pour le compte Hugging Face « Motoforge ».** Le jeton est valide, mais depuis l'IP partagée de cet environnement cloud, le Space TRELLIS.2 applique le quota anonyme (épuisé : « 0s left »). Contourner l'identification n'est pas fait (refusé, à juste titre).

Débloquer, sans dépense :
1. Depuis ton ordinateur ou ton iPhone, connecté à Hugging Face : ouvrir https://huggingface.co/spaces/microsoft/TRELLIS.2, déposer la photo, « Extract GLB », télécharger le fichier, puis me l'envoyer ici. Ou lancer `reconstruct_trellis2.py` sur ton ordinateur avec `HF_TOKEN`.
2. Photos d'entrée : deux photos réelles de ta CB125R, 3/4 avant côté gauche et 3/4 avant côté droit, fond dégagé, moto entière, non retournées (protocole : `PHOTO_PIPELINE.md`). Les vues du jeu privé actuel montrent toutes le même côté, et ont échoué au contrôle.

Ensuite : `run.sh` produit le modèle, les 6 vues et le rapport ; correction des incohérences signalées ; import dans l'app.
