import { useState } from 'react'
import { Heart, MoreHorizontal } from 'lucide-react'
import { selectedBike, useApp } from '../store/app'
import { useNav } from '../store/nav'
import { catalog } from '../data/catalog'
import { COMPONENT_LABELS } from '../data/visuals'
import { progress, summarize, formatMoney } from '../domain/budget'
import { finishInfo } from '../domain/finishes'
import { findVariant } from '../domain/catalog'
import { Snapshot } from '../engine/Snapshot'
import type { Project } from '../domain/types'
import { AddBtn, Btn, Card, Chip, Empty, Header, Sheet } from '../ui/kit'
import { PartVisual } from './Catalog'

export function describe(p: Project) {
  const lines = [`${p.name} — Honda CB125R`]
  for (const [slug, s] of Object.entries(p.configuration.styles))
    lines.push(`• ${COMPONENT_LABELS[slug] ?? slug} : ${s.type === 'paint' ? `${s.paint.color} ${finishInfo(s.paint.finish).label}` : 'covering'}`)
  for (const part of p.configuration.parts) { const f = findVariant(catalog, part.variantID); if (f) lines.push(`• ${f.accessory.manufacturer} ${f.accessory.commercialName} — réf. ${f.variant.reference}`) }
  lines.push('Créé avec MOTOFORGE')
  return lines.join('\n')
}

export async function exportImage(p: Project) {
  const { snapshot } = await import('../engine/snapshot')
  const url = await snapshot(p.configuration, 'frontThreeQuarter', 1600, 1100)
  const blob = await (await fetch(url)).blob()
  return new File([blob], `${p.name.replace(/[^\w-]+/g, '_')}.png`, { type: 'image/png' })
}

