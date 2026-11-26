---
name: motoforge-pwa
description: Build, test, deploy and debug the MOTOFORGE PWA in web/ (React, TS strict, Vite, Tailwind, Zustand, Dexie, R3F, vite-plugin-pwa) — iPhone install, offline cache, safe areas, Playwright at iPhone sizes and the free Cloudflare deployment. Use for any work in web/.
---

# MOTOFORGE PWA

## Commands (in `web/`)
| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Unit tests | `npm test` (Vitest, `src/**/*.test.ts`) |
| Build | `npm run build` (sync catalog → tsc → vite) |
| E2E | `npx playwright test --trace off` (375/390/393/430 Chromium + WebKit iPhone 13) |
| E2E on prod | `E2E_URL=https://motoforge.homehub-28saz.workers.dev npx playwright test` |
| Deploy | `npm run deploy` (needs `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` unless a proxy injects it; in the cloud session add `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`) |

Playwright is pinned to the browsers in `/opt/pw-browsers`: do not run `playwright install` locally.

## Architecture
`src/domain` (pure, tested) · `src/data` (catalog, visuals) · `src/store` (Zustand + Dexie, nav with history) · `src/engine` (three/R3F, lazy-loaded) · `src/ui` (kit, Glass) · `src/screens`. The `Configuration` is the source of truth; angles never change it; every edit goes through history (undo/redo).

## iPhone rules
- `viewport-fit=cover`, `env(safe-area-inset-*)`, `dvh` units, `.pb-dock` under content when the dock is visible.
- iOS limits WebGL contexts: thumbnails use the single shared off-screen renderer (`engine/snapshot.ts`), never one Canvas per card.
- Handle WebGL context loss; `frameloop="demand"`.
- Data lives in IndexedDB (Dexie): survives closing the app; Safari may evict it after weeks without use when not installed on the home screen.

## Deployment
`scripts/deploy-worker.mjs` publishes `dist/` as a single Cloudflare Worker (free plan, files embedded as modules, no asset-upload token). `.github/workflows/web.yml` builds, tests and deploys when the `CLOUDFLARE_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable exist. Never enable a paid plan. Free Worker limit: 3 MB compressed — check `tar czf - dist | wc -c` if assets grow.
