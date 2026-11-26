import { describe, expect, it } from 'vitest'
import { composite } from './composite'
import { defaultsFor } from '../domain/finishes'

const px = (n: number, v: number) => new Uint8ClampedArray(Array.from({ length: n }, () => [v, v, v, 255]).flat())

describe('photo composite', () => {
  it('maps the masked average to the chosen colour and leaves the rest untouched', () => {
    const base = px(4, 30)                       // dark, uniform photo
    const mask = new Uint8Array([255, 255, 0, 0])
    const out = composite(base, [{ mask, style: { type: 'paint', paint: defaultsFor('matte', '#CC2020') } }])
    expect([out[0], out[1], out[2]]).toEqual([204, 32, 32])
    expect([out[8], out[9], out[10], out[11]]).toEqual([30, 30, 30, 255])
  })
  it('keeps photo shading inside the mask', () => {
    const base = new Uint8ClampedArray([20, 20, 20, 255, 40, 40, 40, 255])
    const out = composite(base, [{ mask: new Uint8Array([255, 255]), style: { type: 'paint', paint: defaultsFor('matte', '#808080') } }])
    expect(out[4]).toBeGreaterThan(out[0])
  })
  it('does nothing with an empty mask', () => {
    const base = px(2, 90)
    expect(Array.from(composite(base, [{ mask: new Uint8Array([0, 0]), style: { type: 'paint', paint: defaultsFor('gloss', '#00FF00') } }]))).toEqual(Array.from(base))
  })
})
