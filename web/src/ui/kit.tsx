import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check, ChevronLeft, CircleHelp, Clock, Plus, ShieldCheck, Sparkles, TriangleAlert, Ban } from 'lucide-react'
import { useNav } from '../store/nav'
import type { HomologationStatus } from '../domain/types'
import { HOMOLOGATION_LABEL } from '../domain/catalog'

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

/** Compact pill button (mockups: small purple CTAs). */
export function Btn({ kind = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'secondary' | 'ghost' }) {
  return <button {...p} className={cx('press inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-9 text-[15px] font-semibold disabled:opacity-40',
    kind === 'primary' && 'bg-accent text-white', kind === 'secondary' && 'bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]',
    kind === 'ghost' && 'text-accent', className)} />
}

/** Full-width purple CTA used once per screen (mockup: « Ajouter au projet »). */
export function WideBtn(p: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={cx('press w-full h-12 rounded-full bg-accent text-white text-[17px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40', p.className)} />
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={cx('bg-surface rounded-[var(--radius-card)] shadow-[var(--shadow-card)]', onClick && 'press', className)}>{children}</div>
}

export function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex bg-surface rounded-full p-[3px]">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={v === value} onClick={() => onChange(v)}
          className={cx('flex-1 h-9 rounded-full text-[15px] font-semibold transition-colors', v === value ? 'bg-accent text-white' : 'text-ink')}>{label}</button>
      ))}
    </div>
  )
}

export function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return <button onClick={onClick} aria-pressed={active} className={cx('press shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold', active ? 'bg-accent text-white' : 'bg-surface text-ink')}>{label}</button>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="flex items-center justify-between mb-3"><h2 className="text-[19px] font-bold tracking-[-0.01em]">{children}</h2>{right}</div>
}

/** Screen header in the mockups' style: round back button, centered title, round trailing action. */
export function Header({ title, back = true, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const pop = useNav((s) => s.pop)
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md px-5 pt-2 pb-2 grid grid-cols-[44px_1fr_auto] items-center min-h-[52px]">
      {back ? <RoundBtn label="Retour" onClick={pop}><ChevronLeft size={22} /></RoundBtn> : <span />}
      <h1 className="text-center text-[17px] font-semibold truncate">{title}</h1>
      <div className="min-w-[44px] flex justify-end">{right}</div>
    </header>
  )
}

export function RoundBtn({ children, label, onClick, className }: { children: ReactNode; label: string; onClick?: () => void; className?: string }) {
  return <button aria-label={label} onClick={onClick} className={cx('press w-10 h-10 rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)] grid place-items-center text-ink', className)}>{children}</button>
}

export const AddBtn = ({ onClick, label }: { onClick: () => void; label: string }) => <RoundBtn label={label} onClick={onClick}><Plus size={20} /></RoundBtn>

type BadgeKind = 'verified' | 'unverified' | 'estimate' | 'simulation' | 'soon' | HomologationStatus
export function Badge({ kind, text }: { kind: BadgeKind; text?: string }) {
  const map: Record<BadgeKind, [ReactNode, string]> = {
    verified: [<Check size={12} />, 'Vérifié'], unverified: [<CircleHelp size={12} />, 'Non vérifié'], estimate: [null, 'Estimation'],
    simulation: [<Sparkles size={12} />, 'Simulation'], soon: [<Clock size={12} />, 'Bientôt disponible'],
    approved: [<ShieldCheck size={12} />, HOMOLOGATION_LABEL.approved], approvedWithConditions: [<TriangleAlert size={12} />, HOMOLOGATION_LABEL.approvedWithConditions],
    notApproved: [<Ban size={12} />, HOMOLOGATION_LABEL.notApproved], notVerified: [<CircleHelp size={12} />, HOMOLOGATION_LABEL.notVerified],
  }
  const [icon, label] = map[kind]
  return <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-bg text-ink text-[12px] font-semibold shadow-[0_0_0_1px_var(--color-line)] whitespace-nowrap">{icon}{text ?? label}</span>
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-14 gap-3">
      <div className="text-ink-2">{icon}</div>
      <p className="text-[17px] font-semibold">{title}</p>
      <p className="text-[15px] text-ink-2 max-w-[30ch]">{text}</p>
      {action}
    </div>
  )
}

export function Slider({ label, value, min, max, step = 0.01, format, onChange }: { label: string; value: number; min: number; max: number; step?: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[15px]"><span>{label}</span><span className="text-ink-2 tabular-nums">{format(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" aria-label={label} />
    </label>
  )
}
export const pct = (v: number) => `${Math.round(v * 100)} %`

/** Bottom sheet for studios and pickers. */
export function Sheet({ title, onClose, children, footer, peek, closeLabel = 'Fermer' }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; peek?: boolean; closeLabel?: string }) {
  return (
    <div className={cx('fixed inset-0 z-50 flex flex-col justify-end', peek ? 'pointer-events-none' : 'bg-black/25')} onClick={onClose}>
      <div role="dialog" aria-label={title} className={cx('sheet-enter pointer-events-auto bg-bg rounded-t-[28px] flex flex-col shadow-[0_-8px_30px_rgb(0_0_0/0.08)]', peek ? 'h-[56dvh]' : 'max-h-[92dvh]')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button className="text-accent text-[17px]" onClick={onClose}>{closeLabel}</button>
          <h2 className="text-[17px] font-semibold">{title}</h2><span className="w-12" />
        </div>
        <div className="overflow-y-auto px-5 pb-4 flex-1">{children}</div>
        {footer && <div className="px-5 pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>{footer}</div>}
      </div>
    </div>
  )
}
