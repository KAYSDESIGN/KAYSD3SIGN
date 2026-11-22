#!/usr/bin/env python3
"""Fond « dégradé givré » de HotCouple (jour et nuit) : dégradé doux mauve/rose/lavande/bleu pâle,
une vague plus soutenue en S, et un grain de verre dépoli. Usage : python3 design-src/frosted-bg.py"""
import numpy as np
from PIL import Image, ImageFilter

W, H = 780, 1688
rng = np.random.default_rng(7)

def hex2(c): return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)

def mesh(points):
    """Mélange de couleurs pondéré par la distance (dégradé « mesh » très doux)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    acc = np.zeros((H, W, 3), np.float32); wsum = np.zeros((H, W), np.float32)
    for (x, y, col, r) in points:
        d2 = ((xx - x * W) / W) ** 2 + ((yy - y * H) / H) ** 2
        w = np.exp(-d2 / (2 * r * r))
        acc += w[..., None] * hex2(col); wsum += w
    return acc / wsum[..., None]

def band(img, col, alpha, width, blur):
    """Vague en S plus soutenue, très floutée."""
    layer = Image.new("L", (W, H), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(layer)
    pts = []
    for t in np.linspace(0, 1, 200):
        x = -0.1 * W + t * 1.2 * W
        y = H * (0.36 + 0.10 * np.tanh((t - 0.5) * 5))  # descend comme sur la référence
        pts.append((x, y))
    d.line(pts, fill=255, width=width, joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    m = np.asarray(layer, np.float32)[..., None] / 255 * alpha
    return img * (1 - m) + hex2(col) * m

def frost(img, strength):
    """Grain de verre dépoli : bruit adouci puis relief léger (clair/sombre)."""
    n = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
    nimg = Image.fromarray(((n - n.min()) / (n.max() - n.min()) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    nimg = nimg.filter(ImageFilter.GaussianBlur(1.2))
    a = np.asarray(nimg, np.float32) / 255
    relief = np.roll(a, 1, axis=0) - np.roll(a, -1, axis=0) + 0.5 * (np.roll(a, 1, axis=1) - np.roll(a, -1, axis=1))
    return np.clip(img + relief[..., None] * strength, 0, 255)

def render(points, band_col, band_alpha, frost_strength, out):
    img = mesh(points)
    img = band(img, band_col, band_alpha, 260, 90)
    img = frost(img, frost_strength)
    Image.fromarray(img.astype(np.uint8)).save(out, quality=86, optimize=True, progressive=True)
    print("ok", out)

render([(0.05, 0.05, "#E3BFDC", 0.30), (0.95, 0.10, "#F6E2EC", 0.32), (0.55, 0.35, "#EBC8DE", 0.25),
        (0.10, 0.62, "#DCE3F5", 0.30), (0.55, 0.70, "#D3DCF3", 0.28), (0.95, 0.80, "#DDB4D6", 0.30),
        (0.30, 0.97, "#EADCF0", 0.30), (1.00, 0.50, "#F7F2F7", 0.22)],
       "#CC9CC9", 0.55, 40, "assets/bg/frosted-light.jpg")
render([(0.05, 0.05, "#3A2240", 0.30), (0.95, 0.10, "#2A1A30", 0.32), (0.55, 0.35, "#45264A", 0.25),
        (0.10, 0.62, "#1E2242", 0.30), (0.55, 0.70, "#21243F", 0.28), (0.95, 0.80, "#3E2342", 0.30),
        (0.30, 0.97, "#1A1626", 0.30), (1.00, 0.50, "#161219", 0.22)],
       "#5A3060", 0.6, 22, "assets/bg/frosted-dark.jpg")
