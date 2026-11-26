import { useState } from 'react'
import { Calendar, CheckCircle2, Circle, Gauge, MoreHorizontal, ShieldCheck, Wrench } from 'lucide-react'
import { useApp } from '../store/app'
import { useNav } from '../store/nav'
import { bikeName, catalog } from '../data/catalog'
import { isTrustworthy } from '../domain/catalog'
import { Snapshot } from '../engine/Snapshot'
import { AddBtn, Btn, Card, Chip, cx, Empty, Header, Segmented, Sheet, WideBtn } from '../ui/kit'
import type { Bike } from '../domain/types'

export default function Garage() {
  const { bikes, projects, createProject, removeBike, selectBike, updateBike, selectedBikeID } = useApp()
  const { push } = useNav()
  const [seg, setSeg] = useState<'bikes' | 'history'>('bikes')
  const [menu, setMenu] = useState<Bike | null>(null)
  const [edit, setEdit] = useState<Bike | null>(null)

  const openWorkshop = async (b: Bike) => {
    const p = projects.find((x) => x.bikeID === b.id) ?? (await createProject(b))
    push({ name: 'workshop', projectID: p.id })
  }

  return (
    <div className="pb-dock">
      <Header title="Mon garage" back={false} right={<AddBtn label="Ajouter une moto" onClick={() => push({ name: 'addBike' })} />} />
      <div className="px-5 space-y-4">
        <Segmented options={[['bikes', 'Mes motos'], ['history', 'Historique']]} value={seg} onChange={setSeg} />
        {seg === 'bikes' && !bikes.length && <Empty icon={<Wrench size={36} />} title="Aucune moto" text="Ajoutez votre moto pour créer vos projets de personnalisation." action={<Btn onClick={() => push({ name: 'addBike' })}>Ajouter une moto</Btn>} />}
        {seg === 'bikes' && bikes.map((b) => {
          const n = bikeName(b.variantID)
          return (
            <Card key={b.id} className="overflow-hidden">
              <div className="p-4 pb-0 flex justify-between items-start">
                <div>
                  <div className="text-[17px] font-semibold">{b.nickname ?? `${n.brand} ${n.model}`}{b.id === selectedBikeID && <span className="ml-2 text-[12px] text-accent font-semibold">principale</span>}</div>
                  <div className="text-[13px] text-ink-2">{[b.year, n.code].filter(Boolean).join(' · ')}</div>
                </div>
                <button aria-label="Actions pour la moto" onClick={() => setMenu(b)} className="press w-8 h-8 rounded-full bg-bg grid place-items-center"><MoreHorizontal size={18} /></button>
              </div>
              <button onClick={() => openWorkshop(b)} className="block w-full" aria-label="Ouvrir l'atelier">
                <Snapshot configuration={{ vehicleVariantID: b.variantID, styles: {}, parts: [] }} angle="rightProfile" className="w-full h-[180px]" />
              </button>
              <div className="grid grid-cols-3 border-t border-line py-3 text-center text-[13px]">
                <div><Gauge size={18} className="mx-auto mb-1" />{b.mileageKm ? `${b.mileageKm.toLocaleString('fr-FR')} km` : '— km'}</div>
                <div><Calendar size={18} className="mx-auto mb-1" />{b.year ?? '—'}</div>
                <div><Wrench size={18} className="mx-auto mb-1" />{n.code}</div>
              </div>
            </Card>
          )
        })}
        {seg === 'history' && (projects.length ? projects.map((p) => (
          <Card key={p.id} onClick={() => push({ name: 'workshop', projectID: p.id })} className="px-4 py-3">
            <div className="text-[15px] font-semibold">{p.name}</div>
            <div className="text-[13px] text-ink-2">Mis à jour le {new Date(p.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · {p.history.length} modification(s)</div>
          </Card>
        )) : <Empty icon={<Calendar size={36} />} title="Aucun historique" text="Vos projets et leurs modifications apparaîtront ici." />)}
      </div>

      {menu && (
        <Sheet title="Moto" onClose={() => setMenu(null)}>
          <div className="space-y-2 py-2">
            <WideBtn onClick={() => { setMenu(null); openWorkshop(menu) }}>Ouvrir l'atelier</WideBtn>
            <Btn kind="secondary" className="w-full" onClick={async () => { const p = await createProject(menu); setMenu(null); push({ name: 'workshop', projectID: p.id }) }}>Nouveau projet</Btn>
            <Btn kind="secondary" className="w-full" onClick={() => { selectBike(menu.id); setMenu(null) }}>Définir comme moto principale</Btn>
            <Btn kind="secondary" className="w-full" onClick={() => { setEdit(menu); setMenu(null) }}>Modifier</Btn>
            <Btn kind="ghost" className="w-full !text-negative" onClick={() => { if (confirm('Supprimer cette moto et ses projets ?')) removeBike(menu.id); setMenu(null) }}>Supprimer</Btn>
          </div>
        </Sheet>
      )}
      {edit && (
        <Sheet title="Modifier la moto" onClose={() => setEdit(null)} footer={<WideBtn onClick={() => { updateBike(edit); setEdit(null) }}>Enregistrer</WideBtn>}>
          <div className="space-y-3 py-2">
            <Field label="Surnom"><input className="input" value={edit.nickname ?? ''} onChange={(e) => setEdit({ ...edit, nickname: e.target.value || undefined })} placeholder="Facultatif" /></Field>
            <Field label="Kilométrage"><input className="input" inputMode="numeric" value={edit.mileageKm ?? ''} onChange={(e) => setEdit({ ...edit, mileageKm: Number(e.target.value.replace(/\D/g, '')) || undefined })} placeholder="km" /></Field>
          </div>
        </Sheet>
      )}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[13px] text-ink-2">{label}</span><div className="mt-1">{children}</div></label>
}

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3"><span className="w-6 h-6 rounded-full bg-accent text-white text-[12px] font-bold grid place-items-center">{n}</span><h2 className="text-[17px] font-semibold">{title}</h2></div>
      {children}
    </Card>
  )
const Option = ({ on, active, title, sub, verified }: { on: () => void; active: boolean; title: string; sub?: string; verified?: boolean }) => (
    <button onClick={on} className={cx('press w-full flex items-center gap-3 p-3 rounded-[var(--radius-tile)] text-left mb-2', active ? 'bg-accent-soft' : 'bg-bg')} aria-pressed={active}>
      {active ? <CheckCircle2 className="text-accent" size={22} /> : <Circle className="text-ink-2" size={22} />}
      <span className="flex-1"><span className="block text-[15px] font-semibold">{title}</span>{sub && <span className="block text-[12px] text-ink-2">{sub}</span>}</span>
      {verified && <ShieldCheck size={18} className="text-accent" aria-label="Vérifié" />}
    </button>
  )


/** Ajout de moto : marque → modèle → génération → version → année → coloris d'origine. */
export function AddBike() {
  const { addBike } = useApp()
  const { pop } = useNav()
  const [brand, setBrand] = useState(catalog.brands.length === 1 ? catalog.brands[0].id : '')
  const models = catalog.models.filter((m) => m.brandID === brand)
  const [model, setModel] = useState(models.length === 1 ? models[0].id : '')
  const gens = catalog.generations.filter((g) => g.modelID === model)
  const [gen, setGen] = useState(gens.length === 1 ? gens[0].id : '')
  const variants = catalog.variants.filter((v) => v.generationID === gen)
  const [variant, setVariant] = useState(variants[0]?.id ?? '')
  const [year, setYear] = useState<number | undefined>()
  const [colorway, setColorway] = useState<string | undefined>()
  const [km, setKm] = useState('')
  const g = gens.find((x) => x.id === gen)
  const v = variants.find((x) => x.id === variant)
  const years = g?.firstYear ? Array.from({ length: (g.lastYear ?? new Date().getFullYear()) - g.firstYear + 1 }, (_, i) => g.firstYear! + i) : []

  return (
    <div className="pb-40">
      <Header title="Ajouter une moto" />
      <div className="px-5 space-y-3">
        <Step n={1} title="Marque"><div className="flex gap-2">{catalog.brands.map((b) => <Chip key={b.id} label={b.name} active={brand === b.id} onClick={() => { setBrand(b.id); setModel(''); setGen(''); setVariant('') }} />)}</div></Step>
        {brand && <Step n={2} title="Modèle"><div className="flex gap-2">{models.map((m) => <Chip key={m.id} label={m.name} active={model === m.id} onClick={() => { setModel(m.id); setGen('') }} />)}</div></Step>}
        {model && <Step n={3} title="Génération">{gens.map((x) => <Option key={x.id} on={() => setGen(x.id)} active={gen === x.id} title={x.code} sub={x.firstYear ? `${x.firstYear} – ${x.lastYear ?? 'aujourd’hui'}` : undefined} verified={isTrustworthy(x.verification)} />)}</Step>}
        {gen && <Step n={4} title="Version">{variants.map((x) => <Option key={x.id} on={() => { setVariant(x.id); setColorway(undefined) }} active={variant === x.id} title={x.versionName} sub={x.verification.source} verified={isTrustworthy(x.verification)} />)}</Step>}
        {v && <>
          <Step n={5} title="Année"><div className="flex flex-wrap gap-2">{years.map((y) => <Chip key={y} label={String(y)} active={year === y} onClick={() => setYear(y)} />)}<Chip label="Je ne sais pas" active={!year} onClick={() => setYear(undefined)} /></div></Step>
          <Step n={6} title="Coloris d'origine">{v.colorways.map((c) => <Option key={c.id} on={() => setColorway(c.id)} active={colorway === c.id} title={c.name} verified={isTrustworthy(c.verification)} />)}<Option on={() => setColorway(undefined)} active={!colorway} title="Je ne sais pas" /></Step>
          <Step n={7} title="Kilométrage"><input className="input" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ''))} placeholder="Facultatif (km)" aria-label="Kilométrage" /></Step>
        </>}
      </div>
      <div className="fixed left-0 right-0 bottom-0 px-5 pt-3 bg-bg/90 backdrop-blur-md" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <WideBtn disabled={!variant} onClick={async () => { await addBike({ variantID: variant, colorwayID: colorway, year, mileageKm: Number(km) || undefined }); pop() }}>Ajouter au garage</WideBtn>
      </div>
    </div>
  )
}
