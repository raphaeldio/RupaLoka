/**
 * Alur kamera galeri (murni, tanpa three.js): jalur, state, transisi, dan pose kamera.
 * Kamera selalu berjalan "maju" di sepanjang jalur; objek berdiri di sisi kiri dan
 * kanan jalur bergantian. Jalur berbentuk lorong melingkar (cincin) tanpa ujung.
 * Klik objek = kamera menoleh dan mendekat, klik lagi = periksa, Esc = mundur.
 */

export type Vec3 = [number, number, number]
export type Side = -1 | 1 // −1 kiri, 1 kanan (dari arah jalan)

export interface Exhibit {
  id: string
  label: string
  /** jarak sepanjang jalur (m) */
  d: number
  side: Side
  placeholder?: boolean
}

/** Titik jalur: posisi (y=0), arah maju, dan normal kanan (semuanya satuan). */
export interface Frame {
  p: Vec3
  t: Vec3
  n: Vec3
}

export interface Layout {
  /** keliling garis tengah lorong */
  length: number
  /** jari-jari garis tengah lorong */
  radius: number
  exhibits: Exhibit[]
  at: (d: number) => Frame
}

/** Setengah lebar lorong; pedestal berdiri 0.7 m dari dinding. */
export const HALF_W = 2.6
export const PEDESTAL_X = HALF_W - 0.7
export const EYE = 1.6
const FIRST_D = 3
/** Saat berjalan, objek "dilewati" adalah yang ±LOOKAHEAD m di depan kamera. */
const LOOKAHEAD = 2.4
/** Jari-jari garis tengah lorong melingkar dan jumlah slot pedestal di kelilingnya. */
const RING_R = 6
const RING_SLOTS = 12

type ItemIn = { id: string; label: string; placeholder?: boolean }

export function makeLayout(items: ItemIn[]): Layout {
  // Melingkar: pusat lingkaran di kiri titik awal, berjalan berlawanan arah jarum jam
  // (dilihat dari atas). Kiri = dinding dalam, kanan = dinding luar.
  const R = RING_R
  const length = 2 * Math.PI * R
  const slots: ItemIn[] = Array.from({ length: RING_SLOTS }, (_, i) =>
    items[i] ?? { id: `slot-${i + 1}`, label: 'Segera hadir', placeholder: true },
  )
  const exhibits = slots.map((it, i) => ({
    ...it,
    d: FIRST_D + (i * length) / RING_SLOTS,
    side: (i % 2 === 0 ? -1 : 1) as Side,
  }))
  return {
    length,
    radius: R,
    exhibits,
    at: (d) => {
      const a = d / R
      const c = Math.cos(a)
      const s = Math.sin(a)
      return { p: [-R + R * c, 0, -R * s], t: [-s, 0, -c], n: [c, 0, -s] }
    },
  }
}

/** Pusat lingkaran di dunia. */
export function ringCenter(L: Layout): Vec3 {
  return [-L.radius, 0, 0]
}

const wrap = (v: number, len: number) => ((v % len) + len) % len

function normD(L: Layout, d: number): number {
  return wrap(d, L.length)
}

/** Selisih jarak jalur (bertanda), lewat arah terpendek di cincin. */
function delta(L: Layout, from: number, to: number): number {
  const w = wrap(to - from, L.length)
  return w > L.length / 2 ? w - L.length : w
}

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]

/** Posisi pusat pedestal di dunia. */
export function exhibitPos(L: Layout, e: Exhibit, y = 0): Vec3 {
  const f = L.at(e.d)
  const p = add(f.p, f.n, e.side * PEDESTAL_X)
  return [p[0], y, p[2]]
}

/** Rotasi Y pedestal agar menghadap ke tengah lorong (lokal +Z → −side·n). */
export function exhibitYaw(L: Layout, e: Exhibit): number {
  const n = L.at(e.d).n
  return Math.atan2(-e.side * n[0], -e.side * n[2])
}

export function nearestIndex(L: Layout, d: number): number {
  const ahead = d + LOOKAHEAD
  let best = 0
  L.exhibits.forEach((e, i) => {
    if (Math.abs(delta(L, ahead, e.d)) < Math.abs(delta(L, ahead, L.exhibits[best].d))) best = i
  })
  return best
}

