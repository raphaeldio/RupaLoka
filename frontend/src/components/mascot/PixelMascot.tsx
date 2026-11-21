/**
 * Maskot Rupaloka dalam piksel (SVG), diturunkan dari desain tim: makhluk laut bermahkota
 * dengan baju bermotif. Warna disesuaikan tema (teal + emas). Nama maskot masih TODO (T-005).
 *
 * Badan dibuat dari peta piksel setengah kiri yang dicerminkan; mata, lengan, ekor, dan
 * mulut adalah bagian terpisah agar bisa dianimasikan (mata mengikuti kursor, lengan
 * melambai). Komponen ini murni tampilan; interaksi ada di HeroMascot.tsx.
 */
import { memo } from 'react'

export const MASCOT_W = 34
export const MASCOT_H = 30

const PALETTE: Record<string, string> = {
  O: '#0e4d4b', // garis tepi (teal-800)
  B: '#1d7f7b', // badan (teal-600)
  b: '#146b68', // bayangan badan (teal)
  W: '#f5f1e8', // moncong/dada (kertas)
  w: '#e6dcc6', // bayangan moncong
  P: '#eeb48f', // pipi merona
  G: '#e8b64c', // emas
  A: '#a8761a', // emas gelap (amber)
  J: '#8bb9a0', // permata (daun)
  S: '#0e4d4b', // baju (teal gelap)
  K: '#c9952f', // kain bawah (emas tua)
  D: '#7a5512', // motif gelap
}

// Setengah kiri (kolom 0-15); kolom 16-31 adalah cerminannya.
const HALF = [
  '...............G', // 0  ujung mahkota
  '..............GG', // 1
  '........G....GGA', // 2
  '.......GGG..GGAJ', // 3
  '......GGAGGGGAGJ', // 4
  '......GAGGAGGGAG', // 5
  '......AAAAAAAAAA', // 6  pita mahkota
  '.......OBBBBBBBB', // 7  kepala
  '.....OOBBBBBBBBB', // 8
  '....OBBBBBBBBBBB', // 9
  '..OOOBBBBBBBBBBB', // 10 sirip telinga
  '.OBBOBBBBBBBBBBB', // 11
  '.ObbOBPPWWWWWWWW', // 12 pipi + moncong
  '..OOOObWWWWWWWWW', // 13
  '.....OObwWWWWWWW', // 14
  '.......OSwWWWWWW', // 15 kerah
  '.......OSSwWWWWW', // 16
  '.......OSGSSwWWW', // 17 baju bermotif
  '.......OSSSGSwWW', // 18
  '.......OSSGSSSGw', // 19
  '.......OSGSSGSSS', // 20
  '.......OGGGGGGGG', // 21 sabuk
  '.......OKGKKKGKK', // 22 kain
  '.......OKDGKDGKK', // 23
  '.......OKGKKKGKK', // 24
  '.......OKDGKDGKD', // 25
  '.......OOOOOOOOO', // 26
  '.......OBBBO....', // 27 kaki
  '.......OOOOO....', // 28
]

const ARM = ['..OOO', '.OBBO', 'OBBBO', 'OBbO.', '.OO..'] // lengan kiri
const TAIL = ['.OO..OO', '.OBOOBO', 'OOBBBBO', 'OB.ObbO.', 'OO..OO..'] // sirip ekor

type Px = { x: number; y: number; c: string }

function pixels(rows: string[], ox = 0, oy = 0, mirror = false): Px[] {
  const out: Px[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      out.push({ x: ox + (mirror ? row.length - 1 - x : x), y: oy + y, c: PALETTE[ch] })
    }
  })
  return out
}

/** Gabungkan piksel sewarna yang berderet mendatar menjadi satu <rect> (lebih ringan). */
function runs(px: Px[]): { x: number; y: number; w: number; c: string }[] {
  const sorted = [...px].sort((a, b) => a.y - b.y || a.x - b.x)
  const out: { x: number; y: number; w: number; c: string }[] = []
  for (const p of sorted) {
    const last = out[out.length - 1]
    if (last && last.y === p.y && last.c === p.c && last.x + last.w === p.x) last.w++
    else out.push({ x: p.x, y: p.y, w: 1, c: p.c })
  }
  return out
}

const BODY = runs([...pixels(HALF), ...HALF.flatMap((row, y) => pixels([row], 16, y, true))])
const LEFT_ARM = runs(pixels(ARM, 3, 16))
const RIGHT_ARM = runs(pixels(ARM, 24, 16, true))
const TAIL_PX = runs(pixels(TAIL, 24, 21))

const Rects = ({ list }: { list: { x: number; y: number; w: number; c: string }[] }) => (
  <>
    {list.map((r) => (
      <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w + 0.02} height={1.02} fill={r.c} />
    ))}
  </>
)

export type MascotFace = 'normal' | 'blink' | 'happy' | 'thinking'

export interface PixelMascotProps {
  /** Geser pupil, -1..1 per sumbu (mengikuti kursor). */
  look?: { x: number; y: number }
  face?: MascotFace
  /** Mulut terbuka (sedang bicara/menyapa). */
  talking?: boolean
  /** Lengan kanan melambai. */
  waving?: boolean
  className?: string
  title?: string
}

function Eye({ x, look, face }: { x: number; look: { x: number; y: number }; face: MascotFace }) {
  const dx = Math.round(look.x * 2) / 2 // langkah setengah piksel
  const dy = Math.round(look.y * 2) / 2
  if (face === 'blink') return <rect x={x} y={10.5} width={2} height={0.6} fill="#1d2a2a" />
  if (face === 'happy')
    return (
      <g fill="#1d2a2a">
        <rect x={x} y={10} width={0.7} height={0.7} />
        <rect x={x + 0.6} y={9.4} width={0.8} height={0.7} />
        <rect x={x + 1.3} y={10} width={0.7} height={0.7} />
      </g>
    )
  const lift = face === 'thinking' ? -0.5 : 0
  return (
    <g style={{ transform: `translate(${dx}px, ${dy + lift}px)`, transition: 'transform 120ms ease-out' }}>
      <rect x={x} y={9} width={2} height={2} fill="#1d2a2a" />
      <rect x={x + 1} y={9} width={0.7} height={0.7} fill="#f5f1e8" />
    </g>
  )
}

function PixelMascot({ look = { x: 0, y: 0 }, face = 'normal', talking = false, waving = false, className, title }: PixelMascotProps) {
  return (
    <svg
      viewBox={`0 0 ${MASCOT_W} ${MASCOT_H}`}
      className={className}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g className="maskot-ekor">
        <Rects list={TAIL_PX} />
      </g>
      <Rects list={BODY} />
      <Rects list={LEFT_ARM} />
      <g className={waving ? 'maskot-lambai' : undefined}>
        <Rects list={RIGHT_ARM} />
      </g>
      <Eye x={9} look={look} face={face} />
      <Eye x={21} look={look} face={face} />
      {talking ? (
        <g>
          <rect x={15} y={14} width={2} height={1.4} fill="#7a3b2e" />
          <rect x={15.4} y={14.8} width={1.2} height={0.6} fill="#e98a7a" />
        </g>
      ) : face === 'happy' ? (
        <rect x={15} y={14} width={2} height={0.7} fill="#7a3b2e" />
      ) : null}
    </svg>
  )
}

export default memo(PixelMascot)
