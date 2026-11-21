/**
 * Pelari tampak samping (menghadap kanan) dalam gaya piksel, diturunkan dari karakter
 * pangsi milik tim (pangsi2.png): rambut jabrik oranye, kacamata biru muda, pangsi hitam
 * dengan lencana kuning. Kepala dan badan digambar dari peta piksel; lengan dan kaki
 * digambar per frame sehingga kaki melangkah saat berlari.
 */

export const GRID_W = 18
export const GRID_H = 32
/** Satu piksel seni = 2 px dunia. */
export const PIXEL = 2
export const RUN_FRAMES = 8
const FPS = 14

const PAL: Record<string, string> = {
  K: '#141414', // garis luar
  B: '#2d2d2d', // pangsi
  H: '#c8782a', // rambut
  h: '#8a4a1a', // rambut gelap
  S: '#f0b98a', // kulit
  s: '#d49a6c', // kulit bayangan
  G: '#a8dcf5', // kacamata
  g: '#5e8fa8', // bingkai kacamata
  Y: '#e8c43a', // lencana
}
const LEG_FRONT = '#2d2d2d'
const LEG_BACK = '#1b1b1b'
const SANDAL = '#0e0e0e'
/** Lengan depan sedikit lebih terang agar terlihat di atas badan. */
const ARM_FRONT = '#454545'

/** Kepala dan badan, menghadap kanan (baris 0-20). */
const UPPER = [
  '........H.........',
  '.......HH.H.......',
  '......HHHHHH......',
  '.....HHhHHHhH.....',
  '....HhHHHHHHHH....',
  '....HHHHHSSSSS....',
  '....HHhSSSSSSS....',
  '....HHsSgGGGGGg...',
  '....HHsSgGKgGGg...',
  '....HHSSgGGGGGg...',
  '.....HSSSSSSSSS...',
  '......SSSSSSSS....',
  '.......KSSK.......',
  '......KBBBBK......',
  '.....KBBBBBBK.....',
  '.....KBBBBYBK.....',
  '.....KBBBBYBK.....',
  '.....KBBBBBBK.....',
  '.....KBBBBBBK.....',
  '.....KBBBBBBK.....',
  '.....KKBBBBKK.....',
]
const HIP = { x: 8.5, y: 21 }
const SHOULDER = { x: 8.5, y: 14 }
const THIGH = 4
const SHIN = 4
const ARM = 6

export interface LegPose {
  /** Sudut paha dari vertikal (radian, positif = ke depan/kanan). */
  thigh: number
  /** Tekukan lutut (radian, positif = betis ke belakang). */
  bend: number
}
export interface Pose {
  front: LegPose
  back: LegPose
  /** Sudut lengan depan dan belakang dari vertikal. */
  armFront: number
  armBack: number
  /** Badan turun 1 piksel saat kaki melintas. */
  bob: number
}

const leg = (p: number): LegPose => ({
  thigh: 0.75 * Math.sin(p),
  bend: 0.15 + 1.1 * Math.max(0, -Math.cos(p)),
})

/** Pose lari pada frame ke-f (0..RUN_FRAMES-1), atau pose melompat. Murni, untuk diuji. */
export function poseAt(frame: number, onGround: boolean): Pose {
  if (!onGround) {
    return {
      front: { thigh: 0.9, bend: 1.2 },
      back: { thigh: -0.55, bend: 0.4 },
      armFront: -1.3,
      armBack: 0.9,
      bob: 0,
    }
  }
  const p = (frame / RUN_FRAMES) * Math.PI * 2
  return {
    front: leg(p),
    back: leg(p + Math.PI),
    armFront: -0.9 * Math.sin(p),
    armBack: 0.9 * Math.sin(p),
    bob: Math.cos(2 * p) > 0 ? 0 : 1,
  }
}

/** Frame lari untuk waktu tertentu (diam = frame 0). */
export const frameAt = (elapsed: number, still: boolean): number =>
  still ? 0 : Math.floor(elapsed * FPS) % RUN_FRAMES

type Ctx = CanvasRenderingContext2D

/** Garis tebal piksel demi piksel agar tetap terlihat seperti seni piksel. */
function limb(ctx: Ctx, x0: number, y0: number, angle: number, len: number, thick: number, color: string) {
  ctx.fillStyle = color
  const dx = Math.sin(angle)
  const dy = Math.cos(angle)
  for (let i = 0; i <= len * 2; i++) {
    const x = Math.round(x0 + (dx * i) / 2 - thick / 2)
    const y = Math.round(y0 + (dy * i) / 2)
    ctx.fillRect(x, y, thick, 1)
  }
  return { x: x0 + dx * len, y: y0 + dy * len }
}

function drawLeg(ctx: Ctx, pose: LegPose, bob: number, color: string) {
  const knee = limb(ctx, HIP.x, HIP.y + bob, pose.thigh, THIGH, 3, color)
  const foot = limb(ctx, knee.x, knee.y, pose.thigh - pose.bend, SHIN, 3, color)
  const fx = Math.round(foot.x - 1)
  const fy = Math.round(foot.y)
  ctx.fillStyle = PAL.S
  ctx.fillRect(fx, fy, 2, 1)
  ctx.fillStyle = SANDAL
  ctx.fillRect(fx, fy + 1, 4, 1) // sandal menghadap kanan
}

function drawArm(ctx: Ctx, angle: number, bob: number, color: string) {
  const hand = limb(ctx, SHOULDER.x, SHOULDER.y + bob, angle, ARM, 2, color)
  ctx.fillStyle = PAL.S
  ctx.fillRect(Math.round(hand.x - 1), Math.round(hand.y), 2, 2)
}

/** Gambar satu frame ke kanvas kecil GRID_W × GRID_H. */
export function paintFrame(ctx: Ctx, pose: Pose) {
  ctx.clearRect(0, 0, GRID_W, GRID_H)
  drawArm(ctx, pose.armBack, pose.bob, LEG_BACK)
  drawLeg(ctx, pose.back, pose.bob, LEG_BACK)
  UPPER.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = PAL[row[x]]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(x, y + pose.bob, 1, 1)
    }
  })
  drawLeg(ctx, pose.front, pose.bob, LEG_FRONT)
  drawArm(ctx, pose.armFront, pose.bob, ARM_FRONT)
}

const cache = new Map<string, HTMLCanvasElement>()

/** Kanvas frame pelari (disimpan), atau null bila tidak ada DOM. */
export function runnerFrame(frame: number, onGround: boolean): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const key = onGround ? `r${frame}` : 'air'
  let c = cache.get(key)
  if (!c) {
    c = document.createElement('canvas')
    c.width = GRID_W
    c.height = GRID_H
    const ctx = c.getContext('2d')
    if (!ctx) return null
    paintFrame(ctx, poseAt(frame, onGround))
    cache.set(key, c)
  }
  return c
}
