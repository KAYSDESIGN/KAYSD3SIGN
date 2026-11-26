---
name: motoforge-design
description: MOTOFORGE visual rules for the web PWA (web/) and the iOS app — tokens, liquid glass usage, neutral stage around the bike, screen states and French copy. Use before creating or changing any MOTOFORGE screen, component, colour, spacing or icon.
---

# MOTOFORGE design

Reference: `docs/DESIGN.md` (full rules) and `docs/mockups/` (validated mockups = official reference, never reinterpret).

## Tokens (web: `web/src/index.css` `@theme`; iOS: `MFDesignSystem`)
| Token | Value |
|---|---|
| Background | `#F5F5F7` |
| Ink | `#17171C` |
| Ink 2 | `#777780` |
| Accent | `#7938F5` |
| Graphite | `#202124` |

Never hard-code a colour, radius or spacing in a component: use the Tailwind theme tokens (`bg-bg`, `text-ink`, `text-ink-2`, `bg-accent`, `rounded-[var(--radius-card)]` …) or `ui/kit.tsx` components.

## Rules
1. System font (SF Pro on iPhone), Lucide icons only (web) / SF Symbols (iOS).
2. Compact buttons, generous spacing, rounded cards, discreet shadows. No gradients as decoration, no glow, no oversized buttons, no stacked cards.
3. Liquid glass only for navigation (dock, floating headers, sheets' handles, workshop toolbars): `ui/Glass.tsx`. Real refraction exists in Chromium only (`mode:'backdrop'`); WebKit/iOS shows the `.glass` tinted backdrop-filter fallback. Never call the fallback "liquid glass" in copy.
4. The stage around the bike stays **neutral** (light grey, no accent, no tint) so paint colours are judged correctly.
5. Every screen handles loading, empty, error and content. Every button has a defined behaviour; unavailable = "Bientôt disponible", never a dead button.
6. Accessibility: `aria-label` on icon buttons, no information carried by colour alone, 44 px targets, `prefers-reduced-motion` respected.
7. Copy in French, sentence case, verbs on buttons ("Ajouter au projet" → toast "Ajouté au projet").
8. Simulated effects (iridescence, chrome, candy…) carry the "Simulation" badge; estimated prices carry "Estimation".

## Verify
`cd web && npx playwright test` → screenshots in `web/e2e-shots/<project>/`; look at 375×812 and WebKit before handing over.
