import { useState } from 'react'
import { ApiError, submitReflection } from '../lib/api'
import type { CityDetail, ReflectionPrompt, ReflectionResult } from '../lib/api.types'
import { useCityProgress, useProgress } from '../lib/store'
import { Button, SourceChip } from './primitives'

const MAX_CHARS = 500

/**
 * Refleksi akhir tur (masukan juri, 25 Nov 2026): pertanyaan terbuka tentang nilai budaya.
 * Jawaban dicocokkan server dengan nilai yang ditulis tim budaya (kata kunci, lalu bila perlu
 * diklasifikasi AI). Umpan balik selalu dari konten. Jawaban tidak disimpan.
 */
export default function ReflectionCard({ detail, question }: { detail: CityDetail; question: ReflectionPrompt }) {
  const cityId = detail.city.id
  const done = useCityProgress(cityId).reflection?.[question.id] ?? false
  const setReflection = useProgress((s) => s.setReflection)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ReflectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gained, setGained] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = answer.trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await submitReflection({ city_id: cityId, question_id: question.id, answer: text })
      setResult(res)
      if (res.matched.length > 0 && !done) {
        setReflection(cityId, question.id)
        setGained(true)
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Terlalu sering mengirim. Tunggu sebentar, lalu coba lagi.'
          : 'Jawabanmu belum bisa diperiksa sekarang. Coba lagi nanti.',
      )
    } finally {
      setBusy(false)
    }
  }

  const id = `refleksi-${question.id}`
  return (
    <section className="border border-emas/40 bg-emas-100/60 p-4 shadow-melayang rounded-2xl" aria-labelledby={`${id}-judul`}>
      <p className="eyebrow text-amber">Refleksi</p>
      <h3 id={`${id}-judul`} className="mt-1 text-lg font-extrabold">
        {question.prompt}
      </h3>
      {done && !result && (
        <p className="mt-2 text-sm font-bold text-teal">
          Kamu sudah menjawab refleksi ini (+{detail.rewards.points_per_reflection} poin). Boleh menulis lagi untuk
          dirimu sendiri.
        </p>
      )}
      <form onSubmit={submit} className="mt-3 grid gap-2">
        <label htmlFor={id} className="text-sm text-redup">
          Tulis dengan kata-katamu sendiri. Jangan tulis data pribadi (nama lengkap, alamat, nomor telepon).
        </label>
        <textarea
          id={id}
          value={answer}
          onChange={(e) => setAnswer(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          maxLength={MAX_CHARS}
          className="w-full border border-emas/40 bg-white p-3 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-2xl"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-redup">
            {answer.length}/{MAX_CHARS}
          </span>
          <Button type="submit" disabled={busy || !answer.trim()}>
            {busy ? 'Memeriksa…' : 'Kirim jawaban'}
          </Button>
        </div>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-redup">
          {error}
        </p>
      )}
      {result && (
        <div role="status" className="mt-3 border border-emas/40 bg-white p-3 rounded-2xl">
          <p className="text-[15px] font-bold">{result.feedback}</p>
          {result.matched.length > 0 && (
            <ul className="mt-2 grid gap-2">
              {result.matched.map((v) => (
                <li key={v.id} className="rounded-xl bg-teal-50 p-2">
                  <p className="text-sm font-black text-teal-800">{v.label}</p>
                  {v.explanation && <p className="mt-1 text-sm">{v.explanation}</p>}
                  {v.chunk && (
                    <div className="mt-1">
                      <SourceChip source={detail.sources[v.chunk]} label="Sumber" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-redup">
            {result.method === 'ai' && (
              <span className="border border-emas/40 bg-pasir px-2 py-0.5 font-sans font-bold text-tinta rounded-full">Dinilai dengan bantuan AI</span>
            )}
            {gained && <span className="font-bold text-teal">+{detail.rewards.points_per_reflection} poin path!</span>}
          </p>
        </div>
      )}
    </section>
  )
}
