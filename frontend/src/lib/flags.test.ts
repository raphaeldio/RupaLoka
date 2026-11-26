import { describe, expect, it } from 'vitest'
import { featureFlags, galleryEnabled, parseFlags } from './flags'

describe('parseFlags', () => {
  it('semua mati bila env kosong', () => {
    expect(parseFlags(undefined)).toEqual({
      viewer3d: false,
      class_mode: false,
      premium_content: false,
      strict_node_requirements: false,
    })
    expect(parseFlags('')).toEqual(parseFlags(undefined))
  })

  it('menyalakan flag yang disebut (dipisah koma, spasi diabaikan)', () => {
    const f = parseFlags(' viewer3d, premium_content ')
    expect(f.viewer3d).toBe(true)
    expect(f.premium_content).toBe(true)
    expect(f.class_mode).toBe(false)
    expect(f.strict_node_requirements).toBe(false)
  })

  it('mengabaikan nama yang tidak dikenal tanpa galat', () => {
    expect(parseFlags('tidak_dikenal,__proto__,toString')).toEqual(parseFlags(undefined))
  })
})

describe('featureFlags bawaan', () => {
  it('mati saat VITE_FLAGS tidak diisi di lingkungan uji', () => {
    expect(featureFlags.viewer3d).toBe(false)
    expect(galleryEnabled).toBe(false)
  })
})
