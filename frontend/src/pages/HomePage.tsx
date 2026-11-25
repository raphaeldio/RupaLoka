import { lazy, Suspense, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import kursorUrl from '../assets/figma-map/kursor.svg'
import CityCard from '../components/CityCard'
// Peta (Leaflet ±150 kB) dimuat terpisah; ada di bawah lipatan layar.
const LeafletMap = lazy(() => import('../components/LeafletMap'))
import CityRotator from '../components/landing/CityRotator'
import { CityStops, CollectionPreview } from '../components/landing/CityPreview'
import { useCityPreview } from '../components/landing/useCityPreview'
import { Chapter, CtaLink, LevelCards, Marquee, PixelIcon, type Level } from '../components/landing/pixel'
import { ICON_BUKU, ICON_KUIS, ICON_LARI, ICON_PETA, ICON_PIALA } from '../components/landing/pixelIcons'
import HeroMascot from '../components/mascot/HeroMascot'
import { bundledCities, loadCities, placeCity, type City, type CitySource } from '../lib/cities'
import { PROVINCES, REGIONS } from '../lib/provinces'
import { useReveal } from '../lib/useReveal'

const legendUrls = import.meta.glob<string>('../assets/figma-map/legend-*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
})

/** Nama kota tambahan untuk rotator judul hero. */
const EXTRA_CITIES = ['Jakarta', 'Yogyakarta', 'Surabaya', 'Medan', 'Makassar', 'Denpasar']

/** Pengantar beranda (F-004): ≤60 kata, tiga langkah. */
const STEPS = ['Pilih kota', 'Belajar bersama Saloka', 'Main game, kumpulkan item']

/** Janji produk (bukan fakta budaya). */
const PROMISES = [
  { title: 'Bersumber', text: 'Setiap fakta, kuis, dan item punya rujukan yang bisa kamu buka.', icon: ICON_BUKU },
  { title: 'Seru dimainkan', text: 'Path belajar bertitik, game lari keliling kota, lencana, dan koleksi.', icon: ICON_LARI },
  {
    title: 'Terhubung ke tempat asli',
    text: 'Tombol Kunjungi membawamu ke lokasi, sanggar, dan komunitas budayanya.',
    icon: ICON_PETA,
  },
]

const Arrow = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
  </svg>
)

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

