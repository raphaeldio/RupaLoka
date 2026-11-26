import { describe, expect, it } from 'vitest'
import { feedbackUrl } from './feedback'

const target = { cityId: 'bandung', id: 'item-angklung', title: 'Angklung' }
const FORM = 'https://docs.google.com/forms/d/e/abc/viewform'

describe('feedbackUrl', () => {
  it('kosong / bukan https / tidak valid → null (tombol disembunyikan)', () => {
    expect(feedbackUrl(target, undefined, undefined)).toBeNull()
    expect(feedbackUrl(target, '  ', undefined)).toBeNull()
    expect(feedbackUrl(target, 'http://contoh.org/form', undefined)).toBeNull()
    expect(feedbackUrl(target, 'bukan url', undefined)).toBeNull()
  })

  it('tanpa entry → URL form apa adanya', () => {
    expect(feedbackUrl(target, FORM, undefined)).toBe(FORM)
    expect(feedbackUrl(target, FORM, 'salah')).toBe(FORM)
  })

  it('dengan entry → isian otomatis kota, judul, id', () => {
    const url = new URL(feedbackUrl(target, FORM, 'entry.123')!)
    expect(url.searchParams.get('usp')).toBe('pp_url')
    expect(url.searchParams.get('entry.123')).toBe('bandung / Angklung (item-angklung)')
  })
})
