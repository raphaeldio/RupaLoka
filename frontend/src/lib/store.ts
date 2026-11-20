import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Progres disimpan di perangkat saja (tanpa akun, SDD §12). */
interface ProgressState {
  collected: Record<string, string[]> // cityId -> itemId terbuka
  collect: (cityId: string, itemId: string) => void
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      collected: {},
      collect: (cityId, itemId) =>
        set((s) => {
          const have = s.collected[cityId] ?? []
          return have.includes(itemId) ? s : { collected: { ...s.collected, [cityId]: [...have, itemId] } }
        }),
    }),
    { name: 'rupaloka-progress', version: 1 },
  ),
)
