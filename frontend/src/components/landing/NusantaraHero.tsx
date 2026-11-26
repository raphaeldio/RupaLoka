import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import latarUrl from '../../assets/hero/nusantara.webp'
import latar960Url from '../../assets/hero/nusantara-960.webp'
import HeroMascot from '../mascot/HeroMascot'
import './nusantara-hero.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Hero beranda "Nusantara" (desain tim 26 Nov 2026).
 *
 * Latar = ilustrasi piksel milik tim (content/sources.yaml) yang teks dan maskot bawaannya
 * sudah dihapus; di atasnya ada lapisan hidup buatan kode: pendar matahari, kabut, awan,
 * burung, kilau air, dan kunang-kunang. Maskot asli (HeroMascot: menyapa, mata mengikuti
 * kursor, bisa diklik) berdiri di dermaga.
 *
 * Gulir (section `position: sticky` di dalam lintasan setinggi ±2 layar; GSAP ScrollTrigger
 * hanya membaca progres, tanpa pin JS agar tidak tersendat saat gulir cepat): kamera mendekat dan maskot berjalan maju menyusuri
 * dermaga ke arah pembaca, sementara teks memudar. Gerak dimatikan bila
 * prefers-reduced-motion; konten tetap utuh tanpa JS.
 *
 * Koordinat lapisan memakai persen gambar (1376 × 768) agar menempel di semua lebar layar.
 */

const STEPS = ['Pilih kota', 'Belajar bersama pemandu AI', 'Main game, kumpulkan item']

/** Kunang-kunang: [x %, y %, ukuran px, jeda dtk]. Tetap (bukan acak) agar render stabil. */
const KUNANG: [number, number, number, number][] = [
  [8, 84, 4, 0],
  [14, 91, 3, 1.4],
  [21, 79, 3, 2.6],
  [27, 88, 4, 0.8],
  [33, 95, 3, 3.1],
  [38, 82, 3, 1.9],
  [44, 90, 2, 0.3],
  [57, 87, 3, 2.2],
  [62, 80, 2, 1.1],
  [67, 93, 4, 3.4],
  [72, 84, 3, 0.5],
  [78, 90, 3, 2.9],
  [83, 80, 4, 1.6],
  [88, 87, 3, 0.2],
  [93, 93, 3, 2.4],
  [17, 72, 2, 3.8],
  [50, 76, 2, 1.3],
  [86, 73, 2, 2.0],
  [4, 76, 3, 2.7],
  [97, 80, 3, 0.9],
]

const AWAN = [
  { top: 9, w: 16, dur: 140, delay: -30, o: 0.75 },
  { top: 18, w: 11, dur: 170, delay: -110, o: 0.6 },
  { top: 27, w: 20, dur: 200, delay: -60, o: 0.5 },
]

function Burung({ className }: { className: string }) {
  return (
    <span className={`nh-burung ${className}`}>
      <svg viewBox="0 0 14 6" aria-hidden="true">
        <path d="M0 1 L4 4 L7 2 L10 4 L14 1" fill="none" stroke="#5b4a32" strokeWidth="1.3" strokeLinejoin="miter" />
      </svg>
    </span>
  )
}

