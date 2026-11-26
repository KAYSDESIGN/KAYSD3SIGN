import Dexie, { type Table } from 'dexie'
import type { Bike, Project } from '../domain/types'

export interface KV { key: string; value: unknown }

/** Local-first storage (IndexedDB). A Supabase adapter can mirror these tables later. */
class MotoforgeDB extends Dexie {
  bikes!: Table<Bike, string>
  projects!: Table<Project, string>
  kv!: Table<KV, string>
  constructor() {
    super('motoforge')
    this.version(1).stores({ bikes: 'id, variantID', projects: 'id, bikeID, updatedAt', kv: 'key' })
  }
}

export const db = new MotoforgeDB()
