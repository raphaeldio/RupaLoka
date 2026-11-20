import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FlowState } from '../flow/machine'

/** Progres satu kota (SDD §6): tahap, jawaban kuis, materi dibuka, rekor. */
export interface CityProgress {
  flow: FlowState | null
  lessonsSeen: string[]
  best: number
}

const emptyProgress = (): CityProgress => ({ flow: null, lessonsSeen: [], best: 0 })

/** Progres disimpan di perangkat saja (tanpa akun, SDD §12). */
interface ProgressState {
  lastCity: string | null
  collected: Record<string, string[]> // cityId -> itemId terbuka
  cities: Record<string, CityProgress>
  collect: (cityId: string, itemId: string) => void
  saveFlow: (cityId: string, flow: FlowState) => void
  markLesson: (cityId: string, lessonId: string) => void
  recordScore: (cityId: string, score: number) => void
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
      saveFlow: (cityId, flow) =>
        set((s) => ({
          lastCity: cityId,
          cities: { ...s.cities, [cityId]: { ...(s.cities[cityId] ?? emptyProgress()), flow } },
        })),
      markLesson: (cityId, lessonId) =>
        set((s) => {
          const p = s.cities[cityId] ?? emptyProgress()
          if (p.lessonsSeen.includes(lessonId)) return s
          return { cities: { ...s.cities, [cityId]: { ...p, lessonsSeen: [...p.lessonsSeen, lessonId] } } }
        }),
      recordScore: (cityId, score) =>
        set((s) => {
          const p = s.cities[cityId] ?? emptyProgress()
          if (score <= p.best) return s
          return { cities: { ...s.cities, [cityId]: { ...p, best: score } } }
        }),
    }),
    {
      name: 'rupaloka-progress',
      version: 2,
      migrate: (old) => {
        const o = (old ?? {}) as Partial<ProgressState>
        return { lastCity: null, cities: {}, collected: o.collected ?? {} } as unknown as ProgressState
      },
    },
  ),
)