/** Titik berdiri saat berjalan agar objek ke-i tampak serong di depan. */
const standFor = (L: Layout, e: Exhibit) => normD(L, e.d - LOOKAHEAD)

export type CamState =
  | { kind: 'intro' }
  | { kind: 'walk'; d: number }
  | { kind: 'focus'; index: number }
  | { kind: 'inspect'; index: number }

export type CamAction =
  | { type: 'introDone' }
  | { type: 'walkBy'; delta: number }
  | { type: 'clickExhibit'; index: number }
  | { type: 'step'; dir: -1 | 1 }
  | { type: 'back' }
  | { type: 'goto'; index: number }

export function reduce(s: CamState, a: CamAction, L: Layout): CamState {
  const ex = L.exhibits
  const n = ex.length
  switch (a.type) {
    case 'introDone':
      return s.kind === 'intro' ? { kind: 'walk', d: 0 } : s
    case 'walkBy':
      if (s.kind === 'walk') return { kind: 'walk', d: normD(L, s.d + a.delta) }
      // scroll saat fokus: kembali ke tengah lorong lalu lanjut berjalan
      if (s.kind === 'focus') return { kind: 'walk', d: normD(L, standFor(L, ex[s.index]) + a.delta) }
      return s
    case 'clickExhibit':
      if (ex[a.index]?.placeholder) return s
      if (s.kind === 'focus' && s.index === a.index) return { kind: 'inspect', index: a.index }
      if (s.kind === 'walk' || s.kind === 'focus') return { kind: 'focus', index: a.index }
      return s
    case 'step': {
      if (s.kind === 'walk') {
        const i = wrap(nearestIndex(L, s.d) + a.dir, n)
        return { kind: 'walk', d: standFor(L, ex[i]) }
      }
      if (s.kind === 'focus') {
        // lompat ke objek asli berikutnya, lewati slot "Segera hadir"
        for (let k = 1; k < n; k++) {
          const i = wrap(s.index + a.dir * k, n)
          if (!ex[i].placeholder) return { kind: 'focus', index: i }
        }
        return s
      }
      return s
    }
    case 'back':
      if (s.kind === 'inspect') return { kind: 'focus', index: s.index }
      if (s.kind === 'focus') return { kind: 'walk', d: standFor(L, ex[s.index]) }
      return s
    case 'goto':
      return ex[a.index]?.placeholder ? s : { kind: 'focus', index: a.index }
  }
}

export interface Pose {
  position: Vec3
  target: Vec3
}

/**
 * Pose kamera untuk tiap state.
 * - walk: di tengah lorong, menatap titik jalur 3 m di depan (pandangan ikut melengkung).
 * - focus/inspect: menoleh ke samping, menghadap objek.
 * `portrait` (0..1): di layar tegak kamera mundur dan melirik ke sisi objek terdekat.
 */
export function poseFor(s: CamState, L: Layout, portrait = 0): Pose {
  const withY = (v: Vec3, y: number): Vec3 => [v[0], y, v[2]]
  switch (s.kind) {
    case 'intro': {
      const f = L.at(0)
      return { position: withY(add(f.p, f.t, -4), EYE + 0.3), target: withY(L.at(6).p, 1.4) }
    }
    case 'walk': {
      const f = L.at(s.d)
      const ahead = L.at(s.d + 3)
      const glance = portrait * 1.1 * L.exhibits[nearestIndex(L, s.d)].side
      return { position: withY(f.p, EYE), target: withY(add(ahead.p, ahead.n, glance), 1.45) }
    }
    case 'focus':
    case 'inspect': {
      const e = L.exhibits[s.index]
      const f = L.at(e.d)
      const dist = s.kind === 'focus' ? 2.1 + portrait * 0.6 : 1.3 + portrait * 0.5
      const pos = add(f.p, f.n, e.side * (PEDESTAL_X - dist))
      const y = s.kind === 'focus' ? 1.55 : 1.45
      return { position: withY(pos, y), target: exhibitPos(L, e, s.kind === 'focus' ? 1.3 : 1.35) }
    }
  }
}

/** Indeks objek untuk label bawah layar. */
export function currentIndex(s: CamState, L: Layout): number {
  if (s.kind === 'walk') return nearestIndex(L, s.d)
  if (s.kind === 'intro') return 0
  return s.index
}

/** Peluruhan eksponensial yang tidak bergantung frame rate. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
