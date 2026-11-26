#!/usr/bin/env python3
"""
Builds the PRIVATE photo visual set (never committed: App/PrivatePhotos is git-ignored).

  python3 tools/photoseg/build_private_set.py <photos_dir> <segmentation_root>

photos_dir/<angle>.png and segmentation_root/seg_<angle>/mask_<slug>.png  →
App/PrivatePhotos/photo_<angle>.png, photo_mask_<angle>_<slug>.png, photo_views.json
"""
import json, os, shutil, sys
import numpy as np
from PIL import Image

PHOTOS, SEG = sys.argv[1], sys.argv[2]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "App/PrivatePhotos")
GEN = "honda.cb125r.jc91"
COMPONENTS = {"tank", "tank-shrouds", "front-fender", "rear-fender", "tail-section", "front-wheel", "rear-wheel", "fork",
              "frame", "swingarm", "handlebar", "levers", "brake-calipers", "seat", "engine-covers", "protections"}
if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
views = []
for angle in ["front", "rear", "leftProfile", "rightProfile", "frontThreeQuarter", "rearThreeQuarter"]:
    src = os.path.join(PHOTOS, f"{angle}.png")
    if not os.path.exists(src): continue
    img = Image.open(src).convert("RGBA"); W, H = img.size
    img.save(os.path.join(OUT, f"photo_{angle}.png"), compress_level=6)
    masks = []
    segdir = os.path.join(SEG, f"seg_{angle}")
    for f in sorted(os.listdir(segdir)):
        if not f.startswith("mask_"): continue
        slug = f[5:-4]
        if slug not in COMPONENTS: continue
        m = Image.open(os.path.join(segdir, f)).convert("L"); a = np.asarray(m) > 127
        ys, xs = np.nonzero(a)
        if len(xs) < 200: continue
        m.save(os.path.join(OUT, f"photo_mask_{angle}_{slug}.png"), compress_level=6)
        masks.append({"componentID": f"{GEN}.{slug}", "maskAsset": f"photo:photo_mask_{angle}_{slug}",
                      "bounds": {"x": xs.min() / W, "y": ys.min() / H, "width": (xs.max() - xs.min() + 1) / W,
                                 "height": (ys.max() - ys.min() + 1) / H}, "_a": int(a.sum())})
    for z, m in enumerate(sorted(masks, key=lambda m: -m["_a"])):
        m["zIndex"] = z; del m["_a"]
    views.append({"id": f"{GEN}.photo.{angle}", "angle": angle, "baseImageAsset": f"photo:photo_{angle}",
                  "pixelWidth": W, "pixelHeight": H, "masks": masks,
                  "license": {"status": "verified", "source": "Photos fournies par l'utilisateur — usage personnel, non redistribuées",
                              "verifiedAt": "2026-11-26T00:00:00Z",
                              "notes": "Coloris Matt Gunpowder Black Metallic 23YM. Masques : SAM (tools/photoseg)."}})
json.dump(views, open(os.path.join(OUT, "photo_views.json"), "w"), indent=1, ensure_ascii=False)
print(f"{len(views)} views, {sum(len(v['masks']) for v in views)} masks → {OUT}")
