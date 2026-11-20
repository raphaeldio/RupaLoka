import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import kursorUrl from '../assets/figma-map/kursor.svg'
import CityCard from '../components/CityCard'
// Peta (Leaflet ±150 kB) dimuat terpisah; ada di bawah lipatan layar.
const LeafletMap = lazy(() => import('../components/LeafletMap'))
import BlurText from '../components/reactbits/BlurText'
import ClickSpark from '../components/reactbits/ClickSpark'
import Magnet from '../components/reactbits/Magnet'
import ShinyText from '../components/reactbits/ShinyText'
import FeatureCards from '../components/landing/FeatureCards'
import HeroIllustration from '../components/landing/HeroIllustration'
import JourneySteps from '../components/landing/JourneySteps'
import SwirlCloud from '../components/landing/SwirlCloud'
import { bundledCities, loadCities, placeCity, type City, type CitySource } from '../lib/cities'
import { PROVINCES, REGIONS } from '../lib/provinces'
import { useReveal } from '../lib/useReveal'

const legendUrls = import.meta.glob<string>('../assets/figma-map/legend-*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
})

/** Pengantar beranda (F-004): ≤60 kata, tiga langkah. */
const STEPS = ['Pilih kota', 'Belajar bersama pemandu AI', 'Main game, kumpulkan item']

const Arrow = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
    <path
      d="M3 8h10M9 4l4 4-4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

function SectionTitle({ id, eyebrow, children }: { id: string; eyebrow: string; children: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-[11px] font-extrabold uppercase tracking-[2.3px] text-amber">{eyebrow}</p>
      <div className="mt-2 flex w-full items-center justify-center gap-4">
        <span aria-hidden="true" className="h-px max-w-40 flex-1 bg-gradient-to-r from-transparent to-emas" />
        <h2 id={id} className="text-balance text-2xl font-extrabold tracking-tight text-teal sm:text-[32px]">
          {children}
        </h2>
        <span aria-hidden="true" className="h-px max-w-40 flex-1 bg-gradient-to-l from-transparent to-emas" />
      </div>
    </div>
  )
}

function useCountUp(target: number, run: boolean, ms = 900) {
  const [n, setN] = useState(0)
  const instant =
    typeof requestAnimationFrame === 'undefined' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    if (!run || instant) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setN(Math.round(target * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, ms, instant])
  return instant ? target : n
}

