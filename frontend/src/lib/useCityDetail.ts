import { useCallback, useEffect, useState } from 'react'
import { ApiError, getCity } from './api'
import type { CityDetail } from './api.types'

export type CityDetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'ready'; data: CityDetail }

type Result = Exclude<CityDetailState, { status: 'loading' }> & { key: string }

/** Cache per sesi agar berpindah titik path tidak mengunduh ulang (docs/API.md). */
const cache = new Map<string, CityDetail>()
export const clearCityCache = () => cache.clear()

/** Muat `CityDetail` sekali per kota. Galat → pesan + coba lagi. */
export function useCityDetail(cityId: string | undefined): CityDetailState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const key = `${cityId}#${attempt}`
  const cached = cityId ? cache.get(cityId) : undefined

  useEffect(() => {
    if (!cityId || cache.has(cityId)) return
    const ctrl = new AbortController()
    getCity(cityId, ctrl.signal)
      .then((data) => {
        cache.set(cityId, data)
        setResult({ key, status: 'ready', data })
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        const notFound = err instanceof ApiError && err.status === 404
        setResult({
          key,
          status: 'error',
          notFound,
          message: notFound
            ? 'Kota ini belum tersedia.'
            : 'Konten kota belum bisa dimuat. Server mungkin sedang bangun; coba lagi sebentar lagi.',
        })
      })
    return () => ctrl.abort()
  }, [cityId, key])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  if (cached) return { status: 'ready', data: cached, retry }
  // Hasil untuk kota/percobaan lama dianggap masih memuat.
  if (!result || result.key !== key) return { status: 'loading', retry }
  return { ...result, retry }
}
