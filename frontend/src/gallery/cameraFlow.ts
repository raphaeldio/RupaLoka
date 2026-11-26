/**
 * Alur kamera galeri 3D (murni, tanpa three.js; SDD ADR 40, spesifikasi §2.1).
 * Diport dari purwarupa `mocks/galeri-kamera/src/flow.ts`.
 *
 * Lorong melingkar tanpa ujung: kamera berjalan maju di garis tengah, pedestal berdiri
 * bergantian di dinding dalam (kiri) dan luar (kanan). Klik objek = menoleh dan mendekat,
 * klik lagi = periksa, Esc = mundur satu tingkat.
 *
 * Rumus jalur harus sama dengan `backend/app/ring.py` (vektor uji bersama di uji).
 */

export type Vec3 = [number, number, number]
export type Side = -1 | 1 // −1 kiri (dinding dalam), 1 kanan (dinding luar)

export interface RingParams {
  radius: number
  slots: number
  first_d: number
}

export interface Exhibit {
  id: string
  label: string
  /** jarak sepanjang jalur (m) */
  d: number
  side: Side
  /** indeks data pameran (GalleryOut.exhibits); null = slot "Segera hadir" */
  source: number | null
}

/** Titik jalur: posisi (y=0), arah maju, dan normal kanan (satuan). */
export interface Frame {
  p: Vec3
  t: Vec3
  n: Vec3
}

export interface Layout {
  length: number
  radius: number
  exhibits: Exhibit[]
  at: (d: number) => Frame
}

export const HALF_W = 2.6
export const PEDESTAL_X = HALF_W - 0.7
export const EYE = 1.6
/** Saat berjalan, objek "dilewati" adalah yang ±LOOKAHEAD m di depan kamera. */
export const LOOKAHEAD = 2.4

