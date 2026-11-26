import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Configuration } from '../domain/types'
import { ANGLES, MODEL_URL, type AngleID } from '../data/visuals'
import { applyConfiguration, cameraPosition, CENTER, indexModel, type ModelIndex } from './scene'

/**
 * One shared off-screen WebGL renderer for every thumbnail (iOS Safari limits WebGL contexts).
 * Renders are queued, cached by configuration + angle, and returned as object URLs.
 */
let setup: Promise<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; index: ModelIndex }> | null = null
const cache = new Map<string, string>()
let queue: Promise<unknown> = Promise.resolve()

function init() {
  setup ??= new GLTFLoader().loadAsync(MODEL_URL).then((gltf) => {
    const canvas = document.createElement('canvas')
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(3, 5, 3); scene.add(sun)
    scene.add(gltf.scene)
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
    return { renderer, scene, camera, index: indexModel(gltf.scene) }
  })
  return setup
}

export function snapshot(configuration: Configuration, angle: AngleID, width = 640, height = 420): Promise<string> {
  const key = JSON.stringify([configuration.styles, configuration.parts, angle, width, height])
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  const job = queue.then(async () => {
    const { renderer, scene, camera, index } = await init()
    const created = applyConfiguration(index, configuration)
    renderer.setSize(width, height, false)
    camera.aspect = width / height; camera.updateProjectionMatrix()
    const a = ANGLES.find((x) => x.id === angle)!
    const t = Math.tan((camera.fov * Math.PI) / 360)
    camera.position.copy(cameraPosition(a.az, a.el, Math.max(1.25 / (t * camera.aspect), 0.7 / t))); camera.lookAt(CENTER)
    renderer.render(scene, camera)
    const blob = await new Promise<Blob | null>((r) => renderer.domElement.toBlob(r, 'image/png'))
    created.forEach((m) => m.dispose())
    const url = blob ? URL.createObjectURL(blob) : ''
    if (cache.size > 40) { const [k, v] = cache.entries().next().value as [string, string]; URL.revokeObjectURL(v); cache.delete(k) }
    cache.set(key, url)
    return url
  })
  queue = job.catch(() => undefined)
  return job
}
