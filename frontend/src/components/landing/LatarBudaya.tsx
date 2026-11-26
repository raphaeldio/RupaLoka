/**
 * Latar hidup untuk bab-bab landing setelah hero (redesain 26 Nov 2026).
 *
 * Tiap bab memakai corak hias Nusantara yang berbeda, digambar sendiri sebagai pola SVG
 * (bukan salinan kain tertentu; tanpa klaim fakta). Hiasan saja: aria-hidden.
 *
 * Ringan untuk semua perangkat:
 * - gerak terus-menerus hanya `transform`/`opacity` (dikerjakan compositor), pola SVG
 *   dirasterisasi sekali lalu digeser satu ubin agar berulang mulus;
 * - animasi dijeda saat bab di luar layar (IntersectionObserver → `data-aktif`);
 * - kursor (hanya `pointer: fine`): sorot cahaya + paralaks lapisan `data-dalam`, satu rAF;
 * - ketuk/klik di latar (semua perangkat): percikan kembang emas kecil, maks. 6 sekaligus;
 * - `prefers-reduced-motion`: semua diam, tanpa paralaks dan percikan.
 */
import { useEffect, useId, useRef, type JSX, type ReactNode, type RefObject } from 'react'
import './latar-budaya.css'

export type Corak = 'kawung' | 'mega' | 'parang' | 'truntum' | 'senja'

/* ---------------- Interaksi ---------------- */

const PERCIK_SVG =
  '<svg viewBox="-20 -20 40 40"><g fill="none" stroke="currentColor" stroke-width="2.2">' +
  '<ellipse cx="0" cy="-9" rx="4" ry="8"/><ellipse cx="0" cy="9" rx="4" ry="8"/>' +
  '<ellipse cx="-9" cy="0" rx="8" ry="4"/><ellipse cx="9" cy="0" rx="8" ry="4"/></g>' +
  '<circle r="2.4" fill="currentColor"/></svg>'

function useLatarHidup(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const lb = ref.current
    const host = lb?.parentElement
    if (!lb || !host) return

    const io =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([e]) => lb.toggleAttribute('data-aktif', e.isIntersecting), { rootMargin: '120px' })
        : null
    if (io) io.observe(host)
    else lb.setAttribute('data-aktif', '')

    const mq = (q: string) => typeof window.matchMedia === 'function' && window.matchMedia(q).matches
    if (mq('(prefers-reduced-motion: reduce)')) return () => io?.disconnect()

    const layers = Array.from(lb.querySelectorAll<HTMLElement>('[data-dalam]'))
    const sorot = lb.querySelector<HTMLElement>('.lb-sorot')
    const wadah = lb.querySelector<HTMLElement>('.lb-percikan')
    let raf = 0
    let cx = 0
    let cy = 0
    const paint = () => {
      raf = 0
      const r = host.getBoundingClientRect()
      const x = cx - r.left
      const y = cy - r.top
      const nx = x / r.width - 0.5
      const ny = y / r.height - 0.5
      for (const l of layers) {
        const d = Number(l.dataset.dalam)
        l.style.transform = `translate3d(${(nx * d).toFixed(1)}px,${(ny * d).toFixed(1)}px,0)`
      }
      if (sorot) sorot.style.transform = `translate3d(${x - 260}px,${y - 260}px,0)`
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      cx = e.clientX
      cy = e.clientY
      if (!raf) raf = requestAnimationFrame(paint)
    }
    const enter = (e: PointerEvent) => e.pointerType === 'mouse' && lb.setAttribute('data-sorot', '')
    const leave = () => lb.removeAttribute('data-sorot')
    const tap = (e: PointerEvent) => {
      if (!wadah || wadah.childElementCount >= 6) return
      if ((e.target as Element | null)?.closest('a,button,input,select,textarea,label,.leaflet-container')) return
      const r = host.getBoundingClientRect()
      const s = document.createElement('span')
      s.className = 'lb-percik'
      s.style.left = `${e.clientX - r.left}px`
      s.style.top = `${e.clientY - r.top}px`
      s.innerHTML = PERCIK_SVG
      wadah.appendChild(s)
      const done = () => s.remove()
      s.addEventListener('animationend', done, { once: true })
      window.setTimeout(done, 1200)
    }

    const fine = mq('(pointer: fine)')
    if (fine) {
      host.addEventListener('pointermove', move, { passive: true })
      host.addEventListener('pointerenter', enter)
      host.addEventListener('pointerleave', leave)
    }
    host.addEventListener('pointerdown', tap, { passive: true })
    return () => {
      io?.disconnect()
      cancelAnimationFrame(raf)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerenter', enter)
      host.removeEventListener('pointerleave', leave)
      host.removeEventListener('pointerdown', tap)
    }
  }, [ref])
}

