import { describe, expect, it } from 'vitest'
import { coordsOf, googleDirections, osmDirections } from './mapLinks'

describe('mapLinks', () => {
  it('membuat tautan arah', () => {
    expect(googleDirections(-6.9, 107.6)).toBe('https://www.google.com/maps/dir/?api=1&destination=-6.9,107.6')
    expect(osmDirections(-6.9, 107.6)).toBe('https://www.openstreetmap.org/directions?to=-6.9%2C107.6')
  })

  it('hanya menerima koordinat lengkap dan masuk akal', () => {
    const base = { name: 'x', address: 'y' }
    expect(coordsOf({ ...base, lat: -6.9, lng: 107.6 })).toEqual({ lat: -6.9, lng: 107.6 })
    expect(coordsOf({ ...base, lat: null, lng: 107.6 })).toBeNull()
    expect(coordsOf({ ...base, lat: 100, lng: 107.6 })).toBeNull()
    expect(coordsOf(null)).toBeNull()
  })
})
