#!/usr/bin/env python3
"""
Installs accessory renders + clean plates and derives masks of stock parts that are not components.

  python3 tools/bike3d/install_accessories.py <acc_render_dir> <base_render_dir>
"""
import json, os, sys, shutil
import numpy as np
from PIL import Image
ACC, BASE = sys.argv[1], sys.argv[2]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
XC = os.path.join(ROOT, "App/Resources/Assets.xcassets")

def folder(name):
    d = os.path.join(XC, name)
    if os.path.isdir(d): shutil.rmtree(d)
    os.makedirs(d)
    json.dump({"info": {"author": "xcode", "version": 1}}, open(os.path.join(d, "Contents.json"), "w"))
    return name

def imageset(fold, name, img):
    d = os.path.join(XC, fold, f"{name}.imageset"); os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, f"{name}.png"), compress_level=6)
    json.dump({"images": [{"idiom": "universal", "filename": f"{name}.png"}], "info": {"author": "xcode", "version": 1}},
              open(os.path.join(d, "Contents.json"), "w"))

acc_f = folder("Accessories"); clean_f = folder("CB125R Clean")
for f in sorted(os.listdir(ACC)):
    if f.startswith("acc_") and f.endswith(".png"):
        img = Image.open(os.path.join(ACC, f)).convert("RGBA")
        bbox = img.getbbox()
        imageset(acc_f, f[:-4], img)
        print(f, "visible" if bbox else "empty")
    elif f.startswith("clean_") and f.endswith(".png"):
        clean = Image.open(os.path.join(ACC, f)).convert("RGBA")
        imageset(clean_f, f[:-4], clean)
        # Stock parts without a component mask (e.g. muffler): derive a mask from base vs clean plate.
        part, angle = f[len("clean_"):-4].split("_", 1)
        if part == "muffler":
            base = np.asarray(Image.open(os.path.join(BASE, f"cb125r_{angle}.png")).convert("RGBA")).astype(int)
            c = np.asarray(clean).astype(int)
            diff = np.abs(base - c).sum(axis=2) > 24
            m = Image.fromarray((diff * 255).astype(np.uint8), "L")
            imageset("CB125R Masks", f"mask_{angle}_muffler", m)
            print(f"mask_{angle}_muffler", int(diff.sum()), "px")
