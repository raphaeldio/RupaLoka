import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import kursorUrl from '../assets/figma-map/kursor.svg'
import CityCard from '../components/CityCard'
// Peta (Leaflet ±150 kB) dimuat terpisah; ada di bawah lipatan layar.
const LeafletMap = lazy(() => import('../components/LeafletMap'))
import { CityStops, CollectionPreview } from '../components/landing/CityPreview'
import { useCityPreview } from '../components/landing/useCityPreview'
import ChapterHud from '../components/landing/ChapterHud'
import LatarBudaya from '../components/landing/LatarBudaya'
import NusantaraHero from '../components/landing/NusantaraHero'
import { useLandingMotion } from '../components/landing/useLandingMotion'
import { Chapter, CtaLink, LevelCards, Marquee, PixelIcon, type Level } from '../components/landing/pixel'
import { ICON_BUKU, ICON_KUIS, ICON_LARI, ICON_PETA, ICON_PIALA } from '../components/landing/pixelIcons'
import PixelLoader from '../components/PixelLoader'
import { bundledCities, loadCities, placeCity, type City, type CitySource } from '../lib/cities'
import { PROVINCES, REGIONS } from '../lib/provinces'
import { gulirKe, useGulirHalus } from '../lib/gulirHalus'
import { useReveal } from '../lib/useReveal'

const legendUrls = import.meta.glob<string>('../assets/figma-map/legend-*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
})

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

