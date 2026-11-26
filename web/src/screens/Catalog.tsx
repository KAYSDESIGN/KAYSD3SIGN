import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Heart, ShieldCheck, ShoppingCart } from 'lucide-react'
import { selectedBike, useApp } from '../store/app'
import { useNav } from '../store/nav'
import { bikeName, catalog } from '../data/catalog'
import { PART_RENDERS } from '../data/visuals'
import { CATEGORY_LABEL, compatibleAccessories, displayOffer, isTrustworthy } from '../domain/catalog'
import { formatMoney } from '../domain/budget'
import type { Accessory, Bike } from '../domain/types'
import { Snapshot } from '../engine/Snapshot'
import { Btn, Chip, cx, Empty, Header, Sheet } from '../ui/kit'
import { CategoryIcon } from '../ui/icons'

/** Adds a part to the bike's latest project (creates one if needed). Returns the project id. */
export async function addToProject(bike: Bike, a: Accessory, variantID: string) {
  const { projects, createProject, addPart } = useApp.getState()
  const p = projects.find((x) => x.bikeID === bike.id) ?? (await createProject(bike))
  await addPart(p.id, { accessoryID: a.id, variantID, category: a.category })
  return p.id
}

export function PartVisual({ a, variantID, vehicleID, className = '' }: { a: Accessory; variantID?: string; vehicleID: string; className?: string }) {
  const v = variantID ?? a.variants[0]?.id
  if (v && PART_RENDERS[v]) return <Snapshot configuration={{ vehicleVariantID: vehicleID, styles: {}, parts: [{ accessoryID: a.id, variantID: v, category: a.category }] }} className={className} w={420} h={300} />
  return (
    <div className={cx('grid place-items-center bg-bg text-accent', className)}>
      <div className="text-center"><CategoryIcon category={a.category} size={34} /><div className="text-[11px] font-semibold text-ink mt-1 tracking-wide">{a.manufacturer}</div></div>
    </div>
  )
}

export default function Catalog() {
  const bike = useApp(selectedBike)
  const { bikes, selectBike, favorites, toggleFavoriteAccessory } = useApp()
  const { push, catalogCategory } = useNav()
  const [cat, setCat] = useState<string | undefined>(catalogCategory)
  const [pick, setPick] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  useEffect(() => { setCat(catalogCategory) }, [catalogCategory])

  const all = useMemo(() => (bike ? compatibleAccessories(catalog, bike.variantID) : []), [bike])
  const cats = useMemo(() => [...new Set(all.map((a) => a.category))], [all])
  const items = all.filter((a) => !cat || a.category === cat)

  return (
    <div className="pb-dock">
      <Header title="Catalogue" back={false} />
      <div className="px-5">
        <p className="text-[15px] text-ink-2 -mt-1">Accessoires & pièces compatibles</p>
        <div className="flex justify-end mt-2">
          <button onClick={() => setPick(true)} className="press h-9 px-3.5 rounded-full bg-surface flex items-center gap-1.5 text-[15px] font-semibold whitespace-nowrap">
            {bike ? `${bikeName(bike.variantID).brand} ${bikeName(bike.variantID).model}` : 'Choisir une moto'}<ChevronDown size={16} />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 py-4">
          <Chip label="Toutes" active={!cat} onClick={() => setCat(undefined)} />
          {cats.map((c) => <Chip key={c} label={CATEGORY_LABEL[c]} active={cat === c} onClick={() => setCat(c)} />)}
        </div>
        {!bike && <Empty icon={<ShieldCheck size={36} />} title="Aucune moto sélectionnée" text="Le catalogue n'affiche que les pièces vérifiées compatibles avec votre moto." action={<Btn onClick={() => push({ name: 'addBike' })}>Ajouter ma moto</Btn>} />}
        <div className="grid grid-cols-2 gap-3">
          {bike && items.map((a) => {
            const offer = displayOffer(a.variants[0])
            const fav = favorites.accessories.includes(a.id)
            return (
              <div key={a.id} className="bg-surface rounded-[var(--radius-tile)] p-3 flex flex-col">
                <div className="relative">
                  <button onClick={() => push({ name: 'product', accessoryID: a.id })} className="block w-full" aria-label={`Fiche ${a.commercialName}`}>
                    <PartVisual a={a} vehicleID={bike.variantID} className="h-[92px] w-full rounded-[12px]" />
                  </button>
                  <button aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => toggleFavoriteAccessory(a.id)} className="absolute right-0 top-0 w-8 h-8 grid place-items-center">
                    <Heart size={19} className={fav ? 'fill-accent text-accent' : 'text-ink'} />
                  </button>
                </div>
                <button onClick={() => push({ name: 'product', accessoryID: a.id })} className="text-left mt-2 text-[13px] font-semibold leading-snug line-clamp-2 min-h-[34px]">{a.manufacturer} {a.commercialName}</button>
                <div className="flex items-end justify-between mt-auto pt-2">
                  <div>
                    {offer ? <div className="text-[16px] font-bold text-accent">{formatMoney(offer.price.amount, offer.price.currency)}</div> : <div className="text-[13px] text-ink-2">Prix non publié</div>}
                    <div className="text-[11px] text-ink-2">{offer ? (isTrustworthy(offer.verification) ? offer.taxNote?.split(',')[0] ?? 'Vérifié' : 'Estimation') : `${a.variants.length} réf.`}</div>
                  </div>
                  <button aria-label="Ajouter au projet" onClick={async () => { await addToProject(bike, a, a.variants[0].id); setAdded(a.commercialName); setTimeout(() => setAdded(null), 1600) }}
                    className="press w-9 h-9 rounded-[11px] bg-accent text-white grid place-items-center"><ShoppingCart size={18} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {added && <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-50 glass rounded-full px-4 h-10 flex items-center text-[14px] font-semibold">Ajouté au projet</div>}
      {pick && (
        <Sheet title="Moto" onClose={() => setPick(false)}>
          <div className="space-y-2 py-2">
            {bikes.map((b) => <Btn key={b.id} kind={b.id === bike?.id ? 'primary' : 'secondary'} className="w-full" onClick={() => { selectBike(b.id); setPick(false) }}>{bikeName(b.variantID).brand} {bikeName(b.variantID).model} {b.year ?? ''}</Btn>)}
            <Btn kind="ghost" className="w-full" onClick={() => { setPick(false); push({ name: 'addBike' }) }}>Ajouter une moto</Btn>
          </div>
        </Sheet>
      )}
    </div>
  )
}
