# MOTOFORGE — Avancement (web)

Mis à jour : 2026-11-26. Lire ce fichier en premier (skill `motoforge-token-optimizer`).

## En ligne
**https://motoforge.homehub-28saz.workers.dev** — iPhone : Safari → Partager → « Sur l'écran d'accueil ».

## Terminé et vérifié
- PWA React 19 + TS strict + Vite + Tailwind 4 + Zustand + Dexie + R3F, manifeste, icônes, Apple touch icon, mode standalone, service worker (cache versionné, 25 fichiers dont le GLB), safe areas, `dvh`.
- Modèle 3D unique de la CB125R (Blender → GLB), 6 angles + rotation libre + zoom, sélection par clic, 23 finitions PBR, motifs, stickers, covering partiel, accessoires montés en 3D (dont remplacement du silencieux d'origine), avant/après, annuler/rétablir.
- Garage, projets (duplication, comparaison, favoris, export image), budget (devise d'origine, estimation vs vérifié, pièces sans prix publié jamais comptées 0 €), liste d'achat, catalogue vérifié (compatibilité et homologation sourcées), menu.
- Tests : Vitest 8/8 ; Playwright parcours complet 5/5 (375×812, 390×844, 393×852, 430×932 Chromium + WebKit iPhone 13) **sur la version déployée** ; test hors ligne 4/4 Chromium (WebKit : non émulable par Playwright).
- Déploiement gratuit : `npm run deploy` (Worker unique, fichiers embarqués) ; workflow `.github/workflows/web.yml` (build + tests + déploiement si secret Cloudflare présent).
- Skills : frontend-design, liquid-glass-web, pollinations-api, motoforge-design/-graphics/-catalog/-pwa/-token-optimizer. Playwright MCP déclaré dans `.mcp.json`.

## Limites connues
- Réfraction liquid glass réelle uniquement dans Chromium ; Safari/iOS = verre dépoli teinté.
- Pages Cloudflare : l'envoi d'assets refuse l'authentification du proxy de session → Workers utilisé à la place (limite gratuite 3 Mo compressés ; actuel ≈ 1,2 Mo).
- Déploiement automatique depuis GitHub : nécessite d'ajouter le secret `CLOUDFLARE_API_TOKEN` et la variable `CLOUDFLARE_ACCOUNT_ID` au dépôt (action du propriétaire).
- 17 références sur 30 (GIVI, Kappa, SW-Motech…) sans offre sourcée → « Prix non publié ».
- Bundle principal ~1 Mo (three chargé à la demande dans l'atelier).

## Prochaine tâche
Test sur iPhone réel par le propriétaire (installation écran d'accueil, hors ligne, rotation), puis corrections issues de ce retour. Ensuite : sourcer les prix GIVI/Kappa manquants.
