/**
 * Komponen landing bergaya piksel (redesain 25 Nov 2026). Ikon digambar sendiri dari peta
 * piksel; tidak memakai karakter atau logo pihak lain (CLAUDE.md prinsip 5).
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'


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

export function Chapter({
  id,
  no,
  tag,
  title,
  lead,
  tone = 'teal',
}: {
  id: string
  no: number
  tag: string
  title: string
  lead?: ReactNode
  tone?: 'teal' | 'bata' | 'emas'
}) {
  const bg = tone === 'teal' ? 'bg-teal text-white' : tone === 'bata' ? 'bg-bata text-white' : 'bg-emas text-tinta'
  return (
    <header className="max-w-3xl">
      <p className="eyebrow flex items-center gap-2 text-redup">
        <span className="grid h-6 min-w-9 place-items-center border-2 border-tinta bg-white px-1 text-tinta shadow-tekan">
          {String(no).padStart(2, '0')}
        </span>
        {tag}
      </p>
      <h2 id={id} className={`pita mt-4 text-[28px] sm:text-[40px] ${bg}`}>
        {title}
      </h2>
      {lead && <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-tinta/80">{lead}</p>}
    </header>
  )
}

/* ---------------- Pita berjalan ---------------- */

export function Marquee({ words }: { words: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {words.map((w) => (
        <li key={w} className="flex items-center gap-6 pr-6 font-display text-lg font-bold uppercase tracking-wide sm:text-xl">
          {w}
          <span aria-hidden="true" className="text-teal">
            ✦
          </span>
        </li>
      ))}
    </ul>
  )
  return (
    <div className="overflow-hidden border-y-2 border-tinta bg-emas py-3 text-tinta" aria-label="Isi Rupaloka">
      <div className="anim-pita-jalan flex w-max">
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
}: {
  to: string
  children: ReactNode
  variant?: 'primary' | 'emas' | 'ghost'
}) {
  const v =
    variant === 'primary' ? 'bg-teal text-white' : variant === 'emas' ? 'bg-emas text-tinta' : 'bg-white text-tinta'
  return (
    <Link
      to={to}
      className={`tekan inline-flex items-center gap-2 border-2 border-tinta px-5 py-3 text-[15px] font-extrabold shadow-melayang ${v}`}
    >
      {children}
      <span aria-hidden="true">→</span>
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
  tone: string
}

export function LevelCards({ levels }: { levels: Level[] }) {
  return (
    <ol className="grid gap-6 md:grid-cols-3">
      {levels.map((l, i) => (
        <li key={l.title} className="kotak flex flex-col">
          <div className="flex items-center justify-between border-b-2 border-tinta px-4 py-2">
            <span className="eyebrow text-tinta">Level {String(i + 1).padStart(2, '0')}</span>
            <span className={`grid size-8 place-items-center border-2 border-tinta ${l.tone}`} aria-hidden="true">
              {i + 1}
            </span>
          </div>
          <div className="grid place-items-center border-b-2 border-tinta bg-pasir/60 py-6">
            <PixelIcon rows={l.icon} className="size-20" />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="eyebrow text-amber">{l.tag}</p>
            <h3 className="mt-1 font-display text-2xl font-bold uppercase">{l.title}</h3>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed text-tinta/80">{l.text}</p>
            <div className="mt-5">
              <CtaLink to={l.to} variant="ghost">
                {l.cta}
              </CtaLink>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
