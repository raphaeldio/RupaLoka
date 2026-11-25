/**
 * Alur kamera galeri (murni, tanpa three.js): state, transisi, dan pose kamera.
 * Pola interaksi terinspirasi galeri dinding lengkung: jalan menyusuri busur,
 * klik objek untuk mendekat, klik lagi untuk inspeksi, Esc/klik kosong untuk mundur.
 */

export type Vec3 = [number, number, number]

export interface Exhibit {
  id: string
  label: string
  /** sudut posisi di busur (radian) */
  angle: number
  placeholder?: boolean
}

export type CamState =
  | { kind: 'intro' }
  | { kind: 'walk'; phi: number }
  | { kind: 'focus'; index: number }
  | { kind: 'inspect'; index: number }

export type CamAction =
  | { type: 'introDone' }
  | { type: 'walkBy'; delta: number }
  | { type: 'clickExhibit'; index: number }
  | { type: 'step'; dir: -1 | 1 }
  | { type: 'back' }
  | { type: 'goto'; index: number }

/** Jari-jari dinding; pedestal berdiri 1 m di depan dinding. */
export const WALL_R = 9
export const PEDESTAL_R = WALL_R - 1.2
const EYE = 1.6

const SPACING = 0.42

export function makeExhibits(items: { id: string; label: string; placeholder?: boolean }[]): Exhibit[] {
  const start = -((items.length - 1) * SPACING) / 2
  return items.map((it, i) => ({ ...it, angle: start + i * SPACING }))
}

export function phiLimits(ex: Exhibit[]): [number, number] {
  return [ex[0].angle - 0.25, ex[ex.length - 1].angle + 0.25]
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Titik di lantai pada sudut a, jari-jari r. Sudut 0 = arah -Z (depan kamera awal). */
export function polar(a: number, r: number, y: number): Vec3 {
  return [Math.sin(a) * r, y, -Math.cos(a) * r]
}

export function nearestIndex(ex: Exhibit[], phi: number): number {
  let best = 0
  ex.forEach((e, i) => {
    if (Math.abs(e.angle - phi) < Math.abs(ex[best].angle - phi)) best = i
  })
  return best
}

export function reduce(s: CamState, a: CamAction, ex: Exhibit[]): CamState {
  const [lo, hi] = phiLimits(ex)
  switch (a.type) {
    case 'introDone':
      return s.kind === 'intro' ? { kind: 'walk', phi: ex[0].angle } : s
    case 'walkBy':
      if (s.kind === 'walk') return { kind: 'walk', phi: clamp(s.phi + a.delta, lo, hi) }
      // scroll saat fokus: mundur lalu lanjut berjalan (seperti referensi)
      if (s.kind === 'focus') return { kind: 'walk', phi: clamp(ex[s.index].angle + a.delta, lo, hi) }
      return s
    case 'clickExhibit':
      if (ex[a.index]?.placeholder) return s
      if (s.kind === 'focus' && s.index === a.index) return { kind: 'inspect', index: a.index }
      if (s.kind === 'walk' || s.kind === 'focus') return { kind: 'focus', index: a.index }
      return s
    case 'step': {
      if (s.kind === 'walk') {
        const i = clamp(nearestIndex(ex, s.phi) + a.dir, 0, ex.length - 1)
        return { kind: 'walk', phi: ex[i].angle }
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
      if (s.kind === 'focus') return { kind: 'walk', phi: ex[s.index].angle }
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
 * Pose kamera untuk tiap state. Intro: berdiri di pintu, agak jauh dari busur.
 * `portrait` (0..1) memundurkan kamera di layar tegak agar objek tidak terpotong.
 */
export function poseFor(s: CamState, ex: Exhibit[], portrait = 0): Pose {
  const back = portrait * 1.6
  switch (s.kind) {
    case 'intro':
      return { position: [0, EYE + 0.4, 6], target: [0, 1.4, -WALL_R] }
    case 'walk':
      return { position: polar(s.phi, 3.2 - back, EYE), target: polar(s.phi, WALL_R, 1.4) }
    case 'focus': {
      const a = ex[s.index].angle
      return { position: polar(a, PEDESTAL_R - 2.8 - back, 1.55), target: polar(a, PEDESTAL_R, 1.3) }
    }
    case 'inspect': {
      const a = ex[s.index].angle
      return { position: polar(a, PEDESTAL_R - 1.35 - back * 0.6, 1.45), target: polar(a, PEDESTAL_R, 1.35) }
    }
  }
}

/** Indeks objek yang sedang "dilewati" untuk label bawah layar. */
export function currentIndex(s: CamState, ex: Exhibit[]): number {
  if (s.kind === 'walk') return nearestIndex(ex, s.phi)
  if (s.kind === 'intro') return 0
  return s.index
}

/** Peluruhan eksponensial yang tidak bergantung frame rate. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}
