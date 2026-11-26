/**
 * Suara maskot Saloka (SDD ADR 42).
 *
 * Utama: suara ElevenLabs lewat `POST /api/tts` (kunci hanya di server). Cadangan: Web Speech
 * peramban (id-ID) bila server menjawab 503 (belum dikonfigurasi/kuota habis) atau gagal.
 * Pengguna pembaca layar cukup memakai wilayah aria-live; suara ini opsional (tombol
 * "Suara pemandu") agar tidak bertabrakan dengan pembaca layar.
 */
import { API_BASE } from '../lib/api'

type Remote = 'unknown' | 'on' | 'off'
let remote: Remote = 'unknown'
let token = 0
let ctrl: AbortController | null = null
let audio: HTMLAudioElement | null = null

/** Cache audio per kalimat (URL objek), dibatasi agar memori tidak membengkak. */
const CACHE_MAX = 40
const cache = new Map<string, string>()

const webSpeechAvailable = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

export const speechAvailable = (): boolean =>
  webSpeechAvailable() || (typeof Audio !== 'undefined' && typeof fetch !== 'undefined')

/** Sumber suara yang sedang dipakai, untuk label UI dan uji. */
export const voiceSource = (): 'saloka' | 'peramban' | 'belum-diketahui' =>
  remote === 'on' ? 'saloka' : remote === 'off' ? 'peramban' : 'belum-diketahui'

function browserSpeak(text: string): void {
  if (!webSpeechAvailable()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'id-ID'
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('id'))
  if (voice) u.voice = voice
  synth.speak(u)
}

function remember(text: string, url: string): void {
  cache.set(text, url)
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value as string
    URL.revokeObjectURL(cache.get(oldest)!)
    cache.delete(oldest)
  }
}

async function salokaUrl(text: string, signal: AbortSignal): Promise<string | null> {
  const hit = cache.get(text)
  if (hit) return hit
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  })
  if (res.status === 503) {
    remote = 'off' // belum dikonfigurasi/kuota habis: pakai suara peramban sampai muat ulang
    return null
  }
  if (!res.ok) return null // mis. 429: kalimat ini lewat suara peramban, berikutnya dicoba lagi
  remote = 'on'
  const url = URL.createObjectURL(await res.blob())
  remember(text, url)
  return url
}

export function speak(text: string): void {
  const t = text.trim()
  if (!t) return
  stopSpeaking()
  const my = ++token
  if (remote === 'off') {
    browserSpeak(t)
    return
  }
  ctrl = new AbortController()
  salokaUrl(t, ctrl.signal)
    .then((url) => {
      if (my !== token) return // sudah digantikan kalimat lain
      if (!url) {
        browserSpeak(t)
        return
      }
      audio = new Audio(url)
      audio.play().catch(() => {
        if (my === token) browserSpeak(t) // mis. diblokir kebijakan autoplay
      })
    })
    .catch((err: unknown) => {
      if (my === token && !(err instanceof DOMException && err.name === 'AbortError')) browserSpeak(t)
    })
}

export function stopSpeaking(): void {
  token++
  ctrl?.abort()
  ctrl = null
  if (audio) {
    audio.pause()
    audio = null
  }
  if (webSpeechAvailable()) window.speechSynthesis.cancel()
}

/** Hanya untuk uji: kembalikan ke keadaan awal. */
export function __resetSpeechForTest(): void {
  stopSpeaking()
  remote = 'unknown'
  cache.clear()
}
