import { describe, expect, it } from 'vitest'
import { AMBIENT_CELL, walkersAt } from './ambient'
import { frameAt, poseAt, RUN_FRAMES } from './runnerSprite'

describe('pelari tampak samping', () => {
  it('kaki bergantian maju-mundur sepanjang siklus lari', () => {
    const thighs = Array.from({ length: RUN_FRAMES }, (_, f) => poseAt(f, true).front.thigh)
    expect(Math.max(...thighs)).toBeGreaterThan(0.5)
    expect(Math.min(...thighs)).toBeLessThan(-0.5)
    for (let f = 0; f < RUN_FRAMES; f++) {
      const p = poseAt(f, true)
      // Kaki depan dan belakang selalu berlawanan, lengan berlawanan dengan kaki.
      expect(p.front.thigh).toBeCloseTo(-p.back.thigh)
      expect(Math.sign(p.armFront) || 0).toBe(-Math.sign(p.front.thigh) || 0)
    }
  })

  it('diam (gerak dikurangi) memakai frame 0; berlari berganti frame', () => {
    expect(frameAt(5.3, true)).toBe(0)
    const frames = new Set(Array.from({ length: 30 }, (_, i) => frameAt(i / 20, false)))
    expect(frames.size).toBe(RUN_FRAMES)
  })
})

describe('warga acak di latar', () => {
  it('deterministik, ada di layar, dan tidak terlalu padat', () => {
    const a = walkersAt(5000, 3, 800, 3, false)
    expect(walkersAt(5000, 3, 800, 3, false)).toEqual(a)
    for (const w of a) {
      expect(w.x).toBeGreaterThan(-40)
      expect(w.x).toBeLessThan(840)
      expect(w.kind).toBeGreaterThanOrEqual(0)
      expect(w.kind).toBeLessThan(3)
    }
    expect(a.length).toBeLessThanOrEqual(Math.ceil(880 / AMBIENT_CELL) + 1)
  })

  it('rata-rata sekitar separuh sel berisi warga', () => {
    let n = 0
    for (let i = 0; i < 200; i++) n += walkersAt(i * 2000, 0, 800, 3, true).length
    const perScreen = n / 200
    expect(perScreen).toBeGreaterThan(1)
    expect(perScreen).toBeLessThan(3.5)
  })

  it('gerak dikurangi: warga diam di tempat', () => {
    expect(walkersAt(1000, 0, 800, 3, true)).toEqual(walkersAt(1000, 9, 800, 3, true).map((w) => ({ ...w })))
    for (const w of walkersAt(1000, 9, 800, 3, true)) expect(w.bob).toBe(0)
  })
})
