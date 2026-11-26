import { db } from '../store/db'

/** Private photo pack built by tools/photoqc/make_pack.py and imported by the user on their own device. */
export interface PackView {
  angle: string; file: string; width: number; height: number
  accepted: boolean; rejectReasons: string[]
  masks: { component: string; file: string }[]
}
export interface PackManifest {
  format: 'motoforge-photo-pack'; version: 1; generation: string
  source: string; reviewedAt?: string; setNotes: string[]; views: PackView[]
}
export interface StoredPack { generation: string; manifest: PackManifest; files: Record<string, Blob>; importedAt: string }

export class PackError extends Error {}

/** Validates and stores the files of a pack folder selected by the user (manifest.json + PNGs). */
export async function importPack(list: FileList | File[]): Promise<StoredPack> {
  const files = Array.from(list)
  const mf = files.find((f) => f.name === 'manifest.json')
  if (!mf) throw new PackError('Fichier manifest.json introuvable : sélectionnez tous les fichiers du dossier du pack.')
  let manifest: PackManifest
  try { manifest = JSON.parse(await mf.text()) } catch { throw new PackError('manifest.json illisible.') }
  if (manifest.format !== 'motoforge-photo-pack' || manifest.version !== 1) throw new PackError('Ce fichier n\'est pas un pack photo MOTOFORGE (format inconnu).')
  const byName = new Map(files.map((f) => [f.name, f]))
  const needed = manifest.views.flatMap((v) => [v.file, ...v.masks.map((m) => m.file)])
  const missing = needed.filter((n) => !byName.has(n))
  if (missing.length) throw new PackError(`${missing.length} fichier(s) manquant(s), par exemple ${missing[0]}.`)
  const stored: StoredPack = { generation: manifest.generation, manifest, importedAt: new Date().toISOString(),
    files: Object.fromEntries(needed.map((n) => [n, byName.get(n)!])) }
  await db.photoPacks.put(stored)
  return stored
}

export const loadPack = (generation: string) => db.photoPacks.get(generation)
export const deletePack = (generation: string) => db.photoPacks.delete(generation)
export const acceptedViews = (p?: StoredPack) => p?.manifest.views.filter((v) => v.accepted) ?? []

/** Human-readable rejection reasons (QC keys → French). */
const REASON: Record<string, string> = {
  'auto:transparentBackground': 'fond non transparent', 'auto:fullyVisible': 'moto coupée ou collée au bord',
  'auto:resolution': 'résolution insuffisante', 'auto:proportions': 'proportions différentes de la référence officielle',
  'auto:uniformLighting': 'éclairage différent des autres vues',
  engine: 'moteur', brakeDiscs: 'disques de frein', transmission: 'transmission', exhaust: 'échappement', mirrors: 'rétroviseurs',
  wheels: 'jantes', fork: 'fourche', bodywork: 'carénages / angle', logos: 'logos', colour: 'coloris',
}
export function describeReasons(reasons: string[]): string[] {
  return reasons.map((r) => {
    if (r.startsWith('auto:')) return REASON[r] ?? r
    const [k, status] = r.split(':')
    return `${REASON[k] ?? k} : ${status === 'fail' ? 'incohérent' : 'non vérifié'}`
  })
}

/** Generation slug of a catalog variant (honda.cb125r.jc91.eu → honda.cb125r.jc91). */
export function generationOf(variantID: string, variants: { id: string; generationID: string }[]): string | undefined {
  return variants.find((v) => v.id === variantID)?.generationID
}
