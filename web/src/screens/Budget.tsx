import { useState } from 'react'
import { Check, ExternalLink, MoreHorizontal, Plus } from 'lucide-react'
import { uid, useApp } from '../store/app'
import { formatMoney, summarize } from '../domain/budget'
import type { Budget as BudgetT, LineStatus, Project, ShoppingLine } from '../domain/types'
import { Snapshot } from '../engine/Snapshot'
import { Badge, Btn, Card, cx, Empty, Header, Sheet, WideBtn } from '../ui/kit'
import { useNav } from '../store/nav'
import { Field } from './Garage'

const useProject = (id: string) => useApp((s) => s.projects.find((p) => p.id === id))
const STATUS: Record<LineStatus, string> = { toBuy: 'À acheter', ordered: 'Commandé', installed: 'Installé' }
const COLORS = ['#7938F5', '#4FA8F0', '#F5A54A', '#3FBF8F', '#C9C9D1']

function Ring({ value, children }: { value: number; children: React.ReactNode }) {
  const r = 92, c = 2 * Math.PI * r
  return (
    <div className="relative w-[220px] h-[220px] mx-auto">
      <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90" aria-hidden><circle cx="110" cy="110" r={r} fill="none" stroke="var(--color-accent-soft)" strokeWidth="14" />
        <circle cx="110" cy="110" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} style={{ transition: 'stroke-dashoffset .5s' }} /></svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Budget({ projectID }: { projectID: string }) {
  const p = useProject(projectID)
  const { saveProject } = useApp()
  const { push } = useNav()
  const [edit, setEdit] = useState(false)
  if (!p) return <><Header title="Budget projet" /><Empty icon={<Check />} title="Projet introuvable" text="" /></>
  const s = summarize(p.budget, p.lines)
  const parts = p.lines.filter((l) => l.kind === 'part').length
  const priced = parts - s.unpriced.length
  const rows: [string, number, boolean][] = [[`Pièces (${priced}${s.unpriced.length ? ` + ${s.unpriced.length} sans prix` : ''})`, s.parts, s.partsVerified], ['Peinture', s.paint, false], ['Covering', s.wrap, false], ["Main-d'œuvre", s.labor, false], ['Livraison', s.shipping, false]]
  return (
    <div className="pb-dock">
      <Header title="Budget projet" right={<Btn kind="ghost" onClick={() => setEdit(true)}>Modifier</Btn>} />
      <div className="px-5 space-y-5">
        <Card className="p-3 flex items-center gap-3"><Snapshot configuration={p.configuration} angle="rightProfile" className="w-20 h-14" w={240} h={160} /><b className="text-[17px]">{p.name}</b></Card>
        <Ring value={s.maximum ? s.total / s.maximum : 0}>
          <div><div className="text-[15px] text-ink-2">Total estimé</div><div className="text-[30px] font-bold tabular-nums">{formatMoney(s.total)}</div>
            {s.maximum ? <div className="text-[13px] text-ink-2">sur {formatMoney(s.maximum)}</div> : <button className="text-[13px] text-accent font-semibold" onClick={() => setEdit(true)}>Définir un budget maximal</button>}</div>
        </Ring>
        <div className="space-y-3">{rows.map(([label, v, verified], i) => (
          <div key={label} className="flex items-center gap-3 text-[15px]"><span className="w-3 h-3 rounded-[3px]" style={{ background: COLORS[i] }} /><span className="flex-1">{label}</span>{v > 0 && !verified && <Badge kind="estimate" />}<b className="tabular-nums">{formatMoney(v)}</b></div>
        ))}</div>
        <div className="rounded-[var(--radius-tile)] bg-track text-center py-4">
          <div className="text-[15px] text-ink-2">{s.margin === undefined ? 'Reste à payer' : s.margin >= 0 ? 'Reste à financer' : 'Dépassement du budget'}</div>
          <div className={cx('text-[26px] font-bold tabular-nums', (s.margin ?? 0) < 0 && 'text-negative')}>{formatMoney(Math.abs(s.margin ?? s.remaining))}</div>
        </div>
        <div className="flex justify-between text-[15px]"><span>Déjà dépensé</span><b>{formatMoney(s.spent)}</b></div>
        <p className="text-[12px] text-ink-2">Part du total basée sur des prix vérifiés : {Math.round(s.verifiedShare * 100)} %{s.excluded.length ? ` · ${s.excluded.length} ligne(s) dans une autre devise non comptée(s) (jamais convertie(s))` : ''}{s.unpriced.length ? ` · ${s.unpriced.length} pièce(s) au prix non publié, non comptée(s) dans le total` : ''}</p>
        <Btn kind="secondary" onClick={() => push({ name: 'list', projectID })}>Voir la liste d'achat</Btn>
      </div>
      {edit && <BudgetEditor p={p} onClose={() => setEdit(false)} onSave={(b) => { saveProject({ ...p, budget: b }); setEdit(false) }} />}
    </div>
  )
}

function BudgetEditor({ p, onClose, onSave }: { p: Project; onClose: () => void; onSave: (b: BudgetT) => void }) {
  const [b, setB] = useState<Record<string, string>>(Object.fromEntries(['maximum', 'paint', 'wrap', 'labor', 'shipping'].map((k) => [k, String((p.budget as unknown as Record<string, number>)[k] ?? '')])))
  const num = (v: string) => (v.trim() === '' ? undefined : Math.max(0, Number(v.replace(',', '.')) || 0))
  const field = (k: string, label: string) => <Field key={k} label={label}><input className="input" inputMode="decimal" value={b[k]} onChange={(e) => setB({ ...b, [k]: e.target.value })} placeholder="0,00 €" /></Field>
  return (
    <Sheet title="Budget" onClose={onClose} footer={<WideBtn onClick={() => onSave({ currency: 'EUR', maximum: num(b.maximum), paint: num(b.paint), wrap: num(b.wrap), labor: num(b.labor), shipping: num(b.shipping) })}>Enregistrer</WideBtn>}>
      <div className="space-y-3 py-2">{field('maximum', 'Budget maximal')}{field('paint', 'Peinture (estimation)')}{field('wrap', 'Covering (estimation)')}{field('labor', "Main-d'œuvre")}{field('shipping', 'Livraison supplémentaire')}
        <p className="text-[12px] text-ink-2">Montants saisis par vous, affichés comme estimations. Les prix des pièces viennent des offres sourcées.</p></div>
    </Sheet>
  )
}

/** Liste d'achat : cases à cocher (sélection), statut commandé / installé, total, vendeurs. */
export function ShoppingList({ projectID }: { projectID: string }) {
  const p = useProject(projectID)
  const { saveProject } = useApp()
  const [sel, setSel] = useState<string[]>([])
  const [menu, setMenu] = useState<ShoppingLine | null>(null)
  const [vendors, setVendors] = useState(false)
  const [adding, setAdding] = useState(false)
  if (!p) return <><Header title="Liste d'achat" /><Empty icon={<Check />} title="Projet introuvable" text="" /></>
  const update = (id: string, patch: Partial<ShoppingLine>) => saveProject({ ...p, lines: p.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  const remove = (l: ShoppingLine) => saveProject({ ...p, lines: p.lines.filter((x) => x.id !== l.id), configuration: { ...p.configuration, parts: p.configuration.parts.filter((x) => x.variantID !== l.variantID) } })
  const selected = p.lines.filter((l) => sel.includes(l.id))
  const total = selected.reduce((s, l) => s + (l.unit?.currency === 'EUR' ? l.unit.amount * l.quantity + (l.shipping?.amount ?? 0) : 0), 0)
  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+190px)]">
      <Header title="Liste d'achat" />
      <div className="px-5">
        <p className="text-[15px] mb-3">Projet : {p.name}</p>
        {!p.lines.length && <Empty icon={<Check size={36} />} title="Liste vide" text="Les pièces ajoutées au projet apparaissent ici automatiquement." />}
        {!!p.lines.length && <Card className="divide-y divide-line">{p.lines.map((l) => (
          <div key={l.id} className="flex items-center gap-3 px-3 py-3">
            <button aria-label={sel.includes(l.id) ? 'Désélectionner' : 'Sélectionner'} onClick={() => setSel((s) => (s.includes(l.id) ? s.filter((x) => x !== l.id) : [...s, l.id]))}
              className={cx('w-6 h-6 rounded-[7px] grid place-items-center border-2', sel.includes(l.id) ? 'bg-accent border-accent text-white' : 'border-ink-2/40')}>{sel.includes(l.id) && <Check size={15} strokeWidth={3} />}</button>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-snug line-clamp-2">{l.label}</div>
              <div className="flex items-center gap-2"><b className={cx('text-[15px]', l.unit ? 'text-accent' : 'text-ink-2')}>{l.unit ? formatMoney(l.unit.amount * l.quantity, l.unit.currency) : 'Prix non publié'}</b>{l.unit && !l.unit.verified && <Badge kind="estimate" />}</div>
              {l.status !== 'toBuy' && <div className="text-[12px] text-ink-2">{STATUS[l.status]}</div>}
            </div>
            <button aria-label={`Actions pour ${l.label}`} onClick={() => setMenu(l)} className="w-8 h-8 grid place-items-center"><MoreHorizontal size={18} /></button>
          </div>
        ))}</Card>}
        <Btn kind="secondary" className="mt-3" onClick={() => setAdding(true)}><Plus size={16} />Ajouter une ligne</Btn>
      </div>
      <div className="fixed left-0 right-0 z-30 px-5 pt-3 bg-bg/90 backdrop-blur-md bottom-[calc(env(safe-area-inset-bottom)+80px)]">
        <div className="flex justify-between text-[15px] mb-2"><span>Total sélectionné</span><b className="text-accent">{formatMoney(total)}</b></div>
        <WideBtn disabled={!selected.length} onClick={() => setVendors(true)}>Commander chez les vendeurs ({selected.length})</WideBtn>
      </div>
      {menu && (
        <Sheet title="Ligne" onClose={() => setMenu(null)}>
          <div className="grid grid-cols-3 gap-2 py-2">{(Object.keys(STATUS) as LineStatus[]).map((s) => <Btn key={s} kind={menu.status === s ? 'primary' : 'secondary'} onClick={() => { update(menu.id, { status: s }); setMenu(null) }}>{STATUS[s]}</Btn>)}</div>
          <div className="flex items-center gap-3 py-2"><span className="flex-1">Quantité</span><Btn kind="secondary" onClick={() => { update(menu.id, { quantity: Math.max(1, menu.quantity - 1) }); setMenu({ ...menu, quantity: Math.max(1, menu.quantity - 1) }) }}>−</Btn><b>{menu.quantity}</b><Btn kind="secondary" onClick={() => { update(menu.id, { quantity: menu.quantity + 1 }); setMenu({ ...menu, quantity: menu.quantity + 1 }) }}>+</Btn></div>
          {menu.url && <a className="flex items-center gap-1 text-accent font-semibold py-2" href={menu.url} target="_blank" rel="noreferrer">Consulter le vendeur <ExternalLink size={15} /></a>}
          <Btn kind="ghost" className="!text-negative !px-0" onClick={() => { remove(menu); setMenu(null) }}>Retirer</Btn>
        </Sheet>
      )}
      {vendors && <Sheet title="Vendeurs" onClose={() => setVendors(false)}><div className="py-2 space-y-2">{selected.map((l) => l.url
        ? <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex justify-between items-center text-[15px] py-1"><span className="line-clamp-1">{l.label}</span><ExternalLink size={16} /></a>
        : <div key={l.id} className="text-[15px] py-1">{l.label} <span className="text-ink-2">— aucun vendeur référencé</span></div>)}</div></Sheet>}
      {adding && <AddLine onClose={() => setAdding(false)} onAdd={(l) => { saveProject({ ...p, lines: [...p.lines, l] }); setAdding(false) }} />}
    </div>
  )
}

function AddLine({ onClose, onAdd }: { onClose: () => void; onAdd: (l: ShoppingLine) => void }) {
  const [label, setLabel] = useState(''); const [amount, setAmount] = useState(''); const [kind, setKind] = useState<ShoppingLine['kind']>('other')
  return (
    <Sheet title="Nouvelle ligne" onClose={onClose} footer={<WideBtn disabled={!label.trim()} onClick={() => onAdd({ id: uid(), label, kind, quantity: 1, status: 'toBuy', unit: amount ? { amount: Number(amount.replace(',', '.')) || 0, currency: 'EUR', verified: false } : undefined })}>Ajouter</WideBtn>}>
      <div className="space-y-3 py-2">
        <Field label="Libellé"><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-2">{([['other', 'Autre'], ['paint', 'Peinture'], ['wrap', 'Covering'], ['labor', "Main-d'œuvre"]] as const).map(([k, t]) => <Btn key={k} kind={kind === k ? 'primary' : 'secondary'} onClick={() => setKind(k)}>{t}</Btn>)}</div>
        <Field label="Montant estimé (€)"><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      </div>
    </Sheet>
  )
}
