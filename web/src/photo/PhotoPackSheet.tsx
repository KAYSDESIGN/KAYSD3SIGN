import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Btn, Sheet } from '../ui/kit'
import { deletePack, describeReasons, importPack, loadPack, PackError, type StoredPack } from './pack'

const ANGLE_LABEL: Record<string, string> = {
  front: 'Avant (0°)', frontThreeQuarter: '3/4 avant (45°)', rightProfile: 'Profil droit (90°)',
  rear: 'Arrière (180°)', rearThreeQuarter: '3/4 arrière (225°)', leftProfile: 'Profil gauche (270°)',
}

/** Import / inspect / delete the private photo pack of a generation. Files stay on this device (IndexedDB). */
export function PhotoPackSheet({ generation, onClose, onChange }: { generation: string; onClose: () => void; onChange?: () => void }) {
  const [pack, setPack] = useState<StoredPack | undefined>()
  const [state, setState] = useState<'loading' | 'idle' | 'importing'>('loading')
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { loadPack(generation).then((p) => { setPack(p); setState('idle') }) }, [generation])

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setState('importing'); setError(null)
    try {
      const p = await importPack(files)
      if (p.generation !== generation) { await deletePack(p.generation); throw new PackError('Ce pack concerne une autre moto.') }
      setPack(p); onChange?.()
    } catch (e) { setError(e instanceof PackError ? e.message : 'Import impossible.') }
    setState('idle')
  }

  return (
    <Sheet title="Vues photo" onClose={onClose}>
      <p className="text-[13px] text-ink-2">Un pack photo est préparé et contrôlé par les outils du projet (tools/photoqc). Il reste sur cet appareil : il n'est jamais envoyé ni publié. Seules les vues acceptées au contrôle qualité s'affichent.</p>
      {state === 'loading' && <p className="py-4 text-[14px] text-ink-2">Lecture…</p>}
      {state !== 'loading' && !pack && <p className="py-4 text-[15px]">Aucun pack photo installé pour cette moto.</p>}
      {pack && (
        <div className="py-3 space-y-2">
          <p className="text-[13px] text-ink-2">{pack.manifest.source} · contrôlé le {pack.manifest.reviewedAt ?? '—'}</p>
          {Object.keys(ANGLE_LABEL).map((a) => {
            const v = pack.manifest.views.find((x) => x.angle === a)
            return (
              <div key={a} className="flex items-start gap-2 text-[14px]">
                {v?.accepted ? <Check size={16} className="mt-0.5 text-ink" aria-label="Acceptée" /> : <X size={16} className="mt-0.5 text-negative" aria-label="Refusée" />}
                <div className="flex-1"><b>{ANGLE_LABEL[a]}</b> — {v ? (v.accepted ? 'acceptée' : 'refusée') : 'absente'}
                  {v && !v.accepted && <div className="text-[12px] text-ink-2">{describeReasons(v.rejectReasons).join(' · ')}</div>}</div>
              </div>
            )
          })}
        </div>
      )}
      {error && <p role="alert" className="text-[13px] text-negative py-2">{error}</p>}
      <input ref={input} type="file" multiple accept=".json,image/png" className="hidden" onChange={(e) => onFiles(e.target.files)} aria-label="Fichiers du pack photo" />
      <div className="flex gap-2 pt-2">
        <Btn onClick={() => input.current?.click()} disabled={state === 'importing'}>{state === 'importing' ? 'Import…' : pack ? 'Remplacer le pack' : 'Importer un pack'}</Btn>
        {pack && <Btn kind="ghost" className="!text-negative" onClick={async () => { await deletePack(generation); setPack(undefined); onChange?.() }}>Supprimer</Btn>}
      </div>
    </Sheet>
  )
}
