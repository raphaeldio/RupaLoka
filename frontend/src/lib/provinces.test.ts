import { describe, expect, it } from 'vitest'
import { findProvince, insetToBox, MAP_H, MAP_W, PROVINCES, REGIONS } from './provinces'

describe('provinces', () => {
  it('memuat 38 provinsi dengan kode unik dan wilayah yang dikenal', () => {
    expect(PROVINCES).toHaveLength(38)
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(38)
    const regions = new Set(REGIONS.map((r) => r.id))
    for (const p of PROVINCES) expect(regions.has(p.region)).toBe(true)
  })

  it('kotak permukaan berada di dalam bidang peta', () => {
    for (const p of PROVINCES) {
      const b = insetToBox(p.surface)
      expect(b.w).toBeGreaterThan(0)
      expect(b.h).toBeGreaterThan(0)
      expect(b.x + b.w).toBeLessThanOrEqual(MAP_W + 0.5)
      expect(b.y + b.h).toBeLessThanOrEqual(MAP_H + 0.5)
    }
  })

  it('mencocokkan nama provinsi dari konten, termasuk alias', () => {
    expect(findProvince('Jawa Barat')?.code).toBe('JB')
    expect(findProvince('DI Yogyakarta')?.code).toBe('YO')
    expect(findProvince('Daerah Istimewa Yogyakarta')?.code).toBe('YO')
    expect(findProvince('provinsi  jawa-barat')?.code).toBe('JB')
    expect(findProvince('ID-JK')?.code).toBe('JK')
    expect(findProvince('Atlantis')).toBeUndefined()
    expect(findProvince(null)).toBeUndefined()
  })
})
