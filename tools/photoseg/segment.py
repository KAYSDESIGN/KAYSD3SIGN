#!/usr/bin/env python3
"""
Box-prompted component segmentation of reference photos with SAM (facebook/sam-vit-base, Apache-2.0).

  python3 tools/photoseg/segment.py <image.png> <boxes.json> <out_dir>

boxes.json: {"tank": [x0, y0, x1, y1], ...} in image pixels. Writes mask_<slug>.png (8-bit) + overlay.png.
Masks are intersected with the photo's alpha (background removed) and de-overlapped (smaller part wins).
"""
import json, os, sys
import numpy as np
import torch
from PIL import Image
from transformers import SamModel, SamProcessor

img_path, boxes_path, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
rgba = Image.open(img_path).convert("RGBA")
alpha = np.asarray(rgba)[:, :, 3] > 16
rgb = Image.new("RGB", rgba.size, (255, 255, 255)); rgb.paste(rgba, mask=rgba.split()[3])
boxes = json.load(open(boxes_path))

model = SamModel.from_pretrained("facebook/sam-vit-base").eval()
proc = SamProcessor.from_pretrained("facebook/sam-vit-base")
# A slug may have several boxes (e.g. both shrouds in the front view): masks are unioned.
flat = [(n, b) for n, v in boxes.items() for b in (v if isinstance(v[0], list) else [v])]
inputs = proc(rgb, input_boxes=[[b for _, b in flat]], return_tensors="pt")
with torch.no_grad():
    outputs = model(**inputs, multimask_output=True)
masks = proc.image_processor.post_process_masks(outputs.pred_masks, inputs["original_sizes"], inputs["reshaped_input_sizes"])[0]
scores = outputs.iou_scores[0]

rgb_arr = np.asarray(rgb).astype(float) / 255
result = {}
for i, (n, box) in enumerate(flat):
    best = int(scores[i].argmax())
    m = masks[i, best].numpy() & alpha
    if n.endswith("-wheel"):
        # Keep the rim only: inside ~72 % of the wheel ellipse (tyre excluded), minus bright grey metal (brake disc).
        ys, xs = np.nonzero(m)
        if len(xs):
            cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
            rx, ry = (xs.max() - xs.min()) / 2 * 0.72, (ys.max() - ys.min()) / 2 * 0.72
            yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
            inside = ((xx - cx) / max(rx, 1)) ** 2 + ((yy - cy) / max(ry, 1)) ** 2 <= 1
            lum = rgb_arr.mean(axis=2); sat = rgb_arr.max(axis=2) - rgb_arr.min(axis=2)
            m = m & inside & ~((lum > 0.42) & (sat < 0.12))
    elif n not in ("fork", "brake-calipers"):
        # Matte and glossy panels leave holes where reflections fool SAM: close small gaps and fill holes.
        from scipy import ndimage
        m = ndimage.binary_closing(m, structure=np.ones((9, 9)), iterations=2)
        m = ndimage.binary_fill_holes(m) & alpha
    prev = result.get(n, (np.zeros_like(alpha), 0.0))
    result[n] = (prev[0] | m, max(prev[1], float(scores[i, best])))
names = list(result)
# de-overlap: smaller masks keep contested pixels
order = sorted(names, key=lambda n: result[n][0].sum())
taken = np.zeros_like(alpha)
palette = [(121, 56, 245), (79, 168, 240), (245, 165, 74), (63, 191, 143), (224, 36, 36), (240, 107, 168), (232, 181, 58), (41, 182, 232)]
overlay = np.asarray(rgb).astype(float).copy()
for k, n in enumerate(order):
    m = result[n][0] & ~taken
    taken |= m
    Image.fromarray((m * 255).astype(np.uint8), "L").save(os.path.join(out, f"mask_{n}.png"))
    c = np.array(palette[k % len(palette)], dtype=float)
    overlay[m] = overlay[m] * 0.45 + c * 0.55
    print(f"{n:15s} score={result[n][1]:.3f} px={int(m.sum())}")
Image.fromarray(overlay.astype(np.uint8)).save(os.path.join(out, "overlay.png"))
