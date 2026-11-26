import { useEffect, useState } from 'react'
import type { Configuration } from '../domain/types'
import type { AngleID } from '../data/visuals'

/** Static render of a configuration (thumbnail). */
export function Snapshot({ configuration, angle = 'frontThreeQuarter', className = '', w = 640, h = 420 }: { configuration: Configuration; angle?: AngleID; className?: string; w?: number; h?: number }) {
  const [src, setSrc] = useState<string>()
  const key = JSON.stringify([configuration.styles, configuration.parts, angle])
  useEffect(() => {
    let alive = true
    // three.js is loaded on demand: the first paint stays light.
    import('./snapshot').then(({ snapshot }) => snapshot(configuration, angle, w, h)).then((u) => alive && setSrc(u)).catch(() => undefined)
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w, h])
  return src
    ? <img src={src} alt="" className={`object-contain ${className}`} draggable={false} />
    : <div className={`animate-pulse bg-track rounded-[inherit] ${className}`} aria-label="Rendu en cours" />
}
