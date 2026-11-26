import { describe, expect, it } from 'vitest'
import { wrapLines } from './labelText'

const measure = (t: string) => t.length * 10

describe('wrapLines', () => {
  it('membungkus per kata sesuai lebar', () => {
    expect(wrapLines('satu dua tiga empat', 90, 5, measure)).toEqual(['satu dua', 'tiga', 'empat'])
  })

  it('memotong dengan elipsis bila melebihi jumlah baris', () => {
    const out = wrapLines('aa bb cc dd ee ff', 50, 2, measure)
    expect(out).toHaveLength(2)
    expect(out[1].endsWith('…')).toBe(true)
    expect(measure(out[1])).toBeLessThanOrEqual(50)
  })

  it('kata yang lebih panjang dari baris tetap ditaruh sendiri', () => {
    expect(wrapLines('superpanjangsekali ok', 50, 3, measure)).toEqual(['superpanjangsekali', 'ok'])
  })
})