/** Ubin ikon kartu bab 01 (hijau daun, emas, bata). */
const TILE = ['from-daun-100 to-[#c3dfd0]', 'from-emas-100 to-[#f1d38b]', 'from-bata-50 to-[#efc3b2]']

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
    const el = document.getElementById(location.hash.slice(1))
    if (el) gulirKe(el)
  }, [location.hash])

  const scrollToMap = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const peta = document.getElementById('peta')
    if (peta) gulirKe(peta)
    window.history.pushState(null, '', '#peta')
  }

  const placed = useMemo(() => cities.flatMap((c) => placeCity(c) ?? []), [cities])
  const selected = cities.find((c) => c.id === selectedId) ?? null
  const unplaced = cities.filter((c) => !placed.some((p) => p.city.id === c.id))
  const firstActive = cities.find((c) => c.status === 'active') ?? null
  const activeCount = cities.filter((c) => c.status === 'active').length
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
      tone: 'teal',
    },
    {
      tag: 'Main',
      title: 'Keliling kota',
      text: 'Lari keliling kota, lompati rintangan, dan temui warga yang memperkenalkan item budaya.',
      icon: ICON_LARI,
      to: start,
      cta: 'Main game',
      tone: 'bata',
    },
    {
      tag: 'Bersaing',
      title: 'Koleksi & peringkat',
      text: 'Lengkapi koleksi, tulis refleksimu, dan raih gelar juara kota di papan peringkat.',
      icon: ICON_PIALA,
      to: '/koleksi',
      cta: 'Lihat koleksi',
      tone: 'emas',
    },
  ]

  useGulirHalus()
  const mainRef = useRef<HTMLElement>(null)
  const [chapter, setChapter] = useState('')
  useLandingMotion(mainRef, setChapter, [!!preview.detail])

  const [statsRef, statsShown] = useReveal<HTMLDListElement>()
  const provinsi = useCountUp(PROVINCES.length, statsShown)
  const kota = useCountUp(cities.length, statsShown)
  const siap = useCountUp(activeCount, statsShown)

  return (
    <main id="konten" ref={mainRef} className="relative overflow-x-clip">
      {/* Latar halaman bersama: warnanya bergradasi mengikuti bab (useLandingMotion) agar alur menyambung. */}
      <div data-alur-latar aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-[#f6efdf]" />
      <ChapterHud label={chapter} />
      <NusantaraHero startTo={start} onMap={scrollToMap} />

      <Marquee words={['Kuis', 'Materi bersumber', 'Game keliling kota', 'Koleksi budaya', 'Papan peringkat', 'Tanya Saloka']} />

      {/* ---------------- Bab 01: Apa itu Rupaloka ---------------- */}
      <section
        data-chapter="01 · Apa itu Rupaloka"
        data-warna="#f8efdc"
        aria-labelledby="judul-kenalan"
        className="relative isolate overflow-clip px-4 pb-36 pt-16 sm:px-8 sm:pb-40 lg:px-12 lg:pb-60 xl:pb-72 lg:pt-24"
      >
        <LatarBudaya corak="kawung" />
        <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.12fr_1fr] lg:gap-16">
          <div>
            <Chapter
              id="judul-kenalan"
              no={1}
              tag={
                <>
                  Apa itu <span className="text-amber">Rupaloka</span>
                </>
              }
              title="Budaya dari"
              accent="Sumbernya"
              lead="Rupaloka adalah ekspedisi belajar budaya Nusantara untuk pelajar: pilih kota, ikuti path belajar, lalu main game keliling kota untuk mengumpulkan item budaya."
            />
            <blockquote data-anim="card" className="kutipan-nuansa mt-8">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-teal">Pegangan kami</p>
              <p className="mt-2 text-[17px] font-extrabold leading-snug text-tinta sm:text-[20px]">
                Membuat budaya terasa dekat: dipelajari dari sumber yang jelas, dimainkan dengan hormat, dan dikunjungi
                langsung di tempat aslinya.
              </p>
            </blockquote>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#peta" onClick={scrollToMap} className="pil pil-emas group">
                Pilih kota <Arrow className="size-4 transition-transform group-hover:translate-x-1" />
              </a>
              <Link to="/tentang" className="pil pil-putih">
                Tentang Rupaloka
              </Link>
            </div>
          </div>
          <ul className="relative grid gap-5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-14 left-[52px] top-14 border-l-[3px] border-dotted border-emas/70 sm:left-[62px]"
            />
            {PROMISES.map((p, i) => (
              <li
                key={p.title}
                data-anim="card"
                data-angkat
                className={`kartu-nuansa relative flex items-center gap-4 p-4 sm:gap-5 sm:p-6 ${i === 1 ? 'lg:translate-x-6' : ''}`}
              >
                <div
                  className={`ikon-lompat grid size-[72px] shrink-0 place-items-center rounded-[20px] bg-gradient-to-br sm:size-[88px] ${TILE[i]}`}
                >
                  <PixelIcon rows={p.icon} className="size-11 sm:size-14" />
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-black uppercase tracking-[0.02em] text-teal-800 sm:text-[19px]">{p.title}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-tinta/75 sm:text-[15px]">{p.text}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-3 text-[12px] font-black tracking-[0.1em] text-amber sm:right-5 sm:top-4"
                >
                  0{i + 1}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- Bab 02: Peta ---------------- */}
      <section
        id="peta"
        data-chapter="02 · Pilih kota"
        data-warna="#eef3ea"
        aria-labelledby="judul-peta"
        className="relative isolate scroll-mt-24 overflow-clip px-4 pb-44 pt-20 sm:px-8 lg:px-12"
      >
        <LatarBudaya corak="mega" />
        <div className="relative z-10 mx-auto max-w-[1360px]">
          <Chapter
            id="judul-peta"
            no={2}
            tag="Dari Sabang sampai Merauke"
            title="Pilih kota untuk"
            accent="dijelajahi"
            align="center"
            lead="Ketuk provinsi di peta untuk melihat kotanya. Bandung sudah bisa dijelajahi; kota lain segera hadir."
          />

          <div className="relative mt-8">
            <Suspense
              fallback={
                <div className="kotak grid h-[240px] place-items-center bg-laut sm:h-[420px] lg:h-[540px]">
                  <PixelLoader label="Memuat peta…" />
                </div>
              }
            >
              <LeafletMap cities={placed} selectedId={selectedId} onSelect={setSelectedId} />
            </Suspense>

            <div className="mt-4 lg:absolute lg:bottom-8 lg:left-0 lg:mt-0 lg:w-80">
              {selected ? (
                <CityCard city={selected} onClose={() => setSelectedId(null)} />
              ) : (
                <p className="rounded-[22px] border-2 border-dashed border-teal/30 bg-white/85 p-5 text-sm text-redup">
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
                      className={`rounded-full px-4 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                        c.id === selectedId
                          ? 'bg-teal-800 text-white shadow-[0_8px_18px_-8px_rgb(14_77_75/0.6)]'
                          : 'bg-white text-tinta ring-1 ring-tinta/10'
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

            <dl ref={statsRef} data-anim="stats" className="mt-2 grid w-full max-w-2xl grid-cols-3 gap-3">
              {[
                { label: 'provinsi di peta', value: provinsi },
                { label: 'kota terdaftar', value: kota },
                { label: 'kota siap dijelajahi', value: siap },
              ].map((s) => (
                <div key={s.label} data-anim="stat" className="kartu-nuansa flex flex-col-reverse px-3 py-4 text-center">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-redup sm:text-[12px]">{s.label}</dt>
                  <dd className="text-3xl font-black tabular-nums text-teal-800 sm:text-[42px]">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------- Bab 03: Cara menjelajah ---------------- */}
      <section
        data-chapter="03 · Cara menjelajah"
        data-warna="#f7efdf"
        aria-labelledby="judul-jalur"
        className="relative isolate overflow-clip px-4 pb-28 pt-20 sm:px-8 lg:px-12"
      >
        <LatarBudaya corak="parang" />
        <div className="relative z-10 mx-auto max-w-[1200px]">
          <Chapter
            id="judul-jalur"
            no={3}
            tag="Cara menjelajah"
            title="Belajar, main,"
            accent="lalu bersaing"
            align="center"
            lead="Tiga mode dalam satu ekspedisi kota. Mulai dari mana saja; poinmu terkumpul di path belajar."
          />
          <div className="mt-14">
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
      <section data-chapter="06 · Berangkat" data-warna="#f6efdf" aria-labelledby="judul-ajakan" className="px-4 pb-24 pt-12 sm:px-8 lg:px-12">
        <div
          data-anim="cta-final"
          className="relative isolate mx-auto max-w-[1200px] overflow-clip rounded-[32px] px-6 py-14 text-center text-white shadow-[0_30px_60px_-30px_rgb(14_77_75/0.7)] ring-1 ring-emas/50 sm:px-12 sm:py-16"
        >
          <LatarBudaya corak="senja" />
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#f6d98e] ring-1 ring-white/20">
              Tiket sudah di tangan
            </p>
            <h2 id="judul-ajakan" className="mx-auto mt-5 max-w-2xl font-sans text-[32px] font-black leading-[1.08] sm:text-[48px]">
              Ayo berangkat ke <span className="teks-emas teks-emas-terang">kota pertamamu</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-white/85">
              Jawab kuis, tonton materi, lari keliling kota, dan kumpulkan item budaya. Gratis, tanpa akun.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {firstActive && (
                <CtaLink to={`/kota/${firstActive.id}`} variant="emas" part="cta-btn">
                  Mulai di {firstActive.name}
                </CtaLink>
              )}
              <a data-anim-part="cta-btn" href="#peta" onClick={scrollToMap} className="pil pil-putih">
                Lihat peta
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
