# MOTOFORGE — Avancement (web)

Mis à jour : 2026-11-26 (vues photo). Lire ce fichier en premier (skill `motoforge-token-optimizer`).

## En ligne
**https://motoforge.homehub-28saz.workers.dev** — iPhone : Safari → Partager → « Sur l'écran d'accueil ».

## Terminé et vérifié
- PWA React 19 + TS strict + Vite + Tailwind 4 + Zustand + Dexie + R3F, manifeste, icônes, Apple touch icon, mode standalone, service worker (cache versionné, 25 fichiers dont le GLB), safe areas, `dvh`.
- Modèle 3D unique de la CB125R (Blender → GLB), 6 angles + rotation libre + zoom, sélection par clic, 23 finitions PBR, motifs, stickers, covering partiel, accessoires montés en 3D (dont remplacement du silencieux d'origine), avant/après, annuler/rétablir.
- Garage, projets (duplication, comparaison, favoris, export image), budget (devise d'origine, estimation vs vérifié, pièces sans prix publié jamais comptées 0 €), liste d'achat, catalogue vérifié (compatibilité et homologation sourcées), menu.
- Tests : Vitest 8/8 ; Playwright parcours complet 5/5 (375×812, 390×844, 393×852, 430×932 Chromium + WebKit iPhone 13) **sur la version déployée** ; test hors ligne 4/4 Chromium (WebKit : non émulable par Playwright).
- Déploiement gratuit : `npm run deploy` (Worker unique, fichiers embarqués) ; workflow `.github/workflows/web.yml` (build + tests + déploiement si secret Cloudflare présent).
- Skills : frontend-design, liquid-glass-web, pollinations-api, motoforge-design/-graphics/-catalog/-pwa/-token-optimizer. Playwright MCP déclaré dans `.mcp.json`.

## Vues photoréalistes (exigence prioritaire)
- Chaîne complète en place : QC automatique + revue mécanique (`tools/photoqc`), pack privé (`make_pack.py`), import sur l'appareil, mode Photo dans l'atelier avec recoloration par masques sur la configuration partagée (testé localement avec le jeu privé).
- **Bloqué : aucune vue fidèle disponible.** Le jeu privé échoue au contrôle (détails : `docs/visuals/QC_CB125R_JC91.md`) ; photos Honda non réutilisables ; aucun modèle 3D fidèle trouvé. Voir `docs/visuals/PHOTO_PIPELINE.md`.

## Reconstruction 3D depuis photos réelles
- Pipeline `tools/recon3d` en place et testé sans GPU (alignement sur cotes Honda, fusion gauche/droite, découpe en composants, accessoires, 6 rendus d'une même géométrie, QC). App : import d'un modèle reconstruit privé, rotation 360°, repeinture conservant la texture.
- Cause du refus ZeroGPU trouvée et corrigée (en-tête Authorization vs x-hf-authorization). `reconstruct.py <génération>` automatise tout : droits → TRELLIS.2 → alignement/composants → 6 rendus → QC.
- CB125R : modèle TRELLIS.2 cohérent obtenu, non accepté (côté gauche déduit par symétrie, proportions ≈ 10 %). **Manque : photos réutilisables du côté gauche** (aucune en ligne). Détails : `docs/visuals/RECONSTRUCTION_3D.md`.

## Limites connues
- Réfraction liquid glass réelle uniquement dans Chromium ; Safari/iOS = verre dépoli teinté.
- Pages Cloudflare : l'envoi d'assets refuse l'authentification du proxy de session → Workers utilisé à la place (limite gratuite 3 Mo compressés ; actuel ≈ 1,2 Mo).
- Déploiement automatique depuis GitHub : nécessite d'ajouter le secret `CLOUDFLARE_API_TOKEN` et la variable `CLOUDFLARE_ACCOUNT_ID` au dépôt (action du propriétaire).
- 17 références sur 30 (GIVI, Kappa, SW-Motech…) sans offre sourcée → « Prix non publié ».
- Bundle principal ~1 Mo (three chargé à la demande dans l'atelier).

## Prochaine tâche
Obtenir 2 photos réelles (3/4 gauche + 3/4 droit) → TRELLIS.2 dans le navigateur connecté → `tools/recon3d/run.sh` → import ; ou des photos fidèles (protocole dans `docs/visuals/PHOTO_PIPELINE.md`) → détourage, QC, pack, intégration. En parallèle : Test sur iPhone réel par le propriétaire (installation écran d'accueil, hors ligne, rotation), puis corrections issues de ce retour. Ensuite : sourcer les prix GIVI/Kappa manquants.
