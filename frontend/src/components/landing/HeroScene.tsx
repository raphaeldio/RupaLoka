import { useEffect, useRef, useState } from 'react'
import jalanUrl from '../../assets/hero/bandung-jalan.webp'
import jalan960Url from '../../assets/hero/bandung-jalan-960.webp'
import { GRID_H, GRID_W, RUN_FRAMES, runnerFrame } from '../../game/runnerSprite'
import './hero-scene.css'

/**
 * Latar hero: pemandangan jalan Bandung piksel (aset tim, lihat content/sources.yaml) yang
 * "hidup": awan bergeser, burung terbang, lampu jalan berpendar, kendaraan lewat di dua lajur,
 * dan pejalan kaki di trotoar. Semua lapisan hidup digambar sendiri dari peta piksel.
 *
 * Koordinat lapisan dalam persen gambar (1672 × 941) sehingga tetap menempel pada gambar
 * di semua lebar layar. Hiasan saja (aria-hidden). Gerak berhenti saat di luar layar dan
 * dimatikan bila prefers-reduced-motion.
 */

const PAL: Record<string, string> = {
  k: '#1d2a2a', // tinta
  g: '#a8d8ee', // kaca
  G: '#6b6f78', // velg
  y: '#f6e7a8', // lampu
  t: '#146b68', // teal
  b: '#b5523b', // bata
  e: '#e8b64c', // emas
  w: '#f5f1e8', // kertas
  d: '#8bb9a0', // daun
}

function Sprite({ rows, className }: { rows: string[]; className?: string }) {
  const w = Math.max(...rows.map((r) => r.length))
  return (
    <svg viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" className={className}>
      {rows.flatMap((r, y) =>
        [...r].map((c, x) => (PAL[c] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PAL[c]} /> : null)),
      )}
    </svg>
  )
}

/** Mobil kecil menghadap kanan; huruf `c` diganti warna badan. */
const mobil = (c: string) =>
  [
    '....kkkkkkkk......',
    '...kggkggggggk....',
    '..kgggkgggggggk...',
    'kkkkkkkkkkkkkkkkk.',
    'kccccccccccccccyk.',
    'kcccccccccccccccck',
    'kkkkkkkkkkkkkkkkkk',
    '..kkkk......kkkk..',
    '..kGGk......kGGk..',
    '...kk........kk...',
  ].map((r) => r.replaceAll('c', c))

const BUS = [
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  'kwwwwwwwwwwwwwwwwwwwwwwwwwwwkk',
  'kwgggwgggwgggwgggwgggwggggwwgk',
  'kwgggwgggwgggwgggwgggwggggwwgk',
  'kwwwwwwwwwwwwwwwwwwwwwwwwwwwwk',
  'kttttttttttttttttttttttttttttk',
  'kwwwwwwwwwwwwwwwwwwwwwwwwwwwyk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  '...kkkk..............kkkk.....',
  '...kGGk..............kGGk.....',
  '....kk................kk......',
]

const BURUNG_A = ['k.....k', '.k...k.', '..k.k..', '...k...']
const BURUNG_B = ['.......', 'kkk.kkk', '...k...', '.......']

function Burung({ className }: { className: string }) {
  return (
    <span className={`hs-burung ${className}`}>
      <Sprite rows={BURUNG_A} className="hs-sayap-a" />
      <Sprite rows={BURUNG_B} className="hs-sayap-b" />
    </span>
  )
}

/** Lembar sprite pejalan kaki (8 frame berjajar) dari pelari game, sebagai data URL; null tanpa kanvas. */
function walkerSheet(): string | null {
  if (typeof document === 'undefined') return null
  try {
    const c = document.createElement('canvas')
    c.width = GRID_W * RUN_FRAMES
    c.height = GRID_H
    const ctx = c.getContext('2d')
    if (!ctx) return null
    for (let f = 0; f < RUN_FRAMES; f++) {
      const frame = runnerFrame(f, true)
      if (frame) ctx.drawImage(frame, f * GRID_W, 0)
    }
    return c.toDataURL()
  } catch {
    return null
  }
}

const LAMPU = [10.6, 19.1, 80.9, 89.4]

export default function HeroScene({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [walker] = useState(walkerSheet)

  // Hentikan animasi saat hero di luar layar atau tab disembunyikan.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let visible = true
    const update = () => setPaused(!visible || document.hidden)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      update()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return (
    <div ref={ref} aria-hidden="true" className={`hs-wadah ${className}`} data-paused={paused || undefined}>
      <div className="hs-adegan">
        <img
          src={jalanUrl}
          srcSet={`${jalan960Url} 960w, ${jalanUrl} 1672w`}
          sizes="(min-width: 1024px) 100vw, 800px"
          alt=""
          className="hs-gambar"
          decoding="async"
        />

        {/* Langit */}
        <span className="hs-awan hs-awan-1" />
        <span className="hs-awan hs-awan-2" />
        <span className="hs-awan hs-awan-3" />
        <Burung className="hs-burung-1" />
        <Burung className="hs-burung-2" />
        <Burung className="hs-burung-3" />

        {/* Lampu jalan */}
        {LAMPU.map((x, i) => (
          <span key={x} className="hs-pendar" style={{ left: `${x}%`, animationDelay: `${-i * 0.7}s` }} />
        ))}

        {/* Trotoar */}
        {walker && (
          <>
            <span className="hs-pejalan hs-pejalan-1" style={{ backgroundImage: `url(${walker})` }} />
            <span className="hs-pejalan hs-pejalan-2" style={{ backgroundImage: `url(${walker})` }} />
          </>
        )}

        {/* Lajur atas: ke kanan; lajur bawah: ke kiri */}
        <span className="hs-kendaraan hs-mobil-1">
          <Sprite rows={mobil('b')} />
        </span>
        <span className="hs-kendaraan hs-mobil-2">
          <Sprite rows={mobil('e')} />
        </span>
        <span className="hs-kendaraan hs-bus">
          <Sprite rows={BUS} />
        </span>
        <span className="hs-kendaraan hs-mobil-3">
          <Sprite rows={mobil('t')} />
        </span>
      </div>
    </div>
  )
}
