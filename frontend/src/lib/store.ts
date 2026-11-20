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
  /** Titik materi selesai; jawaban benar disimpan bila lebih baik dari sebelumnya. */
  completeNode: (cityId: string, lessonId: string, correct: number) => void
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
      completeNode: (cityId, lessonId, correct) =>
        set((s) => {
          const p = s.cities[cityId] ?? emptyCity()
          return {
            lastCity: cityId,
            cities: {
              ...s.cities,
              [cityId]: {
                ...p,
                completed: p.completed.includes(lessonId) ? p.completed : [...p.completed, lessonId],
                correct: { ...p.correct, [lessonId]: Math.max(correct, p.correct[lessonId] ?? 0) },
              },
            },
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
      version: 3,
      migrate: (old) => {
        const o = (old ?? {}) as Partial<ProgressState>
        return { lastCity: null, cities: {}, collected: o.collected ?? {} } as unknown as ProgressState
      },
    },
  ),
)

const EMPTY = emptyCity()
/** Progres satu kota (objek stabil bila belum ada). */
export const useCityProgress = (cityId: string): CityProgress => useProgress((s) => s.cities[cityId] ?? EMPTY)