/* ---------------- Bahan gambar ---------------- */

/** Lapisan pola berulang. `ubin` dipakai CSS untuk menggeser tepat satu ubin (loop mulus). */
function Pola({ ubin, h = ubin, className, children }: { ubin: number; h?: number; className?: string; children: ReactNode }) {
  const id = `pola${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg
      className={`lb-pola ${className ?? ''}`}
      style={{ ['--ubin' as string]: `${ubin}px`, ['--ubin-h' as string]: `${h}px` }}
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width={ubin} height={h} patternUnits="userSpaceOnUse">
          {children}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Gambar piksel; deret huruf sama digabung menjadi satu persegi agar elemen SVG sedikit. */
export function Piksel({ rows, pal, className }: { rows: string[]; pal: Record<string, string>; className?: string }) {
  const w = Math.max(...rows.map((r) => r.length))
  const rects: ReactNode[] = []
  rows.forEach((r, y) => {
    let x = 0
    while (x < r.length) {
      const c = r[x]
      if (!pal[c]) {
        x++
        continue
      }
      let e = x + 1
      while (e < r.length && r[e] === c) e++
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={e - x} height={1} fill={pal[c]} />)
      x = e
    }
  })
  return (
    <svg viewBox={`0 0 ${w} ${rows.length}`} className={`pixel-art ${className ?? ''}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  )
}

const HIJAU = { D: '#2f6b4f', g: '#4f9a64', l: '#8bc29a', e: '#e8b64c', o: '#b5523b', k: '#0e4d4b' }

const PAKIS = [
  '.......l........',
  '......lg....l...',
  '..l...g....lg...',
  '..gl..g...gg....',
  '...gg.gg.gg...l.',
  '.l...ggDgg...lg.',
  '.gg...gDg...gg..',
  '..ggg.gD..ggg...',
  '....ggDDggg.....',
  '.l....DD.....g..',
  '.gg...DD....gg..',
  '..ggg.DD..ggg...',
  '....gggDggg.....',
  '......DD........',
  '......DD........',
  '.....DDDD.......',
]
const KEMBANG = [
  '..e.......',
  '.eoe...e..',
  '..e...eoe.',
  '..g....e..',
  '..g...g...',
  '...g.g..e.',
  '...gg..eoe',
  '...g...ge.',
  '..gg..g...',
  '.g.g.g....',
  '...gg.....',
  '...g......',
]
const LAYANG = [
  '....k....',
  '...kek...',
  '..keeek..',
  '.keeoeek.',
  'keeoooeek',
  '.keeoeek.',
  '..keeek..',
  '...kek...',
  '....k....',
  '....g....',
  '...e.....',
  '....g....',
  '...o.....',
  '....g....',
]

function Kawung({ warna, tebal = 1.6 }: { warna: string; tebal?: number }) {
  return (
    <g fill="none" stroke={warna} strokeWidth={tebal}>
      <ellipse cx="28" cy="14" rx="6.5" ry="11.5" />
      <ellipse cx="28" cy="42" rx="6.5" ry="11.5" />
      <ellipse cx="14" cy="28" rx="11.5" ry="6.5" />
      <ellipse cx="42" cy="28" rx="11.5" ry="6.5" />
      <g fill={warna} stroke="none">
        <circle cx="28" cy="28" r="2.2" />
        <circle cx="28" cy="10" r="1.3" />
        <circle cx="28" cy="46" r="1.3" />
        <circle cx="10" cy="28" r="1.3" />
        <circle cx="46" cy="28" r="1.3" />
      </g>
      <circle cx="0" cy="0" r="3.4" />
      <circle cx="56" cy="0" r="3.4" />
      <circle cx="0" cy="56" r="3.4" />
      <circle cx="56" cy="56" r="3.4" />
    </g>
  )
}

