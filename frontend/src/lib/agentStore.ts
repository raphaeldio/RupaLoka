import { create } from 'zustand'
import type { ChatContext } from './api.types'

export type MascotMood = 'idle' | 'thinking' | 'talking'

/** Permintaan tanya dari luar panel (kartu materi, item). `id` unik per permintaan. */
export interface AgentRequest {
  id: number
  text: string
  lessonId?: string | null
}

/**
 * Status chatbot pemandu (tidak disimpan). Halaman memanggil `say` untuk skrip per fase
 * dan `ask` untuk pertanyaan dari tombol; panel chat yang mengirim ke API.
 */
interface AgentState {
  open: boolean
  unread: number
  mood: MascotMood
  context: ChatContext
  /** Skrip yang sudah diucapkan, berurutan; panel menampilkan yang belum tampil. */
  scripts: { id: number; text: string }[]
  request: AgentRequest | null
  setOpen: (open: boolean) => void
  setMood: (mood: MascotMood) => void
  setContext: (context: ChatContext) => void
  say: (text: string | null | undefined) => void
  ask: (text: string, lessonId?: string | null) => void
  reset: () => void
}

let seq = 0

export const useAgent = create<AgentState>()((set) => ({
  open: false,
  unread: 0,
  mood: 'idle',
  context: {},
  scripts: [],
  request: null,
  setOpen: (open) => set(open ? { open, unread: 0 } : { open }),
  setMood: (mood) => set({ mood }),
  setContext: (context) => set({ context }),
  say: (text) =>
    set((s) => {
      if (!text || s.scripts.at(-1)?.text === text) return s
      return { scripts: [...s.scripts, { id: ++seq, text }], unread: s.open ? 0 : s.unread + 1 }
    }),
  ask: (text, lessonId) => set({ request: { id: ++seq, text, lessonId }, open: true, unread: 0 }),
  reset: () => set({ open: false, unread: 0, mood: 'idle', context: {}, scripts: [], request: null }),
}))
