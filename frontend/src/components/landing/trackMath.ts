/** Logika murni jalur titik budaya (StopsTrack): posisi pelari, patok, dan frame langkah. */
import { RUN_FRAMES } from '../../game/runnerSprite'

/** Garis mata: pelari berada di posisi bab yang sedang sejajar 55% tinggi layar. */
const EYE = 0.55

/**
 * Kemajuan 0–1 pelari di sepanjang jalur, dari posisi bagian di layar: 0 saat bagian baru
 * menyentuh garis mata, 1 saat bagian bawahnya melewatinya.
 */
export function trackProgress(top: number, height: number, viewport: number): number {
  if (height <= 0) return 0
  return Math.min(1, Math.max(0, (viewport * EYE - top) / height))
}

/** Posisi patok ke-i dari n titik (persen), tersebar rata dengan jarak tepi setengah langkah. */
export const stopAt = (i: number, n: number) => ((i + 0.5) / n) * 100

/** Frame lari dari jarak tempuh (px): kaki melangkah tiap ~10 px agar gerak terkait gulir. */
export const strideFrame = (px: number) => Math.floor(Math.abs(px) / 10) % RUN_FRAMES
