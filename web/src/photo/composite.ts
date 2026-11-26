import type { ComponentStyle, PaintMaterial } from '../domain/types'
import { hexToRgb } from '../domain/color'

/**
 * Photo recolouring, same principle as the iOS compositor (MFRendering):
 * inside a component mask the photo's luminance is kept as shading (normalised so the masked average maps to the
 * chosen colour), highlights are partly preserved according to gloss, and pixels outside the mask are untouched.
 * Pure function on RGBA buffers so it is testable without a browser.
 */
export interface Layer { mask: Uint8ClampedArray | Uint8Array; style: ComponentStyle }

const lumOf = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

export function paintOf(style: ComponentStyle): PaintMaterial {
  return style.type === 'paint' ? style.paint : style.base
}

export function recolor(base: Uint8ClampedArray, out: Uint8ClampedArray, mask: Uint8ClampedArray | Uint8Array, paint: PaintMaterial) {
  const n = mask.length
  let sum = 0, cnt = 0
  for (let i = 0; i < n; i++) if (mask[i] > 127) { sum += lumOf(base[i * 4], base[i * 4 + 1], base[i * 4 + 2]); cnt++ }
  if (!cnt) return
  const mean = Math.max(sum / cnt, 0.01)
  const rgb = hexToRgb(paint.color)
  if (!rgb) return
  const { r: cr, g: cg, b: cb } = rgb
  const sat = paint.saturation ?? 1
  const gloss = Math.min(1, Math.max(0, paint.gloss))
  for (let i = 0; i < n; i++) {
    const m = mask[i] / 255
    if (m <= 0) continue
    const p = i * 4
    const L = lumOf(base[p], base[p + 1], base[p + 2])
    const shade = Math.min(2.2, L / mean)
    // Highlights: the brightest relative pixels keep part of their original light (reflections), scaled by gloss.
    const hi = Math.max(0, Math.min(1, (shade - 1.3) / 0.9)) * gloss
    for (let c = 0; c < 3; c++) {
      const col = [cr, cg, cb][c]
      const grey = (cr + cg + cb) / 3
      const tinted = (grey + (col - grey) * sat) * shade
      const v = tinted * (1 - hi) + 255 * Math.min(1, L * 1.4) * hi
      out[p + c] = out[p + c] * (1 - m) + Math.max(0, Math.min(255, v)) * m
    }
  }
}

/** Applies every styled component (largest first) to a copy of the base photo. */
export function composite(base: Uint8ClampedArray, layers: Layer[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(base)
  for (const l of layers) recolor(base, out, l.mask, paintOf(l.style))
  return out
}
