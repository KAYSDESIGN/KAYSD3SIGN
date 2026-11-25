#!/usr/bin/env python3
"""Generates the built-in MOTOFORGE sticker artwork (original shapes, DejaVu Sans Bold font: free license)."""
import json, math, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "App/Resources/Assets.xcassets/Stickers")
S = 512
WHITE, BLACK, ACCENT = (255, 255, 255, 255), (23, 23, 28, 255), (121, 56, 245, 255)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def canvas(): return Image.new("RGBA", (S, S), (0, 0, 0, 0))
def save(name, img):
    d = os.path.join(OUT, f"{name}.imageset"); os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, f"{name}.png"), optimize=True)
    json.dump({"images": [{"idiom": "universal", "filename": f"{name}.png"}], "info": {"author": "xcode", "version": 1}},
              open(os.path.join(d, "Contents.json"), "w"))

os.makedirs(OUT, exist_ok=True)
json.dump({"info": {"author": "xcode", "version": 1}}, open(os.path.join(OUT, "Contents.json"), "w"))

im = canvas(); d = ImageDraw.Draw(im)
d.polygon([(300, 20), (120, 290), (240, 290), (190, 492), (400, 200), (270, 200), (340, 20)], fill=ACCENT, outline=WHITE, width=10)
save("sticker_lightning", im)

im = canvas(); d = ImageDraw.Draw(im)
pts = [(S/2 + (230 if i % 2 == 0 else 95) * math.cos(math.pi/2 + i*math.pi/5), S/2 - (230 if i % 2 == 0 else 95) * math.sin(math.pi/2 + i*math.pi/5)) for i in range(10)]
d.polygon(pts, fill=WHITE, outline=BLACK, width=10)
save("sticker_star", im)

im = canvas(); d = ImageDraw.Draw(im)
for k in range(3):
    x = 60 + k * 140
    d.polygon([(x, 60), (x + 110, 256), (x, 452), (x + 70, 452), (x + 180, 256), (x + 70, 60)], fill=WHITE)
save("sticker_chevrons", im)

im = canvas(); d = ImageDraw.Draw(im)
d.ellipse([16, 16, S - 16, S - 16], fill=WHITE, outline=BLACK, width=18)
f = ImageFont.truetype(FONT, 250); d.text((S/2, S/2), "77", font=f, fill=BLACK, anchor="mm")
save("sticker_number", im)

im = canvas(); d = ImageDraw.Draw(im)
n = 8; c = S // n
for y in range(n):
    for x in range(n):
        d.rectangle([x*c, y*c, (x+1)*c - 1, (y+1)*c - 1], fill=BLACK if (x + y) % 2 else WHITE)
save("sticker_checker", im)

im = canvas(); d = ImageDraw.Draw(im)
for k, col in enumerate((WHITE, ACCENT, WHITE)):
    d.polygon([(40 + k*150, 452), (160 + k*150, 452), (260 + k*150 - 40, 60), (140 + k*150 - 40, 60)], fill=col)
save("sticker_tristripe", im)

im = canvas(); d = ImageDraw.Draw(im)
for r, col in ((240, WHITE), (180, BLACK), (120, WHITE), (60, ACCENT)):
    d.ellipse([S/2 - r, S/2 - r, S/2 + r, S/2 + r], fill=col)
save("sticker_circle", im)

im = Image.new("RGBA", (1024, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
f = ImageFont.truetype(FONT, 150)
d.text((512, 128), "MOTOFORGE", font=f, fill=WHITE, anchor="mm", stroke_width=6, stroke_fill=BLACK)
save("sticker_wordmark", im)
print("stickers ok")
