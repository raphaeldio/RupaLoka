/**
 * Kalimat pemandu galeri (maskot Saloka) dan kapan mengucapkannya. Murni dan diuji.
 *
 * Kalimat ini hanya NAVIGASI (arah, tombol, nama pameran dari konten), tidak memuat fakta
 * budaya. Fakta hanya datang dari kartu bersumber atau jawaban agen bersumber (/api/chat).
 */

export type GuideEvent =
  | { type: 'enter' }
  | { type: 'pass'; index: number; name: string; side: -1 | 1; empty: boolean }
  | { type: 'focus'; index: number; name: string }
  | { type: 'inspect'; index: number; name: string }
  | { type: 'idle'; name: string }

const sideWord = (side: -1 | 1) => (side < 0 ? 'kiri' : 'kanan')

export function guideLine(e: GuideEvent): string {
  switch (e.type) {
    case 'enter':
      return (
        'Halo, aku Saloka, pemandumu di Museum Rupaloka. Gulir, geser ke atas, atau tekan panah atas ' +
        'untuk berjalan. Klik aku atau tekan T kapan saja untuk bertanya.'
      )
    case 'pass':
      return e.empty
        ? `Pedestal di sebelah ${sideWord(e.side)}mu masih kosong. Koleksi berikutnya segera hadir.`
        : `Di sebelah ${sideWord(e.side)}mu ada ${e.name}. Tekan Enter atau klik bendanya untuk melihat ` +
            'lebih dekat, atau tekan K untuk membaca kartunya.'
    case 'focus':
      return `Ini ${e.name}. Tekan Enter atau klik bendanya sekali lagi untuk memutar dan memeriksanya. Tekan Esc untuk kembali berjalan.`
    case 'inspect':
      return `Geser ke kiri atau kanan untuk memutar ${e.name}, atau pakai panah kiri dan kanan. Tekan K untuk membaca kartunya.`
    case 'idle':
      return `Mau lanjut? Tekan panah atas untuk koleksi berikutnya, atau tekan T untuk bertanya tentang ${e.name}.`
  }
}

/** Kunci untuk mencegah kalimat yang sama diulang berturut-turut. */
const keyOf = (e: GuideEvent) => ('index' in e ? `${e.type}:${e.index}` : e.type)

export interface GuideMemory {
  lastKey: string | null
  lastAt: number
}

export const PASS_GAP_MS = 4000
export const IDLE_AFTER_MS = 25000

/**
 * Putuskan apakah pemandu bicara untuk `e` pada waktu `now` (ms).
 * - kalimat sama berturut-turut tidak diulang (kecuali pengingat idle)
 * - saat berjalan, kalimat "melewati" diberi jeda minimal PASS_GAP_MS
 * - fokus, periksa, dan masuk selalu diucapkan (tindakan pengguna)
 */
export function nextLine(mem: GuideMemory, e: GuideEvent, now: number): { say: string | null; mem: GuideMemory } {
  const key = keyOf(e)
  if (e.type !== 'idle' && key === mem.lastKey) return { say: null, mem }
  if (e.type === 'pass' && now - mem.lastAt < PASS_GAP_MS) return { say: null, mem }
  if (e.type === 'idle' && now - mem.lastAt < IDLE_AFTER_MS) return { say: null, mem }
  return { say: guideLine(e), mem: { lastKey: key, lastAt: now } }
}