const Panah = () => (
  <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
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

export default function NusantaraHero({
  startTo,
  onMap,
}: {
  startTo: string
  onMap: (e: MouseEvent<HTMLAnchorElement>) => void
}) {
  // Lintasan gulir: pembungkus tinggi; <section> di dalamnya menempel (sticky) di atas layar.
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const trek = ref.current
      const root = trek?.querySelector<HTMLElement>('.nh') ?? null
      if (!trek || !root || typeof window.matchMedia !== 'function') return
      const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T & HTMLElement>(s)
      const $$ = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s))
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const stage = $('.nh-adegan')
        const maskot = $('.nh-maskot')
        if (!stage || !maskot) return

        /* ---------- Masuk ---------- */
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from($('.nh-geser'), { scale: 1.08, duration: 2.4, ease: 'power2.out' }, 0)
          .from($$('[data-nh="masuk"]'), { y: 28, autoAlpha: 0, duration: 0.7, stagger: 0.09 }, 0.15)
          .from($$('[data-nh="langkah"]'), { y: 16, autoAlpha: 0, duration: 0.45, stagger: 0.08 }, 0.7)
          .from($('.nh-maskot-masuk'), { y: -60, autoAlpha: 0, duration: 0.9, ease: 'bounce.out' }, 0.5)

        /* ---------- Gulir: kamera mendekat, maskot berjalan maju ---------- */
        let stopWalk = 0
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: trek,
            start: 'clamp(top top)',
            end: 'bottom bottom',
            scrub: 0.5,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              // Gelembung sapaan disembunyikan saat maskot sudah maju (agar tidak ikut membesar).
              const maju = self.progress > 0.02
              if (maju !== 'maju' in maskot.dataset) {
                if (maju) maskot.dataset.maju = ''
                else delete maskot.dataset.maju
              }
              // Ayunan langkah hanya saat sedang digulir.
              if (self.progress > 0 && self.progress < 1) {
                if (!('jalan' in maskot.dataset)) maskot.dataset.jalan = ''
                window.clearTimeout(stopWalk)
                stopWalk = window.setTimeout(() => delete maskot.dataset.jalan, 160)
              }
            },
          },
        })
        // Maskot maju 16.5% tinggi gambar, tetapi kakinya tidak boleh keluar dari bawah layar
        // (layar lebar-pendek memotong bagian bawah gambar). Kaki ada di 78.4% tinggi gambar.
        const geser = stage.parentElement
        const jarakJalan = () => {
          const h = stage.offsetHeight
          const kaki = (geser?.offsetTop ?? 0) + stage.offsetTop + h * 0.784
          return Math.max(0, Math.min(h * 0.165, root.clientHeight - 14 - kaki))
        }
        // Hanya transform (tanpa ubah ukuran/posisi tata letak) agar gulir tetap mulus.
        tl.to(stage, { scale: 1.16, duration: 1 }, 0)
          .to(maskot, { y: jarakJalan, scale: 1.9, duration: 1 }, 0)
          .to($('.nh-teks'), { y: -90, autoAlpha: 0, duration: 0.45 }, 0)
          .to($('.nh-langkah'), { y: 40, autoAlpha: 0, duration: 0.3 }, 0)
          .to($('.nh-matahari'), { scale: 1.25, duration: 1 }, 0)

        /* ---------- Paralaks penunjuk (perangkat dengan kursor) ---------- */
        if (!window.matchMedia('(pointer: fine)').matches) return
        const lapis = $$('[data-dalam]').map((el) => ({
          d: Number(el.dataset.dalam),
          x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3' }),
          y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3' }),
        }))
        const onMove = (e: PointerEvent) => {
          const r = root.getBoundingClientRect()
          const nx = (e.clientX - r.left) / r.width - 0.5
          const ny = (e.clientY - r.top) / r.height - 0.5
          for (const l of lapis) {
            l.x(nx * l.d)
            l.y(ny * l.d * 0.5)
          }
        }
        root.addEventListener('pointermove', onMove)
        return () => {
          root.removeEventListener('pointermove', onMove)
          window.clearTimeout(stopWalk)
        }
      })

      return () => mm.revert()
    },
    { scope: ref },
  )

  return (
    <div ref={ref} data-chapter="00 · Mulai" className="nh-trek relative -mt-[76px]">
      <section
          aria-labelledby="judul-hero"
        className="nh sticky top-0 h-[100svh] min-h-[620px] overflow-hidden pt-[76px]"
      >
        {/* ---------- Pemandangan (hiasan) ---------- */}
        <div className="nh-wadah" aria-hidden="true">
          <div className="nh-geser" data-dalam="-18">
            <div className="nh-adegan">
              <img
                src={latarUrl}
                srcSet={`${latar960Url} 960w, ${latarUrl} 1376w`}
                sizes="100vw"
                alt=""
                className="nh-gambar"
                decoding="async"
              />

              {/* Langit */}
              {AWAN.map((a, i) => (
                <span
                  key={i}
                  className="nh-awan"
                  style={{
                    top: `${a.top}%`,
                    width: `${a.w}cqw`,
                    opacity: a.o,
                    animationDuration: `${a.dur}s`,
                    animationDelay: `${a.delay}s`,
                  }}
                />
              ))}
              <Burung className="nh-burung-1" />
              <Burung className="nh-burung-2" />
              <Burung className="nh-burung-3" />

              {/* Matahari: pendar + sinar berputar, terpotong di cakrawala */}
              <div className="nh-langit-fx">
                <span className="nh-matahari">
                  <span className="nh-sinar" />
                  <span className="nh-pendar" />
                </span>
              </div>

              {/* Kabut di cakrawala */}
              <span className="nh-kabut nh-kabut-1" />
              <span className="nh-kabut nh-kabut-2" />
              <span className="nh-kabut nh-kabut-3" />

              {/* Air */}
              <span className="nh-air">
              <span className="nh-kilau" />
            </span>
              <span className="nh-pantul" />

              {/* Maskot di dermaga */}
              <div className="nh-maskot">
                <div className="nh-maskot-masuk">
                  <div className="nh-ayun">
                    <HeroMascot className="w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="nh-kunang-lapis" data-dalam="-40">
            {KUNANG.map(([x, y, s, d], i) => (
              <span
                key={i}
                className="nh-kunang"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: s,
                  height: s,
                  animationDelay: `${-d}s, ${-d * 1.7}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* ---------- Teks ---------- */}
        <div className="nh-teks relative z-10 mx-auto flex max-w-[980px] flex-col items-center px-4 pt-6 text-center sm:pt-8">
          <div data-dalam="8" className="flex flex-col items-center">
            <p
              data-nh="masuk"
              className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 text-[13px] font-bold text-teal-800 shadow-[0_4px_14px_rgb(14_77_75/0.12)]"
            >
              <svg viewBox="0 0 12 12" className="size-3 text-emas" aria-hidden="true">
                <path d="M6 0l1.4 4.6L12 6l-4.6 1.4L6 12 4.6 7.4 0 6l4.6-1.4z" fill="currentColor" />
              </svg>
              <span>
                Budaya Nusantara, <span className="text-amber">cara seru</span>
              </span>
            </p>

            <h1
              id="judul-hero"
              data-nh="masuk"
              className="mt-5 font-sans text-[34px] font-black leading-[1.08] tracking-[-0.01em] text-teal-800 sm:text-[52px] lg:text-[64px]"
            >
              Jelajahi Budaya, Mulai dari <span className="nh-emas block">Nusantara</span>
            </h1>

            <p data-nh="masuk" className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-tinta/85 sm:text-[18px]">
              Kenali kekayaan alam dan budaya Indonesia melalui kuis interaktif, materi bersumber, dan permainan seru.
            </p>

            <div data-nh="masuk" className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={startTo}
                className="group inline-flex items-center gap-2 rounded-full bg-emas px-6 py-3 text-[15px] font-bold text-tinta shadow-[0_8px_20px_rgb(168_118_26/0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgb(168_118_26/0.4)] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal"
              >
                Mulai Jelajah Sekarang
                <span className="transition-transform group-hover:translate-x-1">
                  <Panah />
                </span>
              </Link>
              <a
                href="#peta"
                onClick={onMap}
                className="inline-flex items-center rounded-full border border-tinta/10 bg-white/95 px-6 py-3 text-[15px] font-bold text-tinta shadow-[0_6px_16px_rgb(29_42_42/0.08)] transition hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal"
              >
                Lihat Peta
              </a>
            </div>
          </div>
        </div>

        {/* ---------- Tiga langkah ---------- */}
        <ol
          aria-label="Cara belajar"
          className="nh-langkah absolute inset-x-0 bottom-3 z-10 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:bottom-5 sm:flex-wrap sm:justify-center sm:gap-3 sm:overflow-visible"
        >
          {STEPS.map((s, i) => (
            <li
              key={s}
              data-nh="langkah"
              className="flex shrink-0 snap-start items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-4 text-[13px] font-semibold text-tinta shadow-[0_4px_14px_rgb(14_77_75/0.12)] sm:text-[14px]"
            >
              <span className="grid size-7 place-items-center rounded-full bg-teal-800 text-[12px] font-bold text-white">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
