import { create } from 'zustand'
import { db } from './db'
import type { Bike, Budget, Configuration, FittedPart, Project, ShoppingLine } from '../domain/types'
import { catalog } from '../data/catalog'
import { displayOffer, findVariant, isTrustworthy } from '../domain/catalog'

const now = () => new Date().toISOString()
export const uid = () => crypto.randomUUID()

interface Favorites { accessories: string[]; colors: string[]; recent: string[] }

interface AppState {
  ready: boolean
  bikes: Bike[]
  selectedBikeID?: string
  projects: Project[]
  favorites: Favorites
  country: string
  load: () => Promise<void>
  addBike: (b: Omit<Bike, 'id' | 'addedAt'>) => Promise<Bike>
  updateBike: (b: Bike) => Promise<void>
  removeBike: (id: string) => Promise<void>
  selectBike: (id: string) => Promise<void>
  createProject: (bike: Bike, name?: string, configuration?: Partial<Configuration>) => Promise<Project>
  saveProject: (p: Project) => Promise<void>
  duplicateProject: (id: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  addPart: (projectID: string, part: FittedPart) => Promise<void>
  toggleFavoriteAccessory: (id: string) => Promise<void>
  pushRecentColor: (hex: string) => Promise<void>
  toggleFavoriteColor: (hex: string) => Promise<void>
  clearAll: () => Promise<void>
}

const saveKV = (key: string, value: unknown) => db.kv.put({ key, value })

/** Lines for fitted parts that are not in the list yet (keeps ordered/installed lines). */
export function syncLines(lines: ShoppingLine[], parts: FittedPart[], currency: string): ShoppingLine[] {
  const fitted = new Set(parts.map((p) => p.variantID))
  const kept = lines.filter((l) => l.kind !== 'part' || !l.variantID || fitted.has(l.variantID) || l.status !== 'toBuy')
  const listed = new Set(kept.map((l) => l.variantID))
  for (const p of parts) {
    if (listed.has(p.variantID)) continue
    const found = findVariant(catalog, p.variantID)
    if (!found) continue
    const offer = displayOffer(found.variant, currency)
    kept.push({
      id: uid(), kind: 'part', variantID: p.variantID, quantity: 1, status: 'toBuy',
      label: `${found.accessory.manufacturer} ${found.accessory.commercialName} — ${found.variant.reference}`,
      unit: offer ? { ...offer.price, verified: isTrustworthy(offer.verification), taxNote: offer.taxNote } : undefined,
      shipping: offer?.shippingCost, url: offer?.url,
    })
  }
  return kept
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  bikes: [],
  projects: [],
  favorites: { accessories: [], colors: [], recent: [] },
  country: 'FR',

  async load() {
    const [bikes, projects, fav, sel] = await Promise.all([
      db.bikes.toArray(), db.projects.orderBy('updatedAt').reverse().toArray(),
      db.kv.get('favorites'), db.kv.get('selectedBike'),
    ])
    set({ bikes, projects, favorites: (fav?.value as Favorites) ?? get().favorites, selectedBikeID: (sel?.value as string) ?? bikes[0]?.id, ready: true })
  },

  async addBike(b) {
    const bike: Bike = { ...b, id: uid(), addedAt: now() }
    await db.bikes.put(bike); await saveKV('selectedBike', bike.id)
    set({ bikes: [...get().bikes, bike], selectedBikeID: bike.id })
    return bike
  },
  async updateBike(b) { await db.bikes.put(b); set({ bikes: get().bikes.map((x) => (x.id === b.id ? b : x)) }) },
  async removeBike(id) {
    const victims = get().projects.filter((p) => p.bikeID === id).map((p) => p.id)
    await db.projects.bulkDelete(victims); await db.bikes.delete(id)
    const bikes = get().bikes.filter((b) => b.id !== id)
    set({ bikes, projects: get().projects.filter((p) => p.bikeID !== id), selectedBikeID: bikes[0]?.id })
  },
  async selectBike(id) { await saveKV('selectedBike', id); set({ selectedBikeID: id }) },

  async createProject(bike, name, configuration) {
    const count = get().projects.filter((p) => p.bikeID === bike.id).length
    const p: Project = {
      id: uid(), name: name ?? `Projet CB125R ${count + 1}`, bikeID: bike.id, favorite: false, history: [],
      configuration: { vehicleVariantID: bike.variantID, colorwayID: bike.colorwayID, styles: {}, parts: [], ...configuration },
      budget: { currency: 'EUR' } as Budget, lines: [], createdAt: now(), updatedAt: now(),
    }
    await get().saveProject(p)
    return p
  },
  async saveProject(p) {
    const saved = { ...p, lines: syncLines(p.lines, p.configuration.parts, p.budget.currency), updatedAt: now() }
    await db.projects.put(saved)
    set({ projects: [saved, ...get().projects.filter((x) => x.id !== p.id)] })
  },
  async duplicateProject(id) {
    const p = get().projects.find((x) => x.id === id)
    if (!p) return
    await get().saveProject({ ...structuredClone(p), id: uid(), name: `${p.name} (copie)`, favorite: false, createdAt: now(),
      lines: p.lines.map((l) => ({ ...l, id: uid() })) })
  },
  async deleteProject(id) { await db.projects.delete(id); set({ projects: get().projects.filter((p) => p.id !== id) }) },
  async addPart(projectID, part) {
    const p = get().projects.find((x) => x.id === projectID)
    if (!p) return
    const others = p.configuration.parts.filter((x) => x.variantID !== part.variantID && (part.category === 'other' || x.category !== part.category))
    await get().saveProject({ ...p, configuration: { ...p.configuration, parts: [...others, part] }, history: [...p.history, 'Pièce ajoutée'] })
  },

  async toggleFavoriteAccessory(id) {
    const f = get().favorites
    const accessories = f.accessories.includes(id) ? f.accessories.filter((x) => x !== id) : [...f.accessories, id]
    const favorites = { ...f, accessories }; await saveKV('favorites', favorites); set({ favorites })
  },
  async pushRecentColor(hex) {
    const f = get().favorites
    const favorites = { ...f, recent: [hex, ...f.recent.filter((x) => x !== hex)].slice(0, 12) }
    await saveKV('favorites', favorites); set({ favorites })
  },
  async toggleFavoriteColor(hex) {
    const f = get().favorites
    const colors = f.colors.includes(hex) ? f.colors.filter((x) => x !== hex) : [...f.colors, hex]
    const favorites = { ...f, colors }; await saveKV('favorites', favorites); set({ favorites })
  },
  async clearAll() {
    await db.delete(); await db.open()
    set({ bikes: [], projects: [], favorites: { accessories: [], colors: [], recent: [] }, selectedBikeID: undefined })
  },
}))

export const selectedBike = (s: AppState) => s.bikes.find((b) => b.id === s.selectedBikeID) ?? s.bikes[0]
