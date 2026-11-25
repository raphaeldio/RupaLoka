import { motion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ApiError, getLeaderboard, submitScore } from '../lib/api'
import type { LeaderboardResponse } from '../lib/api.types'
import { usePlayer } from '../lib/player'
import { Button } from './primitives'

type Status = 'loading' | 'ready' | 'error' | 'hidden'

function Crown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#e8b64c" stroke="#a8761a" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="14.5" r="1.6" fill="#a8761a" />
    </svg>
  )
}

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422 && err.detail && !err.detail.startsWith('[')) return err.detail
    if (err.status === 429) return 'Terlalu sering mengirim skor. Coba lagi sebentar lagi.'
  }
  return 'Papan peringkat belum bisa dihubungi. Skormu tetap tersimpan di perangkat ini.'
}

/**
 * Papan peringkat akhir tur kota (skor = total poin path). Peringkat 1 bergelar
 * `champion_title` (mis. "Si Paling Bandung"). Tanpa akun: nama panggilan + id acak perangkat.
 * Gagal dengan anggun: kota tanpa papan (404) tidak menampilkan apa-apa; API mati → pesan + coba lagi.
 */
export default function Leaderboard({ cityId, points, canSubmit }: { cityId: string; points: number; canSubmit: boolean }) {
  const { playerId, nickname, setNickname, markSubmitted } = usePlayer()
  const [board, setBoard] = useState<LeaderboardResponse | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(nickname ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const inputId = useId()
  const autoSent = useRef(false)

  const send = useCallback(
    async (name: string) => {
      setSending(true)
      setFormError(null)
      try {
        const res = await submitScore(cityId, { player_id: playerId, nickname: name, points })
        setNickname(name)
        markSubmitted(cityId, points)
        setBoard(res)
        setStatus('ready')
        setEditing(false)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setStatus('hidden')
        else setFormError(errorText(err))
      } finally {
        setSending(false)
      }
    },
    [cityId, playerId, points, setNickname, markSubmitted],
  )

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setBoard(await getLeaderboard(cityId, playerId, signal))
        setStatus('ready')
        // Sudah punya nama dan skor baru lebih tinggi dari yang terakhir dikirim: kirim otomatis sekali.
        const { nickname: name, submitted: sent } = usePlayer.getState()
        if (canSubmit && name && !autoSent.current && (sent[cityId] ?? -1) < points) {
          autoSent.current = true
          await send(name)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setStatus(err instanceof ApiError && err.status === 404 ? 'hidden' : 'error')
      }
    },
    [cityId, playerId, canSubmit, points, send],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    // setState di `load` hanya terjadi setelah `await` (respons jaringan), bukan sinkron.
    // eslint-disable-next-line react/set-state-in-effect
    void load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  if (status === 'hidden') return null

  const title = board?.champion_title ?? 'Juara'
  const you = board?.you ?? null
  const showForm = canSubmit && (editing || !nickname)

  return (
    <section className="rounded-3xl border border-garis bg-white p-5 shadow-kartu" aria-labelledby="judul-peringkat">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="judul-peringkat" className="font-extrabold">
            Papan peringkat
          </h3>
          <p className="text-xs text-redup">
            Total poin path tertinggi. Peringkat 1 bergelar <strong className="text-amber">{title}</strong>.
          </p>
        </div>
        <Crown className="size-9 shrink-0" />
      </div>

      {you && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className={`mt-3 rounded-2xl p-3 text-sm font-bold ${you.rank === 1 ? 'bg-emas-100 text-amber' : 'bg-teal-50 text-teal'}`}
        >
          {you.rank === 1 ? `Selamat, kamu ${title}!` : `Kamu peringkat ${you.rank} dengan ${you.points} poin.`}
        </motion.p>
      )}

      {showForm && (
        <form
          className="mt-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send(draft)
          }}
        >
          <label htmlFor={inputId} className="text-sm font-bold">
            Nama panggilan untuk papan peringkat
          </label>
          <p className="text-xs text-redup">Jangan pakai nama lengkap atau data pribadi. 3-20 huruf/angka.</p>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={20}
              minLength={3}
              required
              autoComplete="off"
              placeholder="mis. Pejuang Angklung"
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? `${inputId}-err` : undefined}
              className="min-w-0 flex-1 rounded-2xl border border-garis bg-kertas px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
            <Button type="submit" disabled={sending || draft.trim().length < 3}>
              {sending ? 'Mengirim…' : `Kirim ${points} poin`}
            </Button>
          </div>
          {formError && (
            <p id={`${inputId}-err`} role="alert" className="text-xs font-bold text-red-700">
              {formError}
            </p>
          )}
        </form>
      )}
      {!showForm && formError && (
        <p role="alert" className="mt-3 text-xs font-bold text-red-700">
          {formError}
        </p>
      )}

      {status === 'loading' && !board && <p className="mt-4 text-sm text-redup motion-safe:animate-pulse">Memuat papan peringkat…</p>}
      {status === 'error' && (
        <div className="mt-4 text-sm text-redup">
          <p>Papan peringkat belum bisa dimuat.</p>
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              void load()
            }}
            className="mt-1 font-extrabold text-teal hover:underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {board && (
        <ol className="mt-4 grid gap-1.5" aria-label={`Peringkat ${board.city_id}`}>
          {board.entries.length === 0 && <li className="text-sm text-redup">Belum ada skor. Jadilah yang pertama!</li>}
          {board.entries.map((e) => {
            const mine = you?.rank === e.rank
            return (
              <motion.li
                key={`${e.rank}-${e.nickname}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(e.rank, 10) * 0.04 }}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
                  e.rank === 1 ? 'bg-emas-100' : mine ? 'bg-teal-50 ring-2 ring-teal/40' : 'bg-kertas'
                }`}
              >
                <span className="w-6 text-center text-sm font-extrabold tabular-nums text-redup">
                  {e.rank === 1 ? <Crown className="mx-auto size-5" /> : e.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">
                    {e.nickname}
                    {mine && <span className="ml-1 text-xs font-bold text-teal">(kamu)</span>}
                  </span>
                  {e.title && <span className="block eyebrow text-amber">{e.title}</span>}
                </span>
                <span className="text-sm font-extrabold tabular-nums text-teal">{e.points}</span>
              </motion.li>
            )
          })}
        </ol>
      )}

      {canSubmit && nickname && !editing && (
        <button
          type="button"
          onClick={() => {
            setDraft(nickname)
            setEditing(true)
          }}
          className="mt-3 text-xs font-bold text-redup hover:text-teal hover:underline"
        >
          Ganti nama panggilan ({nickname})
        </button>
      )}
    </section>
  )
}
