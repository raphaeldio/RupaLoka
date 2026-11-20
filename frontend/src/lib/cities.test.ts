import { afterEach, describe, expect, it, vi } from 'vitest'
import { bundledCities, isPlaceholder, loadCities, parseCities, placeCity, projectLatLng, type City } from './cities'
import { findProvince, surfaceBox } from './provinces'

const base: City = {
  id: 'bandung',
  name: 'Bandung',
  province: 'Jawa Barat',
  status: 'active',
  lat: null,
  lng: null,
  summary: null,
}

describe('cities', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('membaca content/cities.yaml yang dibundel', () => {
    expect(bundledCities.find((c) => c.id === 'bandung')?.status).toBe('active')
  })

  it('mengabaikan entri tanpa id/nama', () => {
    expect(parseCities([{ id: 'x' }, null, { id: 'a', name: 'A', status: 'aneh' }])).toEqual([
      expect.objectContaining({ id: 'a', status: 'coming_soon' }),
    ])
  })

  it('menandai teks [PERLU DIISI] sebagai placeholder', () => {
    expect(isPlaceholder('[PERLU DIISI] ringkasan')).toBe(true)
    expect(isPlaceholder(null)).toBe(true)
    expect(isPlaceholder('Ringkasan kota')).toBe(false)
  })

  it('tanpa lat/lng, titik kota ditaruh di tengah provinsinya (bukan ditebak)', () => {
    const placed = placeCity(base)!
    const b = surfaceBox(findProvince('Jawa Barat')!)
    expect(placed.exact).toBe(false)
    expect(placed.x).toBeCloseTo(b.x + b.w / 2)
    expect(placed.y).toBeCloseTo(b.y + b.h / 2)
  })

  it('dengan lat/lng, memakai proyeksi', () => {
    const placed = placeCity({ ...base, lat: -6, lng: 107 })!
    expect(placed.exact).toBe(true)
    expect(placed).toMatchObject(projectLatLng(-6, 107))
  })

  it('tidak menaruh kota tanpa koordinat dan provinsi tak dikenal', () => {
    expect(placeCity({ ...base, province: 'Atlantis' })).toBeNull()
  })

  it('jatuh ke data bundel bila API gagal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const r = await loadCities()
    expect(r.source).toBe('bundled')
    expect(r.cities).toBe(bundledCities)
  })

  it('memakai data API bila tersedia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ ...base, lesson_count: 3 }]))))
    const r = await loadCities()
    expect(r.source).toBe('api')
    expect(r.cities[0].lesson_count).toBe(3)
  })
})
