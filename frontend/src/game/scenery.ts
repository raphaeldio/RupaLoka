/**
 * Latar kota Bandung dari aset tim (folder "ASSET GAME"): pemandangan Bandung sebagai latar
 * statis, jalan yang berulang, dan landmark paralaks (Gedung Sate, rumah adat). Landmark hanya latar: tidak
 * bertabrakan dan tidak pernah dijadikan rintangan (PRD §7).
 * Posisi murni dari jarak tempuh, jadi bisa diuji tanpa kanvas.
 */
import { GROUND_Y, WORLD_W } from './engine'
import bandungSrc from './sprites/scene/bandung-bg.webp'
import gedungSateSrc from './sprites/scene/gedung-sate.webp'
import roadSrc from './sprites/scene/road.webp'
import rumahAdatSrc from './sprites/scene/rumah-adat.webp'

/** Tepi belakang trotoar (atas gambar jalan). Kaki pelari (GROUND_Y) jatuh di aspal dekat kerb. */
export const ROAD_TOP = GROUND_Y - 20
/** Kaki warga latar: di atas trotoar. */
export const SIDEWALK_Y = ROAD_TOP + 9

export const ROAD = { src: roadSrc, aspect: 1577 / 293 }

/** Pemandangan Bandung (dengan langit), statis; bagian bawahnya tepi belakang trotoar. */
export const BACKDROP = { src: bandungSrc, aspect: 1672 / 665 }

/**
 * Kotak latar statis: menutupi seluruh lebar yang tampil dan seluruh langit di atas jalan
 * (cover), menempel ke tepi belakang trotoar, dipusatkan mendatar. Sisa atas yang terpotong
 * hanyalah langit.
 */
export function backdropRect(viewW: number): { x: number; y: number; w: number; h: number } {
  const w = Math.max(viewW, ROAD_TOP * BACKDROP.aspect)
  const h = w / BACKDROP.aspect
  return { x: (viewW - w) / 2, y: ROAD_TOP - h, w, h }
}

/** Landmark bergerak lebih lambat dari jalan (paralaks). */
export const SCENERY_PARALLAX = 0.35

export interface LandmarkDef {
  id: string
  src: string
  /** Lebar ÷ tinggi gambar. */
  aspect: number
  /** Tinggi di dunia (px). */
  h: number
  /** Jarak kosong setelah landmark ini (px lapisan). */
  gapAfter: number
}

/** gapAfter landmark terakhir harus >= START_X agar layar awal bersih (diuji). */
export const LANDMARKS: LandmarkDef[] = [
  { id: 'gedung-sate', src: gedungSateSrc, aspect: 1000 / 345, h: 92, gapAfter: 360 },
  { id: 'rumah-adat', src: rumahAdatSrc, aspect: 560 / 403, h: 88, gapAfter: 840 },
]

/** Posisi awal tiap landmark dalam satu siklus, dan panjang siklus. Landmark pertama mulai di luar
 * layar agar tulisan BANDUNG di latar terlihat utuh saat game dimulai. */
const START_X = WORLD_W + 20
const layout = (() => {
  let x = START_X
  const starts = LANDMARKS.map((d) => {
    const s = x
    x += d.h * d.aspect + d.gapAfter
    return s
  })
  return { starts, cycle: x - START_X }
})()
export const SCENERY_CYCLE = layout.cycle

export interface LandmarkView {
  def: LandmarkDef
  x: number
  w: number
}

/** Landmark yang (sebagian) tampak di layar [0, viewW) untuk jarak tempuh tertentu. */
export function landmarksAt(distance: number, viewW: number): LandmarkView[] {
  const off = distance * SCENERY_PARALLAX
  const out: LandmarkView[] = []
  const first = Math.floor((off - START_X - SCENERY_CYCLE) / SCENERY_CYCLE)
  const last = Math.ceil((off + viewW) / SCENERY_CYCLE)
  for (let k = first; k <= last; k++) {
    LANDMARKS.forEach((def, i) => {
      const w = def.h * def.aspect
      const x = k * SCENERY_CYCLE + layout.starts[i] - off
      if (x + w > 0 && x < viewW) out.push({ def, x, w })
    })
  }
  return out
}

/** Posisi x ubin jalan yang menutupi [0, viewW), mulai dari kiri layar. */
export function roadTilesAt(distance: number, tileW: number, viewW: number): number[] {
  const start = -(((distance % tileW) + tileW) % tileW)
  const xs: number[] = []
  for (let x = start; x < viewW; x += tileW) xs.push(x)
  return xs
}
