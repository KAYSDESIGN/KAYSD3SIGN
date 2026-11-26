import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
// @ts-expect-error -- untyped ES module from the liquid-glass-web skill (MIT)
import { createGlass } from '../lib/liquid-glass.js'

interface Props { children: ReactNode; className?: string; radius?: number; refraction?: number; style?: CSSProperties }

/** Liquid glass surface for navigation and floating controls only (CLAUDE.md §2). */
export function Glass({ children, className = '', radius = 28, refraction = 14, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const g = createGlass(ref.current, {
      mode: 'backdrop', fit: true, radius, refraction, bezel: 0.5, curvature: 3, chroma: 0.15, specular: 0.6,
      fallback: 'blur(18px) saturate(1.7)',
    })
    return () => g.destroy()
  }, [radius, refraction])
  return <div ref={ref} className={`glass ${className}`} style={{ borderRadius: radius, ...style }}>{children}</div>
}
