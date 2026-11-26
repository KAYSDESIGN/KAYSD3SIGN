import Dexie, { type Table } from 'dexie'
import type { Bike, Project } from '../domain/types'
import type { StoredPack } from '../photo/pack'

export interface KV { key: string; value: unknown }

/** Local-first storage (IndexedDB). A Supabase adapter can mirror these tables later. */
class MotoforgeDB extends Dexie {
  bikes!: Table<Bike, string>
  projects!: Table<Project, string>
  kv!: Table<KV, string>
  photoPacks!: Table<StoredPack, string>
  constructor() {
    super('motoforge')
    this.version(1).stores({ bikes: 'id, variantID', projects: 'id, bikeID, updatedAt', kv: 'key' })
    // v2: private photo packs, imported on the device only (never deployed)
    this.version(2).stores({ bikes: 'id, variantID', projects: 'id, bikeID, updatedAt', kv: 'key', photoPacks: 'generation' })
  }
}

export const db = new MotoforgeDB()
