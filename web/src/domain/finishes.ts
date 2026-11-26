import type { Finish, PaintMaterial } from './types'

export interface FinishInfo {
  id: Finish
  label: string
  /** Depends on light, angle, temperature or UV: the 3D view approximates it → labelled « Simulation ». */
  simulated: boolean
}

export const FINISHES: FinishInfo[] = [
  { id: 'gloss', label: 'Brillant', simulated: false }, { id: 'satin', label: 'Satiné', simulated: false },
  { id: 'matte', label: 'Mat', simulated: false }, { id: 'metallic', label: 'Métallisé', simulated: false },
  { id: 'pearl', label: 'Nacré', simulated: true }, { id: 'candy', label: 'Candy', simulated: false },
  { id: 'chameleon', label: 'Caméléon', simulated: true }, { id: 'iridescent', label: 'Iridescent', simulated: true },
  { id: 'holographic', label: 'Holographique', simulated: true }, { id: 'chrome', label: 'Chrome', simulated: false },
  { id: 'coloredChrome', label: 'Chrome coloré', simulated: false }, { id: 'brushedMetal', label: 'Métal brossé', simulated: false },
  { id: 'anodized', label: 'Anodisé', simulated: false }, { id: 'glitter', label: 'Pailleté', simulated: true },
  { id: 'carbon', label: 'Carbone', simulated: false }, { id: 'forgedCarbon', label: 'Carbone forgé', simulated: false },
  { id: 'fluorescent', label: 'Fluorescent', simulated: true }, { id: 'uvReactive', label: 'Réactif aux UV', simulated: true },
  { id: 'phosphorescent', label: 'Phosphorescent', simulated: true }, { id: 'thermochromic', label: 'Thermochromique', simulated: true },
  { id: 'photochromic', label: 'Photochromique', simulated: true }, { id: 'simulatedGlow', label: 'Incandescent simulé', simulated: true },
  { id: 'marble', label: 'Marbré', simulated: false },
]

export const finishInfo = (f: Finish) => FINISHES.find((x) => x.id === f)!
export const QUICK_FINISHES: Finish[] = ['gloss', 'satin', 'matte', 'metallic']

/** Sensible defaults when a finish is chosen. */
export function defaultsFor(finish: Finish, color: string): PaintMaterial {
  const base: PaintMaterial = { color, finish, gloss: 0.85, roughness: 0.25, reflectivity: 0.5, saturation: 1, effect: 0.5 }
  switch (finish) {
    case 'matte': return { ...base, gloss: 0.05, roughness: 0.85 }
    case 'satin': return { ...base, gloss: 0.4, roughness: 0.5 }
    case 'metallic': return { ...base, roughness: 0.35, reflectivity: 0.7 }
    case 'pearl': return { ...base, secondary: '#FFFFFF', effect: 0.6 }
    case 'candy': return { ...base, gloss: 1, roughness: 0.08, reflectivity: 0.8 }
    case 'chameleon': return { ...base, secondary: '#1FD1C1', effect: 0.8 }
    case 'iridescent': return { ...base, effect: 0.9 }
    case 'holographic': return { ...base, effect: 1, roughness: 0.15 }
    case 'chrome': return { ...base, color: '#E6E6E8', roughness: 0.04, reflectivity: 1 }
    case 'coloredChrome': return { ...base, roughness: 0.06, reflectivity: 1 }
    case 'brushedMetal': return { ...base, roughness: 0.4, reflectivity: 0.9 }
    case 'anodized': return { ...base, roughness: 0.3, reflectivity: 0.8 }
    case 'glitter': return { ...base, effect: 0.7 }
    case 'carbon': case 'forgedCarbon': return { ...base, color: '#1C1C1F', roughness: 0.2 }
    case 'fluorescent': return { ...base, effect: 0.6 }
    case 'phosphorescent': case 'simulatedGlow': return { ...base, effect: 0.7 }
    case 'thermochromic': case 'photochromic': case 'uvReactive': return { ...base, secondary: '#FFFFFF', effect: 0.5 }
    case 'marble': return { ...base, secondary: '#FFFFFF', roughness: 0.15 }
    default: return base
  }
}
