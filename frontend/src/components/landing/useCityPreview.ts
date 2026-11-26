import { useEffect, useState } from 'react'
import { getCity, getLeaderboard } from '../../lib/api'
import type { CityDetail, LeaderboardEntry } from '../../lib/api.types'

/** Isi kota aktif untuk pratinjau di landing; gagal → bagian tetap tampil dengan teks cadangan. */
export function useCityPreview(cityId: string | null) {
  const [detail, setDetail] = useState<CityDetail | null>(null)
  const [board, setBoard] = useState<{ title: string; entries: LeaderboardEntry[] } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!cityId) return
    const ctrl = new AbortController()
    getCity(cityId, ctrl.signal)
      .then((d) => {
        setDetail(d)
        if (!d.rewards.leaderboard?.enabled) return
        return getLeaderboard(cityId, undefined, ctrl.signal).then((b) =>
          setBoard({ title: b.champion_title, entries: b.entries.slice(0, 3) }),
        )
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setFailed(true)
      })
    return () => ctrl.abort()
  }, [cityId])

  return { detail, board, failed }
}
