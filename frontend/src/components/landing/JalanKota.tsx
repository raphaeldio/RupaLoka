/**
 * "Jalan kota" (26 Nov 2026): bab titik budaya sebagai perjalanan menyusuri jalan Bandung.
 *
 * Panggung menempel (CSS sticky, bukan pin JS agar gulir cepat tidak tersendat) sementara
 * GSAP ScrollTrigger menggeser dunia ke kiri 1:1 dengan gulir: gerbang kota, gedung, rumah adat,
 * dan papan titik budaya lewat; pelari tim berlari di trotoar dan papan yang dilewati menyala.
 * Bukit dan awan bergeser lebih lambat (paralaks). Lebar perjalanan diukur ulang saat resize.
 *
 * Gambar hanya latar (tanpa klaim fakta). Teks papan = judul & lokasi materi dari konten bersumber.
 * Tanpa JS/gerak dikurangi: panggung bisa digeser horizontal biasa.
 */
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Fragment, useRef } from 'react'
import gerbangUrl from '../../assets/bandung/gerbang-bandung.webp'
import gedungUrl from '../../assets/bandung/gedung-sate.webp'
import jalanUrl from '../../assets/bandung/jalan.webp'
import rumahUrl from '../../assets/bandung/rumah-adat.webp'
import { GRID_H, GRID_W, runnerFrame } from '../../game/runnerSprite'
import type { CityDetail } from '../../lib/api.types'
import { labelOr } from '../../lib/cities'
import { CtaLink, PixelIcon } from './pixel'
import { ICON_PETA } from './pixelIcons'
import { strideFrame } from './trackMath'
import './jalan-kota.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

type Lesson = CityDetail['lessons'][number]

/** Bangunan latar diselipkan setelah titik ke-n (indeks), agar papan dan bangunan bergantian. */
/** Lebar/tinggi ubin jalan.webp (1483×200). */
const JALAN_RASIO = 1483 / 200

const BANGUNAN: Record<number, { src: string; cls: string }> = {
  0: { src: gedungUrl, cls: 'jk-gedung' },
  1: { src: rumahUrl, cls: 'jk-rumah' },
}

