import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  assetUrl,
  fillTemplate,
  getCity,
  postChat,
  shouldUseScript,
  splitAnswer,
} from './api'
import type { Citation } from './api.types'

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('memanggil path relatif dan mengembalikan JSON', async () => {
    const fetchFn = mockFetch(() => json({ city: { id: 'bandung' } }))
    const city = await getCity('bandung')
    expect(fetchFn).toHaveBeenCalledWith('/api/content/cities/bandung', { signal: undefined })
    expect(city.city.id).toBe('bandung')
  })

  it('mengirim pertanyaan sebagai JSON POST', async () => {
    const fetchFn = mockFetch(() => json({ answer: 'x', grounded: false, citations: [], refusal_reason: 'out_of_scope', suggestions: [] }))
    await postChat({ city_id: 'bandung', message: 'Apa itu angklung?' })
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('/api/chat')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ city_id: 'bandung', message: 'Apa itu angklung?' })
  })

  it('mengubah status galat menjadi ApiError dengan detail', async () => {
    mockFetch(() => json({ detail: 'kota belum tersedia' }, 404))
    await expect(getCity('yogyakarta')).rejects.toMatchObject({ status: 404, detail: 'kota belum tersedia' })
  })

  it('galat jaringan menjadi ApiError status 0', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(getCity('bandung')).rejects.toMatchObject({ status: 0 })
  })
})

describe('shouldUseScript', () => {
  it.each([
    [0, true],
    [429, true],
    [503, true],
    [400, false],
    [422, false],
  ])('status %i -> %s', (status, expected) => {
    expect(shouldUseScript(new ApiError(status, null))).toBe(expected)
  })

  it('bukan ApiError -> false', () => {
    expect(shouldUseScript(new Error('lain'))).toBe(false)
  })
})

describe('helper', () => {
  it('assetUrl memetakan src konten ke /api/assets', () => {
    expect(assetUrl('assets/images/item-angklung.webp')).toBe('/api/assets/images/item-angklung.webp')
  })

  it('fillTemplate mengisi variabel yang dikenal dan membiarkan yang lain', () => {
    expect(fillTemplate('Kamu menemukan {item}! {short_explanation} {lain}', { item: 'Angklung', short_explanation: 'Penjelasan.' }))
      .toBe('Kamu menemukan Angklung! Penjelasan. {lain}')
  })

  it('splitAnswer memisahkan teks dan sitasi', () => {
    const citations: Citation[] = [
      { chunk_id: 'a-001', title: 'Sumber A', url: null },
      { chunk_id: 'b-002', title: 'Sumber B', url: 'https://example.org' },
    ]
    const parts = splitAnswer('Satu [1]. Dua [2][1]. Salah [9].', citations)
    expect(parts.map((p) => (p.type === 'text' ? p.text : `#${p.n}`))).toEqual([
      'Satu ', '#1', '. Dua ', '#2', '#1', '. Salah [9].',
    ])
  })
})
