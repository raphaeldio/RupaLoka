import { describe, expect, it } from 'vitest'
import { WORLD_W } from './engine'
import { backdropRect, landmarksAt, LANDMARKS, ROAD_TOP, roadTilesAt, SCENERY_CYCLE, SCENERY_PARALLAX } from './scenery'

describe('roadTilesAt', () => {
  it('menutupi layar tanpa celah dan bergeser sejauh jarak tempuh', () => {
    const xs = roadTilesAt(50, 366, WORLD_W)
    expect(xs[0]).toBe(-50)
    expect(xs[xs.length - 1] + 366).toBeGreaterThanOrEqual(WORLD_W)
    xs.slice(1).forEach((x, i) => expect(x - xs[i]).toBe(366))
  })
  it('berulang tiap satu lebar ubin', () => {
    expect(roadTilesAt(366 * 7 + 10, 366, WORLD_W)).toEqual(roadTilesAt(10, 366, WORLD_W))
  })
})

describe('landmarksAt', () => {
  it('tidak menutupi latar Bandung saat mulai, lalu landmark masuk dari kanan', () => {
    expect(landmarksAt(0, WORLD_W)).toEqual([])
    expect(landmarksAt(400, WORLD_W).length).toBeGreaterThan(0)
  })
  it('semua landmark muncul bergiliran selama satu siklus', () => {
    const seen = new Set<string>()
    for (let d = 0; d < SCENERY_CYCLE / SCENERY_PARALLAX; d += 200) for (const l of landmarksAt(d, WORLD_W)) seen.add(l.def.id)
    expect([...seen].sort()).toEqual(LANDMARKS.map((l) => l.id).sort())
  })
  it('hanya mengembalikan yang terlihat dan berulang per siklus', () => {
    for (const d of [0, 1234, 98765]) {
      for (const l of landmarksAt(d, WORLD_W)) {
        expect(l.x + l.w).toBeGreaterThan(0)
        expect(l.x).toBeLessThan(WORLD_W)
      }
    }
    const a = landmarksAt(500, WORLD_W).map((l) => [l.def.id, Math.round(l.x)])
    const b = landmarksAt(500 + SCENERY_CYCLE / SCENERY_PARALLAX, WORLD_W).map((l) => [l.def.id, Math.round(l.x)])
    expect(b).toEqual(a)
  })
})

describe('backdropRect', () => {
  it.each([540, 680, WORLD_W])('menutupi lebar %i dan seluruh langit, dipusatkan', (viewW) => {
    const r = backdropRect(viewW)
    expect(r.x).toBeLessThanOrEqual(0)
    expect(r.x + r.w).toBeGreaterThanOrEqual(viewW)
    expect(r.y).toBeLessThanOrEqual(0)
    expect(r.y + r.h).toBeCloseTo(ROAD_TOP)
    expect(r.x + r.w / 2).toBeCloseTo(viewW / 2)
  })
})
