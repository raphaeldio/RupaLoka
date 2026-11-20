import { useEffect, useMemo, useState } from 'react'
import kursorUrl from '../assets/figma-map/kursor.svg'
import CityCard from '../components/CityCard'
import IndonesiaMap from '../components/IndonesiaMap'
import { bundledCities, loadCities, placeCity, type City, type CitySource } from '../lib/cities'
import { PROVINCES, REGIONS } from '../lib/provinces'

const legendUrls = import.meta.glob<string>('../assets/figma-map/legend-*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
})

/** Pengantar beranda (F-004): ≤60 kata, tiga langkah. */
const STEPS = [
  { n: '1', title: 'Pilih kota', text: 'di peta Nusantara.' },
  { n: '2', title: 'Belajar bersama pemandu AI', text: 'lewat kuis dan kartu materi budaya.' },
  { n: '3', title: 'Main game keliling kota', text: 'dan kumpulkan item budaya.' },
]

export default function HomePage() {
  const [cities, setCities] = useState<City[]>(bundledCities)
  const [source, setSource] = useState<CitySource>('bundled')
  const [selectedId, setSelectedId] = useState<string | null>(
    () => bundledCities.find((c) => c.status === 'active')?.id ?? null,
  )

  useEffect(() => {
    const ctrl = new AbortController()
    loadCities(ctrl.signal)
      .then((r) => {
        setCities(r.cities)
        setSource(r.source)
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  const placed = useMemo(() => cities.flatMap((c) => placeCity(c) ?? []), [cities])
  const selected = cities.find((c) => c.id === selectedId) ?? null
  const unplaced = cities.filter((c) => !placed.some((p) => p.city.id === c.id))

  return (
    <main id="konten" className="mx-auto w-full max-w-[1440px] px-4 pb-16 sm:px-8 lg:px-16">
      <section className="flex flex-col items-center pt-6 text-center sm:pt-10">
        <p className="text-[11px] font-extrabold uppercase tracking-[2.3px] text-[#587260]">
          Dari Sabang sampai Merauke
        </p>
        <h1 className="mt-3 max-w-3xl text-balance text-[32px] font-extrabold leading-[1.1] tracking-[-1px] text-teal sm:text-[44px] sm:tracking-[-1.3px]">
          Jelajahi budaya Nusantara, mulai dari peta.
        </h1>
        <ol className="mt-5 flex flex-col gap-2 text-left text-[15px] text-redup sm:flex-row sm:gap-6 sm:text-center">
          {STEPS.map((s) => (
            <li key={s.n} className="flex items-baseline gap-2 sm:items-center">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-extrabold text-teal">
                {s.n}
              </span>
              <span>
                <strong className="font-bold text-tinta">{s.title}</strong> {s.text}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="judul-peta" className="relative mt-6 sm:mt-4">
        <h2 id="judul-peta" className="sr-only">
          Peta Indonesia
        </h2>
        <IndonesiaMap cities={placed} selectedId={selectedId} onSelect={setSelectedId} />

        <div className="mt-4 lg:absolute lg:bottom-10 lg:left-0 lg:mt-0 lg:w-80">
          {selected ? (
            <CityCard city={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <p className="rounded-3xl border border-dashed border-garis bg-white/60 p-5 text-sm text-redup">
              Pilih titik kota di peta untuk melihat kartunya.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8 flex flex-col items-center gap-5" aria-label="Panduan peta">
        <p className="flex items-center gap-3 text-[15px] font-bold text-teal">
          <img src={kursorUrl} alt="" width={19} height={24} />
          Arahkan kursor atau ketuk provinsi untuk melihat kotanya.
        </p>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Warna kepulauan">
          {REGIONS.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-[11px] font-semibold text-[#778174]">
              <img src={legendUrls[`../assets/figma-map/legend-${r.id}.svg`]} alt="" width={8} height={8} />
              {r.name}
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-4 text-[10px] text-[#8b9285]">
          <span className="font-extrabold">{PROVINCES.length} PROVINSI</span>
          <span aria-hidden="true" className="text-[#a7aa9c]">
            •
          </span>
          <span className="text-[11px] font-semibold">
            {cities.filter((c) => c.status === 'active').length} kota siap dijelajahi
          </span>
        </p>

        {/* Alternatif teks untuk pembaca layar dan kota yang provinsinya belum cocok dengan peta */}
        <div className="w-full max-w-xl">
          <h2 className="sr-only">Daftar kota</h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {cities.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-pressed={c.id === selectedId}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    c.id === selectedId
                      ? 'border-teal bg-teal text-white'
                      : 'border-garis bg-white text-tinta hover:border-teal'
                  }`}
                >
                  {c.name}
                  <span className={`ml-1.5 font-semibold ${c.id === selectedId ? 'text-white/80' : 'text-redup'}`}>
                    {c.status === 'active' ? '· tersedia' : '· segera hadir'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {unplaced.length > 0 && import.meta.env.DEV && (
            <p className="mt-2 text-center text-xs text-amber">
              Dev: provinsi tidak cocok dengan peta untuk {unplaced.map((c) => c.id).join(', ')}
            </p>
          )}
          {source === 'bundled' && import.meta.env.DEV && (
            <p className="mt-2 text-center text-xs text-redup">Dev: API tidak terhubung, memakai content/cities.yaml.</p>
          )}
        </div>
      </section>
    </main>
  )
}
