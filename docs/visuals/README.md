# Visuels de référence — Honda CB125R JC91

## Pourquoi un modèle 3D et pas des photos

- Aucune série de photographies libres de droits de la JC91 sous six angles cohérents n'existe : Wikimedia Commons ne propose que 3 photos, toutes de la génération précédente (JC79, 2018-2020), sous des angles et éclairages disparates.
- Les photos constructeur et presse sont protégées par le droit d'auteur.
- L'environnement de développement ne dispose d'aucun outil de génération d'images.

Le projet utilise donc un **modèle 3D procédural** (`tools/bike3d/cb125r_jc91.py`, Blender 4.2 LTS) construit aux **cotes officielles Honda** :

| Cote | Valeur | Source |
|---|---|---|
| Longueur × largeur × hauteur | 2040 × 820 × 1055 mm | Honda Japon, 19/03/2021 |
| Empattement | 1345 mm | Honda Japon / Honda Motor Europe |
| Hauteur de selle | 815 mm | Honda Japon |
| Chasse / déport | 24,2° / 90 mm | Honda Motor Europe 24YM |
| Pneus | 110/70R17 · 150/60R17 | Honda Japon |
| Freins | disque flottant 296 mm + étrier radial 4 pistons · disque 220 mm | Honda Motor Europe |
| Fourche | Showa SFF-BP inversée 41 mm | Honda Motor Europe |

Chaque élément personnalisable est un objet séparé : les **masques sont exacts** (rendus avec occultation, sans segmentation approximative) et **issus de la même géométrie pour les six angles**.

Les visuels sont la propriété du projet. L'app les présente comme une représentation 3D simplifiée, jamais comme des photographies.

## Régénérer

```sh
blender -b -P tools/bike3d/cb125r_jc91.py -- /tmp/cb_final --samples 64 --size 1600x1100
python3 tools/bike3d/install_assets.py /tmp/cb_final      # asset catalog + contrôles de cohérence
python3 tools/catalog/build_catalog.py /tmp/cb_final      # vues + masques dans catalog.json
```

`contact_sheet.png` montre les six angles avec les boîtes englobantes des masques.
