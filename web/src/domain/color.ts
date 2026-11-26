// Colour math (sRGB). Pure functions, unit-tested.
export interface RGB { r: number; g: number; b: number }   // 0…255
export interface HSL { h: number; s: number; l: number }   // h 0…360, s/l 0…100

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function hexToRgb(hex: string): RGB | null {
  let s = hex.trim().replace(/^#/, '')
  if (s.length === 3) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  const n = parseInt(s, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const R = r / 255, G = g / 255, B = b / 255
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min
  const l = (max + min) / 2
  let h = 0
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d) {
    if (max === R) h = 60 * (((G - B) / d) % 6)
    else if (max === G) h = 60 * ((B - R) / d + 2)
    else h = 60 * ((R - G) / d + 4)
  }
  return { h: (h + 360) % 360, s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const S = clamp(s, 0, 100) / 100, L = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = L - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

export const hexToHsl = (hex: string) => rgbToHsl(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 })
export const hslToHex = (hsl: HSL) => rgbToHex(hslToRgb(hsl))

/** Representative paint colour from RGBA pixels: ignores transparent, blown-out and very dark pixels. */
export function sampleColor(rgba: Uint8ClampedArray | number[]): string | null {
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    const max = Math.max(rgba[i], rgba[i + 1], rgba[i + 2])
    if (max < 16 || (rgba[i] > 247 && rgba[i + 1] > 247 && rgba[i + 2] > 247)) continue
    r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; n++
  }
  return n ? rgbToHex({ r: r / n, g: g / n, b: b / n }) : null
}

/** 12 quick picks from the validated workshop mockup (free colours, not manufacturer references). */
export const QUICK_COLORS: { name: string; hex: string }[] = [
  { name: 'Blanc', hex: '#F2F2F2' }, { name: 'Argent', hex: '#B9BBC0' }, { name: 'Gris', hex: '#8A8D93' },
  { name: 'Noir', hex: '#2A2A2E' }, { name: 'Bleu', hex: '#1F4FD8' }, { name: 'Cyan', hex: '#29B6E8' },
  { name: 'Violet', hex: '#7938F5' }, { name: 'Rose', hex: '#F06BA8' }, { name: 'Rouge', hex: '#E02424' },
  { name: 'Orange', hex: '#F5821F' }, { name: 'Or', hex: '#E8B53A' }, { name: 'Vert', hex: '#7CC22E' },
]
