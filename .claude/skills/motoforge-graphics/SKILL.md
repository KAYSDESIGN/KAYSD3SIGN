---
name: motoforge-graphics
description: How MOTOFORGE bike and accessory visuals are produced — the Blender CB125R pipeline, the GLB used by the web 3D viewer, node naming, PBR finishes and what generation engines are (not) available. Use when adding a component, an accessory model, a finish, a sticker, or when asked to generate images.
---

# MOTOFORGE graphics

## One model, every angle
The web app renders **one GLB** (`web/public/models/cb125r-jc91.glb`) with three.js/R3F. The 6 angles are camera presets (`web/src/data/visuals.ts` `ANGLES`); free rotation and zoom come from OrbitControls. Never produce six independent AI images of the bike.

## Rebuild the GLB
```sh
/opt/blender-4.2.3-linux-x64/blender -b -P tools/bike3d/cb125r_jc91.py -- --export-glb web/public/models/cb125r-jc91.glb
```
Node names: `cmp~<component-slug>~n` (paintable), `acc~<render-id>~n` (accessory, hidden unless fitted), `stock~<part>~n` (stock part hidden when an accessory replaces it), `fixed~x~n`. Use `~`: three.js strips `:` and `.` from names.
Map catalog variants → renders in `PART_RENDERS` (`visuals.ts`), with `hides` / `replacesStock`.

## Materials
`web/src/engine/materials.ts`: MeshPhysicalMaterial per finish (`domain/finishes.ts`), shader patterns (gradient, stripes, carbon, …) injected via `onBeforeCompile`, stickers via drei `Decal`. Finishes not physically computed are flagged `simulated` and shown with the "Simulation" badge.

## Photorealistic views (priority requirement)
Method and state: `docs/visuals/PHOTO_PIPELINE.md`. Photos → SAM masks → `tools/photoqc/qc.py` (auto checks + per-view mechanical review: engine, discs, transmission, exhaust, mirrors, wheels, fork, bodywork, logos, colour) → `make_pack.py` → imported on the device (Menu → Vues photo privées). Only ACCEPTED views are displayed; never substitute an approximation. Private photos and Honda photos are never committed nor deployed.

## Reconstruction from real photos (tools/recon3d)
`docs/visuals/RECONSTRUCTION_3D.md`. `python3 tools/recon3d/reconstruct.py <generation>` (refs/<generation>.json → rights gate → TRELLIS.2 via HF Space with `Authorization: Bearer`, NOT gradio_client token= → run.sh) (align on the dimensioned reference, never mirror, fuse sides, transfer cmp~ tags, add acc~, export GLB, render 6 angles, photoqc) → Menu → Modèle 3D reconstruit. Hunyuan3D is excluded (licence excludes the EU). Self-test without GPU: `make_selftest.py`.

## Generation engines
- No GPU, no ComfyUI and no image MCP are connected in this environment. Do not claim one.
- Pollinations (`.claude/skills/pollinations-api`) works only with the user's key stored outside the repo (`~/.config/pollinations/agent-key`, never commit or print it). Its output is "Aperçu illustratif", never a faithful render, never used for the catalog.
- Public images are not free to reuse: record licence and source in `docs/ASSETS.md` before adding any file.
- Private photos (`App/PrivatePhotos/`) are never committed (public repo).
