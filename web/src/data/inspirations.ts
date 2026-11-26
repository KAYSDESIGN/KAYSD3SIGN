import type { ComponentStyle, Finish } from '../domain/types'
import { defaultsFor } from '../domain/finishes'

const paint = (color: string, finish: Finish): ComponentStyle => ({ type: 'paint', paint: defaultsFor(finish, color) })

/** Curated paint combinations (no parts) for the home « Inspirations » gallery. */
export const INSPIRATIONS: { id: string; name: string; summary: string; styles: Record<string, ComponentStyle> }[] = [
  { id: 'violet-or', name: 'Violet & or', summary: 'Carrosserie violet candy, jantes et fourche or',
    styles: { tank: paint('#7938F5', 'candy'), 'tank-shrouds': paint('#7938F5', 'candy'), 'tail-section': paint('#7938F5', 'candy'), 'front-fender': paint('#7938F5', 'candy'), 'front-wheel': paint('#C99A2E', 'metallic'), 'rear-wheel': paint('#C99A2E', 'metallic'), fork: paint('#C99A2E', 'anodized') } },
  { id: 'stealth', name: 'Stealth', summary: 'Tout noir mat, cadre satiné',
    styles: { tank: paint('#1A1A1E', 'matte'), 'tank-shrouds': paint('#1A1A1E', 'matte'), 'tail-section': paint('#1A1A1E', 'matte'), 'front-fender': paint('#1A1A1E', 'matte'), frame: paint('#1A1A1E', 'satin'), swingarm: paint('#1A1A1E', 'satin') } },
  { id: 'british', name: 'British green', summary: 'Vert anglais brillant, cadre or',
    styles: { tank: paint('#1F5C3A', 'gloss'), 'tank-shrouds': paint('#1F5C3A', 'gloss'), 'tail-section': paint('#1F5C3A', 'gloss'), 'front-fender': paint('#1F5C3A', 'gloss'), frame: paint('#C99A2E', 'metallic') } },
  { id: 'racing', name: 'Rouge racing', summary: 'Rouge candy, écopes blanc nacré',
    styles: { tank: paint('#B3121B', 'candy'), 'tank-shrouds': paint('#EDEDEA', 'pearl'), 'tail-section': paint('#B3121B', 'candy'), 'front-fender': paint('#EDEDEA', 'pearl') } },
  { id: 'carbon', name: 'Carbone', summary: 'Écopes et coque carbone, jantes chrome coloré',
    styles: { 'tank-shrouds': paint('#1C1C1F', 'carbon'), 'tail-section': paint('#1C1C1F', 'carbon'), 'front-wheel': paint('#3A6BFF', 'coloredChrome'), 'rear-wheel': paint('#3A6BFF', 'coloredChrome') } },
  { id: 'holo', name: 'Holographique', summary: 'Réservoir holographique, reste noir satiné',
    styles: { tank: paint('#B8B8C8', 'holographic'), 'tank-shrouds': paint('#1A1A1E', 'satin'), 'tail-section': paint('#1A1A1E', 'satin') } },
]
