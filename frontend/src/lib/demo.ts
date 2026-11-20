/**
 * Mode uji kuis (khusus pengembangan): `?demo=1` mengganti kuis kota dengan SOAL UJI netral
 * (hitungan/logika sederhana, BUKAN materi budaya) agar mekanik kuis, poin, dan lencana
 * dapat dicoba sebelum soal asli dari tim konten (T-033, T-058) tersedia.
 * `?demo=0` mematikannya. Tidak aktif di build produksi kecuali VITE_ALLOW_DEBUG=true.
 */
import type { CityDetail, QuizQuestion } from './api.types'

const KEY = 'rupaloka-demo'

export const demoAllowed = (): boolean => import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEBUG === 'true'

/** Baca/simpan flag dari URL (bertahan selama tab terbuka). */
export function demoEnabled(search: string): boolean {
  if (!demoAllowed()) return false
  const v = new URLSearchParams(search).get('demo')
  try {
    if (v === '1') sessionStorage.setItem(KEY, '1')
    if (v === '0') sessionStorage.removeItem(KEY)
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return v === '1'
  }
}

const NOTE = 'Ini soal uji untuk mencoba mekanik kuis, bukan materi budaya.'

/** Bank soal uji: sengaja bukan fakta budaya (CLAUDE.md prinsip 1–2). */
const BANK: Omit<QuizQuestion, 'id' | 'chunk'>[] = [
  { question: '[Soal uji] 3 + 4 = ?', options: ['6', '7', '8', '9'], correct: 1, explanation: `${NOTE} 3 + 4 = 7.` },
  { question: '[Soal uji] Huruf apa yang muncul setelah C?', options: ['B', 'D', 'E', 'F'], correct: 1, explanation: `${NOTE} Urutannya A, B, C, D.` },
  { question: '[Soal uji] 10 − 6 = ?', options: ['3', '4', '5', '6'], correct: 1, explanation: `${NOTE} 10 − 6 = 4.` },
  { question: '[Soal uji] Mana bilangan genap?', options: ['3', '7', '8', '11'], correct: 2, explanation: `${NOTE} 8 habis dibagi 2.` },
  { question: '[Soal uji] 2 × 5 = ?', options: ['7', '10', '12', '25'], correct: 1, explanation: `${NOTE} 2 × 5 = 10.` },
  { question: '[Soal uji] Hari setelah Senin adalah …', options: ['Minggu', 'Selasa', 'Rabu', 'Kamis'], correct: 1, explanation: `${NOTE} Senin lalu Selasa.` },
  { question: '[Soal uji] Bangun datar dengan tiga sisi adalah …', options: ['Persegi', 'Lingkaran', 'Segitiga', 'Segi lima'], correct: 2, explanation: `${NOTE} Segitiga punya tiga sisi.` },
  { question: '[Soal uji] 9 − 3 = ?', options: ['5', '6', '7', '8'], correct: 1, explanation: `${NOTE} 9 − 3 = 6.` },
]

/**
 * Ganti kuis dengan 2 soal uji per titik materi. Tiap soal memakai chunk yang memang
 * milik materi itu (dari `sources`) agar pembagian soal per titik tetap berjalan.
 */
export function withDemoQuiz(detail: CityDetail): CityDetail {
  const intro: QuizQuestion[] = []
  let n = 0
  for (const lesson of detail.lessons) {
    const chunk = Object.values(detail.sources).find((s) => s.lesson_id === lesson.id)?.chunk_id
    if (!chunk) continue
    for (let k = 0; k < 2; k++) {
      intro.push({ ...BANK[n % BANK.length], id: `uji-${lesson.id}-${k + 1}`, chunk })
      n += 1
    }
  }
  return { ...detail, quiz: { ...detail.quiz, intro } }
}
