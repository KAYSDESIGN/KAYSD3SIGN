import { create } from 'zustand'
import { db } from '../store/db'
import { MODEL_URL } from '../data/visuals'

/**
 * Which 3D model the viewer and thumbnails use:
 *  - public : the project's dimensioned model (deployed, labelled "simplified");
 *  - private: a model reconstructed from photos by tools/recon3d, imported on this device only (IndexedDB),
 *             never deployed (the source photos' rights are personal).
 */
const KEY = 'model:honda.cb125r.jc91'
export interface PrivateModelInfo { name: string; size: number; importedAt: string; enabled: boolean }
interface Stored { blob: Blob; info: PrivateModelInfo }

interface ModelState { url: string; kind: 'public' | 'private'; info?: PrivateModelInfo }
export const useModel = create<ModelState>(() => ({ url: MODEL_URL, kind: 'public' }))

let objectURL: string | null = null
function publish(stored?: Stored) {
  if (objectURL) URL.revokeObjectURL(objectURL)
  objectURL = null
  if (stored?.info.enabled) {
    objectURL = URL.createObjectURL(stored.blob)
    useModel.setState({ url: objectURL, kind: 'private', info: stored.info })
  } else useModel.setState({ url: MODEL_URL, kind: 'public', info: stored?.info })
}

export async function initModelSource() {
  const row = await db.kv.get(KEY).catch(() => undefined)
  publish(row?.value as Stored | undefined)
}

export class ModelError extends Error {}

/** Checks the GLB header and the MOTOFORGE component tags before storing. */
export async function importPrivateModel(file: File) {
  const buf = await file.arrayBuffer()
  const v = new DataView(buf)
  if (buf.byteLength < 20 || v.getUint32(0, true) !== 0x46546c67) throw new ModelError('Ce fichier n\'est pas un modèle GLB.')
  const jsonLen = v.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen))) as { nodes?: { name?: string }[] }
  const comps = new Set((json.nodes ?? []).map((n) => n.name ?? '').filter((n) => n.startsWith('cmp~')).map((n) => n.split('~')[1]))
  if (comps.size < 5) throw new ModelError('Ce modèle n\'a pas de composants MOTOFORGE séparés : passez-le d\'abord par tools/recon3d.')
  const stored: Stored = { blob: new Blob([buf], { type: 'model/gltf-binary' }), info: { name: file.name, size: buf.byteLength, importedAt: new Date().toISOString(), enabled: true } }
  await db.kv.put({ key: KEY, value: stored })
  publish(stored)
  return comps.size
}

export async function setPrivateModelEnabled(enabled: boolean) {
  const row = await db.kv.get(KEY)
  if (!row) return
  const stored = row.value as Stored
  stored.info.enabled = enabled
  await db.kv.put({ key: KEY, value: stored })
  publish(stored)
}

export async function deletePrivateModel() {
  await db.kv.delete(KEY)
  publish(undefined)
}
