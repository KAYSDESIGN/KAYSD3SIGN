import { describe, expect, it } from 'vitest'
import { hexToRgb, rgbToHex, hexToHsl, hslToHex, sampleColor } from './color'
import { createHistory, record, undo, redo } from './history'
import { summarize, progress } from './budget'
import { compatibleAccessories, homologation, displayOffer, isTrustworthy } from './catalog'
import catalogJson from '../data/catalog.json'
import type { Catalog, ShoppingLine } from './types'

const catalog = catalogJson as unknown as Catalog
const EU = 'honda.cb125r.jc91.eu'

describe('color', () => {
  it('round-trips hex/rgb/hsl', () => {
    for (const hex of ['#000000', '#FFFFFF', '#7938F5', '#E02424', '#202124']) {
      expect(rgbToHex(hexToRgb(hex)!)).toBe(hex)
      expect(hslToHex(hexToHsl(hex))).toBe(hex)
    }
    expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('nope')).toBeNull()
  })
  it('samples paint ignoring highlights and shadows', () => {
    expect(sampleColor([200, 0, 0, 255, 180, 0, 0, 255, 255, 255, 255, 255, 2, 2, 2, 255])).toBe('#BE0000')
  })
})

describe('history', () => {
  it('undoes and redoes labelled steps', () => {
    let h = createHistory(0)
    h = record(h, 1, 'a'); h = record(h, 2, 'b')
    h = undo(h); expect(h.present).toBe(1)
    h = redo(h); expect(h.present).toBe(2)
    expect(record(h, 2, 'noop')).toBe(h)
  })
})

describe('budget', () => {
  const lines: ShoppingLine[] = [
    { id: '1', label: 'a', kind: 'part', quantity: 2, unit: { amount: 89.9, currency: 'EUR', verified: true }, shipping: { amount: 6.5, currency: 'EUR' }, status: 'ordered' },
    { id: '2', label: 'b', kind: 'other', quantity: 1, unit: { amount: 12, currency: 'EUR', verified: false }, status: 'toBuy' },
    { id: '3', label: 'c', kind: 'part', quantity: 1, unit: { amount: 30, currency: 'GBP', verified: true }, status: 'toBuy' },
  ]
  it('separates verified prices, estimates and foreign currencies', () => {
    const s = summarize({ currency: 'EUR', maximum: 300, paint: 150, labor: 40 }, lines)
    expect(s.total).toBeCloseTo(388.3)
    expect(s.spent).toBeCloseTo(186.3)
    expect(s.margin).toBeCloseTo(-88.3)
    expect(s.excluded).toEqual(['3'])
    expect(s.unpriced).toEqual([])
    expect(progress(lines)).toBeCloseTo(1 / 6)
  })
})

describe('budget without published price', () => {
  it('never counts an unpriced part as 0 €', () => {
    const s = summarize({ currency: 'EUR' }, [{ id: 'x', label: 'top case', kind: 'part', quantity: 1, status: 'toBuy' }])
    expect(s.unpriced).toEqual(['x'])
    expect(s.total).toBe(0)
    expect(s.partsVerified).toBe(false)
  })
})

describe('catalog', () => {
  it('only lists references with a sourced fitment, with 30+ references', () => {
    const list = compatibleAccessories(catalog, EU)
    const refs = list.flatMap((a) => a.variants)
    expect(refs.length).toBeGreaterThanOrEqual(30)
    expect(compatibleAccessories(catalog, 'unknown.bike')).toHaveLength(0)
    for (const r of refs) expect(r.compatibilities.some((c) => isTrustworthy(c.verification))).toBe(true)
  })
  it('never infers homologation; sourced records only', () => {
    const mivv = catalog.accessories.flatMap((a) => a.variants).find((v) => v.reference === 'H.077.L2P')!
    expect(homologation(mivv, 'FR', EU).status).toBe('approvedWithConditions')
    expect(homologation(mivv, 'DE', EU).status).toBe('notVerified')
    const mk3 = catalog.accessories.flatMap((a) => a.variants).find((v) => v.reference === 'H.078.SM3B')!
    expect(homologation(mk3, 'FR', EU).status).toBe('notApproved')
  })
  it('displays offers in their own currency', () => {
    const rad = catalog.accessories.flatMap((a) => a.variants).find((v) => v.reference.startsWith('RAD0235'))!
    expect(displayOffer(rad)?.price.currency).toBe('GBP')
  })
})
