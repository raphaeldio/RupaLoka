import { describe, expect, it } from 'vitest'
import { guideLine, IDLE_AFTER_MS, nextLine, PASS_GAP_MS, type GuideMemory } from './guide'

const fresh: GuideMemory = { lastKey: null, lastAt: -Infinity }

describe('guideLine', () => {
  it('menyebut sisi dan nama pameran', () => {
    const line = guideLine({ type: 'pass', index: 1, name: 'Gedung Sate', side: 1, empty: false })
    expect(line).toContain('kananmu ada Gedung Sate')
    expect(line).toContain('Enter')
  })

  it('pedestal kosong tidak menyebut nama', () => {
    const line = guideLine({ type: 'pass', index: 5, name: 'Segera hadir', side: -1, empty: true })
    expect(line).toContain('kirimu masih kosong')
  })
})

describe('nextLine', () => {
  it('tidak mengulang kalimat yang sama berturut-turut', () => {
    const e = { type: 'focus', index: 0, name: 'Keris' } as const
    const a = nextLine(fresh, e, 0)
    expect(a.say).toContain('Ini Keris')
    expect(nextLine(a.mem, e, 99999).say).toBeNull()
  })

  it('kalimat melewati diberi jeda, tindakan pengguna tidak', () => {
    const a = nextLine(fresh, { type: 'pass', index: 0, name: 'A', side: -1, empty: false }, 0)
    expect(a.say).not.toBeNull()
    const pass = { type: 'pass', index: 1, name: 'B', side: 1, empty: false } as const
    expect(nextLine(a.mem, pass, PASS_GAP_MS - 1).say).toBeNull()
    expect(nextLine(a.mem, pass, PASS_GAP_MS).say).toContain('B')
    expect(nextLine(a.mem, { type: 'focus', index: 1, name: 'B' }, 10).say).toContain('Ini B')
  })

  it('pengingat idle hanya setelah lama diam', () => {
    const a = nextLine(fresh, { type: 'enter' }, 0)
    expect(nextLine(a.mem, { type: 'idle', name: 'A' }, IDLE_AFTER_MS - 1).say).toBeNull()
    const b = nextLine(a.mem, { type: 'idle', name: 'A' }, IDLE_AFTER_MS)
    expect(b.say).toContain('tentang A')
    expect(nextLine(b.mem, { type: 'idle', name: 'A' }, IDLE_AFTER_MS * 2).say).not.toBeNull()
  })
})
