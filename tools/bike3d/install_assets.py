#!/usr/bin/env python3
"""
Installs rendered CB125R visuals into the app asset catalog and checks cross-angle consistency.

  python3 tools/bike3d/install_assets.py <render_dir>

- bases  -> App/Resources/Assets.xcassets/CB125R/cb125r_<angle>.imageset (RGBA PNG)
- masks  -> .../CB125R Masks/mask_<angle>_<slug>.imageset (8-bit grayscale PNG)
- writes docs/visuals/contact_sheet.png and prints a consistency report.
"""
import json, os, sys, shutil
import numpy as np
from PIL import Image, ImageDraw

SRC = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
XC = os.path.join(ROOT, "App/Resources/Assets.xcassets")
ANGLES = ["front", "rear", "leftProfile", "rightProfile", "frontThreeQuarter", "rearThreeQuarter"]

def imageset(folder, name, img):
    d = os.path.join(XC, folder, f"{name}.imageset"); os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, f"{name}.png"), optimize=True)
    json.dump({"images": [{"idiom": "universal", "filename": f"{name}.png"}], "info": {"author": "xcode", "version": 1},
               "properties": {"preserves-vector-representation": False}}, open(os.path.join(d, "Contents.json"), "w"), indent=1)

for folder in ("CB125R", "CB125R Masks"):
    d = os.path.join(XC, folder)
    if os.path.isdir(d): shutil.rmtree(d)
    os.makedirs(d)
    json.dump({"info": {"author": "xcode", "version": 1}, "properties": {"provides-namespace": False}},
              open(os.path.join(d, "Contents.json"), "w"), indent=1)

report, thumbs = [], []
for angle in ANGLES:
    base_path = os.path.join(SRC, f"cb125r_{angle}.png")
    if not os.path.exists(base_path):
        report.append(f"MISSING base {angle}"); continue
    base = Image.open(base_path).convert("RGBA")
    imageset("CB125R", f"cb125r_{angle}", base)
    alpha = np.asarray(base)[:, :, 3] > 10
    ys, xs = np.nonzero(alpha)
    report.append(f"{angle}: bike bbox x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()} ({(xs.max()-xs.min())/base.width:.2f} of width)")
    overlay = base.copy()
    draw = ImageDraw.Draw(overlay)
    for f in sorted(os.listdir(SRC)):
        if not f.startswith(f"mask_{angle}_"): continue
        slug = f[len(f"mask_{angle}_"):-4]
        m = Image.open(os.path.join(SRC, f)).convert("L")
        a = np.asarray(m)
        if (a > 127).sum() < 40: continue
        imageset("CB125R Masks", f"mask_{angle}_{slug}", m)
        # coverage check: mask pixels must lie on the bike silhouette
        outside = ((a > 127) & ~alpha).sum() / max((a > 127).sum(), 1)
        if outside > 0.02: report.append(f"  WARN {slug}: {outside:.1%} of mask outside silhouette")
        yy, xx = np.nonzero(a > 127)
        draw.rectangle([xx.min(), yy.min(), xx.max(), yy.max()], outline=(121, 56, 245, 255), width=3)
    thumbs.append(overlay.resize((overlay.width // 3, overlay.height // 3)))

# left/right profile symmetry: wheel centres should mirror
def wheel_centre(angle, slug):
    p = os.path.join(SRC, f"mask_{angle}_{slug}.png")
    a = np.asarray(Image.open(p).convert("L")) > 127
    ys, xs = np.nonzero(a); return xs.mean(), ys.mean()
try:
    W = Image.open(os.path.join(SRC, "cb125r_leftProfile.png")).width
    for slug in ("front-wheel", "rear-wheel"):
        lx, ly = wheel_centre("leftProfile", slug); rx, ry = wheel_centre("rightProfile", slug)
        report.append(f"symmetry {slug}: left x={lx:.0f} mirrored right x={W - rx:.0f}, dy={abs(ly - ry):.1f}px")
except Exception as e:
    report.append(f"symmetry check skipped: {e}")

os.makedirs(os.path.join(ROOT, "docs/visuals"), exist_ok=True)
if thumbs:
    tw, th = thumbs[0].size
    sheet = Image.new("RGBA", (tw * 3, th * 2), (245, 245, 247, 255))
    for i, t in enumerate(thumbs): sheet.alpha_composite(t, ((i % 3) * tw, (i // 3) * th))
    sheet.convert("RGB").save(os.path.join(ROOT, "docs/visuals/contact_sheet.png"), optimize=True)
print("\n".join(report))
