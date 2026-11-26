import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isPlaceholder, type City } from '../lib/cities'
import PlaneFlight from './PlaneFlight'
import TravelConfirm from './TravelConfirm'

/** Kartu kota (F-003): nama, ringkasan, jumlah materi dan item, tombol "Mulai". */
export default function CityCard({ city, onClose }: { city: City; onClose?: () => void }) {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [flying, setFlying] = useState(false)
  const active = city.status === 'active'
  const summary = isPlaceholder(city.summary) ? null : city.summary
  const count = (n: number | null | undefined) => (typeof n === 'number' ? String(n) : '–')

  const handleDepart = () => {
    setConfirm(false)
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      navigate(`/kota/${city.id}`)
      return
    }
    setFlying(true)
  }

  return (
    <article
      key={city.id}
      aria-labelledby={`kota-${city.id}`}
      className="relative w-full rounded-3xl border border-garis bg-white/95 p-5 shadow-kartu backdrop-blur motion-safe:animate-[card-in_260ms_ease-out]"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup kartu kota"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-redup transition hover:bg-pasir hover:text-tinta"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <p className="eyebrow text-redup">
        {city.province ?? 'Provinsi belum diisi'}
      </p>
      <h2 id={`kota-${city.id}`} className="mt-1 text-2xl font-extrabold tracking-tight text-teal">
        {city.name}
      </h2>

      <p className="mt-2 min-h-10 text-sm leading-relaxed text-redup">
        {summary ?? (active ? 'Ringkasan kota sedang disiapkan tim konten.' : 'Kota ini sedang disiapkan.')}
      </p>

      {active ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-teal-50 px-3 py-2">
              <dt className="text-[11px] font-semibold text-redup">Materi budaya</dt>
              <dd className="text-lg font-black text-teal-800">{count(city.lesson_count)}</dd>
            </div>
            <div className="rounded-2xl bg-amber-50 px-3 py-2">
              <dt className="text-[11px] font-semibold text-redup">Item koleksi</dt>
              <dd className="text-lg font-extrabold text-amber">{count(city.item_count)}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal px-5 py-3 text-sm font-extrabold text-white shadow-melayang transition hover:bg-teal-600 active:scale-[0.98]"
          >
            Mulai jelajah {city.name}
            <svg viewBox="0 0 16 16" className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {confirm && (
            <TravelConfirm
              city={city}
              onYes={handleDepart}
              onNo={() => setConfirm(false)}
            />
          )}
          {flying && (
            <div className="fixed inset-0 z-[2000] overflow-hidden bg-black/25 backdrop-blur-[2px]">
              <PlaneFlight
                width={typeof window !== 'undefined' ? window.innerWidth : 800}
                height={typeof window !== 'undefined' ? window.innerHeight : 600}
                cityName={city.name}
                onDone={() => navigate(`/kota/${city.id}`)}
              />
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#eef0ea] px-3 py-1.5 text-xs font-bold text-redup">
          <span className="size-1.5 rounded-full bg-[#9aa39a]" />
          Segera hadir
        </p>
      )}
    </article>
  )
}
