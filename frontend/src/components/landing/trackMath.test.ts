import { describe, expect, it } from 'vitest'
import { RUN_FRAMES } from '../../game/runnerSprite'
import { stopAt, strideFrame, trackProgress } from './trackMath'

describe('StopsTrack', () => {
  it('kemajuan 0 sebelum bagian mencapai garis mata dan 1 setelah lewat', () => {
    expect(trackProgress(900, 500, 1000)).toBe(0)
    expect(trackProgress(550, 500, 1000)).toBe(0)
    expect(trackProgress(300, 500, 1000)).toBeCloseTo(0.5)
    expect(trackProgress(-200, 500, 1000)).toBe(1)
    expect(trackProgress(0, 0, 1000)).toBe(0)
  })
  it('patok tersebar rata dengan jarak tepi setengah langkah', () => {
    expect([0, 1, 2, 3].map((i) => stopAt(i, 4))).toEqual([12.5, 37.5, 62.5, 87.5])
  })
  it('frame lari berulang dalam rentang frame sprite', () => {
    expect(strideFrame(0)).toBe(0)
    expect(strideFrame(25)).toBe(2)
    expect(strideFrame(10 * RUN_FRAMES)).toBe(0)
  })
})
