import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Box, ChevronDown, ChevronLeft, ChevronRight, Droplet, Layers, Redo2, Undo2 } from 'lucide-react'
import { useApp } from '../store/app'
import { useNav } from '../store/nav'
import { catalog, variantById } from '../data/catalog'
import { ANGLES, COMPONENT_LABELS, PART_RENDERS, type AngleID } from '../data/visuals'
import { createHistory, record, redo, undo, type History } from '../domain/history'
import { defaultsFor, finishInfo, FINISHES, QUICK_FINISHES } from '../domain/finishes'
import { QUICK_COLORS } from '../domain/color'
import { findVariant } from '../domain/catalog'
import type { ComponentStyle, Configuration, Finish, PaintMaterial } from '../domain/types'
import { Glass } from '../ui/Glass'
import { Badge, Btn, Card, cx, Empty, RoundBtn, Segmented, Sheet } from '../ui/kit'
import { PaintStudio } from './PaintStudio'
import { CoveringStudio } from './CoveringStudio'
import { PhotoStage } from '../photo/PhotoStage'
import { generationOf, loadPack, type StoredPack } from '../photo/pack'

const BikeViewer = lazy(() => import('../engine/BikeViewer'))

export const FinishSwatch = ({ finish, color, active, onClick }: { finish: Finish; color: string; active?: boolean; onClick: () => void }) => {
  const sheen = finish === 'matte' ? 'linear-gradient(160deg,rgba(255,255,255,.06),rgba(0,0,0,.08))'
    : finish === 'satin' ? 'linear-gradient(160deg,rgba(255,255,255,.25),transparent 60%,rgba(0,0,0,.15))'
    : finish === 'carbon' || finish === 'forgedCarbon' ? 'repeating-linear-gradient(45deg,#222 0 3px,#111 3px 6px)'
    : ['chameleon', 'iridescent', 'holographic'].includes(finish) ? 'linear-gradient(120deg,rgba(255,0,180,.35),rgba(0,220,255,.35),rgba(255,230,0,.35))'
    : 'linear-gradient(160deg,rgba(255,255,255,.65),rgba(255,255,255,.05) 35%,transparent 60%,rgba(0,0,0,.3))'
  return (
    <button onClick={onClick} aria-pressed={active} aria-label={finishInfo(finish).label} className={cx('press rounded-[12px] p-1 text-center', active && 'bg-accent-soft ring-[1.5px] ring-accent')}>
      <span className="block h-9 rounded-[9px]" style={{ background: `${sheen}, ${color}` }} />
      <span className="block text-[11px] font-medium mt-1 leading-tight">{finishInfo(finish).label}</span>
    </button>
  )
}

export const Swatch = ({ hex, name, active, onClick }: { hex: string; name: string; active?: boolean; onClick: () => void }) => (
  <button aria-label={name} aria-pressed={active} onClick={onClick} className={cx('press w-11 h-11 rounded-full p-[3px] ring-2', active ? 'ring-accent' : 'ring-transparent')}>
    <span className="block w-full h-full rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" style={{ background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,.5), transparent 45%), ${hex}` }} />
  </button>
)

function article(name: string) {
  const l = name.toLowerCase(); const first = l.split(' ')[0]
  if (first.endsWith('s')) return `des ${l}`
  if ('aeiouéèh'.includes(l[0])) return `de l'${l}`
  return ['selle', 'fourche', 'jante', 'coque'].some((f) => l.startsWith(f)) ? `de la ${l}` : `du ${l}`
}

