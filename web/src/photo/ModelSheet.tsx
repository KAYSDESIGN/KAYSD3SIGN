import { useRef, useState } from 'react'
import { Btn, Sheet } from '../ui/kit'
import { deletePrivateModel, importPrivateModel, ModelError, setPrivateModelEnabled, useModel } from '../engine/modelSource'

/** Import / enable / delete a 3D model reconstructed from photos (tools/recon3d). Stays on this device. */
export function ModelSheet({ onClose }: { onClose: () => void }) {
  const { kind, info } = useModel()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function onFile(f?: File) {
    if (!f) return
    setBusy(true); setMsg(null)
    try { const n = await importPrivateModel(f); setMsg({ ok: true, text: `Modèle importé : ${n} composants personnalisables.` }) }
    catch (e) { setMsg({ ok: false, text: e instanceof ModelError ? e.message : 'Import impossible : fichier illisible.' }) }
    setBusy(false)
  }

  return (
    <Sheet title="Modèle 3D reconstruit" onClose={onClose}>
      <p className="text-[13px] text-ink-2">Modèle texturé reconstruit à partir de photos réelles puis aligné sur les cotes Honda et découpé en composants par les outils du projet (tools/recon3d). Il reste sur cet appareil : il n'est jamais envoyé ni publié.</p>
      <div className="py-3 text-[15px]">
        {info ? <>
          <b>{info.name}</b> · {(info.size / 1048576).toFixed(1)} Mo · importé le {new Date(info.importedAt).toLocaleDateString('fr-FR')}
          <div className="text-[13px] text-ink-2">{kind === 'private' ? 'Utilisé dans l\'atelier et les vignettes.' : 'Désactivé : le modèle simplifié du projet est affiché.'}</div>
        </> : 'Aucun modèle reconstruit importé : le modèle simplifié du projet est affiché.'}
      </div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-[13px] py-1' : 'text-[13px] py-1 text-negative'}>{msg.text}</p>}
      <input ref={input} type="file" accept=".glb,model/gltf-binary" className="hidden" aria-label="Fichier du modèle 3D" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex flex-wrap gap-2 pt-2">
        <Btn onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Import…' : info ? 'Remplacer' : 'Importer un modèle'}</Btn>
        {info && <Btn kind="secondary" onClick={() => setPrivateModelEnabled(kind !== 'private')}>{kind === 'private' ? 'Désactiver' : 'Activer'}</Btn>}
        {info && <Btn kind="ghost" className="!text-negative" onClick={() => deletePrivateModel()}>Supprimer</Btn>}
      </div>
    </Sheet>
  )
}
