/** Tautan arah ke lokasi asli (SDD §10, F-032/F-050). Dibuka di tab baru. */
import type { Location } from './api.types'

export const googleDirections = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

/**
 * Rute Google Maps berdasarkan nama + alamat (bersumber di konten) bila koordinat belum
 * diverifikasi. Google Maps mencari tempatnya sendiri; tidak ada koordinat yang ditebak.
 */
export const googleDirectionsTo = (place: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`

export const osmDirections = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`

const valid = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n)

/** Koordinat yang dapat dipakai, atau null (koordinat belum diverifikasi, T-034). */
export function coordsOf(loc: Location | null | undefined): { lat: number; lng: number } | null {
  if (!loc || !valid(loc.lat) || !valid(loc.lng)) return null
  if (Math.abs(loc.lat) > 90 || Math.abs(loc.lng) > 180) return null
  return { lat: loc.lat, lng: loc.lng }
}
