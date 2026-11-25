/**
 * Alur kamera galeri (murni, tanpa three.js): state, transisi, dan pose kamera.
 * Tata letak: lorong lurus; kamera berjalan ke depan (−Z), objek berdiri di sisi
 * kiri dan kanan bergantian. Klik objek = kamera menoleh dan mendekat ke samping,
 * klik lagi = periksa, Esc/klik kosong = mundur satu tingkat.
 */

export type Vec3 = [number, number, number]
export type Side = -1 | 1 // −1 kiri, 1 kanan (dari arah jalan)

export interface Exhibit {
  id: string
  label: string
  /** jarak sepanjang lorong (m), positif ke depan */
  d: number
  side: Side
  placeholder?: boolean
}

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

/** Setengah lebar lorong; pedestal berdiri 0.7 m dari dinding. */
export const HALF_W = 2.6
export const PEDESTAL_X = HALF_W - 0.7
export const EYE = 1.6
const SPACING = 2.6
const FIRST_D = 3
/** Saat berjalan, objek "dilewati" adalah yang ±LOOKAHEAD m di depan kamera. */
const LOOKAHEAD = 2.4

export function makeExhibits(items: { id: string; label: string; placeholder?: boolean }[]): Exhibit[] {
  return items.map((it, i) => ({ ...it, d: FIRST_D + i * SPACING, side: (i % 2 === 0 ? -1 : 1) as Side }))
}

export function walkLimits(ex: Exhibit[]): [number, number] {
  return [0, ex[ex.length - 1].d - 0.5]
}

export function corridorLength(ex: Exhibit[]): number {
  return ex[ex.length - 1].d + 4
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Posisi pusat pedestal di dunia. */
export function exhibitPos(e: Exhibit, y = 0): Vec3 {
  return [e.side * PEDESTAL_X, y, -e.d]
}

export function nearestIndex(ex: Exhibit[], d: number): number {
  const ahead = d + LOOKAHEAD
  let best = 0
  ex.forEach((e, i) => {
    if (Math.abs(e.d - ahead) < Math.abs(ex[best].d - ahead)) best = i
  })
  return best
}

/** Titik berdiri saat berjalan agar objek ke-i tampak serong di depan. */
const standFor = (e: Exhibit) => e.d - LOOKAHEAD

export function reduce(s: CamState, a: CamAction, ex: Exhibit[]): CamState {
  const [lo, hi] = walkLimits(ex)
  switch (a.type) {
    case 'introDone':
      return s.kind === 'intro' ? { kind: 'walk', d: 0 } : s
    case 'walkBy':
      if (s.kind === 'walk') return { kind: 'walk', d: clamp(s.d + a.delta, lo, hi) }
      // scroll saat fokus: kembali ke tengah lorong lalu lanjut berjalan
      if (s.kind === 'focus') return { kind: 'walk', d: clamp(standFor(ex[s.index]) + a.delta, lo, hi) }
      return s
    case 'clickExhibit':
      if (ex[a.index]?.placeholder) return s
      if (s.kind === 'focus' && s.index === a.index) return { kind: 'inspect', index: a.index }
      if (s.kind === 'walk' || s.kind === 'focus') return { kind: 'focus', index: a.index }
      return s
    case 'step': {
      if (s.kind === 'walk') {
        const i = clamp(nearestIndex(ex, s.d) + a.dir, 0, ex.length - 1)
        return { kind: 'walk', d: clamp(standFor(ex[i]), lo, hi) }
      }
      if (s.kind === 'focus') {
        let i = s.index + a.dir
        while (ex[i]?.placeholder) i += a.dir
        return i >= 0 && i < ex.length ? { kind: 'focus', index: i } : s
      }
      return s
    }
    case 'back':
      if (s.kind === 'inspect') return { kind: 'focus', index: s.index }
      if (s.kind === 'focus') return { kind: 'walk', d: clamp(standFor(ex[s.index]), lo, hi) }
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
 * - walk: di tengah lorong, menatap lurus ke depan.
 * - focus/inspect: menoleh ke samping, menghadap objek.
 * `portrait` (0..1) memundurkan kamera di layar tegak agar objek tidak terpotong.
 */
export function poseFor(s: CamState, ex: Exhibit[], portrait = 0): Pose {
  switch (s.kind) {
    case 'intro':
      return { position: [0, EYE + 0.3, 4], target: [0, 1.4, -6] }
    case 'walk': {
      // Layar tegak (FOV horizontal sempit): kamera melirik ke sisi objek terdekat.
      const glance = portrait * 2.2 * ex[nearestIndex(ex, s.d)].side
      return { position: [0, EYE, -s.d], target: [glance, 1.45, -s.d - 6] }
    }
    case 'focus': {
      const e = ex[s.index]
      const dist = 2.1 + portrait * 0.6 // maks. ±2.7 m, masih di dalam lorong
      return { position: [e.side * (PEDESTAL_X - dist), 1.55, -e.d], target: exhibitPos(e, 1.3) }
    }
    case 'inspect': {
      const e = ex[s.index]
      const dist = 1.3 + portrait * 0.5
      return { position: [e.side * (PEDESTAL_X - dist), 1.45, -e.d], target: exhibitPos(e, 1.35) }
    }
  }
}

/** Indeks objek untuk label bawah layar. */
export function currentIndex(s: CamState, ex: Exhibit[]): number {
  if (s.kind === 'walk') return nearestIndex(ex, s.d)
  if (s.kind === 'intro') return 0
  return s.index
}

/** Peluruhan eksponensial yang tidak bergantung frame rate. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