export function makeLayout(labels: { id: string; label: string }[], ring: RingParams): Layout {
  const R = ring.radius
  const length = 2 * Math.PI * R
  const exhibits: Exhibit[] = Array.from({ length: Math.max(ring.slots, labels.length) }, (_, i) => ({
    id: labels[i]?.id ?? `slot-${i + 1}`,
    label: labels[i]?.label ?? 'Segera hadir',
    d: ring.first_d + (i * length) / ring.slots,
    side: (i % 2 === 0 ? -1 : 1) as Side,
    source: i < labels.length ? i : null,
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

export const ringCenter = (L: Layout): Vec3 => [-L.radius, 0, 0]

const wrap = (v: number, len: number) => ((v % len) + len) % len

/** Selisih jarak jalur (bertanda), lewat arah terpendek di cincin. */
export function ringDelta(L: Layout, from: number, to: number): number {
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

/** Rotasi Y pedestal agar menghadap garis tengah lorong (lokal +Z → −side·n). */
export function exhibitYaw(L: Layout, e: Exhibit): number {
  const n = L.at(e.d).n
  return Math.atan2(-e.side * n[0], -e.side * n[2])
}

export function nearestIndex(L: Layout, d: number): number {
  const ahead = d + LOOKAHEAD
  let best = 0
  L.exhibits.forEach((e, i) => {
    if (Math.abs(ringDelta(L, ahead, e.d)) < Math.abs(ringDelta(L, ahead, L.exhibits[best].d))) best = i
  })
  return best
}

/** Titik berdiri saat berjalan agar objek ke-i tampak serong di depan. */
export const standFor = (L: Layout, e: Exhibit) => wrap(e.d - LOOKAHEAD, L.length)

export type CamState =
  | { kind: 'intro' }
  | { kind: 'walk'; d: number }
  | { kind: 'focus'; index: number }
  | { kind: 'inspect'; index: number }
  /** Melihat pajangan dinding (lukisan) di seberang pedestal ke-`index`. */
  | { kind: 'decor'; index: number }

export type CamAction =
  | { type: 'introDone' }
  | { type: 'walkBy'; delta: number }
  | { type: 'clickExhibit'; index: number }
  | { type: 'step'; dir: -1 | 1 }
  | { type: 'back' }
  | { type: 'goto'; index: number }
  | { type: 'clickDecor'; index: number }

const isEmpty = (e: Exhibit | undefined) => !e || e.source === null

export function reduce(s: CamState, a: CamAction, L: Layout): CamState {
  const ex = L.exhibits
  const n = ex.length
  switch (a.type) {
    case 'introDone':
      return s.kind === 'intro' ? { kind: 'walk', d: 0 } : s
    case 'walkBy':
      if (s.kind === 'walk') return { kind: 'walk', d: wrap(s.d + a.delta, L.length) }
      if (s.kind === 'focus' || s.kind === 'decor')
        return { kind: 'walk', d: wrap(standFor(L, ex[s.index]) + a.delta, L.length) }
      return s
    case 'clickExhibit':
      if (isEmpty(ex[a.index])) return s
      if (s.kind === 'focus' && s.index === a.index) return { kind: 'inspect', index: a.index }
      if (s.kind === 'walk' || s.kind === 'focus' || s.kind === 'intro') return { kind: 'focus', index: a.index }
      return s
    case 'step': {
      if (s.kind === 'walk' || s.kind === 'intro' || s.kind === 'decor') {
        const from = s.kind === 'walk' ? nearestIndex(L, s.d) : s.kind === 'decor' ? s.index : n - 1
        const i = wrap(from + a.dir, n)
        return { kind: 'walk', d: standFor(L, ex[i]) }
      }
      // fokus/periksa: lompat ke pameran berikutnya, lewati slot kosong
      for (let k = 1; k < n; k++) {
        const i = wrap(s.index + a.dir * k, n)
        if (!isEmpty(ex[i])) return { kind: 'focus', index: i }
      }
      return s
    }
    case 'clickDecor':
      return ex[a.index] && s.kind !== 'inspect' ? { kind: 'decor', index: a.index } : s
    case 'back':
      if (s.kind === 'decor') return { kind: 'walk', d: standFor(L, ex[s.index]) }
      if (s.kind === 'inspect') return { kind: 'focus', index: s.index }
      if (s.kind === 'focus') return { kind: 'walk', d: standFor(L, ex[s.index]) }
      return s
    case 'goto':
      return isEmpty(ex[a.index]) ? s : { kind: 'focus', index: a.index }
  }
}

export interface Pose {
  position: Vec3
  target: Vec3
}

/**
 * Pose kamera per state. `portrait` (0..1): di layar tegak kamera mundur dan saat
 * berjalan melirik ke sisi objek terdekat (FOV horizontal sempit).
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
    case 'decor': {
      // menghadap dinding seberang pedestal, cukup jauh agar lukisan ±1,5 m tampak utuh
      const e = L.exhibits[s.index]
      const f = L.at(e.d)
      const wall = -e.side
      const dist = 2.1 + portrait * 0.9
      const pos = add(f.p, f.n, wall * (HALF_W - 0.05 - dist))
      return { position: withY(pos, 1.8), target: withY(add(f.p, f.n, wall * (HALF_W - 0.05)), 1.9) }
    }
    case 'focus':
    case 'inspect': {
      const e = L.exhibits[s.index]
      const f = L.at(e.d)
      const dist = s.kind === 'focus' ? 2.1 + portrait * 0.6 : 1.3 + portrait * 0.5
      const pos = add(f.p, f.n, e.side * (PEDESTAL_X - dist))
      const y = s.kind === 'focus' ? 1.55 : 1.45
      return { position: withY(pos, y), target: exhibitPos(L, e, s.kind === 'focus' ? 1.2 : 1.35) }
    }
  }
}

/** Indeks pedestal yang sedang "dilewati"/dihadapi. */
export function currentIndex(s: CamState, L: Layout): number {
  if (s.kind === 'walk') return nearestIndex(L, s.d)
  if (s.kind === 'intro') return 0
  return s.index
}

/** Peluruhan eksponensial yang tidak bergantung frame rate. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
