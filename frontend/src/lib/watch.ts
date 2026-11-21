/**
 * Syarat menonton video materi (21 Nov 2026): poin titik hanya didapat bila
 * MIN_WATCH_SECONDS pertama video benar-benar ditonton (bukan dilompati).
 * Video lebih pendek dari itu harus ditonton sampai (hampir) habis. Fungsi murni.
 */

export const MIN_WATCH_SECONDS = 180

/** Toleransi detik yang terlewat karena jeda pengambilan sampel/buffer. */
export const WATCH_TOLERANCE = 5

/** Detik wajib tonton untuk video berdurasi `duration` (0/tak diketahui → batas penuh). */
export function requiredSeconds(duration: number, min = MIN_WATCH_SECONDS): number {
  if (!Number.isFinite(duration) || duration <= 0) return min
  return Math.max(1, Math.min(min, Math.floor(duration) - 1))
}

/**
 * Catat posisi putar saat video sedang diputar. Hanya detik di dalam jendela wajib yang dicatat,
 * sehingga melompat ke depan tidak menghitung detik yang dilewati. Mengembalikan set baru bila berubah.
 */
export function recordWatch(seen: ReadonlySet<number>, currentTime: number, required: number): ReadonlySet<number> {
  const sec = Math.floor(currentTime)
  if (!Number.isFinite(sec) || sec < 0 || sec >= required || seen.has(sec)) return seen
  const next = new Set(seen)
  next.add(sec)
  return next
}

/** Sudah cukup ditonton? */
export const isWatched = (seen: ReadonlySet<number>, required: number): boolean =>
  seen.size >= Math.max(1, required - WATCH_TOLERANCE)

/** "m:ss" untuk teks kemajuan. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
