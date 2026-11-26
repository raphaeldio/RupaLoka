import { describe, expect, it } from 'vitest'
import {
  currentIndex,
  damp,
  exhibitPos,
  exhibitYaw,
  HALF_W,
  makeLayout,
  nearestIndex,
  poseFor,
  reduce,
  ringCenter,
  standFor,
  type CamState,
} from './cameraFlow'

const RING = { radius: 6, slots: 12, first_d: 3 }
const L = makeLayout(
  [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ],
  RING,
)
const close = (a: number, b: number, eps = 1e-5) => Math.abs(a - b) < eps

describe('jalur cincin', () => {
  it('mulai di asal menghadap −Z dan kembali ke asal setelah satu keliling', () => {
    const f = L.at(0)
    expect(f.p.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, -0])
    expect(f.t.map((v) => Math.round(v))).toEqual([-0, 0, -1])
    expect(f.n.map((v) => Math.round(v))).toEqual([1, 0, -0])
    const g = L.at(L.length)
    expect(close(g.p[0], 0) && close(g.p[2], 0)).toBe(true)
  })

  it('vektor uji bersama dengan backend/app/ring.py (pedestal_1 dan pedestal_2)', () => {
    const p1 = exhibitPos(L, L.exhibits[0])
    const p2 = exhibitPos(L, L.exhibits[1])
    expect(close(p1[0], -2.401911) && close(p1[2], -1.965645)).toBe(true)
    expect(close(p2[0], -1.889661) && close(p2[2], -6.746489)).toBe(true)
  })

  it('slot di luar data menjadi "Segera hadir"', () => {
    expect(L.exhibits).toHaveLength(12)
    expect(L.exhibits[2].source).toBe(2)
    expect(L.exhibits[3]).toMatchObject({ source: null, label: 'Segera hadir' })
  })

  it('pedestal menghadap garis tengah di kedua sisi', () => {
    for (const e of L.exhibits.slice(0, 2)) {
      const yaw = exhibitYaw(L, e)
      const facing = [Math.sin(yaw), Math.cos(yaw)] // lokal +Z setelah rotasi Y
      const pos = exhibitPos(L, e)
      const mid = L.at(e.d).p
      const toMid = [mid[0] - pos[0], mid[2] - pos[2]]
      const len = Math.hypot(toMid[0], toMid[1])
      expect(close(facing[0], toMid[0] / len, 1e-6) && close(facing[1], toMid[1] / len, 1e-6)).toBe(true)
    }
  })
})

describe('reduce', () => {
  it('intro → walk(0), dan berjalan membungkus keliling', () => {
    const w = reduce({ kind: 'intro' }, { type: 'introDone' }, L)
    expect(w).toEqual({ kind: 'walk', d: 0 })
    const back = reduce(w, { type: 'walkBy', delta: -1 }, L) as { kind: 'walk'; d: number }
    expect(close(back.d, L.length - 1)).toBe(true)
  })

  it('klik objek: fokus, lalu periksa; slot kosong diabaikan', () => {
    const w: CamState = { kind: 'walk', d: 0 }
    expect(reduce(w, { type: 'clickExhibit', index: 5 }, L)).toBe(w)
    const f = reduce(w, { type: 'clickExhibit', index: 1 }, L)
    expect(f).toEqual({ kind: 'focus', index: 1 })
    expect(reduce(f, { type: 'clickExhibit', index: 1 }, L)).toEqual({ kind: 'inspect', index: 1 })
  })

  it('mundur: periksa → fokus → berjalan di depan objek tadi', () => {
    const f = reduce({ kind: 'inspect', index: 2 }, { type: 'back' }, L)
    expect(f).toEqual({ kind: 'focus', index: 2 })
    expect(reduce(f, { type: 'back' }, L)).toEqual({ kind: 'walk', d: standFor(L, L.exhibits[2]) })
  })

  it('langkah saat fokus melewati slot kosong dan berputar', () => {
    expect(reduce({ kind: 'focus', index: 2 }, { type: 'step', dir: 1 }, L)).toEqual({ kind: 'focus', index: 0 })
    expect(reduce({ kind: 'focus', index: 0 }, { type: 'step', dir: -1 }, L)).toEqual({ kind: 'focus', index: 2 })
  })

  it('langkah saat berjalan berdiri sebelum pameran berikutnya', () => {
    const s = reduce({ kind: 'walk', d: standFor(L, L.exhibits[0]) }, { type: 'step', dir: 1 }, L)
    expect(s).toEqual({ kind: 'walk', d: standFor(L, L.exhibits[1]) })
    expect(currentIndex(s, L)).toBe(1)
  })
})

describe('pose dan bantuan', () => {
  it('objek "dilewati" memakai jarak terpendek di cincin', () => {
    expect(nearestIndex(L, L.length - 0.2)).toBe(0)
  })

  it('pose fokus dan periksa berada di dalam lorong (layar lebar dan tegak)', () => {
    const c = ringCenter(L)
    for (const portrait of [0, 1]) {
      for (const kind of ['focus', 'inspect'] as const) {
        for (const index of [0, 1, 2]) {
          const p = poseFor({ kind, index }, L, portrait).position
          const r = Math.hypot(p[0] - c[0], p[2] - c[2])
          expect(Math.abs(r - L.radius)).toBeLessThan(HALF_W)
        }
      }
    }
  })

  it('damp konvergen tanpa melampaui target', () => {
    let v = 0
    for (let i = 0; i < 200; i++) {
      v = damp(v, 10, 6, 1 / 60)
      expect(v).toBeLessThanOrEqual(10)
    }
    expect(close(v, 10, 1e-3)).toBe(true)
  })
})
