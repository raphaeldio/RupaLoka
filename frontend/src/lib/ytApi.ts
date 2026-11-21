/**
 * Pemuat YouTube IFrame Player API (resmi) untuk mengukur waktu tonton video materi.
 * Dimuat sekali saat video pertama diputar. Gagal/timeout → promise ditolak dan pemanggil
 * memakai mode cadangan (gagal dengan anggun).
 */

export interface YTPlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  destroy(): void
}

interface YTPlayerOptions {
  videoId: string
  host?: string
  width?: string | number
  height?: string | number
  playerVars?: Record<string, string | number>
  events?: { onReady?: () => void; onError?: () => void }
}

export interface YTNamespace {
  Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

/** Status pemutar YouTube: sedang diputar. */
export const YT_PLAYING = 1

let pending: Promise<YTNamespace> | null = null

export function loadYouTubeApi(timeoutMs = 8000): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (pending) return pending
  pending = new Promise<YTNamespace>((resolve, reject) => {
    const fail = (why: string) => {
      pending = null
      reject(new Error(why))
    }
    const timer = window.setTimeout(() => fail('timeout'), timeoutMs)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      window.clearTimeout(timer)
      if (window.YT?.Player) resolve(window.YT)
      else fail('no-player')
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => {
      window.clearTimeout(timer)
      fail('load-error')
    }
    document.head.appendChild(s)
  })
  return pending
}
