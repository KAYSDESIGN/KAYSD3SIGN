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
names = list(boxes)
inputs = proc(rgb, input_boxes=[[boxes[n] for n in names]], return_tensors="pt")
with torch.no_grad():
    outputs = model(**inputs, multimask_output=True)
masks = proc.image_processor.post_process_masks(outputs.pred_masks, inputs["original_sizes"], inputs["reshaped_input_sizes"])[0]
scores = outputs.iou_scores[0]

result = {}
for i, n in enumerate(names):
    best = int(scores[i].argmax())
    m = masks[i, best].numpy() & alpha
    result[n] = (m, float(scores[i, best]))
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
