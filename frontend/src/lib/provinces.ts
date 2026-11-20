/**
 * Geometri peta provinsi dari referensi Figma (file lo5e9TknFyRXZd8iXCMkn6, node 191:2).
 *
 * Bidang peta berukuran MAP_W × MAP_H. Tiap provinsi punya dua lapisan aset SVG:
 * - `surface-XX.svg`: permukaan provinsi (bentuk yang bisa disorot),
 * - `depth-XX.svg`: ketebalan/bayangan yang muncul saat provinsi "timbul".
 *
 * Inset dicatat dalam persen [atas, kanan, bawah, kiri] persis seperti di Figma.
 * `depthPad` adalah inset (negatif) gambar ketebalan relatif terhadap kotak ketebalan.
 * Lisensi data batas wilayah masih harus diverifikasi (T-061a), lihat content/sources.yaml.
 */

export const MAP_W = 1200
export const MAP_H = 450

/** Panggung = area bagian "Peta Indonesia" di Figma, dipotong agar label tetap muat. */
export const STAGE_W = 1260
export const STAGE_H = 520
/** Posisi bidang peta di dalam panggung. */
export const MAP_X = 30
export const MAP_Y = 14

export type RegionId =
  | 'sumatera'
  | 'jawa'
  | 'kalimantan'
  | 'sulawesi'
  | 'bali-nusa-tenggara'
  | 'maluku'
  | 'papua'

export const REGIONS: { id: RegionId; name: string }[] = [
  { id: 'sumatera', name: 'Sumatera' },
  { id: 'jawa', name: 'Jawa' },
  { id: 'kalimantan', name: 'Kalimantan' },
  { id: 'sulawesi', name: 'Sulawesi' },
  { id: 'bali-nusa-tenggara', name: 'Bali & Nusa Tenggara' },
  { id: 'maluku', name: 'Maluku' },
  { id: 'papua', name: 'Papua' },
]

type Inset = readonly [top: number, right: number, bottom: number, left: number]

export interface Province {
  /** Kode ISO 3166-2:ID tanpa awalan, mis. "JB". */
  code: string
  name: string
  region: RegionId
  surface: Inset
  depth: Inset
  depthPad: Inset
  /** Nama lain yang mungkin dipakai di content/cities.yaml. */
  aliases?: string[]
}

