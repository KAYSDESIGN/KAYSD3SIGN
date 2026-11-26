/** 3D parts available for catalog references (rendered in the same frame as the bike, tools/bike3d). */
export interface PartRender { render: string; hides?: string[]; replacesStock?: string[] }

const gp = { render: 'mivv-gp-pro', replacesStock: ['muffler'] }
const rad = { render: 'rg-radiator-guard' }
export const PART_RENDERS: Record<string, PartRender> = {
  'mivv.gp-pro.cb125r21.h.077.l2p': gp, 'mivv.gp-pro.cb125r21.h.077.l6p': gp, 'mivv.gp-pro.cb125r21.h.077.lxbp': gp,
  'rg.radiator-guard.cb125r.black': rad, 'rg.radiator-guard.cb125r.titanium': rad,
  'puig.license-support.cb125r.9653n': { render: 'puig-9653n', hides: ['rear-fender'] },
  'givi.b45.std': { render: 'givi-b45-sr1169' },
  'givi.a1164.std': { render: 'givi-a1164' },
  'givi.tn1199.std': { render: 'givi-tn1199' },
  'rg.aero-crash-protectors.cb125r21.cp0522bl': { render: 'rg-aero-cp0522' },
}

export const MODEL_URL = `${import.meta.env.BASE_URL}models/cb125r-jc91.glb`

/** Camera presets (glTF frame: +X forward, +Y up, +Z = bike's right side). Azimuth in degrees from the front. */
export const ANGLES = [
  { id: 'frontThreeQuarter', label: '3/4 avant', az: 40, el: 10 },
  { id: 'leftProfile', label: 'Profil gauche', az: 90, el: 4 },
  { id: 'rearThreeQuarter', label: '3/4 arrière', az: 140, el: 10 },
  { id: 'rear', label: 'Arrière', az: 180, el: 6 },
  { id: 'rightProfile', label: 'Profil droit', az: -90, el: 4 },
  { id: 'front', label: 'Avant', az: 0, el: 6 },
] as const
export type AngleID = (typeof ANGLES)[number]['id']

export const COMPONENT_LABELS: Record<string, string> = {
  tank: 'Réservoir', 'tank-shrouds': 'Écopes', 'front-fender': 'Garde-boue avant', 'rear-fender': 'Garde-boue arrière',
  'tail-section': 'Coque arrière', 'front-wheel': 'Jante avant', 'rear-wheel': 'Jante arrière', fork: 'Fourche', frame: 'Cadre',
  swingarm: 'Bras oscillant', handlebar: 'Guidon', levers: 'Leviers', 'brake-calipers': 'Étriers', seat: 'Selle',
  'engine-covers': 'Caches moteur', protections: 'Sabot moteur',
}
export const STICKERS = [
  { id: 'lightning', name: 'Éclair' }, { id: 'star', name: 'Étoile' }, { id: 'chevrons', name: 'Chevrons' },
  { id: 'number', name: 'Numéro 77' }, { id: 'checker', name: 'Damier' }, { id: 'tristripe', name: 'Trois bandes' },
  { id: 'circle', name: 'Cible' }, { id: 'wordmark', name: 'MOTOFORGE' },
]
export const stickerURL = (id: string) => `${import.meta.env.BASE_URL}stickers/sticker_${id}.png`
