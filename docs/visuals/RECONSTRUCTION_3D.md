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

## Diagnostic TRELLIS.2 (refus « quota ZeroGPU »)

Ni l'authentification ni le compte : **l'environnement réseau**.
- `gradio_client` 2.x n'envoie pas le jeton dans `Authorization` mais dans `x-hf-authorization`.
- Le proxy de l'environnement n'injecte le jeton enregistré que dans `Authorization` : le Space recevait le jeton factice, le jugeait invalide et appliquait le quota anonyme de l'IP partagée (« 0s left »).
- Correctif : envoyer `Authorization: Bearer …` (méthode documentée par Hugging Face pour les Spaces). Vérifié : appel GPU accepté sur le quota du compte alors que le quota anonyme était épuisé.
- Quota gratuit (documentation Hugging Face) : 5 min GPU/jour par compte (anonyme : 2 min). Une reconstruction TRELLIS.2 ≈ 150 s → environ 2 reconstructions par jour. Code de sortie 75 = quota épuisé.

## Plusieurs images d'une même moto

| Méthode | Résultat sur la CB125R |
|---|---|
| TRELLIS v1 multi-images (« experimental », algorithme stochastic), 4 vues en **une seule génération** | **Rejeté** : empreinte carrée (1,00 au lieu de 0,40) = deux motos croisées ; les vues à 90° ne sont pas placées dans un même repère |
| TRELLIS.2, une photo 3/4 avant | Géométrie texturée cohérente (373 000 faces, écart médian aux cotes Honda 15 mm), 6 vues depuis la même géométrie. **Côté caché déduit par symétrie** (disque avant et silencieux des deux côtés) ; profils ≈ 10 % trop hauts |
| Hunyuan3D-2mv (multi-vues) | Exclu : licence non applicable dans l'UE |
| Fusion de deux modèles indépendants | Abandonnée (demande explicite) ; l'option `--sides` reste dans assemble.py mais n'est pas utilisée |

Garde-fou ajouté : `assemble.py` rejette toute géométrie dont l'empreinte largeur/longueur dépasse 0,6 (au lieu de forcer l'alignement).

## Pipeline automatisé (toutes les motos)

```
tools/recon3d/refs/<génération>.json   images de référence : source, angle, droits (free | personal | reserved), priorité,
                                        + journal des recherches déjà faites (évite de les refaire)
python3 tools/recon3d/reconstruct.py <génération>
   1. contrôle des droits (reserved → refus)      2. TRELLIS.2 (en-tête Authorization, quota du compte)
   3. run.sh : barrière d'empreinte → alignement sur le modèle coté → composants → accessoires → GLB
               → 6 rendus d'une seule géométrie → photoqc (auto + revue mécanique reviews/<génération>-recon.json)
   sortie : build/recon/<génération>/ (ignoré par git ; marqué PRIVÉ si une source est personnelle)
app : Menu → Modèle 3D reconstruit (interface inchangée)
```

Nouvelle moto : un modèle de référence coté (`web/public/models/<modèle>-<code>.glb`, nœuds cmp~/stock~/acc~), `tools/photoqc/specs/<génération>.json`, `tools/recon3d/refs/<génération>.json`.

## État CB125R JC91 et ce qui manque

- Pipeline exécuté de bout en bout sur le jeu privé ; modèle importé et repeint dans l'app (test local). **Non accepté** : côté gauche déduit, proportions, logos (`build/recon/…/qc.md`).
- Découpe des composants : transférée depuis le modèle simplifié ; sur le modèle reconstruit, la zone « réservoir » est partielle → à affiner (transfert guidé par la texture/SAM).
- **Ressource manquante : des photos réutilisables du côté gauche du JC91.** Recherches faites (refs/honda.cb125r.jc91.json) : Wikimedia Commons (3 photos, toutes JC79 2018–2019), Flickr Creative Commons (1 photo amateur), Openverse (refusé depuis cet environnement), Honda (tous droits réservés). Aucune image autorisée n'existe en ligne pour ce modèle : je ne peux pas t'en fournir.
