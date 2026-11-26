---
name: motoforge-catalog
description: Rules and workflow for MOTOFORGE catalog data — parts, fitments, offers, prices, homologation — shared by iOS and the web PWA. Use whenever adding, editing or displaying a reference, a price, a compatibility or a homologation status.
---

# MOTOFORGE catalog

## Single source of truth
`tools/catalog/build_catalog.py` → `Packages/MotoForgeKit/Sources/MFCatalog/Resources/catalog.json` → copied to `web/src/data/catalog.json` by `web/scripts/sync-catalog.mjs` (runs on `npm run build`). Never edit either JSON by hand. `tools/catalog/catalog_report.py` regenerates `docs/CATALOG.md`.

## Non-negotiable
1. No invented data: every reference, price, fitment and homologation carries a `verification` (source, URL, date, status). No source → `unverified`, never shown as verified.
2. Only parts with a **trustworthy fitment** for the selected bike are listed (`compatibleAccessories`).
3. Homologation is never inferred from a product name ("homologué", "E-mark"…). Only a sourced record for country + vehicle + mounting counts; otherwise "Non vérifié".
4. Prices keep their own currency (`displayOffer`); never convert. A part without a published offer shows "Prix non publié" and is **never counted as 0 €** in the budget (`summarize().unpriced`).
5. Do not pad the catalog to reach a count.

## Add a reference
1. Find the manufacturer page (fitment) and a shop page (price); note the date.
2. Add it in `build_catalog.py` with both verifications; run it, then `catalog_report.py`.
3. Optional visual: add a render in the Blender script + `PART_RENDERS`.
4. `cd web && npm test` (catalog tests check fitments and homologation rules); `swift test` in `Packages/MotoForgeKit` when available.
5. Cite the sources in `docs/SOURCES.md`.
