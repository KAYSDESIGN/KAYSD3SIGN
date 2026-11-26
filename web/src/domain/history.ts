/** Snapshot undo/redo with labelled steps (configurations are small values). */
export interface History<T> { past: { state: T; label: string }[]; present: T; future: { state: T; label: string }[] }

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] })

export function record<T>(h: History<T>, next: T, label: string, limit = 100): History<T> {
  if (JSON.stringify(next) === JSON.stringify(h.present)) return h
  const past = [...h.past, { state: h.present, label }].slice(-limit)
  return { past, present: next, future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  const last = h.past[h.past.length - 1]
  if (!last) return h
  return { past: h.past.slice(0, -1), present: last.state, future: [...h.future, { state: h.present, label: last.label }] }
}

export function redo<T>(h: History<T>): History<T> {
  const next = h.future[h.future.length - 1]
  if (!next) return h
  return { past: [...h.past, { state: h.present, label: next.label }], present: next.state, future: h.future.slice(0, -1) }
}
