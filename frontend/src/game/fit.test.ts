import { describe, expect, it } from 'vitest'
import { WORLD_H, WORLD_W } from './engine'
import { fitCanvas } from './fit'

describe('fitCanvas', () => {
  it('mengisi penuh layar desktop dan menjaga rasio dunia', () => {
    const r = fitCanvas(1440, 820)
    expect(r.w).toBe(1440)
    expect(r.h).toBeLessThanOrEqual(820)
    expect(r.viewW).toBeGreaterThanOrEqual(540)
    expect(r.viewW).toBeLessThanOrEqual(WORLD_W)
    expect(Math.abs(r.w / r.h - r.viewW / WORLD_H)).toBeLessThan(0.01)
  })

  it('layar sangat lebar: tinggi penuh, pita samping', () => {
    const r = fitCanvas(3000, 600)
    expect(r.viewW).toBe(WORLD_W)
    expect(r.h).toBe(600)
    expect(r.w).toBe(1600)
  })

  it('ponsel potret: lebar penuh, minimal 540 unit dunia tampil', () => {
    const r = fitCanvas(360, 640)
    expect(r.viewW).toBe(540)
    expect(r.w).toBe(360)
    expect(r.h).toBe(200)
  })
})
