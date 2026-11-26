import * as THREE from 'three'
import type { Configuration } from '../domain/types'
import { PART_RENDERS } from '../data/visuals'
import { paintMaterial, withTextureShading, wrapMaterial } from './materials'

/** Tags in the GLB node names: cmp~<slug>~n, acc~<render>~n, stock~<part>~n, fixed~x~n. */
export function parseTag(name: string) {
  const [kind, id] = name.split('~')
  return { kind, id }
}

export interface ModelIndex {
  comps: Map<string, THREE.Mesh[]>; accs: Map<string, THREE.Mesh[]>; stock: Map<string, THREE.Mesh[]>
  original: Map<THREE.Mesh, THREE.Material | THREE.Material[]>; boxes: Map<string, THREE.Box3>
}

export function indexModel(root: THREE.Object3D): ModelIndex {
  const comps = new Map<string, THREE.Mesh[]>(), accs = new Map<string, THREE.Mesh[]>(), stock = new Map<string, THREE.Mesh[]>()
  const original = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    original.set(mesh, mesh.material)
    const { kind, id } = parseTag(mesh.name || mesh.parent?.name || '')
    const map = kind === 'cmp' ? comps : kind === 'acc' ? accs : kind === 'stock' ? stock : null
    if (map && id) map.set(id, [...(map.get(id) ?? []), mesh])
  })
  root.updateMatrixWorld(true)
  const boxes = new Map<string, THREE.Box3>()
  comps.forEach((meshes, slug) => { const b = new THREE.Box3(); meshes.forEach((m) => b.expandByObject(m)); boxes.set(slug, b) })
  return { comps, accs, stock, original, boxes }
}

/** Applies paints, wraps, fitted parts and replaced originals. Returns created materials (dispose on change). */
export function applyConfiguration(index: ModelIndex, configuration: Configuration, showOriginal = false): THREE.Material[] {
  const created: THREE.Material[] = []
  index.comps.forEach((meshes, slug) => {
    const style = showOriginal ? undefined : configuration.styles[slug]
    const box = index.boxes.get(slug)!
    const mat = style ? (style.type === 'paint' ? paintMaterial(style.paint, box) : wrapMaterial(style.base, style.wrap, box)) : null
    // Reconstructed (photo-textured) model: keep the photographed shading under the new paint.
    const orig = index.original.get(meshes[0]) as THREE.MeshStandardMaterial | undefined
    const lum = meshes[0].userData.lumMean as number | undefined
    if (mat && orig?.map && lum) withTextureShading(mat, orig.map, lum)
    if (mat) created.push(mat)
    meshes.forEach((m) => { m.material = mat ?? index.original.get(m)! })
  })
  const fitted = showOriginal ? [] : configuration.parts.map((p) => PART_RENDERS[p.variantID]).filter(Boolean)
  const visible = new Set(fitted.map((f) => f.render))
  const hidden = new Set(fitted.flatMap((f) => f.hides ?? []))
  const replaced = new Set(fitted.flatMap((f) => f.replacesStock ?? []))
  index.accs.forEach((meshes, id) => meshes.forEach((m) => (m.visible = visible.has(id))))
  index.comps.forEach((meshes, slug) => meshes.forEach((m) => (m.visible = !hidden.has(slug))))
  index.stock.forEach((meshes, id) => meshes.forEach((m) => (m.visible = !replaced.has(id))))
  return created
}

export const CENTER = new THREE.Vector3(0.66, 0.55, 0)

export function cameraPosition(az: number, el: number, d = 4.6) {
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180
  return new THREE.Vector3(CENTER.x + Math.cos(a) * Math.cos(e) * d, CENTER.y + Math.sin(e) * d, CENTER.z - Math.sin(a) * Math.cos(e) * d)
}
