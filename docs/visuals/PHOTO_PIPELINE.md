# Vues photoréalistes — méthode, état, blocage

Exigence : 6 vues photographiques fidèles (0°, 45°, 90°, 180°, 225°, 270°) de la moto exacte (marque, modèle, millésime, génération), fond transparent, moto entière, haute résolution, échelle et éclairage homogènes, configuration constructeur identique, asymétries respectées. Aucune approximation présentée comme exacte.

## Chaîne (identique pour toutes les motos)

1. **Sources** : photos dont l'origine et les droits sont connus (voir ci-dessous).
2. **Détourage + masques** : `tools/photoseg/segment.py` (SAM, facebook/sam-vit-base) → `build_private_set.py`.
3. **Contrôle qualité** : `tools/photoqc/qc.py <dossier> specs/<génération>.json --review reviews/<jeu>.json --md …`
   - automatique : fond transparent, moto entière (marge), résolution, proportions comparées à une vue officielle mesurée, éclairage homogène entre vues ;
   - revue mécanique par vue : moteur, disques de frein, transmission, échappement, rétroviseurs, jantes, fourche, carénages/angle, logos, coloris. Tout point non « ok » = vue refusée.
4. **Préparation** : `tools/photoqc/make_pack.py` — recadrage, même hauteur de moto pour tous les angles, même ligne de sol, masques transformés à l'identique, verdict QC par vue dans `manifest.json`.
5. **Intégration** : Menu → *Vues photo privées* → importer les fichiers du pack. Stockage IndexedDB sur l'appareil uniquement. Atelier → bouton *Photo* : seules les vues **acceptées** s'affichent ; les autres montrent les raisons du refus, jamais une image de remplacement.
6. **Personnalisation** : `web/src/photo/composite.ts` recolore chaque composant dans son masque en conservant l'ombrage de la photo, à partir de la **même configuration** que la 3D → une couleur choisie sur un angle s'applique à tous les angles où le composant est visible. Covering et accessoires : 3D uniquement pour l'instant (indiqué à l'écran).

Nouvelle moto : créer `tools/photoqc/specs/<génération>.json` (cotes + faits sourcés + vue officielle mesurée), puis étapes 1 à 5.

## État CB125R JC91 (26/11/2026)

**Aucune vue acceptée.** Rapport : `docs/visuals/QC_CB125R_JC91.md`.

| Source étudiée | Résultat |
|---|---|
| Jeu privé fourni (6 vues, Matt Gunpowder Black 23YM) | Refusé : disque avant visible des deux côtés (un seul disque réel), logos différents sur un même côté, profils 7 % plus allongés que la vue officielle, moto collée aux bords, « 3/4 arrière » à ≈ 200°. Probables images retournées ou générées. |
| Honda (hondanews.eu, honda.co.uk, honda.co.jp) | Une seule vue studio par coloris (profil). Pas de jeu multi-angles publié. Droits : « HONDA holds all copyrights of photos » — non réutilisable, et jamais publiable sur le site public. |
| Wikimedia Commons | Non vérifié aujourd'hui (API limitée en débit). Photos de rue éventuelles : angles, éclairages et motos différents → ne peuvent pas former un jeu cohérent. |
| Modèle 3D fidèle | Aucun modèle CB125R JC91 trouvé (Sketchfab, CGTrader, TurboSquid : autres modèles Honda seulement). |
| Génération d'images (Pollinations) | Écartée : les asymétries mécaniques ne sont pas tenues (cf. jeu refusé) ; résultat non contrôlable comme fidèle. |

Le modèle 3D du projet reste affiché, étiqueté « Modèle 3D simplifié … ce n'est pas une photo ».

## Débloquer — solution recommandée : vos propres photos

Droits clairs, moto exacte. Protocole :

- Moto propre, béquille latérale repliée si possible (sinon sur béquille d'atelier), guidon droit, rétroviseurs dans leur position d'usage, même configuration pour les 6 prises.
- Lieu : ciel couvert ou ombre uniforme, fond dégagé et uni (mur clair), sol plat.
- Appareil à hauteur du réservoir (≈ 80 cm), **à 6–8 m** avec zoom (≈ 2–3×) pour limiter la perspective ; même distance et même hauteur pour toutes les vues ; ne pas recadrer en coupant la moto.
- Angles autour de la moto (0° = face avant) : 0, 45, 90 (côté droit), 180, 225, 270 (côté gauche). Un repère au sol (craie) à chaque angle.
- Photos non retournées, non retouchées, pleine résolution (HEIC/JPEG d'origine).
- Envoi : à déposer dans la session (jamais dans le dépôt public). Détourage, contrôle, pack et intégration sont ensuite automatiques.

Alternative : achat d'un modèle 3D fidèle de la JC91 s'il en existe un (nécessite votre accord, aucun trouvé à ce jour).
