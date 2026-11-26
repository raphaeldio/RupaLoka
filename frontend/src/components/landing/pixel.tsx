/**
 * Komponen landing bergaya piksel (redesain 25 Nov 2026). Ikon digambar sendiri dari peta
 * piksel; tidak memakai karakter atau logo pihak lain (CLAUDE.md prinsip 5).
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './latar-budaya.css'


/* ---------------- Ikon piksel ---------------- */

const PAL: Record<string, string> = {
  t: '#146b68', // teal
  e: '#e8b64c', // emas
  b: '#b5523b', // bata
  k: '#1d2a2a', // tinta
  w: '#ffffff',
  d: '#8bb9a0', // daun
  p: '#ede6d6', // pasir
}

/** Gambar ikon dari baris string; tiap karakter = satu piksel (spasi/titik = kosong). */
export function PixelIcon({ rows, className, label }: { rows: string[]; className?: string; label?: string }) {
  const h = rows.length
  const w = Math.max(...rows.map((r) => r.length))
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`pixel-art ${className ?? ''}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rows.flatMap((r, y) =>
        [...r].map((c, x) => (PAL[c] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PAL[c]} /> : null)),
      )}
    </svg>
  )
}

/* ---------------- Judul bab ---------------- */

const Bintang = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
    <path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z" fill="currentColor" />
  </svg>
)

/**
 * Kepala bab bergaya "nuansa" (26 Nov 2026): label pil bernomor, judul tebal teal dengan baris
 * kedua emas. `tone="gelap"` untuk bab berlatar gelap.
 */
export function Chapter({
  id,
  no,
  tag,
  title,
  accent,
  lead,
  tone = 'terang',
  align = 'left',
}: {
  id: string
  no: number
  tag: ReactNode
  title: ReactNode
  /** Baris kedua judul berwarna emas. */
  accent?: ReactNode
  lead?: ReactNode
  tone?: 'terang' | 'gelap'
  align?: 'left' | 'center'
}) {
  const gelap = tone === 'gelap'
  return (
    <header className={`max-w-3xl ${align === 'center' ? 'mx-auto text-center' : ''}`} data-anim="chapter">
      <p
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] shadow-[0_8px_20px_-10px_rgb(14_77_75/0.35)] sm:text-[13px] ${
          gelap ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-white/95 text-teal-800'
        }`}
      >
        <span data-anim-part="no" className="inline-flex items-center gap-2">
          <Bintang className="size-3.5 text-emas" />
          {String(no).padStart(2, '0')}
        </span>
        <span>{tag}</span>
      </p>
      <h2
        id={id}
        data-anim-part="pita"
        className={`mt-5 font-sans text-[34px] font-black leading-[1.06] tracking-[-0.015em] sm:text-[46px] lg:text-[54px] ${
          gelap ? 'text-white' : 'text-teal-800'
        }`}
      >
        {title}
        {accent && <span className={`block ${gelap ? 'teks-emas teks-emas-terang' : 'teks-emas'}`}>{accent}</span>}
      </h2>
      {lead && (
        <p
          data-anim-part="lead"
          className={`mt-5 max-w-2xl text-[16px] leading-relaxed sm:text-[18px] ${align === 'center' ? 'mx-auto' : ''} ${
            gelap ? 'text-white/80' : 'text-tinta/80'
          }`}
        >
          {lead}
        </p>
      )}
    </header>
  )
}

/* ---------------- Pita berjalan ---------------- */

/** Pita batik berjalan: dasar teal tua, pinggiran belah ketupat emas, teks emas. */
export function Marquee({ words }: { words: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {words.map((w) => (
        <li key={w} className="flex items-center gap-6 pr-6 text-[15px] font-black uppercase tracking-[0.06em] sm:text-[17px]">
          {w}
          <Bintang className="size-3.5 text-emas" />
        </li>
      ))}
    </ul>
  )
  return (
    <div data-anim="marquee" className="pita-batik -mx-2 overflow-hidden bg-teal-800 text-[#f6d98e]" aria-label="Isi Rupaloka">
      <div className="anim-pita-jalan flex w-max py-3">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}

/* ---------------- Tombol aksi ---------------- */

export function CtaLink({
  to,
  children,
  variant = 'primary',
  part,
}: {
  to: string
  children: ReactNode
  variant?: 'primary' | 'emas' | 'ghost'
  /** Penanda animasi (data-anim-part), opsional. */
  part?: string
}) {
  const v = variant === 'primary' ? 'pil-teal' : variant === 'emas' ? 'pil-emas' : 'pil-putih'
  return (
    <Link to={to} data-anim-part={part} className={`pil group ${v}`}>
      {children}
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
        →
      </span>
    </Link>
  )
}

/* ---------------- Kartu level ---------------- */

export interface Level {
  tag: string
  title: string
  text: string
  icon: string[]
  to: string
  cta: string
  /** Warna aksen kartu. */
  tone: 'teal' | 'bata' | 'emas'
}

const NADA: Record<Level['tone'], { pita: string; ubin: string; no: string }> = {
  teal: { pita: 'from-teal-800 to-teal-600', ubin: 'bg-daun-100', no: 'bg-teal-800 text-white' },
  bata: { pita: 'from-[#8f3d2b] to-bata', ubin: 'bg-bata-50', no: 'bg-bata text-white' },
  emas: { pita: 'from-amber to-emas', ubin: 'bg-emas-100', no: 'bg-emas text-tinta' },
}

/**
 * Tiga mode sebagai "tiket" bertangga: kepala berpita dengan motif, medali ikon yang menembus
 * kepala, dan sambungan putus-putus antarkartu di layar lebar (beda dari kartu bab 01).
 */
export function LevelCards({ levels }: { levels: Level[] }) {
  return (
    <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[16%] right-[16%] top-[74px] hidden border-t-[3px] border-dashed border-emas/70 md:block"
      />
      {levels.map((l, i) => {
        const n = NADA[l.tone]
        return (
          <li
            key={l.title}
            data-anim="card"
            data-angkat
            className={`kartu-nuansa relative flex flex-col overflow-hidden ${i === 1 ? 'md:translate-y-8' : ''}`}
          >
            <div className={`tiket-kepala relative h-[96px] bg-gradient-to-br ${n.pita}`}>
              <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] ring-2 ring-white/70 ${n.no}`}>
                Mode {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <div className={`ikon-lompat relative z-10 mx-auto -mt-11 grid size-[88px] place-items-center rounded-[26px] ring-4 ring-white ${n.ubin}`}>
              <PixelIcon rows={l.icon} className="size-14" />
            </div>
            <div className="flex flex-1 flex-col px-6 pb-6 pt-4 text-center">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-amber">{l.tag}</p>
              <h3 className="mt-1 text-[24px] font-black text-teal-800">{l.title}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-tinta/75">{l.text}</p>
              <div className="mt-5">
                <CtaLink to={l.to} variant="ghost">
                  {l.cta}
                </CtaLink>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
