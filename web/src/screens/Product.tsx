import { useState } from 'react'
import { Building2, ExternalLink, Hash, Heart, Layers, Palette, Sparkles } from 'lucide-react'
import { selectedBike, useApp } from '../store/app'
import { useNav } from '../store/nav'
import { bikeName, catalog } from '../data/catalog'
import { PART_RENDERS } from '../data/visuals'
import { displayOffer, homologation, isTrustworthy } from '../domain/catalog'
import { formatMoney } from '../domain/budget'
import { Badge, Btn, Card, Chip, Empty, Header, RoundBtn, SectionTitle, WideBtn } from '../ui/kit'
import { addToProject, PartVisual } from './Catalog'

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export default function Product({ accessoryID }: { accessoryID: string }) {
  const a = catalog.accessories.find((x) => x.id === accessoryID)
  const bike = useApp(selectedBike)
  const { favorites, toggleFavoriteAccessory, country } = useApp()
  const { push } = useNav()
  const [vi, setVi] = useState(0)
  const [done, setDone] = useState(false)
  if (!a) return <><Header title="Détail produit" /><Empty icon={<Layers size={36} />} title="Produit introuvable" text="Cette référence n'est plus dans le catalogue vérifié." /></>
  const v = a.variants[Math.min(vi, a.variants.length - 1)]
  const offer = displayOffer(v)
  const vehicle = bike?.variantID ?? catalog.variants[0].id
  const compat = v.compatibilities.find((c) => isTrustworthy(c.verification) && c.vehicleVariantIDs.includes(vehicle))
  const homo = homologation(v, country, vehicle)
  const fav = favorites.accessories.includes(a.id)
  const fitNames = [...new Set(v.compatibilities.filter((c) => isTrustworthy(c.verification)).flatMap((c) => c.vehicleVariantIDs).map((id) => { const n = bikeName(id); return `${n.brand} ${n.model} (${n.code})` }))]

  const add = async (thenOpen: boolean) => {
    if (!bike) return push({ name: 'addBike' })
    const pid = await addToProject(bike, a, v.id)
    if (thenOpen) push({ name: 'workshop', projectID: pid }); else { setDone(true); setTimeout(() => setDone(false), 1600) }
  }

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+170px)]">
      <Header title="Détail produit" right={<RoundBtn label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => toggleFavoriteAccessory(a.id)}><Heart size={19} className={fav ? 'fill-accent text-accent' : ''} /></RoundBtn>} />
      <div className="px-5">
        <div className="relative">
          <PartVisual a={a} variantID={v.id} vehicleID={vehicle} className="w-full h-[230px] rounded-[var(--radius-card)]" />
          {PART_RENDERS[v.id] && <button onClick={() => add(true)} className="glass press absolute right-2 bottom-2 h-9 px-3.5 rounded-full text-[14px] font-semibold flex items-center gap-1.5"><Sparkles size={16} />Essayer sur ma moto</button>}
        </div>
        <p className="text-[12px] text-ink-2 mt-2">{PART_RENDERS[v.id] ? 'Représentation 3D simplifiée de la pièce montée. Photos officielles chez le fabricant.' : 'Pas encore de représentation 3D pour cette pièce.'}{a.manufacturerURL && <> <a className="text-accent font-semibold" href={a.manufacturerURL} target="_blank" rel="noreferrer">Voir chez {a.manufacturer}</a></>}</p>

        <h1 className="text-[24px] font-bold mt-4 leading-tight">{a.commercialName}</h1>
        <p className="text-[15px] text-ink-2 mt-1">{fitNames.length ? `Compatible ${fitNames.join(' / ')}` : 'Compatibilité non vérifiée'}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {offer ? <span className="text-[24px] font-bold text-accent">{formatMoney(offer.price.amount, offer.price.currency)}</span> : <span className="text-[17px] text-ink-2">Prix non publié par le fabricant</span>}
          {offer && <Badge kind={isTrustworthy(offer.verification) ? 'verified' : 'estimate'} />}
          {offer?.taxNote && <span className="text-[12px] text-ink-2">{offer.taxNote} · au {fmtDate(offer.verification.verifiedAt)}</span>}
        </div>
        {a.variants.length > 1 && <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3">{a.variants.map((x, i) => <Chip key={x.id} label={x.colorway} active={i === vi} onClick={() => setVi(i)} />)}</div>}

        <Card className="mt-4 p-4 space-y-3">
          {[[Building2, 'Fabricant', a.manufacturer], [Hash, 'Référence', v.reference], [Layers, 'Matériaux', a.materials.join(' / ') || '—'], [Palette, 'Finition', v.colorway]].map(([I, k, val]) => {
            const Icon = I as typeof Hash
            return <div key={k as string} className="flex items-start gap-3 text-[15px]"><Icon size={18} className="mt-0.5 shrink-0" /><span className="text-ink-2 w-24 shrink-0">{k as string}</span><span className="flex-1 text-right">{val as string}</span></div>
          })}
          {a.description && <p className="text-[14px] text-ink-2 pt-1">{a.description}</p>}
        </Card>

        <Card className="mt-3 p-4">
          <SectionTitle>Homologation ({country})</SectionTitle>
          <Badge kind={homo.status} />
          {homo.record ? <ul className="mt-2 text-[13px] text-ink-2 list-disc pl-5 space-y-1">{homo.record.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
            : <p className="mt-2 text-[13px] text-ink-2">Aucune source ne confirme l'homologation de cette pièce pour votre moto et cette configuration de montage.</p>}
        </Card>

        <Card className="mt-3 p-4">
          <SectionTitle>Compatibilité et montage</SectionTitle>
          {compat ? <>
            <Badge kind="verified" text="Compatibilité vérifiée" />
            <p className="text-[13px] text-ink-2 mt-2">Texte source : « {compat.notes} »</p>
            <p className="text-[13px] mt-1">{compat.requiredAdapters.length ? `Nécessite : ${compat.requiredAdapters.join(', ')}` : 'Aucun accessoire de montage requis selon la source.'}</p>
          </> : <Badge kind="unverified" />}
        </Card>

        <Card className="mt-3 p-4">
          <SectionTitle>Vendeurs</SectionTitle>
          {!v.offers.length && <p className="text-[13px] text-ink-2">Le fabricant ne publie pas de prix. Consultez un revendeur agréé.</p>}
          {v.offers.map((o) => (
            <a key={o.url} href={o.url} target="_blank" rel="noreferrer" className="flex items-center justify-between py-2 text-[15px]">
              <span><b>{o.merchantName}</b><span className="block text-[12px] text-ink-2">{isTrustworthy(o.verification) ? 'Prix vérifié' : 'Prix non vérifié'}{o.taxNote ? ` · ${o.taxNote}` : ''}</span></span>
              <span className="flex items-center gap-2 font-semibold">{formatMoney(o.price.amount, o.price.currency)}<ExternalLink size={15} /></span>
            </a>
          ))}
        </Card>

        <Card className="mt-3 p-4">
          <SectionTitle>Sources</SectionTitle>
          {[['Fiche produit', a.verification], ...(compat ? [['Compatibilité', compat.verification] as const] : [])].map(([k, ver]) => (
            <p key={k as string} className="text-[13px] mb-1"><b>{k as string}</b> — {(ver as typeof a.verification).source}, vérifié le {fmtDate((ver as typeof a.verification).verifiedAt)} {(ver as typeof a.verification).sourceURL && <a className="text-accent" href={(ver as typeof a.verification).sourceURL} target="_blank" rel="noreferrer">ouvrir</a>}</p>
          ))}
        </Card>
      </div>
      <div className="fixed left-0 right-0 z-30 px-5 bottom-[calc(env(safe-area-inset-bottom)+80px)]">
        <WideBtn onClick={() => add(false)}>{done ? 'Ajouté au projet' : 'Ajouter au projet'}</WideBtn>
      </div>
      {!bike && <div className="px-5 mt-3"><Btn onClick={() => push({ name: 'addBike' })}>Ajouter ma moto</Btn></div>}
    </div>
  )
}
