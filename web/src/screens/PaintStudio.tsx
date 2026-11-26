import { useEffect, useRef, useState } from 'react'
import { Pipette, Star } from 'lucide-react'
import { useApp } from '../store/app'
import { hexToHsl, hexToRgb, hslToHex, rgbToHex, sampleColor, QUICK_COLORS } from '../domain/color'
import { defaultsFor, finishInfo, FINISHES } from '../domain/finishes'
import type { Colorway, PaintMaterial } from '../domain/types'
import { Badge, Card, pct, Sheet, Slider, WideBtn } from '../ui/kit'
import { FinishSwatch, Swatch } from './Workshop'

/** Studio peinture avancé : nuancier libre, RGB/HEX/HSL, favoris, historique, import photo, 23 finitions, réglages, bicolore. */
export function PaintStudio({ label, initial, colorways, onPreview, onApply, onClose }: {
  label: string; initial?: PaintMaterial; colorways: Colorway[]
  onPreview: (p: PaintMaterial) => void; onApply: (p: PaintMaterial) => void; onClose: () => void
}) {
  const { favorites, toggleFavoriteColor } = useApp()
  const [p, setP] = useState<PaintMaterial>(initial ?? defaultsFor('gloss', '#7938F5'))
  const [hex, setHex] = useState(p.color)
  const [photo, setPhoto] = useState<string>()
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => { onPreview(p); setHex(p.color) }, [p]) // eslint-disable-line react-hooks/exhaustive-deps

  const rgb = hexToRgb(p.color)!; const hsl = hexToHsl(p.color)
  const set = (patch: Partial<PaintMaterial>) => setP((x) => ({ ...x, ...patch }))
  const fav = favorites.colors.includes(p.color)

  const loadPhoto = (file?: File) => {
    if (!file) return
    const url = URL.createObjectURL(file); setPhoto(url)
    const img = new Image(); img.onload = () => {
      const c = canvas.current!; const s = Math.min(1, 900 / img.width); c.width = img.width * s; c.height = img.height * s
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    }; img.src = url
  }
  const samplePhoto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvas.current!; const r = c.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * c.width, y = ((e.clientY - r.top) / r.height) * c.height
    const d = c.getContext('2d')!.getImageData(Math.max(0, x - 7), Math.max(0, y - 7), 15, 15).data
    const col = sampleColor(d); if (col) set({ color: col })
  }

  return (
    <Sheet title={`Peinture · ${label}`} onClose={onClose} peek closeLabel="Annuler" footer={<WideBtn onClick={() => onApply(p)}>Appliquer la peinture</WideBtn>}>
      <div className="space-y-3 pb-2">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="color" value={p.color} onChange={(e) => set({ color: e.target.value.toUpperCase() })} aria-label="Sélecteur chromatique" className="w-11 h-11 rounded-full border-0 bg-transparent p-0" />
            <input className="input flex-1 font-mono" value={hex} onChange={(e) => setHex(e.target.value)} onBlur={() => { const c = hexToRgb(hex); if (c) set({ color: rgbToHex(c) }); else setHex(p.color) }} aria-label="HEX" />
            <button aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux couleurs favorites'} onClick={() => toggleFavoriteColor(p.color)}><Star className={fav ? 'fill-accent text-accent' : ''} /></button>
          </div>
          <div className="grid grid-cols-6 gap-y-2 justify-items-center">{QUICK_COLORS.map((c) => <Swatch key={c.hex} hex={c.hex} name={c.name} active={p.color === c.hex} onClick={() => set({ color: c.hex })} />)}</div>
        </Card>
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold">RGB · HSL</h3>
          {(['r', 'g', 'b'] as const).map((k, i) => <Slider key={k} label={['Rouge', 'Vert', 'Bleu'][i]} value={rgb[k]} min={0} max={255} step={1} format={(v) => String(Math.round(v))} onChange={(v) => set({ color: rgbToHex({ ...rgb, [k]: v }) })} />)}
          <Slider label="Teinte" value={hsl.h} min={0} max={359} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => set({ color: hslToHex({ ...hsl, h: v }) })} />
          <Slider label="Saturation" value={hsl.s} min={0} max={100} step={1} format={(v) => `${Math.round(v)} %`} onChange={(v) => set({ color: hslToHex({ ...hsl, s: v }) })} />
          <Slider label="Luminosité" value={hsl.l} min={0} max={100} step={1} format={(v) => `${Math.round(v)} %`} onChange={(v) => set({ color: hslToHex({ ...hsl, l: v }) })} />
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Mes couleurs</h3>
          <p className="text-[12px] text-ink-2 mb-1">Favorites</p>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">{favorites.colors.length ? favorites.colors.map((c) => <Swatch key={c} hex={c} name={c} onClick={() => set({ color: c })} />) : <span className="text-[13px] text-ink-2">Touchez l'étoile pour garder une couleur.</span>}</div>
          <p className="text-[12px] text-ink-2 mt-2 mb-1">Historique</p>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">{favorites.recent.length ? favorites.recent.map((c) => <Swatch key={c} hex={c} name={c} onClick={() => set({ color: c })} />) : <span className="text-[13px] text-ink-2">Les couleurs appliquées apparaîtront ici.</span>}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Couleur depuis une photo</h3>
            <label className="text-accent text-[14px] font-semibold flex items-center gap-1"><Pipette size={16} />Importer<input type="file" accept="image/*" className="hidden" onChange={(e) => loadPhoto(e.target.files?.[0])} /></label></div>
          {photo && <><canvas ref={canvas} onPointerDown={samplePhoto} className="w-full mt-2 rounded-[12px] touch-none" /><p className="text-[12px] text-ink-2 mt-1">Touchez la zone peinte : reflets et ombres sont écartés, le résultat reste une approximation.</p></>}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-1">Références</h3>
          {colorways.map((c) => <div key={c.id} className="flex justify-between items-center text-[14px] py-1">{c.name}<Badge kind="verified" text="Coloris Honda" /></div>)}
          <p className="text-[12px] text-ink-2 mt-1">Honda ne publie pas de valeur numérique pour ces teintes : importez une photo pour en approcher une. Nuancier RAL : sous licence RAL, affiché dès qu'une source autorisée sera intégrée.</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">Finitions {finishInfo(p.finish).simulated && <Badge kind="simulation" />}</h3>
          <div className="grid grid-cols-4 gap-2">{FINISHES.map((f) => <FinishSwatch key={f.id} finish={f.id} color={p.color} active={p.finish === f.id} onClick={() => setP({ ...defaultsFor(f.id, p.color), gradient: p.gradient })} />)}</div>
        </Card>
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold">Réglages avancés</h3>
          <Slider label="Brillance (vernis)" value={p.gloss} min={0} max={1} format={pct} onChange={(v) => set({ gloss: v })} />
          <Slider label="Rugosité" value={p.roughness} min={0} max={1} format={pct} onChange={(v) => set({ roughness: v })} />
          <Slider label="Réflectivité" value={p.reflectivity} min={0} max={1} format={pct} onChange={(v) => set({ reflectivity: v })} />
          <Slider label="Saturation" value={p.saturation} min={0} max={2} format={pct} onChange={(v) => set({ saturation: v })} />
          <Slider label="Intensité de l'effet / nacrage" value={p.effect} min={0} max={1} format={pct} onChange={(v) => set({ effect: v })} />
          <label className="flex justify-between items-center text-[15px]">Couleur secondaire<input type="color" value={p.secondary ?? '#FFFFFF'} onChange={(e) => set({ secondary: e.target.value.toUpperCase() })} className="w-9 h-9 bg-transparent" /></label>
        </Card>
        <Card className="p-4 space-y-2">
          <label className="flex justify-between items-center font-semibold">Bicolore (dégradé)<input type="checkbox" checked={!!p.gradient} onChange={(e) => set({ gradient: e.target.checked ? { to: '#FFFFFF', angle: 0 } : undefined })} className="w-5 h-5 accent-[var(--color-accent)]" /></label>
          {p.gradient && <>
            <label className="flex justify-between items-center text-[15px]">Seconde couleur<input type="color" value={p.gradient.to} onChange={(e) => set({ gradient: { ...p.gradient!, to: e.target.value.toUpperCase() } })} className="w-9 h-9 bg-transparent" /></label>
            <Slider label="Angle du dégradé" value={p.gradient.angle} min={0} max={359} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => set({ gradient: { ...p.gradient!, angle: v } })} />
          </>}
        </Card>
      </div>
    </Sheet>
  )
}
