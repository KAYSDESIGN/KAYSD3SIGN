#!/usr/bin/env python3
"""App icons: italic heavy « M » in MOTOFORGE violet on the light app background (DejaVu Sans, free license)."""
import os
from PIL import Image, ImageDraw, ImageFont
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons"); os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf"
def icon(size, pad=0.0, radius=False):
    im = Image.new("RGBA", (size, size), (245, 245, 247, 255)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(FONT, int(size * (0.62 - pad)))
    d.text((size / 2, size / 2 + size * 0.02), "M", font=f, fill=(121, 56, 245, 255), anchor="mm")
    d.rectangle([size * 0.24, size * 0.78, size * 0.76, size * 0.80], fill=(23, 23, 28, 255))
    return im
icon(192).save(f"{OUT}/icon-192.png"); icon(512).save(f"{OUT}/icon-512.png")
icon(512, pad=0.14).save(f"{OUT}/icon-512-maskable.png"); icon(180).convert("RGB").save(f"{OUT}/apple-touch-icon.png")
print("icons ok")
