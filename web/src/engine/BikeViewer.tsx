import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Decal, Environment, Lightformer, OrbitControls, useGLTF, useTexture } from '@react-three/drei'
import type { Configuration, WrapLayer } from '../domain/types'
import { ANGLES, MODEL_URL, stickerURL, type AngleID } from '../data/visuals'
import { applyConfiguration, cameraPosition, CENTER, indexModel, parseTag } from './scene'


export interface ViewerProps {
  configuration: Configuration
  angle: AngleID
  selected?: string
  showOriginal?: boolean
  onSelect?: (slug: string) => void
  /** Thumbnails: no controls, lower resolution. */
  still?: boolean
}

function BikeModel({ configuration, showOriginal, onSelect }: Omit<ViewerProps, 'angle' | 'still' | 'selected'>) {
  const { scene } = useGLTF(MODEL_URL)
  const root = useMemo(() => scene.clone(true), [scene])
  const invalidate = useThree((s) => s.invalidate)
  const index = useMemo(() => indexModel(root), [root])

  useEffect(() => {
    const created = applyConfiguration(index, configuration, showOriginal)
    invalidate()
    return () => created.forEach((m) => m.dispose())
  }, [configuration, showOriginal, index, invalidate])

  const decals = showOriginal ? [] : Object.entries(configuration.styles).flatMap(([slug, s]) =>
    s.type === 'wrap' ? s.wrap.layers.filter((l) => l.kind === 'sticker' || l.kind === 'logo' || l.kind === 'texture').map((l) => ({ slug, layer: l })) : [])

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!onSelect || e.delta > 6) return
    const { kind, id } = parseTag(e.object.name)
    if (kind === 'cmp' && id) { e.stopPropagation(); onSelect(id) }
  }

  return (
    <group>
      <primitive object={root} onClick={click} />
      {decals.map(({ slug, layer }) => {
        const target = largestMesh(index.comps.get(slug) ?? [])
        const box = index.boxes.get(slug)
        return target && box ? <WrapDecal key={layer.id + slug} mesh={target} box={box} layer={layer} /> : null
      })}
    </group>
  )
}

function largestMesh(meshes: THREE.Mesh[]) {
  return meshes.reduce<THREE.Mesh | undefined>((best, m) => {
    const n = m.geometry.attributes.position?.count ?? 0
    return !best || n > (best.geometry.attributes.position?.count ?? 0) ? m : best
  }, undefined)
}

/** Sticker / logo / texture projected on both sides of the component. */
function WrapDecal({ mesh, box, layer }: { mesh: THREE.Mesh; box: THREE.Box3; layer: WrapLayer }) {
  const texture = useTexture(layer.image ?? stickerURL(layer.sticker ?? 'star'))
  const size = box.getSize(new THREE.Vector3())
  const s = Math.max(size.x, size.y) * layer.scale
  const out: React.ReactNode[] = []
  for (const side of [1, -1]) {
    const world = new THREE.Vector3(box.min.x + layer.x * size.x, box.max.y - layer.y * size.y, side > 0 ? box.max.z : box.min.z)
    const local = mesh.worldToLocal(world.clone())
    out.push(
      <Decal key={side} mesh={{ current: mesh }} position={local} rotation={[0, side > 0 ? 0 : Math.PI, (layer.rotation * Math.PI) / 180 * side]} scale={[s, s, size.z * 1.2]}>
        <meshPhysicalMaterial map={texture} transparent opacity={layer.opacity} polygonOffset polygonOffsetFactor={-4} clearcoat={1} roughness={0.3} />
      </Decal>,
    )
  }
  return <>{out}</>
}

/** Smoothly moves the camera to the selected preset; free orbit stays available. */
function CameraRig({ angle, still }: { angle: AngleID; still?: boolean }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const { camera, invalidate, size } = useThree()
  // Fit the whole bike (≈2.4 m long, 1.1 m tall incl. mirrors) whatever the stage aspect ratio.
  const target = useMemo(() => {
    const a = ANGLES.find((x) => x.id === angle)!
    const t = Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360)
    const aspect = size.width / Math.max(size.height, 1)
    const d = Math.max(1.32 / (t * aspect), 0.72 / t)
    return cameraPosition(a.az, a.el, d)
  }, [angle, size.width, size.height, camera])
  const animating = useRef(true)
  useEffect(() => { animating.current = true; invalidate() }, [target, invalidate])
  useFrame(() => {
    if (!animating.current) return
    camera.position.lerp(target, still ? 1 : 0.14)
    camera.lookAt(CENTER)
    controls.current?.target.copy(CENTER)
    if (camera.position.distanceTo(target) < 0.002) animating.current = false
    invalidate()
  })
  return still ? null : (
    <OrbitControls ref={controls} target={CENTER} enablePan={false} minDistance={2} maxDistance={9} maxPolarAngle={Math.PI / 2.02}
      onStart={() => (animating.current = false)} />
  )
}

export default function BikeViewer(props: ViewerProps) {
  const [lost, setLost] = useState(0)
  return (
    <Canvas key={lost} shadows={!props.still} frameloop="demand" dpr={props.still ? [1, 1.5] : [1, 2]}
      camera={{ fov: 30, near: 0.1, far: 50, position: [4, 1, 3] }} gl={{ antialias: true, preserveDrawingBuffer: !!props.still, powerPreference: 'low-power' }}
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setTimeout(() => setLost((n) => n + 1), 300) })}
      aria-label="Moto en 3D">
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 3]} intensity={1.6} castShadow={!props.still} shadow-mapSize={[1024, 1024]} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 1.5, 3]} rotation-y={-Math.PI / 3} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[-5, 1, -3]} rotation-y={Math.PI / 3} scale={[4, 2, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <BikeModel configuration={props.configuration} showOriginal={props.showOriginal} onSelect={props.onSelect} />
      </Suspense>
      <ContactShadows position={[0.66, 0.001, 0]} opacity={0.35} scale={5} blur={2.4} far={1.5} frames={1} />
      <CameraRig angle={props.angle} still={props.still} />
    </Canvas>
  )
}

useGLTF.preload(MODEL_URL)
