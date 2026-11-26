import { useEffect, useState } from 'react'
import { ChevronRight, Database, Download, Euro, Info, Link2, Plus, ShieldCheck, Smartphone, Bike, Box, Image as ImageIcon } from 'lucide-react'
import { selectedBike, useApp } from '../store/app'
import { useNav } from '../store/nav'
import { bikeName, catalog } from '../data/catalog'
import { Badge, Btn, Card, Header, Sheet } from '../ui/kit'
import { Wordmark } from './Home'
import { PhotoPackSheet } from '../photo/PhotoPackSheet'
import { ModelSheet } from '../photo/ModelSheet'
import { generationOf } from '../photo/pack'

function Row({ icon, title, value, onClick }: { icon: React.ReactNode; title: string; value?: React.ReactNode; onClick?: () => void }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className="w-full flex items-center gap-3 py-2.5 text-left">
      <span className="w-8 h-8 rounded-[10px] bg-accent-soft text-accent grid place-items-center shrink-0">{icon}</span>
      <span className="flex-1 text-[15px]">{title}</span>
      {value && <span className="text-[13px] text-ink-2 text-right">{value}</span>}
      {onClick && <ChevronRight size={16} className="text-ink-2" />}
    </C>
  )
}

export default function Menu() {
  const bike = useApp(selectedBike)
  const { bikes, projects, clearAll } = useApp()
  const { setTab, push } = useNav()
  const [sheet, setSheet] = useState<'install' | 'sources' | 'licenses' | 'photos' | 'model' | null>(null)
  const [usage, setUsage] = useState<string>('…')
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone)
  useEffect(() => { navigator.storage?.estimate?.().then((e) => setUsage(`${((e.usage ?? 0) / 1048576).toFixed(1)} Mo utilisés`)).catch(() => setUsage('—')) }, [])
  const refs = catalog.accessories.flatMap((a) => a.variants).length

  return (
    <div className="pb-dock">
      <Header title="Menu" back={false} />
      <div className="px-5 space-y-4">
        <Card className="p-4 flex items-center gap-4"><Wordmark /><span className="ml-auto text-[12px] text-ink-2 text-right">{bikes.length} moto(s)<br />{projects.length} projet(s)</span></Card>
        <Card className="px-4 py-2">
          {bike && <Row icon={<Bike size={17} />} title={`${bikeName(bike.variantID).brand} ${bikeName(bike.variantID).model}`} value={[bike.year, bikeName(bike.variantID).code].filter(Boolean).join(' · ')} onClick={() => setTab('garage')} />}
          {bike && generationOf(bike.variantID, catalog.variants) && <Row icon={<ImageIcon size={17} />} title="Vues photo privées" onClick={() => setSheet('photos')} />}
          {bike && <Row icon={<Box size={17} />} title="Modèle 3D reconstruit" onClick={() => setSheet('model')} />}
          <Row icon={<Plus size={17} />} title="Ajouter une moto" onClick={() => push({ name: 'addBike' })} />
        </Card>
        <Card className="px-4 py-2">
          <Row icon={<ShieldCheck size={17} />} title="Pays d'homologation" value="France" />
          <Row icon={<Euro size={17} />} title="Devise" value="Euro (€)" />
          <Row icon={<Smartphone size={17} />} title="Installer sur l'iPhone" value={standalone ? 'Installée' : undefined} onClick={standalone ? undefined : () => setSheet('install')} />
        </Card>
        <Card className="px-4 py-2">
          <Row icon={<Database size={17} />} title="Stockage local" value={usage} />
          <Row icon={<Download size={17} />} title="Catalogue vérifié" value={`${refs} références · rév. ${catalog.revision}`} />
          <Row icon={<Link2 size={17} />} title="Sources et dates de vérification" onClick={() => setSheet('sources')} />
          <Row icon={<Info size={17} />} title="Informations et licences" onClick={() => setSheet('licenses')} />
        </Card>
        <Card className="px-4 py-2">
          <Row icon={<Box size={17} />} title="Synchronisation entre appareils" value={<Badge kind="soon" />} />
        </Card>
        <Btn kind="ghost" className="!text-negative !px-0" onClick={() => { if (confirm('Effacer toutes les données locales (motos, projets, favoris) ?')) clearAll() }}>Effacer les données locales</Btn>
        <p className="text-[12px] text-ink-2 text-center">MOTOFORGE 0.1 · Imagine. Personnalise. Roule.</p>
      </div>
      {sheet === 'photos' && bike && <PhotoPackSheet generation={generationOf(bike.variantID, catalog.variants)!} onClose={() => setSheet(null)} />}
      {sheet === 'model' && <ModelSheet onClose={() => setSheet(null)} />}
      {sheet === 'install' && <Sheet title="Installer MOTOFORGE" onClose={() => setSheet(null)}>
        <ol className="list-decimal pl-5 space-y-2 py-2 text-[15px]"><li>Ouvrez cette page dans <b>Safari</b>.</li><li>Touchez le bouton <b>Partager</b>.</li><li>Choisissez <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li></ol>
        <p className="text-[13px] text-ink-2">L'app s'ouvre ensuite en plein écran et fonctionne hors ligne : projets et modèle 3D sont stockés sur l'iPhone.</p>
      </Sheet>}
      {sheet === 'sources' && <Sheet title="Sources" onClose={() => setSheet(null)}><div className="space-y-2 py-2">
        {[...catalog.generations.map((g) => ({ t: `Génération ${g.code}`, v: g.verification })), ...catalog.variants.map((v) => ({ t: v.versionName, v: v.verification })), ...catalog.accessories.map((a) => ({ t: `${a.manufacturer} ${a.commercialName}`, v: a.verification }))].map(({ t, v }) => (
          <Card key={t} className="p-3 text-[13px]"><b>{t}</b><div className="text-ink-2">{v.source} · vérifié le {v.verifiedAt && new Date(v.verifiedAt).toLocaleDateString('fr-FR')}</div>{v.sourceURL && <a className="text-accent" href={v.sourceURL} target="_blank" rel="noreferrer">Ouvrir la source</a>}</Card>
        ))}</div></Sheet>}
      {sheet === 'licenses' && <Sheet title="Informations et licences" onClose={() => setSheet(null)}><div className="text-[14px] space-y-2 py-2">
        <p>Modèle 3D de la CB125R : modèle simplifié construit par le projet aux cotes officielles Honda (tools/bike3d). Ce n'est pas une photographie.</p>
        <p>Données catalogue : chaque référence, prix, compatibilité et homologation est sourcé et daté. Aucune homologation n'est déduite d'un nom de produit.</p>
        <p>Effets marqués « Simulation » : approximations visuelles d'effets dépendant de la lumière, de la température ou des UV.</p>
        <p>Bibliothèques : React, Three.js, React Three Fiber, Drei, Zustand, Dexie, Lucide (MIT/ISC) ; moteur Liquid Glass (gentpan/liquidglass, MIT).</p>
        <p>Honda et CB125R sont des marques de Honda Motor Co., Ltd. MOTOFORGE n'est pas affilié à Honda.</p>
      </div></Sheet>}
    </div>
  )
}
