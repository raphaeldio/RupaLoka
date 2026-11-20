import { parse } from 'yaml'
import { getCities } from './api'
import fallbackYaml from '../../../content/cities.yaml?raw'
import { findProvince, MAP_H, MAP_W, surfaceBox, type Province } from './provinces'

/** Bentuk `CitySummary` dari `GET /api/content/cities` (backend/app/api_schemas.py). */
export interface City {
  id: string
  name: string
  province: string | null
  status: 'active' | 'coming_soon'
  lat: number | null
  lng: number | null
  summary: string | null
  lesson_count?: number | null
  item_count?: number | null
}

export type CitySource = 'api' | 'bundled'

/** Teks bertanda [PERLU DIISI] / TODO belum layak tampil sebagai fakta. */
export function isPlaceholder(text: string | null | undefined): boolean {
  return !text || /\[PERLU DIISI\]|\bTODO\b/i.test(text)
}

/** Label pendek (nama item/judul materi); placeholder diganti teks netral. */
export const labelOr = (text: string | null | undefined, fallback: string): string =>
  isPlaceholder(text) ? fallback : (text as string)

function toCity(raw: Record<string, unknown>): City | null {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    id: raw.id,
    name: raw.name,
    province: typeof raw.province === 'string' ? raw.province : null,
    status: raw.status === 'active' ? 'active' : 'coming_soon',
    lat: num(raw.lat),
    lng: num(raw.lng),
    summary: typeof raw.summary === 'string' ? raw.summary : null,
    lesson_count: num(raw.lesson_count),
    item_count: num(raw.item_count),
  }
}

export function parseCities(data: unknown): City[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((d) => (d && typeof d === 'object' ? [toCity(d as Record<string, unknown>)] : [])).filter(
    (c): c is City => c !== null,
  )
}

export const bundledCities: City[] = parseCities(parse(fallbackYaml))

/**
 * Ambil daftar kota dari API. Bila API tidur/gagal (Render gratis), pakai salinan
 * content/cities.yaml yang dibundel agar beranda tidak pernah kosong.
 */
export async function loadCities(signal?: AbortSignal): Promise<{ cities: City[]; source: CitySource }> {
  try {
    const cities = parseCities(await getCities(signal))
    if (cities.length === 0) throw new Error('daftar kota kosong')
    return { cities, source: 'api' }
  } catch (err) {
    if (signal?.aborted) throw err
    return { cities: bundledCities, source: 'bundled' }
  }
}

/*
 * Proyeksi PERKIRAAN untuk menaruh titik kota di bidang peta Figma: linear terhadap
 * bujur 95°BT–141°BT dan lintang 6°LU–11°LS (label "06° LU — 11° LS" di desain).
 * Peta referensi tidak menyertakan proyeksi aslinya. TODO(T-034): verifikasi posisi
 * titik terhadap peta acuan setelah koordinat di cities.yaml diisi dari sumber.
 */
const LNG_MIN = 95
const LNG_MAX = 141
const LAT_MAX = 6
const LAT_MIN = -11

export function projectLatLng(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H,
  }
}

export interface PlacedCity {
  city: City
  province: Province | undefined
  /** Posisi di bidang peta (px, MAP_W × MAP_H). */
  x: number
  y: number
  /** true bila posisi berasal dari lat/lng; false = pusat kotak provinsi (lat/lng belum diisi). */
  exact: boolean
}

export function placeCity(city: City): PlacedCity | null {
  const province = findProvince(city.province)
  if (city.lat !== null && city.lng !== null) {
    return { city, province, ...projectLatLng(city.lat, city.lng), exact: true }
  }
  if (!province) return null
  const b = surfaceBox(province)
  return { city, province, x: b.x + b.w / 2, y: b.y + b.h / 2, exact: false }
}
