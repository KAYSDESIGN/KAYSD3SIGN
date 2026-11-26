import { useEffect, useRef, useState } from 'react'
import type { Configuration } from '../domain/types'
import { composite, type Layer } from './composite'
import { describeReasons, type StoredPack } from './pack'

async function pixels(blob: Blob, w: number, h: number, gray = false): Promise<Uint8ClampedArray> {
  const bmp = await createImageBitmap(blob)
  const c = new OffscreenCanvas(w, h)
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const d = g.getImageData(0, 0, w, h).data
  if (!gray) return d
  const m = new Uint8ClampedArray(w * h)
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4]
  return m
}

/**
 * Photo view of one angle. Recolouring is computed locally from the shared Configuration (same source of truth as
 * the 3D view), so a colour changed on one angle is applied on every angle where the component is visible.
 */
export function PhotoStage({ pack, angle, configuration, showOriginal }: { pack: StoredPack; angle: string; configuration: Configuration; showOriginal: boolean }) {
  const view = pack.manifest.views.find((v) => v.angle === angle)
  const ref = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const key = JSON.stringify(showOriginal ? {} : configuration.styles)

  useEffect(() => {
    if (!view?.accepted) return
    let cancelled = false
    setState('loading')
    ;(async () => {
      const { width: w, height: h } = view
      const base = await pixels(pack.files[view.file], w, h)
      const layers: Layer[] = []
      if (!showOriginal) for (const m of view.masks) {
        const style = configuration.styles[m.component]
        if (style) layers.push({ style, mask: await pixels(pack.files[m.file], w, h, true) })
      }
      const out = composite(base, layers)
      if (cancelled || !ref.current) return
      ref.current.width = w; ref.current.height = h
      ref.current.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(out), w, h), 0, 0)
      setState('ready')
    })().catch(() => !cancelled && setState('error'))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, angle, key])

  if (!view) return <Notice title="Vue absente du pack" text="Cet angle n'a pas de photo. Aucune vue de remplacement n'est affichée." />
  if (!view.accepted) return <Notice title="Vue refusée au contrôle qualité" text={describeReasons(view.rejectReasons).slice(0, 4).join(' · ')} />
  return (
    <div className="absolute inset-0 grid place-items-center p-3">
      <canvas ref={ref} className="max-w-full max-h-full object-contain" role="img" aria-label={`Photo de la moto, vue ${angle}`} />
      {state === 'loading' && <span className="absolute text-[13px] text-ink-2">Préparation de la photo…</span>}
      {state === 'error' && <span className="absolute text-[13px] text-ink-2">Impossible de lire la photo de ce pack.</span>}
    </div>
  )
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center px-8 text-center">
      <div><p className="text-[15px] font-semibold">{title}</p><p className="text-[13px] text-ink-2 mt-1">{text}</p></div>
    </div>
  )
}
