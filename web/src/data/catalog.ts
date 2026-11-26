import json from './catalog.json'
import type { Catalog, Variant } from '../domain/types'

export const catalog = json as unknown as Catalog

export const variantById = (id: string): Variant | undefined => catalog.variants.find((v) => v.id === id)

export function bikeName(variantID: string) {
  const v = variantById(variantID)
  const g = v && catalog.generations.find((x) => x.id === v.generationID)
  const m = g && catalog.models.find((x) => x.id === g.modelID)
  const b = m && catalog.brands.find((x) => x.id === m.brandID)
  return { brand: b?.name ?? 'Moto', model: m?.name ?? '', code: g?.code ?? '', version: v?.versionName ?? '' }
}

/** Component slug from a catalog component id (honda.cb125r.jc91.tank → tank). */
export const slugOf = (componentID: string) => componentID.split('.').pop() ?? componentID
