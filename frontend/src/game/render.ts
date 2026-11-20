/**
 * Render kanvas untuk game runner. Gambar vektor sederhana buatan sendiri sebagai
 * placeholder sampai aset final T-054 tersedia (karakter dan latar orisinal).
 * Rintangan hanya benda netral (batu, pagar, becak), bukan objek budaya (PRD §7).
 */
import { GROUND_Y, PLAYER, WORLD_H, WORLD_W, type GameState, type Obstacle } from './engine'

const C = {
  langit: '#eaf3ef',
  bukitJauh: '#cfe3d8',
  bukitDekat: '#a9cdb9',
  kota: '#b9cfc4',
  tanah: '#d9cba7',
  tanahGaris: '#bfae86',
  teal: '#146b68',
  tealGelap: '#0e4d4b',
  emas: '#e8b64c',
  kulit: '#c98d5e',
  tinta: '#1d2a2a',
  batu: '#8d938a',
  kayu: '#9b6b3d',
  merah: '#b5523b',
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 4) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

/** Latar berlapis: bukit jauh (Bandung dikelilingi pegunungan), siluet kota, tanah. */
function background(ctx: CanvasRenderingContext2D, distance: number, still: boolean) {
  const d = still ? 0 : distance
  ctx.fillStyle = C.langit
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)

  const hills = (color: string, base: number, amp: number, period: number, speed: number) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, WORLD_H)
    const off = (d * speed) % period
    for (let x = 0; x <= WORLD_W; x += 8) {
      const t = ((x + off) / period) * Math.PI * 2
      ctx.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(t)) - amp * 0.3 * Math.sin(t * 2.3))
    }
    ctx.lineTo(WORLD_W, WORLD_H)
    ctx.closePath()
    ctx.fill()
  }
  hills(C.bukitJauh, 170, 60, 520, 0.08)

  // Siluet bangunan generik
  ctx.fillStyle = C.kota
  const span = 900
  const off = (d * 0.25) % span
  for (let i = -1; i < 3; i++) {
    const x0 = i * span - off
    const blocks = [
      [0, 46, 38],
      [44, 30, 62],
      [80, 52, 44],
      [140, 26, 80],
      [172, 60, 36],
      [300, 40, 56],
      [348, 34, 40],
      [520, 48, 70],
      [574, 30, 46],
      [700, 44, 58],
    ]
    for (const [bx, bw, bh] of blocks) rect(ctx, x0 + bx, GROUND_Y - bh, bw, bh + 4, 3)
  }
  hills(C.bukitDekat, 248, 22, 340, 0.45)

  // Tanah
  ctx.fillStyle = C.tanah
  ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y)
  ctx.fillStyle = C.tanahGaris
  const gOff = d % 40
  for (let x = -gOff; x < WORLD_W; x += 40) ctx.fillRect(x, GROUND_Y + 14, 18, 3)
  ctx.fillRect(0, GROUND_Y, WORLD_W, 2)
}

/** Pelari orisinal: pelajar bertopi teal dengan tas emas. */
function runner(ctx: CanvasRenderingContext2D, s: GameState, still: boolean) {
  const x = PLAYER.x
  const y = s.playerY - PLAYER.h
  const phase = still ? 0 : Math.sin(s.elapsed * 18)
  const legA = s.onGround ? phase * 7 : 5
  const legB = s.onGround ? -phase * 7 : -3

  // Kaki
  ctx.strokeStyle = C.tinta
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x + 14, y + 36)
  ctx.lineTo(x + 14 + legA, y + PLAYER.h - 2)
  ctx.moveTo(x + 21, y + 36)
  ctx.lineTo(x + 21 + legB, y + PLAYER.h - 2)
  ctx.stroke()

  // Tas
  ctx.fillStyle = C.emas
  rect(ctx, x + 1, y + 18, 11, 16, 4)
  // Badan
  ctx.fillStyle = C.teal
  rect(ctx, x + 8, y + 16, 20, 22, 7)
  // Lengan
  ctx.strokeStyle = C.kulit
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x + 24, y + 22)
  ctx.lineTo(x + 31, y + 28 - phase * 3)
  ctx.stroke()
  // Kepala
  ctx.fillStyle = C.kulit
  ctx.beginPath()
  ctx.arc(x + 19, y + 9, 9, 0, Math.PI * 2)
  ctx.fill()
  // Topi
  ctx.fillStyle = C.tealGelap
  ctx.beginPath()
  ctx.arc(x + 19, y + 7, 9.5, Math.PI, 0)
  ctx.fill()
  rect(ctx, x + 22, y + 4, 12, 4, 2)
  // Mata
  ctx.fillStyle = C.tinta
  ctx.beginPath()
  ctx.arc(x + 23, y + 10, 1.4, 0, Math.PI * 2)
  ctx.fill()
}

function obstacle(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const top = GROUND_Y - o.h
  switch (o.kind) {
    case 'batu': {
      ctx.fillStyle = C.batu
      ctx.beginPath()
      ctx.ellipse(o.x + o.w / 2, GROUND_Y - o.h / 2 + 2, o.w / 2, o.h / 2 + 2, 0, Math.PI, 0)
      ctx.lineTo(o.x + o.w, GROUND_Y)
      ctx.lineTo(o.x, GROUND_Y)
      ctx.fill()
      ctx.fillStyle = '#a3a99f'
      ctx.beginPath()
      ctx.ellipse(o.x + o.w * 0.38, top + 8, 6, 3, -0.3, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'pagar': {
      ctx.fillStyle = C.kayu
      for (let i = 0; i < 2; i++) rect(ctx, o.x + i * (o.w - 6), top, 6, o.h, 2)
      rect(ctx, o.x - 2, top + 10, o.w + 4, 5, 2)
      rect(ctx, o.x - 2, top + 28, o.w + 4, 5, 2)
      break
    }
    case 'becak': {
      ctx.fillStyle = C.merah
      rect(ctx, o.x + 4, top + 8, o.w * 0.55, o.h - 22, 6) // kabin
      ctx.fillStyle = '#6f2f22'
      rect(ctx, o.x + 2, top + 2, o.w * 0.6, 8, 4) // atap
      ctx.strokeStyle = C.tinta
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(o.x + o.w * 0.55, GROUND_Y - 16)
      ctx.lineTo(o.x + o.w - 6, GROUND_Y - 16)
      ctx.lineTo(o.x + o.w - 6, top + 14)
      ctx.stroke()
      ctx.fillStyle = C.tinta
      for (const cx of [o.x + 12, o.x + o.w * 0.42, o.x + o.w - 7]) {
        ctx.beginPath()
        ctx.arc(cx, GROUND_Y - 7, 7, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    default: {
      ctx.fillStyle = C.kayu
      rect(ctx, o.x, top, o.w, o.h, 5)
    }
  }
}

export function draw(ctx: CanvasRenderingContext2D, s: GameState, reducedMotion: boolean) {
  background(ctx, s.distance, reducedMotion)
  for (const o of s.obstacles) obstacle(ctx, o)
  runner(ctx, s, reducedMotion || s.status !== 'running')
}