const btn = 'tekan inline-flex items-center gap-2 border-2 border-tinta px-5 py-3 text-[15px] font-extrabold shadow-melayang'

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

  const scrollToMap = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('peta')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.pushState(null, '', '#peta')
  }

  const placed = useMemo(() => cities.flatMap((c) => placeCity(c) ?? []), [cities])
  const selected = cities.find((c) => c.id === selectedId) ?? null
  const unplaced = cities.filter((c) => !placed.some((p) => p.city.id === c.id))
  const firstActive = cities.find((c) => c.status === 'active') ?? null
  const activeCount = cities.filter((c) => c.status === 'active').length
  // Rotator judul: kota aktif dulu, lalu kota lain (hanya nama; tanpa klaim konten).
  const rotatorWords = useMemo(() => {
    const names = [firstActive?.name ?? 'Bandung', ...cities.map((c) => c.name), ...EXTRA_CITIES]
    return [...new Set(names.filter(Boolean))]
  }, [cities, firstActive])

  const preview = useCityPreview(firstActive?.id ?? null)
  const start = firstActive ? `/kota/${firstActive.id}` : '/'
  const levels: Level[] = [
    {
      tag: 'Belajar',
      title: 'Kuis & materi',
      text: 'Kuis awal, kartu materi dengan video, lalu kuis akhir. Soal nilai memberi poin terbesar.',
      icon: ICON_KUIS,
      to: start,
      cta: 'Mulai path',
      tone: 'bg-teal text-white',
    },
    {
      tag: 'Main',
      title: 'Keliling kota',
      text: 'Lari keliling kota, lompati rintangan, dan temui warga yang memperkenalkan item budaya.',
      icon: ICON_LARI,
      to: start,
      cta: 'Main game',
      tone: 'bg-bata text-white',
    },
    {
      tag: 'Bersaing',
      title: 'Koleksi & peringkat',
      text: 'Lengkapi koleksi, tulis refleksimu, dan raih gelar juara kota di papan peringkat.',
      icon: ICON_PIALA,
      to: '/koleksi',
      cta: 'Lihat koleksi',
      tone: 'bg-emas text-tinta',
    },
  ]

  const [statsRef, statsShown] = useReveal<HTMLDListElement>()
  const provinsi = useCountUp(PROVINCES.length, statsShown)
  const kota = useCountUp(cities.length, statsShown)
  const siap = useCountUp(activeCount, statsShown)

  return (
    <main id="konten" className="relative overflow-x-clip">
      {/* ---------------- Hero ---------------- */}
      <section className="relative -mt-[76px] overflow-hidden pt-[76px]">
        <div className="relative mx-auto grid max-w-[1360px] items-center gap-8 px-4 pb-12 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-12 lg:pb-16 lg:pt-14">
          <div className="relative z-10 motion-safe:animate-[card-in_600ms_ease-out]">
            <p className="eyebrow inline-flex items-center gap-2 border-2 border-tinta bg-white px-3 py-1.5 text-teal shadow-tekan">
              <span className="size-2 bg-emas motion-safe:animate-pulse" aria-hidden="true" />
              Ekspedisi budaya Nusantara
            </p>
            <h1
              aria-label={`Jelajahi Budaya, Mulai dari ${firstActive?.name ?? 'Bandung'}`}
              className="mt-6 flex flex-col items-start gap-4 text-[32px] font-bold sm:text-[52px] lg:text-[60px]"
            >
              <span className="pita bg-teal text-white" aria-hidden="true">
                Jelajahi budaya
              </span>
              <span className="pita pita-2 bg-bata text-white" aria-hidden="true">
                Mulai dari <CityRotator words={rotatorWords} />
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-tinta/80">
              Kenali kekayaan budaya Indonesia melalui kuis interaktif, materi bersumber, dan permainan seru.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#peta" onClick={scrollToMap} className={`group ${btn} bg-emas text-tinta`}>
                Mulai Jelajah Sekarang
                <Arrow className="size-4 transition-transform group-hover:translate-x-1" />
              </a>
              {firstActive && (
                <Link to={`/kota/${firstActive.id}`} className={`${btn} bg-white text-tinta`}>
                  Langsung ke {firstActive.name}
                </Link>
              )}
            </div>

            <ol className="mt-8 flex flex-wrap gap-2" aria-label="Cara belajar">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2 border-2 border-tinta bg-white py-1 pl-1 pr-3 text-[13px] font-semibold">
                  <span className="grid size-6 place-items-center bg-teal font-mono text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="relative -mx-4 sm:mx-0">
            <HeroMascot className="mx-auto w-[min(72vw,340px)] lg:w-[380px]" />
          </div>
        </div>
      </section>

      <Marquee words={['Kuis', 'Materi bersumber', 'Game keliling kota', 'Koleksi budaya', 'Papan peringkat', 'Tanya Saloka']} />

      {/* ---------------- Bab 01: Kenalan ---------------- */}
      <section aria-labelledby="judul-kenalan" className="px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Chapter
              id="judul-kenalan"
              no={1}
              tag="Kenalan"
              title="Kenalan dengan Rupaloka"
              lead="Rupaloka adalah ekspedisi belajar budaya Nusantara untuk pelajar: pilih kota, ikuti path belajar, lalu main game keliling kota untuk mengumpulkan item budaya."
            />
            <blockquote className="mt-8 border-l-4 border-teal bg-white/80 py-4 pl-5 pr-4">
              <p className="eyebrow text-teal">Misi kami</p>
              <p className="mt-2 text-lg font-bold leading-relaxed">
                Membuat budaya terasa dekat: dipelajari dari sumber yang jelas, dimainkan dengan hormat, dan dikunjungi
                langsung di tempat aslinya.
              </p>
            </blockquote>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#peta" onClick={scrollToMap} className={`${btn} bg-teal text-white`}>
                Pilih kota <Arrow />
              </a>
              <Link to="/tentang" className={`${btn} bg-white text-tinta`}>
                Tentang Rupaloka
              </Link>
            </div>
          </div>
          <ul className="grid gap-4">
            {PROMISES.map((p) => (
              <li key={p.title} className="kotak flex gap-4 p-4">
                <PixelIcon rows={p.icon} className="size-12 shrink-0" />
                <div>
                  <p className="font-display text-lg font-bold uppercase">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-tinta/80">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- Bab 02: Peta ---------------- */}
      <section id="peta" aria-labelledby="judul-peta" className="relative scroll-mt-24 px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1360px]">
          <Chapter
            id="judul-peta"
            no={2}
            tag="Dari Sabang sampai Merauke"
            title="Pilih kota untuk dijelajahi"
            lead="Ketuk provinsi di peta untuk melihat kotanya. Bandung sudah bisa dijelajahi; kota lain segera hadir."
          />

          <div className="relative mt-8">
            <Suspense
              fallback={
                <div className="kotak grid h-[240px] place-items-center bg-laut text-sm font-bold text-redup sm:h-[420px] lg:h-[540px]">
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
                <p className="border-2 border-dashed border-tinta/40 bg-white/80 p-5 text-sm text-redup">
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
                      className={`tekan border-2 border-tinta px-3.5 py-1.5 text-xs font-bold ${
                        c.id === selectedId ? 'bg-teal text-white shadow-melayang' : 'bg-white text-tinta shadow-tekan'
                      }`}
                    >
                      {c.status === 'coming_soon' && (
                        <svg viewBox="0 0 12 12" className="mr-1 inline size-3 -translate-y-px" aria-hidden="true">
                          <rect x="2" y="5.5" width="8" height="5.5" fill="currentColor" opacity=".55" />
                          <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".55" />
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
                <p className="mt-2 text-center text-xs text-redup">Dev: API tidak terhubung, memakai content/cities.yaml.</p>
              )}
            </div>

            <dl ref={statsRef} className="mt-2 grid w-full max-w-2xl grid-cols-3 gap-3">
              {[
                { label: 'provinsi di peta', value: provinsi },
                { label: 'kota terdaftar', value: kota },
                { label: 'kota siap dijelajahi', value: siap },
              ].map((s) => (
                <div key={s.label} className="kotak flex flex-col-reverse px-3 py-3 text-center">
                  <dt className="eyebrow text-redup">{s.label}</dt>
                  <dd className="font-display text-3xl font-bold tabular-nums text-teal sm:text-4xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------- Bab 03: Pilih jalurmu ---------------- */}
      <section aria-labelledby="judul-jalur" className="px-4 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px]">
          <Chapter
            id="judul-jalur"
            no={3}
            tag="Pilih jalurmu"
            title="Mau belajar, main, atau bersaing?"
            lead="Tiga level dalam satu perjalanan kota. Mulai dari mana saja; poinmu terkumpul di path belajar."
          />
          <div className="mt-10">
            <LevelCards levels={levels} />
          </div>
        </div>
      </section>

      {firstActive && (
        <>
          <CollectionPreview
            no={4}
            cityId={firstActive.id}
            cityName={firstActive.name}
            detail={preview.detail}
            board={preview.board}
            failed={preview.failed}
          />
          <CityStops no={5} cityId={firstActive.id} cityName={firstActive.name} detail={preview.detail} />
        </>
      )}

      {/* ---------------- CTA akhir ---------------- */}
      <section aria-labelledby="judul-ajakan" className="px-4 pb-24 pt-8 sm:px-8 lg:px-12">
        <div className="kotak mx-auto max-w-[1200px] !bg-teal px-6 py-12 text-center text-white sm:px-12">
          <p className="eyebrow text-emas">Siap?</p>
          <h2 id="judul-ajakan" className="mx-auto mt-3 max-w-2xl text-[30px] font-bold uppercase leading-tight sm:text-[44px]">
            Siap mulai ekspedisimu?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-white/85">
            Jawab kuis, tonton materi, lari keliling kota, dan kumpulkan item budaya. Gratis, tanpa akun.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {firstActive && (
              <CtaLink to={`/kota/${firstActive.id}`} variant="emas">
                Mulai di {firstActive.name}
              </CtaLink>
            )}
            <a href="#peta" onClick={scrollToMap} className={`${btn} bg-white text-tinta`}>
              Lihat peta
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
