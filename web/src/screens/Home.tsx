import { useMemo, useState } from 'react'
import { Bell, Bookmark, ChevronRight, House, Layers, SlidersHorizontal, UserRound, Wrench } from 'lucide-react'
import { selectedBike, useApp } from '../store/app'
import { useNav } from '../store/nav'
import { bikeName, catalog } from '../data/catalog'
import { INSPIRATIONS } from '../data/inspirations'
import { Snapshot } from '../engine/Snapshot'
import { compatibleAccessories, CATEGORY_LABEL } from '../domain/catalog'
import { Btn, Card, cx, SectionTitle, Sheet } from '../ui/kit'

export function Wordmark() {
  return (
    <div>
      <div className="text-[30px] leading-none font-black italic tracking-[-0.02em] text-accent">MOTOFORGE</div>
      <div className="text-[13px] text-ink-2 mt-1">Imagine. Personnalise. Roule.</div>
    </div>
  )
}

export default function Home() {
  const { projects, bikes, createProject, saveProject } = useApp()
  const bike = useApp(selectedBike)
  const { push, setTab, openCatalog } = useNav()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [sheet, setSheet] = useState<'notif' | 'filter' | null>(null)
  const recent = projects.slice(0, 4)

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s || !bike) return []
    return compatibleAccessories(catalog, bike.variantID).filter((a) => `${a.manufacturer} ${a.commercialName} ${CATEGORY_LABEL[a.category]}`.toLowerCase().includes(s))
  }, [q, bike])

  const openWorkshop = async () => {
    if (projects[0]) return push({ name: 'workshop', projectID: projects[0].id })
    if (!bike) return push({ name: 'addBike' })
    const p = await createProject(bike); push({ name: 'workshop', projectID: p.id })
  }
  const startInspiration = async (id: string) => {
    if (!bike) return push({ name: 'addBike' })
    const insp = INSPIRATIONS.find((i) => i.id === id)!
    const p = await createProject(bike, insp.name, { styles: insp.styles })
    await saveProject({ ...p, history: [`Inspiration « ${insp.name} »`] })
    push({ name: 'workshop', projectID: p.id })
  }
  const demoConfig = { vehicleVariantID: bike?.variantID ?? catalog.variants[0].id, styles: {}, parts: [] }

  return (
    <div className="px-5 pb-dock">
      <div className="flex items-start justify-between pt-3">
        <Wordmark />
        <div className="flex items-center gap-2">
          <button aria-label="Notifications" onClick={() => setSheet('notif')} className="press w-10 h-10 rounded-full bg-surface grid place-items-center"><Bell size={19} /></button>
          <button aria-label="Profil et paramètres" onClick={() => setTab('menu')} className="press w-10 h-10 rounded-full bg-graphite text-white grid place-items-center"><UserRound size={20} /></button>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <label className="flex-1 flex items-center gap-2 h-11 rounded-full bg-surface px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une moto, une pièce…" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink-2" aria-label="Rechercher" />
        </label>
        <button aria-label="Filtrer le catalogue" onClick={() => setSheet('filter')} className="press w-11 h-11 rounded-full bg-graphite text-white grid place-items-center"><SlidersHorizontal size={18} /></button>
      </div>

      {q ? (
        <div className="mt-5 space-y-2">
          {!bike && <p className="text-ink-2">Ajoutez votre moto pour chercher des pièces compatibles.</p>}
          {bike && !results.length && <p className="text-ink-2 py-6 text-center">Aucune pièce compatible pour « {q} ».</p>}
          {results.map((a) => (
            <Card key={a.id} onClick={() => push({ name: 'product', accessoryID: a.id })} className="px-4 py-3 flex justify-between items-center">
              <span className="text-[15px]"><b>{a.manufacturer}</b> {a.commercialName}</span><ChevronRight size={18} className="text-ink-2" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <section className="mt-6">
            <SectionTitle>Mon projet</SectionTitle>
            {recent.length ? (
              <>
                <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-5 px-5 gap-3" onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
                  {recent.map((p) => {
                    const n = bikeName(p.configuration.vehicleVariantID)
                    const b = bikes.find((x) => x.id === p.bikeID)
                    return (
                      <button key={p.id} onClick={() => push({ name: 'workshop', projectID: p.id })} className="press snap-center shrink-0 w-full relative h-[178px] rounded-[var(--radius-card)] bg-graphite overflow-hidden text-left" aria-label={`Reprendre ${p.name}`}>
                        <Snapshot configuration={p.configuration} className="absolute right-[-12%] top-0 h-full w-[78%]" />
                        <div className="absolute left-4 bottom-4 text-white">
                          <div className="text-[15px] opacity-90">{n.brand}</div>
                          <div className="text-[30px] leading-tight font-black italic">{n.model}</div>
                          <div className="text-[13px] opacity-80">{[b?.year, n.code].filter(Boolean).join(' · ')}</div>
                        </div>
                        <span className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-white/85 grid place-items-center text-ink"><ChevronRight size={18} /></span>
                      </button>
                    )
                  })}
                </div>
                {recent.length > 1 && <div className="flex justify-center gap-1.5 mt-3">{recent.map((p, i) => <span key={p.id} className={cx('w-1.5 h-1.5 rounded-full', i === page ? 'bg-accent' : 'bg-ink-2/30')} />)}</div>}
              </>
            ) : (
              <Card className="p-4 flex items-center gap-4">
                <Snapshot configuration={demoConfig} className="w-28 h-20" w={320} h={220} />
                <div className="flex-1">
                  <p className="text-[15px] text-ink-2 mb-2">{bike ? 'Aucun projet pour l’instant.' : 'Ajoutez votre moto pour commencer.'}</p>
                  <Btn onClick={openWorkshop}>{bike ? 'Créer un projet' : 'Ajouter ma moto'}</Btn>
                </div>
              </Card>
            )}
          </section>

          <section className="mt-6">
            <SectionTitle>Accès rapide</SectionTitle>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Mon garage', Icon: House, on: () => setTab('garage') },
                { label: 'Atelier', Icon: Wrench, on: openWorkshop, hi: true },
                { label: 'Catalogue', Icon: Layers, on: () => openCatalog() },
                { label: 'Mes projets', Icon: Bookmark, on: () => setTab('projects') },
              ].map(({ label, Icon, on, hi }) => (
                <button key={label} onClick={on} className={cx('press h-[76px] rounded-[var(--radius-tile)] flex flex-col items-center justify-center gap-1.5', hi ? 'bg-accent-soft text-accent' : 'bg-surface')}>
                  <Icon size={22} /><span className="text-[11px] font-medium text-ink">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <SectionTitle>Inspirations</SectionTitle>
            <div className="flex overflow-x-auto no-scrollbar -mx-5 px-5 gap-3">
              {INSPIRATIONS.map((i) => (
                <button key={i.id} onClick={() => startInspiration(i.id)} className="press shrink-0 w-[150px] text-left" aria-label={`${i.name} : ${i.summary}. Créer un projet.`}>
                  <div className="h-[104px] rounded-[var(--radius-tile)] bg-surface overflow-hidden">
                    <Snapshot configuration={{ ...demoConfig, styles: i.styles }} className="w-full h-full" w={360} h={250} />
                  </div>
                  <div className="text-[13px] font-semibold mt-1.5">{i.name}</div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {sheet === 'notif' && <Sheet title="Notifications" onClose={() => setSheet(null)}><p className="text-ink-2 py-8 text-center">Aucune notification.</p></Sheet>}
      {sheet === 'filter' && (
        <Sheet title="Filtrer le catalogue" onClose={() => setSheet(null)}>
          <div className="flex flex-wrap gap-2 py-2">
            {Object.entries(CATEGORY_LABEL).map(([id, label]) => <Btn key={id} kind="secondary" onClick={() => { setSheet(null); openCatalog(id) }}>{label}</Btn>)}
          </div>
        </Sheet>
      )}
    </div>
  )
}