export default function Projects() {
  const { projects, saveProject, duplicateProject, deleteProject, createProject } = useApp()
  const bike = useApp(selectedBike)
  const { push } = useNav()
  const [filter, setFilter] = useState<'all' | 'progress' | 'done' | 'fav'>('all')
  const [menu, setMenu] = useState<Project | null>(null)
  const [compare, setCompare] = useState(false)

  const list = projects.filter((p) => filter === 'all' || (filter === 'progress' ? progress(p.lines) < 1 : progress(p.lines) === 1 && p.lines.length > 0))
  const create = async () => { if (!bike) return push({ name: 'addBike' }); const p = await createProject(bike); push({ name: 'workshop', projectID: p.id }) }
  const share = async (p: Project) => {
    const file = await exportImage(p)
    const data: ShareData = { title: p.name, text: describe(p) }
    if (navigator.canShare?.({ files: [file] })) data.files = [file]
    if (navigator.share) await navigator.share(data).catch(() => undefined)
    else { await navigator.clipboard.writeText(describe(p)); alert('Résumé copié dans le presse-papiers.') }
  }
  const download = async (p: Project) => {
    const f = await exportImage(p); const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click()
  }

  return (
    <div className="pb-dock">
      <Header title="Mes projets" back={false} right={<AddBtn label="Nouveau projet" onClick={create} />} />
      <div className="px-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
          <Chip label="Tous" active={filter === 'all'} onClick={() => setFilter('all')} /><Chip label="En cours" active={filter === 'progress'} onClick={() => setFilter('progress')} />
          <Chip label="Terminés" active={filter === 'done'} onClick={() => setFilter('done')} /><Chip label="Favoris" active={filter === 'fav'} onClick={() => setFilter('fav')} />
          {projects.length > 1 && <Chip label="Comparer" onClick={() => setCompare(true)} />}
        </div>
        {filter === 'fav' ? <Favorites /> : !list.length ? (
          <Empty icon={<Heart size={36} />} title={filter === 'done' ? 'Aucun projet terminé' : 'Aucun projet'} text={filter === 'done' ? 'Un projet est terminé quand toutes ses pièces sont installées.' : 'Créez un projet pour personnaliser votre moto.'} action={filter !== 'done' ? <Btn onClick={create}>Nouveau projet</Btn> : undefined} />
        ) : <div className="space-y-4">{list.map((p) => {
          const pr = Math.round(progress(p.lines) * 100)
          return (
            <Card key={p.id} className="p-3">
              <button className="block w-full" onClick={() => push({ name: 'workshop', projectID: p.id })} aria-label={`Ouvrir ${p.name}`}>
                <Snapshot configuration={p.configuration} angle="rightProfile" className="w-full h-[150px] rounded-[var(--radius-tile)] bg-bg" />
              </button>
              <div className="flex justify-between items-start mt-3 px-1">
                <div><div className="text-[15px] font-semibold">{p.name}{p.favorite && <Heart size={13} className="inline ml-1 fill-accent text-accent" />}</div>
                  <div className="text-[12px] text-ink-2">Mis à jour le {new Date(p.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
                <button aria-label="Actions du projet" onClick={() => setMenu(p)} className="w-8 h-8 grid place-items-center"><MoreHorizontal size={18} /></button>
              </div>
              <div className="flex items-center gap-3 px-1 mt-2"><div className="flex-1 h-1.5 rounded-full bg-track"><div className="h-full rounded-full bg-accent" style={{ width: `${pr}%` }} /></div><span className="text-[12px] font-semibold">{pr} %</span></div>
            </Card>
          )
        })}</div>}
      </div>
      {menu && (
        <Sheet title={menu.name} onClose={() => setMenu(null)}>
          <div className="grid grid-cols-2 gap-2 py-2">
            <Btn onClick={() => { setMenu(null); push({ name: 'workshop', projectID: menu.id }) }}>Atelier</Btn>
            <Btn kind="secondary" onClick={() => { setMenu(null); push({ name: 'budget', projectID: menu.id }) }}>Budget</Btn>
            <Btn kind="secondary" onClick={() => { setMenu(null); push({ name: 'list', projectID: menu.id }) }}>Liste d'achat</Btn>
            <Btn kind="secondary" onClick={() => { saveProject({ ...menu, favorite: !menu.favorite }); setMenu(null) }}>{menu.favorite ? 'Retirer des favoris' : 'Favori'}</Btn>
            <Btn kind="secondary" onClick={() => { const n = prompt('Nom du projet', menu.name)?.trim(); if (n) saveProject({ ...menu, name: n }); setMenu(null) }}>Renommer</Btn>
            <Btn kind="secondary" onClick={() => { duplicateProject(menu.id); setMenu(null) }}>Dupliquer</Btn>
            <Btn kind="secondary" onClick={() => download(menu)}>Exporter l'image</Btn>
            <Btn kind="secondary" onClick={() => share(menu)}>Partager</Btn>
            <Btn kind="ghost" className="!text-negative col-span-2" onClick={() => { if (confirm('Supprimer ce projet ? Action définitive.')) deleteProject(menu.id); setMenu(null) }}>Supprimer</Btn>
          </div>
        </Sheet>
      )}
      {compare && <Compare onClose={() => setCompare(false)} />}
    </div>
  )
}

function Favorites() {
  const { favorites } = useApp()
  const bike = useApp(selectedBike)
  const { push } = useNav()
  const items = favorites.accessories.map((id) => catalog.accessories.find((a) => a.id === id)).filter(Boolean)
  if (!items.length) return <Empty icon={<Heart size={36} />} title="Aucun favori" text="Touchez le cœur d'une pièce du catalogue pour la retrouver ici." />
  return <div className="grid grid-cols-2 gap-3">{items.map((a) => (
    <Card key={a!.id} onClick={() => push({ name: 'product', accessoryID: a!.id })} className="p-3">
      <PartVisual a={a!} vehicleID={bike?.variantID ?? catalog.variants[0].id} className="h-[90px] w-full rounded-[12px]" />
      <div className="text-[13px] font-semibold mt-2">{a!.manufacturer} {a!.commercialName}</div>
    </Card>
  ))}</div>
}

function Compare({ onClose }: { onClose: () => void }) {
  const { projects } = useApp()
  const [a, setA] = useState(projects[0]?.id); const [b, setB] = useState(projects[1]?.id)
  const A = projects.find((p) => p.id === a), B = projects.find((p) => p.id === b)
  const slugs = [...new Set([...Object.keys(A?.configuration.styles ?? {}), ...Object.keys(B?.configuration.styles ?? {})])]
  const cell = (p?: Project, s?: string) => { const st = s && p?.configuration.styles[s]; return st ? (st.type === 'paint' ? <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded" style={{ background: st.paint.color }} />{finishInfo(st.paint.finish).label}</span> : 'Covering') : <span className="text-ink-2">Origine</span> }
  return (
    <Sheet title="Comparer" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 py-2">
        {[[a, setA], [b, setB]].map(([v, set], i) => <select key={i} className="input" value={v as string} onChange={(e) => (set as (x: string) => void)(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>)}
        {A && <Snapshot configuration={A.configuration} className="h-28 w-full" w={420} h={280} />}{B && <Snapshot configuration={B.configuration} className="h-28 w-full" w={420} h={280} />}
      </div>
      <Card className="p-3 text-[14px] divide-y divide-line">
        {slugs.map((s) => <div key={s} className="grid grid-cols-3 py-2 gap-2"><b>{COMPONENT_LABELS[s]}</b>{cell(A, s)}{cell(B, s)}</div>)}
        <div className="grid grid-cols-3 py-2 gap-2"><b>Pièces</b><span>{A?.configuration.parts.length ?? 0}</span><span>{B?.configuration.parts.length ?? 0}</span></div>
        <div className="grid grid-cols-3 py-2 gap-2"><b>Budget</b><span>{A && formatMoney(summarize(A.budget, A.lines).total)}</span><span>{B && formatMoney(summarize(B.budget, B.lines).total)}</span></div>
      </Card>
    </Sheet>
  )
}
