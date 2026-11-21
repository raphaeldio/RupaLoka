/** Sapaan saat halaman dibuka. Tanpa fakta budaya (CLAUDE.md prinsip 1). */
export const GREETING = 'Halo! Selamat datang di Rupaloka. Yuk jelajahi budaya Nusantara bersamaku!'

/** Kalimat saat maskot diklik: ajakan ramah saja, bukan fakta. */
export const CLICK_LINES = [
  'Hehe, geli! 😄',
  'Siap berpetualang hari ini?',
  'Klik "Mulai Jelajah" untuk mulai belajar!',
  'Lihat peta di bawah, pilih kotamu!',
  'Jawab kuis, kumpulkan lencana!',
  'Ada pertanyaan? Tanya aku lewat tombol chat.',
]

/** Arah pandang -1..1 dari pusat elemen ke titik kursor (murni, diuji). */
export function lookToward(cx: number, cy: number, px: number, py: number, reach = 220): { x: number; y: number } {
  const dx = px - cx
  const dy = py - cy
  const len = Math.hypot(dx, dy)
  if (len < 1) return { x: 0, y: 0 }
  const k = Math.min(1, len / reach) / len
  return { x: dx * k, y: dy * k }
}
