import type { Budget, ShoppingLine } from './types'

export interface BudgetSummary {
  currency: string
  parts: number; partsVerified: boolean
  paint: number; wrap: number; labor: number; shipping: number
  total: number; spent: number; remaining: number
  maximum?: number; margin?: number
  excluded: string[]        // lines in another currency (never converted)
  unpriced: string[]        // part lines without any sourced price (never counted as 0 €)
  verifiedShare: number     // 0…1
}

export function summarize(budget: Budget, lines: ShoppingLine[]): BudgetSummary {
  const cur = budget.currency
  let parts = 0, partsEst = 0, paint = 0, wrap = 0, labor = 0, shipping = 0, spent = 0, verified = 0
  const excluded: string[] = [], unpriced: string[] = []
  for (const l of lines) {
    if (l.kind === 'part' && !l.unit) { unpriced.push(l.id); continue }
    if ((l.unit && l.unit.currency !== cur) || (l.shipping && l.shipping.currency !== cur)) { excluded.push(l.id); continue }
    const amount = (l.unit?.amount ?? 0) * l.quantity
    const ship = l.shipping?.amount ?? 0
    if (l.kind === 'paint') paint += amount
    else if (l.kind === 'wrap') wrap += amount
    else if (l.kind === 'labor') labor += amount
    else if (l.unit?.verified) parts += amount
    else partsEst += amount
    if (l.unit?.verified) verified += amount
    shipping += ship
    if (l.status !== 'toBuy') spent += amount + ship
  }
  paint += budget.paint ?? 0; wrap += budget.wrap ?? 0; labor += budget.labor ?? 0; shipping += budget.shipping ?? 0
  const total = parts + partsEst + paint + wrap + labor + shipping
  return {
    currency: cur, parts: parts + partsEst, partsVerified: partsEst === 0 && parts > 0,
    paint, wrap, labor, shipping, total, spent, remaining: total - spent,
    maximum: budget.maximum, margin: budget.maximum !== undefined ? budget.maximum - total : undefined,
    excluded, unpriced, verifiedShare: total ? verified / total : 1,
  }
}

/** Progress of a project: installed = 1, ordered = 0.5. */
export function progress(lines: ShoppingLine[]): number {
  if (!lines.length) return 0
  return lines.reduce((s, l) => s + (l.status === 'installed' ? 1 : l.status === 'ordered' ? 0.5 : 0), 0) / lines.length
}

export const formatMoney = (amount: number, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