export default function HomePage() {
  const location = useLocation()
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

  // Tautan "/#peta" dari header: gulir ke bagian peta.
  useEffect(() => {
    if (!location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  const placed = useMemo(() => cities.flatMap((c) => placeCity(c) ?? []), [cities])
  const selected = cities.find((c) => c.id === selectedId) ?? null
  const unplaced = cities.filter((c) => !placed.some((p) => p.city.id === c.id))
  const firstActive = cities.find((c) => c.status === 'active') ?? null
  const activeCount = cities.filter((c) => c.status === 'active').length

  const [statsRef, statsShown] = useReveal<HTMLDListElement>()
  const provinsi = useCountUp(PROVINCES.length, statsShown)
  const kota = useCountUp(cities.length, statsShown)
  const siap = useCountUp(activeCount, statsShown)

  return (
    <main id="konten" className="relative overflow-x-clip">
      {/* ---------------- Hero ---------------- */}
      <section className="relative -mt-[76px] overflow-hidden bg-gradient-to-b from-[#e6f1ec] via-kertas to-kertas pt-[76px]">
        <SwirlCloud className="pointer-events-none absolute -left-14 bottom-16 w-40 text-emas/40 sm:w-52" />
        <SwirlCloud className="pointer-events-none absolute -right-10 top-24 hidden w-48 -scale-x-100 text-emas/35 xl:block" />

        <div className="relative mx-auto grid max-w-[1360px] items-center gap-6 px-4 pb-10 pt-8 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-2 lg:px-12 lg:pb-16 lg:pt-12">
          <div className="relative z-10 motion-safe:animate-[card-in_600ms_ease-out]">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-teal shadow-kartu">
              <span className="size-2 rounded-full bg-emas motion-safe:animate-pulse" />
              <ShinyText text="Budaya Nusantara, cara seru" color="#146b68" shineColor="#e8b64c" speed={3} />
            </p>
            <h1
              aria-label={`Jelajahi Budaya, Mulai dari ${firstActive?.name ?? 'Bandung'}`}
              className="mt-4 text-balance text-[40px] font-black leading-[1.05] tracking-[-1.2px] text-teal sm:text-[56px] lg:text-[64px]"
            >
              <BlurText text="Jelajahi Budaya, Mulai dari" animateBy="words" delay={110} className="inline" />{' '}
              <span className="relative inline-block text-emas">
                {firstActive?.name ?? 'Bandung'}
                <svg
                  viewBox="0 0 200 16"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-3 w-full text-emas/60"
                  aria-hidden="true"
                >
                  <path
                    d="M2 12C50 2 150 2 198 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-tinta/80">
              Kenali kekayaan budaya Indonesia melalui kuis interaktif, materi bersumber, dan permainan seru.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ClickSpark sparkColor={['#e8b64c', '#146b68']} sparkCount={12} sparkRadius={34} className="!h-auto !w-auto rounded-full">
              <Magnet padding={40} magnetStrength={6}>
              <Link
                to={firstActive ? `/kota/${firstActive.id}` : '/#peta'}
                className="group inline-flex items-center gap-2.5 rounded-full bg-emas px-6 py-3.5 text-[15px] font-extrabold text-teal-800 shadow-[0_10px_24px_-10px_rgb(232_182_76/0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_rgb(232_182_76/1)] active:translate-y-0"
              >
                Mulai Jelajah Sekarang
                <Arrow className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              </Magnet>
              </ClickSpark>
              <a
                href="#peta"
                className="inline-flex items-center gap-2 rounded-full border-2 border-teal/15 bg-white/70 px-5 py-3 text-[15px] font-bold text-teal transition hover:border-teal/40 hover:bg-white"
              >
                Lihat peta
              </a>
            </div>

            <ol className="mt-8 flex flex-wrap gap-2" aria-label="Cara belajar">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className="flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3 text-[13px] font-semibold text-tinta/80"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-teal text-[11px] font-extrabold text-white">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="relative -mx-4 sm:mx-0">
            <HeroIllustration />
          </div>
        </div>

        <svg
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-10 w-full text-kertas"
          aria-hidden="true"
        >
          <path d="M0 60V30c240-30 480-30 720 0s480 30 720 0v30z" fill="currentColor" />
        </svg>
      </section>

      {/* ---------------- Peta ---------------- */}
      <section
        id="peta"
        aria-labelledby="judul-peta"
        className="relative scroll-mt-24 px-4 pb-10 pt-6 sm:px-8 lg:px-12"
      >
        <SwirlCloud className="pointer-events-none absolute -right-6 top-10 hidden w-44 -scale-x-100 text-daun/40 md:block" />
        <SwirlCloud className="pointer-events-none absolute -left-8 bottom-24 hidden w-44 text-daun/40 md:block" />
        <div className="mx-auto max-w-[1360px]">
          <SectionTitle id="judul-peta" eyebrow="Dari Sabang sampai Merauke">
            Pilih Kota untuk Dijelajahi
          </SectionTitle>

          <div className="relative mt-6">
            <Suspense
              fallback={
                <div className="grid h-[240px] place-items-center rounded-[28px] border border-garis bg-laut text-sm font-bold text-redup sm:h-[420px] lg:h-[540px]">
                  Memuat peta…
                </div>
              }
            >
              <LeafletMap cities={placed} selectedId={selectedId} onSelect={setSelectedId} />
            </Suspense>

            <div className="mt-4 lg:absolute lg:bottom-8 lg:left-0 lg:mt-0 lg:w-80">
              {selected ? (
                <CityCard city={selected} onClose={() => setSelectedId(null)} />
              ) : (
                <p className="rounded-3xl border border-dashed border-daun bg-white/70 p-5 text-sm text-redup">
                  Pilih titik kota di peta untuk melihat kartunya.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-5">
            <p className="flex items-center gap-3 text-[15px] font-bold text-teal">
              <img src={kursorUrl} alt="" width={19} height={24} />
              Arahkan kursor atau ketuk provinsi untuk melihat kotanya.
            </p>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Warna kepulauan">
              {REGIONS.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-[11px] font-semibold text-[#6f7b72]">
                  <img src={legendUrls[`../assets/figma-map/legend-${r.id}.svg`]} alt="" width={8} height={8} />
                  {r.name}
                </li>
              ))}
            </ul>

            {/* Alternatif teks untuk pembaca layar dan kota yang provinsinya belum cocok dengan peta */}
            <div className="w-full max-w-xl">
              <h3 className="sr-only">Daftar kota</h3>
              <ul className="flex flex-wrap justify-center gap-2">
                {cities.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      aria-pressed={c.id === selectedId}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                        c.id === selectedId
                          ? 'border-teal bg-teal text-white shadow-melayang'
                          : 'border-garis bg-white text-tinta hover:-translate-y-0.5 hover:border-teal'
                      }`}
                    >
                      {c.status === 'coming_soon' && (
                        <svg viewBox="0 0 12 12" className="mr-1 inline size-3 -translate-y-px" aria-hidden="true">
                          <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill="currentColor" opacity=".55" />
                          <path
                            d="M4 5.5V4a2 2 0 0 1 4 0v1.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            opacity=".55"
                          />
                        </svg>
                      )}
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
                <p className="mt-2 text-center text-xs text-redup">
                  Dev: API tidak terhubung, memakai content/cities.yaml.
                </p>
              )}
            </div>

            <dl ref={statsRef} className="mt-2 grid w-full max-w-2xl grid-cols-3 gap-3">
              {[
                { label: 'provinsi di peta', value: provinsi },
                { label: 'kota terdaftar', value: kota },
                { label: 'kota siap dijelajahi', value: siap },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col-reverse rounded-2xl bg-white/80 px-3 py-3 text-center shadow-kartu"
                >
                  <dt className="text-[11px] font-semibold text-redup sm:text-xs">{s.label}</dt>
                  <dd className="text-2xl font-black tabular-nums text-teal sm:text-3xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------- Fitur ---------------- */}
      <section aria-labelledby="judul-fitur" className="px-4 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1360px]">
          <h2 id="judul-fitur" className="sr-only">
            Fitur Rupaloka
          </h2>
          <FeatureCards />
        </div>
      </section>

      {/* ---------------- Alur ---------------- */}
      <section aria-labelledby="judul-alur" className="relative px-4 pb-20 pt-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle id="judul-alur" eyebrow="Cara bermain">
            Perjalanan Belajarmu
          </SectionTitle>
          <div className="mt-8">
            <JourneySteps />
          </div>
        </div>
      </section>
    </main>
  )
}
