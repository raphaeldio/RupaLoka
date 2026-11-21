/**
 * Warga acak di latar agar kota terasa hidup. Hanya hiasan: digambar di belakang jalan,
 * lebih kecil, tidak bertabrakan, dan tidak memakai tanda "!" seperti NPC pemandu.
 * Posisi murni dari (jarak, waktu) dengan RNG deterministik per sel, jadi tanpa state.
 */
import { nextRandom } from './engine'

export const AMBIENT_CELL = 230
/** Lapisan latar bergerak lebih lambat dari jalan (paralaks). */
export const AMBIENT_PARALLAX = 0.6
const MARGIN = 40

export interface Walker {
  /** Indeks gambar warga (0..kinds-1). */
  kind: number
  x: number
  /** true = berjalan ke kiri (gambar dicerminkan). */
  flip: boolean
  /** Naik-turun langkah, px. */
  bob: number
}

function rolls(cell: number): number[] {
  let seed = Math.imul(cell, 0x9e3779b1) ^ 0x5bd1e995
  const out: number[] = []
  for (let i = 0; i < 5; i++) {
    const [r, s] = nextRandom(seed)
    out.push(r)
    seed = s
  }
  return out
}

/** Warga yang terlihat di jendela [0, viewW]. Sekitar separuh sel berisi satu warga. */
export function walkersAt(distance: number, elapsed: number, viewW: number, kinds: number, still: boolean): Walker[] {
  if (kinds <= 0) return []
  const d = distance * AMBIENT_PARALLAX
  const span = AMBIENT_CELL - MARGIN
  const first = Math.floor((d - MARGIN) / AMBIENT_CELL)
  const last = Math.floor((d + viewW + MARGIN) / AMBIENT_CELL)
  const out: Walker[] = []
  for (let c = first; c <= last; c++) {
    const [present, kind, offset, dir, speed] = rolls(c)
    if (present < 0.45) continue
    const left = dir < 0.5
    const walk = still ? 0 : (left ? -1 : 1) * (8 + speed * 16) * elapsed
    const pos = (((offset * span + walk) % span) + span) % span
    out.push({
      kind: Math.floor(kind * kinds) % kinds,
      x: c * AMBIENT_CELL + pos - d,
      flip: left,
      bob: still ? 0 : Math.abs(Math.sin(elapsed * 9 + c)) * 1.5,
    })
  }
  return out.filter((w) => w.x > -MARGIN && w.x < viewW + MARGIN)
}