function Bunga({ cx, cy, r, p }: { cx: number; cy: number; r: number; p: number }) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} cx={cx + Math.cos((i * Math.PI) / 4) * r} cy={cy + Math.sin((i * Math.PI) / 4) * r} r={p} />
      ))}
      <circle cx={cx} cy={cy} r={p * 0.8} />
    </g>
  )
}

const AWAN_D =
  'M20 80C5 80 5 58 24 56C18 36 44 26 58 40C62 18 96 12 106 36C118 22 146 26 146 48C166 44 182 58 172 72C186 78 180 90 166 90L30 90C18 90 14 84 20 80Z'

/** Awan berlapis (gaya mega mendung): garis luar bertingkat ke dalam. */
function AwanBerlapis({ className }: { className?: string }) {
  const lapis = ['#0e4d4b', '#1d7f7b', '#5aa39b', '#a9d0c7', '#e3efec']
  return (
    <svg viewBox="0 0 200 100" className={className} aria-hidden="true">
      {lapis.map((f, i) => {
        const s = 1 - i * 0.16
        return <path key={f} d={AWAN_D} fill={f} transform={`translate(95 64) scale(${s}) translate(-95 -64)`} />
      })}
    </svg>
  )
}

/* ---------------- Corak per bab ---------------- */

function CorakKawung() {
  return (
    <>
      <div className="lb-area lb-area-kanan" data-dalam="-16">
        <Pola ubin={56} className="lb-geser-miring">
          <Kawung warna="#d6ad5c" />
        </Pola>
      </div>
      <div className="lb-area lb-area-kiri" data-dalam="10">
        <Pola ubin={56} className="lb-geser-miring lb-lambat">
          <Kawung warna="#9cc4b8" tebal={1.2} />
        </Pola>
      </div>
      {/* Medali bulat penuh bermotif kawung, tanaman piksel tumbuh di dalamnya. */}
      <div className="lb-bukit lb-bukit-kiri" data-dalam="8">
        <Pola ubin={56}>
          <rect width="56" height="56" fill="#0e4d4b" />
          <Kawung warna="#e8b64c" tebal={1.4} />
        </Pola>
        <Piksel rows={PAKIS} pal={HIJAU} className="lb-tanaman lb-tanaman-kiri" />
      </div>
      <div className="lb-bukit lb-bukit-kanan" data-dalam="8">
        <Pola ubin={56}>
          <rect width="56" height="56" fill="#0e4d4b" />
          <Kawung warna="#e8b64c" tebal={1.4} />
        </Pola>
        <Piksel rows={KEMBANG} pal={HIJAU} className="lb-tanaman lb-tanaman-kanan" />
      </div>
      <span className="lb-kilau" style={{ top: '18%', left: '46%' }} />
      <span className="lb-kilau" style={{ top: '62%', left: '8%', animationDelay: '-1.4s' }} />
      <span className="lb-kilau" style={{ top: '34%', right: '6%', animationDelay: '-2.6s' }} />
    </>
  )
}

function CorakMega() {
  return (
    <>
      <div className="lb-awan-wadah" data-dalam="-22" style={{ top: '4%', left: '-4%' }}>
        <AwanBerlapis className="lb-awan-mega" />
      </div>
      <div className="lb-awan-wadah lb-awan-kanan" data-dalam="-34" style={{ top: '22%', right: '-6%' }}>
        <AwanBerlapis className="lb-awan-mega lb-balik" />
      </div>
      <div className="lb-awan-wadah lb-awan-kecil" data-dalam="-12" style={{ top: '58%', left: '2%' }}>
        <AwanBerlapis className="lb-awan-mega" />
      </div>
      <div className="lb-ombak">
        <Pola ubin={64} h={18} className="lb-geser-datar">
          <path d="M0 9Q8 2 16 9T32 9T48 9T64 9" fill="none" stroke="#1d7f7b" strokeWidth="1.6" />
        </Pola>
        <Pola ubin={64} h={18} className="lb-geser-datar lb-balik-arah lb-ombak-2">
          <path d="M0 9Q8 2 16 9T32 9T48 9T64 9" fill="none" stroke="#5aa39b" strokeWidth="1.4" />
        </Pola>
      </div>
    </>
  )
}

