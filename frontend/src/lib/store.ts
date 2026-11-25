import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { emptyPath, type PathProgress } from './rewards'

/** Progres satu kota: path belajar + rekor game. */
export interface CityProgress extends PathProgress {
  best: number
}

const emptyCity = (): CityProgress => ({ ...emptyPath(), best: 0 })

/** Progres disimpan di perangkat saja (tanpa akun, SDD §12). */
interface ProgressState {
  lastCity: string | null
  collected: Record<string, string[]> // cityId -> itemId terbuka
  cities: Record<string, CityProgress>
  collect: (cityId: string, itemId: string) => void
  /** Titik materi selesai; jawaban benar (fakta, nilai) disimpan bila lebih baik dari sebelumnya. */
  completeNode: (cityId: string, lessonId: string, correct: number, valueCorrect?: number) => void
  /** Refleksi akhir tur dikenali → poin refleksi (sekali per soal). */
  setReflection: (cityId: string, questionId: string) => void
  finishGame: (cityId: string, score: number) => void
  resetCity: (cityId: string) => void
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      lastCity: null,
      collected: {},
      cities: {},
      collect: (cityId, itemId) =>
        set((s) => {
          const have = s.collected[cityId] ?? []
          return have.includes(itemId) ? s : { collected: { ...s.collected, [cityId]: [...have, itemId] } }
        }),
      completeNode: (cityId, lessonId, correct, valueCorrect = 0) =>
        set((s) => {
          const p = s.cities[cityId] ?? emptyCity()
          const values = p.valueCorrect ?? {}
          return {
            lastCity: cityId,
            cities: {
              ...s.cities,
              [cityId]: {
                ...p,
                completed: p.completed.includes(lessonId) ? p.completed : [...p.completed, lessonId],
                correct: { ...p.correct, [lessonId]: Math.max(correct, p.correct[lessonId] ?? 0) },
                valueCorrect: { ...values, [lessonId]: Math.max(valueCorrect, values[lessonId] ?? 0) },
              },
            },
          }
        }),
      setReflection: (cityId, questionId) =>
        set((s) => {
          const p = s.cities[cityId] ?? emptyCity()
          if (p.reflection?.[questionId]) return s
          return {
            lastCity: cityId,
            cities: { ...s.cities, [cityId]: { ...p, reflection: { ...p.reflection, [questionId]: true } } },
          }
        }),
      finishGame: (cityId, score) =>
        set((s) => {
          const p = s.cities[cityId] ?? emptyCity()
          return {
            lastCity: cityId,
            cities: { ...s.cities, [cityId]: { ...p, gameDone: true, best: Math.max(p.best, score) } },
          }
        }),
      resetCity: (cityId) =>
        set((s) => ({ cities: { ...s.cities, [cityId]: { ...emptyCity(), best: s.cities[cityId]?.best ?? 0 } } })),
    }),
    {
      name: 'rupaloka-progress',
      version: 4,
      migrate: (old, version) => {
        const o = (old ?? {}) as Partial<ProgressState>
        // v3 -> v4: valueCorrect/reflection opsional; progres lama tetap berlaku.
        if (version === 3) return o as ProgressState
        return { lastCity: null, cities: {}, collected: o.collected ?? {} } as unknown as ProgressState
      },
    },
  ),
)

const EMPTY = emptyCity()
/** Progres satu kota (objek stabil bila belum ada). */
export const useCityProgress = (cityId: string): CityProgress => useProgress((s) => s.cities[cityId] ?? EMPTY)
