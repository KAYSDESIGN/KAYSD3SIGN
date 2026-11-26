import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { uid } from '../store/app'
import { QUICK_COLORS } from '../domain/color'
import type { ComponentStyle, PaintMaterial, Wrap, WrapLayer, WrapLayerKind } from '../domain/types'
import { STICKERS, stickerURL } from '../data/visuals'
import { Btn, Card, Chip, pct, Segmented, Sheet, Slider, WideBtn } from '../ui/kit'
import { Swatch } from './Workshop'

const KINDS: [WrapLayerKind, string][] = [['film', 'Film uni'], ['gradient', 'Dégradé'], ['stripes', 'Bandes'], ['checker', 'Damier'], ['sticker', 'Sticker'], ['logo', 'Logo importé'], ['texture', 'Texture importée']]
const TITLE: Record<WrapLayerKind, string> = Object.fromEntries(KINDS) as Record<WrapLayerKind, string>

/** Studio covering : intégral ou partiel, calques combinables, déplacement / rotation / taille / opacité. */
export function CoveringStudio({ label, initial, base, onPreview, onApply, onClose }: {
  label: string; initial?: Wrap; base: PaintMaterial
  onPreview: (s: ComponentStyle) => void; onApply: (s: ComponentStyle) => void; onClose: () => void
}) {
  const [wrap, setWrap] = useState<Wrap>(initial ?? { coverage: 'full', layers: [], region: { from: 0, to: 1 } })
  const [sel, setSel] = useState<string | undefined>(wrap.layers.at(-1)?.id)
  const [picker, setPicker] = useState(false)
  useEffect(() => { if (wrap.layers.length) onPreview({ type: 'wrap', wrap, base }) }, [wrap]) // eslint-disable-line react-hooks/exhaustive-deps

  const layer = wrap.layers.find((l) => l.id === sel)
  const patch = (p: Partial<WrapLayer>) => setWrap((w) => ({ ...w, layers: w.layers.map((l) => (l.id === sel ? { ...l, ...p } : l)) }))
  const add = (kind: WrapLayerKind, extra: Partial<WrapLayer> = {}) => {
    const l: WrapLayer = { id: uid(), kind, color: kind === 'film' ? '#2A2A2E' : '#FFFFFF', color2: '#7938F5', x: 0.5, y: 0.5, scale: kind === 'sticker' || kind === 'logo' ? 0.35 : 1, rotation: 0, opacity: 1, count: 2, ...extra }
    setWrap((w) => ({ ...w, layers: [...w.layers, l] })); setSel(l.id); setPicker(false)
  }
  const importImage = (kind: 'logo' | 'texture', f?: File) => {
    if (!f) return
    const r = new FileReader(); r.onload = () => add(kind, { image: String(r.result), scale: kind === 'texture' ? 0.9 : 0.35 }); r.readAsDataURL(f)
  }
  const move = (d: number) => setWrap((w) => {
    const i = w.layers.findIndex((l) => l.id === sel), j = i + d
    if (i < 0 || j < 0 || j >= w.layers.length) return w
    const layers = [...w.layers]; [layers[i], layers[j]] = [layers[j], layers[i]]; return { ...w, layers }
  })

  return (
    <Sheet title={`Covering · ${label}`} onClose={onClose} peek closeLabel="Annuler" footer={<WideBtn disabled={!wrap.layers.length} onClick={() => onApply({ type: 'wrap', wrap, base })}>Appliquer le covering</WideBtn>}>
      <div className="space-y-3 pb-2">
        <Segmented options={[['full', 'Covering intégral'], ['partial', 'Covering partiel']]} value={wrap.coverage} onChange={(c) => setWrap({ ...wrap, coverage: c })} />
        <Card className="p-4">
          <div className="flex justify-between items-center mb-2"><h3 className="font-semibold">Calques</h3><Btn onClick={() => setPicker(true)}>Ajouter</Btn></div>
          {!wrap.layers.length && <p className="text-[14px] text-ink-2">Ajoutez un film, un dégradé, des bandes, un motif, un sticker ou votre logo.</p>}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">{[...wrap.layers].reverse().map((l) => <Chip key={l.id} label={TITLE[l.kind]} active={l.id === sel} onClick={() => setSel(l.id)} />)}</div>
          {layer && <div className="flex gap-2 mt-3">
            <Btn kind="secondary" onClick={() => move(1)}><ArrowUp size={15} />Monter</Btn><Btn kind="secondary" onClick={() => move(-1)}><ArrowDown size={15} />Descendre</Btn>
            <Btn kind="ghost" className="ml-auto !text-negative" aria-label="Supprimer le calque" onClick={() => { setWrap((w) => ({ ...w, layers: w.layers.filter((x) => x.id !== sel) })); setSel(undefined) }}><Trash2 size={17} /></Btn>
          </div>}
        </Card>
        {layer && <Card className="p-4 space-y-3">
          <h3 className="font-semibold">{TITLE[layer.kind]}</h3>
          {['film', 'gradient', 'stripes', 'checker'].includes(layer.kind) && <>
            <div className="flex gap-1 overflow-x-auto no-scrollbar items-center"><input type="color" value={layer.color} onChange={(e) => patch({ color: e.target.value.toUpperCase() })} className="w-9 h-9 shrink-0 bg-transparent" aria-label="Couleur" />{QUICK_COLORS.map((c) => <Swatch key={c.hex} hex={c.hex} name={c.name} active={layer.color === c.hex} onClick={() => patch({ color: c.hex })} />)}</div>
            {(layer.kind === 'gradient' || layer.kind === 'checker') && <label className="flex justify-between items-center text-[15px]">Seconde couleur<input type="color" value={layer.color2} onChange={(e) => patch({ color2: e.target.value.toUpperCase() })} className="w-9 h-9 bg-transparent" /></label>}
            {layer.kind === 'stripes' && <Slider label="Nombre de bandes" value={layer.count ?? 2} min={1} max={6} step={1} format={(v) => String(v)} onChange={(v) => patch({ count: v })} />}
          </>}
          {layer.kind !== 'film' && <>
            <Slider label="Horizontal" value={layer.x} min={0} max={1} format={pct} onChange={(v) => patch({ x: v })} />
            <Slider label="Vertical" value={layer.y} min={0} max={1} format={pct} onChange={(v) => patch({ y: v })} />
            <Slider label="Taille" value={layer.scale} min={0.05} max={3} format={pct} onChange={(v) => patch({ scale: v })} />
            <Slider label="Rotation" value={layer.rotation} min={-180} max={180} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => patch({ rotation: v })} />
          </>}
          <Slider label="Opacité" value={layer.opacity} min={0.1} max={1} format={pct} onChange={(v) => patch({ opacity: v })} />
        </Card>}
        {wrap.coverage === 'partial' && <Card className="p-4 space-y-2">
          <h3 className="font-semibold">Zone couverte (de l'arrière vers l'avant)</h3>
          <Slider label="Début" value={wrap.region?.from ?? 0} min={0} max={0.95} format={pct} onChange={(v) => setWrap({ ...wrap, region: { from: v, to: Math.max(v + 0.05, wrap.region?.to ?? 1) } })} />
          <Slider label="Fin" value={wrap.region?.to ?? 1} min={0.05} max={1} format={pct} onChange={(v) => setWrap({ ...wrap, region: { from: Math.min(wrap.region?.from ?? 0, v - 0.05), to: v } })} />
          <p className="text-[12px] text-ink-2">Les stickers et logos se placent avec leurs propres réglages.</p>
        </Card>}
        <p className="text-[12px] text-ink-2 px-1">Références de films de fabricants (3M, Avery…) : bientôt disponible.</p>
      </div>
      {picker && (
        <Sheet title="Ajouter un calque" onClose={() => setPicker(false)}>
          <div className="grid grid-cols-2 gap-2 py-2">
            {KINDS.filter(([k]) => !['sticker', 'logo', 'texture'].includes(k)).map(([k, t]) => <Btn key={k} kind="secondary" onClick={() => add(k)}>{t}</Btn>)}
            <label className="press h-9 rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)] grid place-items-center text-[15px] font-semibold">Logo importé<input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={(e) => importImage('logo', e.target.files?.[0])} /></label>
            <label className="press h-9 rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)] grid place-items-center text-[15px] font-semibold">Texture importée<input type="file" accept="image/*" className="hidden" onChange={(e) => importImage('texture', e.target.files?.[0])} /></label>
          </div>
          <h3 className="font-semibold mt-3 mb-2">Stickers</h3>
          <div className="grid grid-cols-4 gap-2 pb-4">{STICKERS.map((s) => (
            <button key={s.id} onClick={() => add('sticker', { sticker: s.id })} className="press bg-graphite rounded-[12px] p-2" aria-label={s.name}><img src={stickerURL(s.id)} alt="" className="w-full aspect-square object-contain" /></button>
          ))}</div>
        </Sheet>
      )}
    </Sheet>
  )
}
