#!/usr/bin/env python3
"""
Builds a PRIVATE photo pack for the MOTOFORGE PWA (imported on the device, never deployed, never committed).

  python3 tools/photoqc/make_pack.py <source_dir> <qc_report.json> <out_dir> [--height 1200]

source_dir: photo_<angle>.png (RGBA cut-out) + photo_mask_<angle>_<component>.png (grayscale masks, same size)
Each view is trimmed to the bike, scaled so every angle has the same bike height (harmonised scale),
placed on a transparent canvas with the ground line at the same position, and its masks get the identical transform.
The QC verdict of every angle is copied into manifest.json: the app only displays ACCEPTED views and shows the
rejection reasons for the others. Rejected views are still packed so the user can see why they are refused.
"""
import argparse, json, os, re, shutil
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("qc"); ap.add_argument("out")
ap.add_argument("--height", type=int, default=1200)
o = ap.parse_args()
qc = json.load(open(o.qc))
if os.path.isdir(o.out): shutil.rmtree(o.out)
os.makedirs(o.out)
PAD = 0.04
views = []
for angle, v in qc["views"].items():
    src = os.path.join(o.src, f"photo_{angle}.png")
    if v.get("missing") or not os.path.exists(src): continue
    img = Image.open(src).convert("RGBA")
    a = np.asarray(img)[..., 3]
    ys, xs = np.nonzero(a > 15)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    s = o.height / (box[3] - box[1])
    bw = round((box[2] - box[0]) * s)
    pad = round(o.height * PAD)
    W, H = bw + 2 * pad, o.height + 2 * pad

    def place(im, mode):
        im = im.crop(box).resize((bw, o.height), Image.LANCZOS)
        canvas = Image.new(mode, (W, H), 0 if mode == "L" else (0, 0, 0, 0))
        canvas.paste(im, (pad, pad))
        return canvas

    place(img, "RGBA").save(os.path.join(o.out, f"{angle}.png"), optimize=True)
    masks = []
    for f in sorted(os.listdir(o.src)):
        m = re.fullmatch(rf"photo_mask_{angle}_(.+)\.png", f)
        if not m: continue
        mk = place(Image.open(os.path.join(o.src, f)).convert("L"), "L")
        area = int((np.asarray(mk) > 127).sum())
        if area < 100: continue
        name = f"{angle}__{m.group(1)}.png"
        mk.save(os.path.join(o.out, name), optimize=True)
        masks.append({"component": m.group(1), "file": name, "area": area})
    masks.sort(key=lambda m: -m["area"])   # large parts first, small parts drawn on top
    views.append({"angle": angle, "file": f"{angle}.png", "width": W, "height": H, "accepted": bool(v.get("accepted")),
                  "rejectReasons": v.get("rejectReasons", []), "masks": [{"component": m["component"], "file": m["file"]} for m in masks]})

manifest = {"format": "motoforge-photo-pack", "version": 1, "generation": qc["generation"],
            "source": "Jeu privé de l'utilisateur — usage personnel, non redistribué", "reviewedAt": qc.get("reviewedAt"),
            "setNotes": qc.get("setNotes", []), "views": views}
json.dump(manifest, open(os.path.join(o.out, "manifest.json"), "w"), indent=1, ensure_ascii=False)
print(f"{len(views)} vues ({sum(v['accepted'] for v in views)} acceptées) → {o.out}")