export const PROVINCES: readonly Province[] = [
  // Sumatera
  { code: 'AC', name: 'Aceh', region: 'sumatera', surface: [3.33, 92.67, 77.11, 0.83], depth: [4.89, 92.67, 75.56, 0.83], depthPad: [-2.27, -17.95, -29.55, -17.95] },
  { code: 'SU', name: 'Sumatera Utara', region: 'sumatera', surface: [10.89, 88, 66.22, 4.92], depth: [12.44, 88, 64.67, 4.92], depthPad: [-1.94, -16.47, -25.24, -16.47] },
  { code: 'SB', name: 'Sumatera Barat', region: 'sumatera', surface: [30.89, 85, 50.67, 8.08], depth: [32.44, 85, 49.11, 8.08], depthPad: [-2.41, -16.87, -31.33, -16.87] },
  { code: 'RI', name: 'Riau', region: 'sumatera', surface: [20.67, 80.75, 58.44, 11.25], depth: [22.22, 80.75, 56.89, 11.25], depthPad: [-2.13, -14.58, -27.66, -14.58] },
  { code: 'KR', name: 'Kepulauan Riau', region: 'sumatera', surface: [11.33, 71, 69.33, 20.08], depth: [12.89, 71, 67.78, 20.08], depthPad: [-2.3, -13.08, -29.89, -13.08] },
  { code: 'JA', name: 'Jambi', region: 'sumatera', surface: [39.56, 79.33, 48.89, 13.5], depth: [41.11, 79.33, 47.33, 13.5], depthPad: [-3.85, -16.28, -50, -16.28] },
  { code: 'BE', name: 'Bengkulu', region: 'sumatera', surface: [48.22, 80.83, 36.67, 13.25], depth: [49.78, 80.83, 35.11, 13.25], depthPad: [-2.94, -19.72, -38.24, -19.72] },
  { code: 'SS', name: 'Sumatera Selatan', region: 'sumatera', surface: [44.44, 75.92, 37.11, 15.5], depth: [46, 75.92, 35.56, 15.5], depthPad: [-2.41, -13.59, -31.33, -13.59] },
  { code: 'BB', name: 'Kepulauan Bangka Belitung', region: 'sumatera', surface: [43.78, 71.17, 46.67, 22], depth: [45.33, 71.17, 45.11, 22], depthPad: [-4.65, -17.07, -60.47, -17.07] },
  { code: 'LA', name: 'Lampung', region: 'sumatera', surface: [56.89, 76.33, 31.78, 18.75], depth: [58.44, 76.33, 30.22, 18.75], depthPad: [-3.92, -23.73, -50.98, -23.73] },
  // Jawa
  { code: 'BT', name: 'Banten', region: 'jawa', surface: [69.33, 74.42, 24.89, 22.83], depth: [70.89, 74.42, 23.33, 22.83], depthPad: [-7.69, -42.42, -100, -42.42] },
  { code: 'JK', name: 'DKI Jakarta', region: 'jawa', surface: [70, 74, 28.89, 25.42], depth: [71.56, 74, 27.33, 25.42], depthPad: [-40, -200, -520, -200], aliases: ['Jakarta', 'Daerah Khusus Ibukota Jakarta', 'Jakarta Raya'] },
  { code: 'JB', name: 'Jawa Barat', region: 'jawa', surface: [69.33, 70.08, 20.22, 24.67], depth: [70.89, 70.08, 18.67, 24.67], depthPad: [-4.26, -22.22, -55.32, -22.22] },
  { code: 'JT', name: 'Jawa Tengah', region: 'jawa', surface: [71.78, 63.92, 18, 29.42], depth: [73.33, 63.92, 16.44, 29.42], depthPad: [-4.35, -17.5, -56.52, -17.5] },
  { code: 'YO', name: 'DI Yogyakarta', region: 'jawa', surface: [78.22, 65.75, 18, 32.42], depth: [79.78, 65.75, 16.44, 32.42], depthPad: [-11.76, -63.64, -152.94, -63.64], aliases: ['Yogyakarta', 'Daerah Istimewa Yogyakarta'] },
  { code: 'JI', name: 'Jawa Timur', region: 'jawa', surface: [73.78, 58.17, 15.56, 34.33], depth: [75.33, 58.17, 14, 34.33], depthPad: [-4.17, -15.56, -54.17, -15.56] },
  // Kalimantan
  { code: 'KB', name: 'Kalimantan Barat', region: 'kalimantan', surface: [24, 58.58, 47.78, 30], depth: [25.56, 58.58, 46.22, 30], depthPad: [-1.57, -10.22, -20.47, -10.22] },
  { code: 'KT', name: 'Kalimantan Tengah', region: 'kalimantan', surface: [30.89, 55.08, 44.67, 34.08], depth: [32.44, 55.08, 43.11, 34.08], depthPad: [-1.82, -10.77, -23.64, -10.77] },
  { code: 'KS', name: 'Kalimantan Selatan', region: 'kalimantan', surface: [42.67, 53.58, 40.89, 41.67], depth: [44.22, 53.58, 39.33, 41.67], depthPad: [-2.7, -24.56, -35.14, -24.56] },
  { code: 'KI', name: 'Kalimantan Timur', region: 'kalimantan', surface: [20.44, 48.83, 51.11, 40.58], depth: [22, 48.83, 49.56, 40.58], depthPad: [-1.56, -11.02, -20.31, -11.02] },
  { code: 'KU', name: 'Kalimantan Utara', region: 'kalimantan', surface: [10.22, 50.5, 71.56, 42.17], depth: [11.78, 50.5, 70, 42.17], depthPad: [-2.44, -15.91, -31.71, -15.91] },
  // Sulawesi
  { code: 'SA', name: 'Sulawesi Utara', region: 'sulawesi', surface: [25.56, 35.08, 66.44, 60.42], depth: [27.11, 35.08, 64.89, 60.42], depthPad: [-5.56, -25.93, -72.22, -25.93] },
  { code: 'GO', name: 'Gorontalo', region: 'sulawesi', surface: [29.33, 38.67, 66.44, 56.42], depth: [30.89, 38.67, 64.89, 56.42], depthPad: [-10.53, -23.73, -136.84, -23.73] },
  { code: 'ST', name: 'Sulawesi Tengah', region: 'sulawesi', surface: [27.56, 38.75, 46.22, 52.58], depth: [29.11, 38.75, 44.67, 52.58], depthPad: [-1.69, -13.46, -22.03, -13.46] },
  { code: 'SR', name: 'Sulawesi Barat', region: 'sulawesi', surface: [40, 46.5, 44.44, 51.17], depth: [41.56, 46.5, 42.89, 51.17], depthPad: [-2.86, -50, -37.14, -50] },
  { code: 'SN', name: 'Sulawesi Selatan', region: 'sulawesi', surface: [46, 42.58, 32.22, 52.42], depth: [47.56, 42.58, 30.67, 52.42], depthPad: [-2.04, -23.33, -26.53, -23.33] },
  { code: 'SG', name: 'Sulawesi Tenggara', region: 'sulawesi', surface: [51.11, 39.33, 32.22, 55.67], depth: [52.67, 39.33, 30.67, 55.67], depthPad: [-2.67, -23.33, -34.67, -23.33] },
  // Bali & Nusa Tenggara
  { code: 'BA', name: 'Bali', region: 'bali-nusa-tenggara', surface: [81.11, 55.42, 15.11, 42.58], depth: [82.67, 55.42, 13.56, 42.58], depthPad: [-11.76, -58.33, -152.94, -58.33] },
  { code: 'NB', name: 'Nusa Tenggara Barat', region: 'bali-nusa-tenggara', surface: [81.33, 48.08, 13.11, 45.25], depth: [82.89, 48.08, 11.56, 45.25], depthPad: [-8, -17.5, -104, -17.5] },
  { code: 'NT', name: 'Nusa Tenggara Timur', region: 'bali-nusa-tenggara', surface: [81.56, 35.33, 5.78, 51.5], depth: [83.11, 35.33, 4.22, 51.5], depthPad: [-3.51, -8.86, -45.61, -8.86] },
  // Maluku
  { code: 'MU', name: 'Maluku Utara', region: 'maluku', surface: [20.22, 27.67, 53.11, 63.08], depth: [21.78, 27.67, 51.56, 63.08], depthPad: [-1.67, -12.61, -21.67, -12.61] },
  { code: 'MA', name: 'Maluku', region: 'maluku', surface: [51.11, 14.75, 19.33, 66.58], depth: [52.67, 14.75, 17.78, 66.58], depthPad: [-1.5, -6.25, -19.55, -6.25] },
  // Papua
  { code: 'PD', name: 'Papua Barat Daya', region: 'papua', surface: [35.33, 17.42, 51.78, 74.58], depth: [36.89, 17.42, 50.22, 74.58], depthPad: [-3.45, -14.58, -44.83, -14.58] },
  { code: 'PB', name: 'Papua Barat', region: 'papua', surface: [39.33, 13.75, 40.44, 79.67], depth: [40.89, 13.75, 38.89, 79.67], depthPad: [-2.2, -17.72, -28.57, -17.72] },
  { code: 'PT', name: 'Papua Tengah', region: 'papua', surface: [50.89, 7.33, 35.11, 85], depth: [52.44, 7.33, 33.56, 85], depthPad: [-3.17, -15.22, -41.27, -15.22] },
  { code: 'PA', name: 'Papua', region: 'papua', surface: [38.89, 1.42, 42.44, 86.5], depth: [40.44, 1.42, 40.89, 86.5], depthPad: [-2.38, -9.66, -30.95, -9.66] },
  { code: 'PE', name: 'Papua Pegunungan', region: 'papua', surface: [53.11, 1.42, 34.89, 91.75], depth: [54.67, 1.42, 33.33, 91.75], depthPad: [-3.7, -17.07, -48.15, -17.07] },
  { code: 'PS', name: 'Papua Selatan', region: 'papua', surface: [61.33, 1.42, 12.89, 91.42], depth: [62.89, 1.42, 11.33, 91.42], depthPad: [-1.72, -16.28, -22.41, -16.28] },
]

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Kotak inset (persen) → koordinat piksel di bidang peta. */
export function insetToBox([t, r, b, l]: Inset, outer: Box = { x: 0, y: 0, w: MAP_W, h: MAP_H }): Box {
  return {
    x: outer.x + (outer.w * l) / 100,
    y: outer.y + (outer.h * t) / 100,
    w: (outer.w * (100 - l - r)) / 100,
    h: (outer.h * (100 - t - b)) / 100,
  }
}

export function surfaceBox(p: Province): Box {
  return insetToBox(p.surface)
}

export function depthImageBox(p: Province): Box {
  return insetToBox(p.depthPad, insetToBox(p.depth))
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/^(provinsi|prov\.)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const byName = new Map<string, Province>()
for (const p of PROVINCES) {
  for (const n of [p.name, p.code, `ID-${p.code}`, ...(p.aliases ?? [])]) byName.set(normalize(n), p)
}

/** Cocokkan nama provinsi dari konten (mis. "Jawa Barat", "DI Yogyakarta") ke data peta. */
export function findProvince(name: string | null | undefined): Province | undefined {
  if (!name) return undefined
  return byName.get(normalize(name))
}
