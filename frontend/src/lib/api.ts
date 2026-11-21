/**
 * Klien API Rupaloka. Kontrak lengkap: docs/API.md. Tipe: ./api.types.ts (dibuat otomatis).
 *
 * Basis URL kosong = asal yang sama: di Vercel `/api/*` diteruskan ke Render (vercel.json),
 * di pengembangan diteruskan ke localhost:8000 oleh proxy Vite. VITE_API_BASE hanya untuk
 * kasus khusus (mis. pratinjau yang memanggil API langsung).
 */
import type {
  ChatRequest,
  ChatResponse,
  Citation,
  CityDetail,
  CitySummary,
  LeaderboardResponse,
  ScoreSubmit,
  SourcesResponse,
} from './api.types'

export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

/** status 0 = jaringan gagal/dibatalkan (mis. Render sedang bangun). */
export class ApiError extends Error {
  readonly status: number
  readonly detail: string | null

  constructor(status: number, detail: string | null, message?: string) {
    super(message ?? `API ${status}${detail ? `: ${detail}` : ''}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, null, `API tidak dapat dihubungi: ${String(err)}`)
  }
  if (!res.ok) {
    let detail: string | null = null
    try {
      const body: unknown = await res.json()
      if (body && typeof body === 'object' && 'detail' in body) {
        const d = (body as { detail: unknown }).detail
        detail = typeof d === 'string' ? d : JSON.stringify(d)
      }
    } catch {
      // badan respons bukan JSON
    }
    throw new ApiError(res.status, detail)
  }
  return (await res.json()) as T
}

export function getCities(signal?: AbortSignal): Promise<CitySummary[]> {
  return request('/api/content/cities', { signal })
}

/** 404 bila kota tidak dikenal atau berstatus coming_soon. */
export function getCity(cityId: string, signal?: AbortSignal): Promise<CityDetail> {
  return request(`/api/content/cities/${encodeURIComponent(cityId)}`, { signal })
}

export function getSources(signal?: AbortSignal): Promise<SourcesResponse> {
  return request('/api/content/sources', { signal })
}

/** Papan peringkat akhir tur kota. 404 bila kota tidak punya papan; 503 bila penyimpanan mati. */
export function getLeaderboard(cityId: string, playerId?: string, signal?: AbortSignal): Promise<LeaderboardResponse> {
  const q = playerId ? `?player_id=${encodeURIComponent(playerId)}` : ''
  return request(`/api/leaderboard/${encodeURIComponent(cityId)}${q}`, { signal })
}

/** Kirim skor (total poin path). 422 nama/poin ditolak (pesan di `detail`), 429 terlalu sering. */
export function submitScore(cityId: string, body: ScoreSubmit, signal?: AbortSignal): Promise<LeaderboardResponse> {
  return request(`/api/leaderboard/${encodeURIComponent(cityId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

/**
 * Tanya agen. Penolakan (luar cakupan / tanpa sitasi) adalah respons 200 dengan
 * `grounded: false`, bukan galat. Galat: 400 konteks salah, 422 permintaan tidak valid,
 * 429 batas laju, 503 agen tidak tersedia. Lihat `shouldUseScript`.
 */
export function postChat(body: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  return request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

/**
 * True bila agen tidak bisa menjawab saat ini dan panel agen harus kembali ke skrip
 * (F-014): jaringan gagal, batas laju, atau LLM tidak tersedia.
 */
export function shouldUseScript(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 0 || err.status === 429 || err.status >= 500)
}

/** `src` gambar di konten relatif ke content/: assets/images/x.webp -> /api/assets/images/x.webp */
export function assetUrl(src: string): string {
  return `${API_BASE}/api/${src.replace(/^\/+/, '')}`
}

/** Isi templat skrip agen, mis. item_unlocked: "Kamu menemukan {item}! {short_explanation}". */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole)
}

export type AnswerPart = { type: 'text'; text: string } | { type: 'citation'; n: number; citation: Citation }

/**
 * Pecah jawaban agen menjadi teks dan penanda sitasi `[n]` (n mulai 1, menunjuk
 * `citations[n-1]`) agar penanda dapat ditampilkan sebagai chip yang bisa dibuka.
 */
export function splitAnswer(answer: string, citations: Citation[]): AnswerPart[] {
  const parts: AnswerPart[] = []
  let last = 0
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(match[1])
    const citation = citations[n - 1]
    if (!citation) continue
    const start = match.index ?? 0
    if (start > last) parts.push({ type: 'text', text: answer.slice(last, start) })
    parts.push({ type: 'citation', n, citation })
    last = start + match[0].length
  }
  if (last < answer.length) parts.push({ type: 'text', text: answer.slice(last) })
  return parts
}