export default function JalanKota({ cityId, lessons }: { cityId: string; lessons: Lesson[] }) {
  const trek = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = trek.current
      if (!el || typeof window.matchMedia !== 'function') return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const panggung = el.querySelector<HTMLElement>('.jk-panggung')
        const isi = el.querySelector<HTMLElement>('.jk-isi')
        const akhir = el.querySelector<HTMLElement>('.jk-akhir')
        const bendera = el.querySelector<SVGSVGElement>('.jk-bendera')
        const pelari = el.querySelector<HTMLCanvasElement>('.jk-pelari')
        if (!panggung || !isi || !akhir || !bendera || !pelari) return
        const ctx = pelari.getContext('2d')
        const papan = Array.from(el.querySelectorAll<HTMLElement>('[data-papan]'))
        const angka = el.querySelector<HTMLElement>('.jk-angka')
        const jalan = el.querySelector<HTMLElement>('.jk-jalan')

        el.setAttribute('data-hidup', '')
        // Jarak tempuh: sampai garis akhir tiba di posisi pelari.
        const posPelari = () => pelari.offsetLeft + pelari.offsetWidth / 2
        const jarak = () => Math.max(0, akhir.offsetLeft + bendera.getBoundingClientRect().width / 2 - posPelari())
        const setTinggi = () => {
          el.style.height = `${panggung.offsetHeight + jarak()}px`
        }
        setTinggi()
        ScrollTrigger.addEventListener('refreshInit', setTinggi)

        // Ukuran dibaca sekali per refresh (bukan tiap frame) agar tidak memaksa tata letak saat gulir.
        let pusat: number[] = []
        let garisPelari = 0
        let ubinJalan = 0
        const ukur = () => {
          pusat = papan.map((p) => p.offsetLeft + p.offsetWidth / 2)
          garisPelari = posPelari()
          ubinJalan = jalan ? (jalan.offsetHeight * JALAN_RASIO) : 0
        }
        ukur()
        ScrollTrigger.addEventListener('refresh', ukur)

        let frame = -1
        let lewat = -1
        const gambar = () => {
          const x = Number(gsap.getProperty(isi, 'x')) || 0
          const f = strideFrame(x)
          if (f !== frame && ctx) {
            frame = f
            const img = runnerFrame(f, true)
            ctx.clearRect(0, 0, GRID_W, GRID_H)
            if (img) ctx.drawImage(img, 0, 0)
          }
          // Jalan: lapisan selebar layar + 2 ubin yang digeser berulang (modulo satu ubin).
          if (jalan && ubinJalan > 0) jalan.style.transform = `translate3d(${(x % ubinJalan).toFixed(1)}px,0,0)`
          const garis = garisPelari - x
          let n = 0
          pusat.forEach((c, i) => {
            const on = c <= garis
            if (on) n = i + 1
            if (papan[i].hasAttribute('data-lewat') !== on) papan[i].toggleAttribute('data-lewat', on)
          })
          if (n !== lewat && angka) {
            lewat = n
            angka.textContent = String(n)
          }
        }

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.35,
            invalidateOnRefresh: true,
          },
          onUpdate: gambar,
        })
        tl.to(isi, { x: () => -jarak(), duration: 1 }, 0)
          .to(el.querySelector('.jk-bukit'), { x: () => -jarak() * 0.22, duration: 1 }, 0)
          .to(el.querySelector('.jk-awan'), { x: () => -jarak() * 0.08, duration: 1 }, 0)
        gambar()

        return () => {
          ScrollTrigger.removeEventListener('refreshInit', setTinggi)
          ScrollTrigger.removeEventListener('refresh', ukur)
          el.removeAttribute('data-hidup')
          el.style.height = ''
        }
      })
      // Gambar latar selesai dimuat → lebar dunia berubah; hitung ulang.
      const imgs = Array.from(el.querySelectorAll('img'))
      const refresh = () => ScrollTrigger.refresh()
      imgs.forEach((i) => !i.complete && i.addEventListener('load', refresh, { once: true }))
      return () => mm.revert()
    },
    { scope: trek, dependencies: [lessons.length], revertOnUpdate: true },
  )

  return (
    <div ref={trek} className="jk-trek">
      <div className="jk-panggung" style={{ ['--jalan' as string]: `url(${jalanUrl})` }}>
        <div className="jk-awan" aria-hidden="true">
          <span style={{ left: '8%', top: '14%' }} />
          <span style={{ left: '46%', top: '8%', scale: '0.7' }} />
          <span style={{ left: '78%', top: '20%' }} />
          <span style={{ left: '92%', top: '12%', scale: '0.8' }} />
        </div>
        <div className="jk-bukit" aria-hidden="true">
          <svg viewBox="0 0 2400 200" preserveAspectRatio="none" shapeRendering="crispEdges">
            <path
              d="M0 200V120h80v-20h80v-20h120v-20h100v20h80v20h140v-30h100v-30h120v30h80v40h160v-30h120v-20h140v20h80v30h120v-40h100v-20h120v30h80v40h140v-20h120v-30h100v40h40v80Z"
              fill="#8fc0c4"
            />
          </svg>
        </div>

        <div className="jk-jalan" aria-hidden="true" />
        <div className="jk-dunia">
          <div className="jk-isi">
            <span className="jk-jeda" aria-hidden="true" />
            <img src={gerbangUrl} alt="" className="jk-gerbang" decoding="async" />
            {lessons.map((l, i) => (
              <Fragment key={l.id}>
                <div data-papan className="jk-papan">
                  <div className="kartu-nuansa jk-papan-kartu">
                    <span className="jk-no">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber">Titik {i + 1}</p>
                      <p className="text-[16px] font-black leading-tight text-teal-800 sm:text-[18px]">
                        {labelOr(l.title, 'Materi budaya')}
                      </p>
                      {l.location && (
                        <p className="mt-1 flex items-center gap-1 text-[12px] text-redup">
                          <PixelIcon rows={ICON_PETA} className="size-3.5 shrink-0" />
                          <span className="truncate">{labelOr(l.location.name, 'Lokasi')}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="jk-tiang" aria-hidden="true" />
                </div>
                {BANGUNAN[i] && <img src={BANGUNAN[i].src} alt="" className={BANGUNAN[i].cls} decoding="async" />}
              </Fragment>
            ))}
            <div className="jk-akhir" aria-hidden="true">
              <svg viewBox="0 0 12 20" className="jk-bendera pixel-art" shapeRendering="crispEdges">
                <rect x="1" y="0" width="1" height="20" fill="#1d2a2a" />
                {[0, 1, 2, 3].map((r) =>
                  [0, 1, 2, 3, 4].map((c) => (
                    <rect key={`${r}${c}`} x={2 + c * 2} y={r * 2} width="2" height="2" fill={(r + c) % 2 ? '#fff' : '#1d2a2a'} />
                  )),
                )}
              </svg>
              <div className="kartu-nuansa jk-akhir-kartu">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber">Garis akhir</p>
                <p className="mt-1 text-[16px] font-black leading-tight text-teal-800">Semua titik selesai, saatnya main game keliling kota!</p>
              </div>
            </div>
            <span className="jk-jeda-akhir" aria-hidden="true" />
          </div>
        </div>

        <canvas width={GRID_W} height={GRID_H} className="jk-pelari pixel-art" aria-hidden="true" />

        <div className="jk-hud">
          <p className="rounded-full bg-white/90 px-4 py-2 text-[13px] font-extrabold text-teal-800 shadow-[0_8px_20px_-10px_rgb(14_77_75/0.5)]">
            Titik <span className="jk-angka tabular-nums">0</span>/{lessons.length} dilewati
          </p>
          <CtaLink to={`/kota/${cityId}`} variant="emas">
            Mulai dari titik 1
          </CtaLink>
        </div>
      </div>
    </div>
  )
}
