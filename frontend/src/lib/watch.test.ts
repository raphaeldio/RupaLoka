import { describe, expect, it } from 'vitest'
import { formatClock, isWatched, MIN_WATCH_SECONDS, recordWatch, requiredSeconds } from './watch'

describe('syarat tonton video', () => {
  it('3 menit pertama; video pendek hampir seluruhnya', () => {
    expect(requiredSeconds(0)).toBe(MIN_WATCH_SECONDS)
    expect(requiredSeconds(600)).toBe(180)
    expect(requiredSeconds(95.4)).toBe(94)
    expect(requiredSeconds(Number.NaN)).toBe(180)
  })

  it('menonton berurutan memenuhi syarat', () => {
    let seen: ReadonlySet<number> = new Set()
    for (let t = 0; t < 180; t += 0.5) seen = recordWatch(seen, t, 180)
    expect(seen.size).toBe(180)
    expect(isWatched(seen, 180)).toBe(true)
  })

  it('melompat ke depan tidak menghitung detik yang dilewati', () => {
    let seen: ReadonlySet<number> = new Set()
    for (let t = 0; t < 10; t++) seen = recordWatch(seen, t, 180)
    for (let t = 170; t < 400; t++) seen = recordWatch(seen, t, 180)
    expect(seen.size).toBe(20)
    expect(isWatched(seen, 180)).toBe(false)
  })

  it('mengulang detik yang sama tidak menambah', () => {
    const a = recordWatch(new Set(), 5.2, 180)
    expect(recordWatch(a, 5.9, 180)).toBe(a)
  })

  it('format jam', () => {
    expect(formatClock(180)).toBe('3:00')
    expect(formatClock(65.7)).toBe('1:05')
  })
})
