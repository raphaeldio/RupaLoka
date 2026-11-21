import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** UUID acak tanpa bergantung pada crypto.randomUUID (tidak ada di konteks tidak aman). */
export function newPlayerId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/**
 * Identitas pemain untuk papan peringkat: id acak + nama panggilan, disimpan di perangkat
 * (tanpa akun). `submitted[cityId]` = poin terakhir yang sudah dikirim.
 */
interface PlayerState {
  playerId: string
  nickname: string | null
  submitted: Record<string, number>
  setNickname: (name: string) => void
  markSubmitted: (cityId: string, points: number) => void
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set) => ({
      playerId: newPlayerId(),
      nickname: null,
      submitted: {},
      setNickname: (nickname) => set({ nickname }),
      markSubmitted: (cityId, points) => set((s) => ({ submitted: { ...s.submitted, [cityId]: points } })),
    }),
    { name: 'rupaloka-player', version: 1 },
  ),
)