function CorakParang() {
  return (
    <>
      <div className="lb-area lb-pita-parang" data-dalam="12">
        <Pola ubin={48} className="lb-geser-datar">
          <path d="M0 24L24 0M24 48L48 24" stroke="#146b68" strokeWidth="5" strokeLinecap="round" />
          <path d="M0 48L48 0" stroke="#e8b64c" strokeWidth="1.4" strokeDasharray="3 5" />
          <path d="M24 17L31 24L24 31L17 24Z" fill="#e8b64c" />
          <circle cx="6" cy="42" r="2" fill="#b5523b" />
          <circle cx="42" cy="6" r="2" fill="#b5523b" />
        </Pola>
      </div>
      <div className="lb-layang-wadah" data-dalam="-30" style={{ top: '10%', right: '7%' }}>
        <Piksel rows={LAYANG} pal={HIJAU} className="lb-layang" />
      </div>
      <div className="lb-layang-wadah lb-layang-kecil" data-dalam="-18" style={{ top: '6%', left: '6%' }}>
        <Piksel rows={LAYANG} pal={{ ...HIJAU, e: '#8bc29a', o: '#146b68' }} className="lb-layang lb-tunda" />
      </div>
    </>
  )
}

function CorakTruntum() {
  return (
    <>
      <div className="lb-area lb-penuh" data-dalam="-14">
        <Pola ubin={96} className="lb-kerlip">
          <g fill="#f3d58c">
            <Bunga cx={22} cy={24} r={6.5} p={2.4} />
            <Bunga cx={70} cy={70} r={4.5} p={1.7} />
          </g>
        </Pola>
      </div>
      <div className="lb-area lb-penuh" data-dalam="-26">
        <Pola ubin={96} className="lb-kerlip lb-kerlip-2">
          <g fill="#a9d0c7">
            <Bunga cx={72} cy={20} r={3.6} p={1.4} />
            <Bunga cx={26} cy={74} r={5} p={1.9} />
          </g>
        </Pola>
      </div>
      <div className="lb-pinggir lb-pinggir-atas">
        <Pola ubin={28} h={16} className="lb-geser-datar lb-lambat">
          <path d="M0 16L14 3L28 16Z" fill="#0b3d3b" stroke="#e8b64c" strokeWidth="1.3" />
          <path d="M7 16L14 9L21 16" fill="none" stroke="#e8b64c" strokeWidth="1.1" />
        </Pola>
      </div>
    </>
  )
}

function CorakSenja() {
  return (
    <>
      <span className="lb-sinar" />
      <div className="lb-area lb-penuh lb-pudar" data-dalam="-14">
        <Pola ubin={56} className="lb-geser-miring lb-lambat">
          <Kawung warna="#e8b64c" tebal={1.2} />
        </Pola>
      </div>
    </>
  )
}

const ISI: Record<Corak, () => JSX.Element> = {
  kawung: CorakKawung,
  mega: CorakMega,
  parang: CorakParang,
  truntum: CorakTruntum,
  senja: CorakSenja,
}

/** Pasang sebagai anak pertama `<section class="relative isolate overflow-clip">`; isi bab diberi `relative z-10`. */
export default function LatarBudaya({ corak }: { corak: Corak }) {
  const ref = useRef<HTMLDivElement>(null)
  useLatarHidup(ref)
  const Isi = ISI[corak]
  return (
    <div ref={ref} aria-hidden="true" className={`lb lb-${corak}`}>
      <Isi />
      <div className="lb-sorot" />
      <div className="lb-percikan" />
    </div>
  )
}