export default function Workshop({ projectID }: { projectID: string }) {
  const project = useApp((s) => s.projects.find((p) => p.id === projectID))
  const { saveProject, pushRecentColor } = useApp()
  const { pop, openCatalog, push } = useNav()
  const [hist, setHist] = useState<History<Configuration> | null>(project ? createHistory(project.configuration) : null)
  const [draft, setDraft] = useState<Configuration | null>(null)   // live preview from studios
  const [angle, setAngle] = useState<AngleID>('frontThreeQuarter')
  const [selected, setSelected] = useState('tank')
  const [seg, setSeg] = useState<'customize' | 'configure'>('customize')
  const [mode, setMode] = useState<'color' | 'finish' | 'parts'>('color')
  const [compare, setCompare] = useState(false)
  const [pack, setPack] = useState<StoredPack | undefined>()
  const [render, setRender] = useState<'3d' | 'photo'>('3d')
  const [sheet, setSheet] = useState<'paint' | 'wrap' | 'component' | null>(null)
  const log = useRef<string[]>(project?.history ?? [])

  // Autosave (debounced) of every recorded change.
  useEffect(() => {
    if (!hist || !project || hist.present === project.configuration) return
    const t = setTimeout(() => saveProject({ ...project, configuration: hist.present, history: log.current }), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hist])

  const variant = project && variantById(project.configuration.vehicleVariantID)
  const components = useMemo(() => variant?.components.map((c) => c.id.split('.').pop()!) ?? [], [variant])
  const generation = project && generationOf(project.configuration.vehicleVariantID, catalog.variants)
  useEffect(() => { if (generation) loadPack(generation).then(setPack).catch(() => setPack(undefined)) }, [generation])
  if (!project || !hist) return <Empty icon={<Box size={36} />} title="Projet introuvable" text="Ce projet a été supprimé." action={<Btn onClick={pop}>Retour</Btn>} />

  const config = draft ?? hist.present
  const current = config.styles[selected]
  const paint: PaintMaterial | undefined = current?.type === 'paint' ? current.paint : current?.type === 'wrap' ? current.base : undefined
  const label = COMPONENT_LABELS[selected] ?? selected

  const commit = (next: Configuration, what: string) => {
    log.current = [...log.current, what]
    setHist((h) => (h ? record(h, next, what) : h)); setDraft(null)
  }
  const setStyle = (slug: string, style: ComponentStyle | undefined, what: string) => {
    const styles = { ...hist.present.styles }
    if (style) styles[slug] = style; else delete styles[slug]
    commit({ ...hist.present, styles }, what)
  }
  const applyPaint = (p: PaintMaterial) => setStyle(selected, { type: 'paint', paint: p }, `Peinture · ${label}`)
  const pickColor = (hex: string) => { applyPaint({ ...(paint ?? defaultsFor('gloss', hex)), color: hex }); pushRecentColor(hex) }
  const pickFinish = (f: Finish) => applyPaint({ ...defaultsFor(f, paint?.color ?? '#7938F5') })
  const removePart = (variantID: string) => commit({ ...hist.present, parts: hist.present.parts.filter((p) => p.variantID !== variantID) }, 'Retrait de pièce')
  const undoLabel = hist.past[hist.past.length - 1]?.label

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-5 pt-2 pb-2 grid grid-cols-[44px_1fr_auto] items-center">
        <RoundBtn label="Retour" onClick={pop}><ChevronLeft size={22} /></RoundBtn>
        <h1 className="text-center text-[17px] font-semibold">Atelier</h1>
        <div className="flex gap-2">
          <RoundBtn label={undoLabel ? `Annuler : ${undoLabel}` : 'Annuler'} onClick={() => { setHist(undo(hist)); setDraft(null) }} className={cx(!hist.past.length && 'opacity-40')}><Undo2 size={18} /></RoundBtn>
          <RoundBtn label="Rétablir" onClick={() => { setHist(redo(hist)); setDraft(null) }} className={cx(!hist.future.length && 'opacity-40')}><Redo2 size={18} /></RoundBtn>
        </div>
      </header>
      <div className="px-5"><Segmented options={[['customize', 'Personnaliser'], ['configure', 'Configurer']]} value={seg} onChange={setSeg} /></div>

      {/* Stage: the bike is the main element; UI around it stays neutral (no tint behind the render). */}
      <div className="relative mx-5 mt-3 rounded-[var(--radius-card)] overflow-hidden bg-[#EDEDF0] h-[min(48dvh,420px)]">
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-ink-2 text-[14px]">Chargement du modèle 3D…</div>}>
          {render === 'photo' && pack
            ? <PhotoStage pack={pack} angle={angle} configuration={config} showOriginal={compare} />
            : <BikeViewer configuration={config} angle={angle} showOriginal={compare} onSelect={(s) => { setSelected(s); setSeg('customize'); setMode('color') }} />}
        </Suspense>
        <div className="absolute left-2 right-2 top-2 flex justify-between gap-2 pointer-events-none">
          <Glass radius={18} className="pointer-events-auto flex overflow-x-auto no-scrollbar p-1 gap-1 max-w-[74%]">
            {ANGLES.map((a) => (
              <button key={a.id} onClick={() => setAngle(a.id)} aria-pressed={angle === a.id} className={cx('shrink-0 h-8 px-2.5 rounded-full text-[12px] font-semibold', angle === a.id ? 'bg-white text-ink shadow' : 'text-ink')}>{a.label}</button>
            ))}
          </Glass>
          <Glass radius={18} className="pointer-events-auto p-1 flex gap-1">
            {pack && <button onClick={() => setRender((r) => (r === '3d' ? 'photo' : '3d'))} aria-label={render === '3d' ? 'Afficher les photos' : 'Afficher le modèle 3D'} className="h-8 px-3 rounded-full text-[12px] font-semibold">{render === '3d' ? 'Photo' : '3D'}</button>}
            <button onClick={() => setCompare((c) => !c)} aria-pressed={compare} className={cx('h-8 px-3 rounded-full text-[12px] font-semibold', compare && 'bg-white shadow')}>{compare ? 'Origine' : 'Avant'}</button>
          </Glass>
        </div>
        <div className="absolute left-2 right-2 bottom-2 grid grid-cols-3 gap-2">
          {([['color', 'Couleur', Droplet], ['finish', 'Finition', Layers], ['parts', 'Pièces', Box]] as const).map(([id, t, I]) => (
            <Glass key={id} radius={16} className={cx(seg === 'customize' && mode === id && '!bg-accent')}>
              <button onClick={() => { setSeg('customize'); setMode(id) }} aria-pressed={mode === id} className={cx('w-full h-[58px] flex flex-col items-center justify-center gap-0.5 text-[12px] font-semibold', seg === 'customize' && mode === id ? 'text-white' : 'text-ink')}>
                <I size={19} />{t}
              </button>
            </Glass>
          ))}
        </div>
      </div>
      <p className="px-5 pt-2 text-[12px] text-ink-2">{render === 'photo' && pack
        ? 'Photo de votre pack privé : couleurs recalculées sur l\'appareil à partir de la même configuration que la 3D. Covering et accessoires visibles en 3D uniquement.'
        : 'Modèle 3D simplifié construit aux cotes Honda : ce n\'est pas une photo de la moto. Les vues photoréalistes attendent des sources fidèles et contrôlées.'}</p>

      <div className="px-5 pt-4 pb-10 flex-1">
        {seg === 'customize' && mode === 'color' && <>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setSheet('component')} className="flex items-center gap-1 text-[17px] font-semibold" aria-label={`Élément : ${label}`}>Couleur {article(label)} <ChevronDown size={16} /></button>
            <button onClick={() => setSheet('paint')} className="text-[13px] font-semibold text-accent">Plus de couleurs</button>
          </div>
          <div className="grid grid-cols-6 gap-y-3 justify-items-center">{QUICK_COLORS.map((c) => <Swatch key={c.hex} hex={c.hex} name={c.name} active={paint?.color === c.hex} onClick={() => pickColor(c.hex)} />)}</div>
          <h3 className="text-[17px] font-semibold mt-6 mb-3 flex items-center gap-2">Finition {paint && finishInfo(paint.finish).simulated && <Badge kind="simulation" />}</h3>
          <div className="grid grid-cols-4 gap-2">{QUICK_FINISHES.map((f) => <FinishSwatch key={f} finish={f} color={paint?.color ?? '#7938F5'} active={paint?.finish === f} onClick={() => pickFinish(f)} />)}</div>
        </>}

        {seg === 'customize' && mode === 'finish' && <>
          <h3 className="text-[17px] font-semibold mb-3">Finitions · {label}</h3>
          <div className="grid grid-cols-4 gap-2">{FINISHES.map((f) => (
            <div key={f.id} className="relative"><FinishSwatch finish={f.id} color={paint?.color ?? '#7938F5'} active={paint?.finish === f.id} onClick={() => pickFinish(f.id)} />
              {f.simulated && <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-graphite text-white rounded-full px-1.5 py-0.5">SIM</span>}</div>
          ))}</div>
          <p className="text-[12px] text-ink-2 mt-3">SIM : effet dépendant de la lumière, de l'angle, de la température ou des UV, rendu en simulation.</p>
          <div className="flex gap-2 mt-4"><Btn kind="secondary" onClick={() => setSheet('paint')}>Peinture avancée</Btn><Btn kind="secondary" onClick={() => setSheet('wrap')}>Covering</Btn></div>
        </>}

        {seg === 'customize' && mode === 'parts' && <>
          <h3 className="text-[17px] font-semibold mb-3">Pièces installées</h3>
          {!config.parts.length && <p className="text-[15px] text-ink-2 mb-3">Aucune pièce. Ajoutez des pièces compatibles depuis le catalogue.</p>}
          <div className="space-y-2">{config.parts.map((p) => {
            const f = findVariant(catalog, p.variantID)
            return (
              <Card key={p.variantID} className="px-4 py-3 flex items-center gap-3">
                <span className="flex-1 text-[15px]"><b>{f?.accessory.manufacturer}</b> {f?.accessory.commercialName}<span className="block text-[12px] text-ink-2">{f?.variant.reference}{!PART_RENDERS[p.variantID] && ' · sans représentation 3D'}</span></span>
                <button onClick={() => removePart(p.variantID)} className="text-negative text-[14px] font-semibold">Retirer</button>
              </Card>
            )
          })}</div>
          <Btn className="mt-4" onClick={() => openCatalog()}>Parcourir le catalogue</Btn>
        </>}

        {seg === 'configure' && <>
          <h3 className="text-[17px] font-semibold mb-3">Éléments</h3>
          <Card className="divide-y divide-line">{components.map((slug) => {
            const st = config.styles[slug]
            const col = st?.type === 'paint' ? st.paint.color : st?.type === 'wrap' ? st.base.color : undefined
            return (
              <button key={slug} onClick={() => { setSelected(slug); setSheet('paint') }} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className="w-7 h-5 rounded-[5px] border border-line" style={{ background: col ?? 'transparent' }} />
                <span className="flex-1 text-[15px]">{COMPONENT_LABELS[slug]}</span>
                <span className={cx('text-[12px]', st ? 'text-accent' : 'text-ink-2')}>{st ? (st.type === 'wrap' ? 'Covering' : 'Modifié') : 'Origine'}</span>
                <ChevronRight size={16} className="text-ink-2" />
              </button>
            )
          })}</Card>
          <div className="flex flex-wrap gap-2 mt-4">
            <Btn kind="secondary" onClick={() => setSheet('wrap')}>Covering {article(label)}</Btn>
            <Btn kind="secondary" onClick={() => push({ name: 'budget', projectID })}>Budget</Btn>
            <Btn kind="secondary" onClick={() => push({ name: 'list', projectID })}>Liste d'achat</Btn>
          </div>
          <h3 className="text-[17px] font-semibold mt-6 mb-2">Historique des modifications</h3>
          {log.current.length ? <ol className="text-[14px] space-y-1 text-ink-2">{[...log.current].reverse().slice(0, 12).map((h, i) => <li key={i}>• {h}</li>)}</ol> : <p className="text-[14px] text-ink-2">Aucune modification.</p>}
          <Btn kind="ghost" className="!text-negative mt-3 !px-0" onClick={() => { if (confirm('Revenir à la configuration d’origine ? (annulable)')) commit({ ...hist.present, styles: {}, parts: [] }, 'Retour à l’origine') }}>Revenir à l'origine</Btn>
        </>}
      </div>

      {sheet === 'component' && (
        <Sheet title="Élément" onClose={() => setSheet(null)}>
          <div className="grid grid-cols-2 gap-2 py-2">{components.map((s) => <Btn key={s} kind={s === selected ? 'primary' : 'secondary'} onClick={() => { setSelected(s); setSheet(null) }}>{COMPONENT_LABELS[s]}</Btn>)}</div>
        </Sheet>
      )}
      {sheet === 'paint' && <PaintStudio label={label} initial={paint} colorways={variant?.colorways ?? []}
        onPreview={(p) => setDraft({ ...hist.present, styles: { ...hist.present.styles, [selected]: { type: 'paint', paint: p } } })}
        onApply={(p) => { applyPaint(p); pushRecentColor(p.color); setSheet(null) }} onClose={() => { setDraft(null); setSheet(null) }} />}
      {sheet === 'wrap' && <CoveringStudio label={label} initial={current?.type === 'wrap' ? current.wrap : undefined} base={paint ?? defaultsFor('gloss', '#2A2A2E')}
        onPreview={(s) => setDraft({ ...hist.present, styles: { ...hist.present.styles, [selected]: s } })}
        onApply={(s) => { setStyle(selected, s, `Covering · ${label}`); setSheet(null) }} onClose={() => { setDraft(null); setSheet(null) }} />}
    </div>
  )
}
