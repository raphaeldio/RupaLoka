/**
 * Render kanvas untuk game runner. Latar memakai aset piksel tim (scenery.ts); bila gambar
 * belum termuat, dipakai gambar vektor sederhana sebagai cadangan.
 * Rintangan hanya benda netral (batu, pagar, becak), bukan objek budaya (PRD §7).
 */
import { GROUND_Y, PLAYER, WORLD_H, WORLD_W, type GameState, type NpcView, type Obstacle } from './engine'
import { walkersAt } from './ambient'
import { ALL_SPRITES, AMBIENT_NPCS, type NpcDef } from './npcs'
import { BACKDROP, backdropRect, LANDMARKS, landmarksAt, ROAD, ROAD_TOP, roadTilesAt, SIDEWALK_Y } from './scenery'
import { frameAt, GRID_H, GRID_W, PIXEL, runnerFrame } from './runnerSprite'

/** Gambar dimuat sekali; selama belum siap (atau gagal) dipakai gambar vektor cadangan. */
const images = new Map<string, HTMLImageElement>()
function sprite(src: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  let img = images.get(src)
  if (!img) {
    img = new Image()
    img.src = src
    images.set(src, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

/** Muat semua karakter sekali, sebelum NPC pertama muncul. */
export function preloadSprites(): void {
  for (const src of [...ALL_SPRITES, BACKDROP.src, ROAD.src, ...LANDMARKS.map((l) => l.src)]) sprite(src)
}

/** Tinggi gambar karakter di dunia (px); kotak tabrakan tetap PLAYER. */
const CHAR_H = 58

const C = {
  langitAtas: '#9fd6f2',
  langit: '#c4e7f4',
  bukitJauh: '#a9cfdc',
  bukitDekat: '#8fbf8f',
  kota: '#bcd6e4',
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
function background(ctx: CanvasRenderingContext2D, distance: number, elapsed: number, still: boolean, viewW: number) {
  const d = still ? 0 : distance
  const sky = ctx.createLinearGradient(0, 0, 0, ROAD_TOP)
  sky.addColorStop(0, C.langitAtas)
  sky.addColorStop(1, C.langit)
  ctx.fillStyle = sky
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
  // Pemandangan Bandung: latar statis yang diperbesar menutupi langit. Bila gambar belum
  // termuat, dipakai bukit dan siluet gedung sederhana.
  const backdrop = sprite(BACKDROP.src)
  if (backdrop) {
    const r = backdropRect(viewW)
    ctx.drawImage(backdrop, r.x, r.y, r.w, r.h)
  } else {
    hills(C.bukitJauh, 170, 60, 520, 0.08)
    ctx.fillStyle = C.kota
    const span = 900
    const off = (d * 0.2) % span
    for (let i = -1; i < 3; i++) {
      const x0 = i * span - off
      for (const [bx, bw, bh] of CITY_BLOCKS) rect(ctx, x0 + bx, ROAD_TOP - bh, bw, bh + 4, 3)
    }
    hills(C.bukitDekat, ROAD_TOP + 4, 16, 340, 0.3)
  }

  // Landmark Bandung (aset tim), paralaks; kaki landmark di tepi belakang trotoar.
  for (const l of landmarksAt(d, WORLD_W)) {
    const img = sprite(l.def.src)
    if (img) ctx.drawImage(img, l.x, ROAD_TOP - l.def.h, l.w, l.def.h)
  }

  // Jalan: aset trotoar + kerb + aspal, diulang mengikuti jarak tempuh.
  const road = sprite(ROAD.src)
  if (road) {
    const h = WORLD_H - ROAD_TOP
    const w = h * ROAD.aspect
    for (const x of roadTilesAt(d, w, WORLD_W)) ctx.drawImage(road, x, ROAD_TOP, w + 0.5, h)
  } else {
    // Cadangan selama gambar belum termuat.
    ctx.fillStyle = C.tanah
    ctx.fillRect(0, ROAD_TOP, WORLD_W, WORLD_H - ROAD_TOP)
    ctx.fillStyle = C.tanahGaris
    const gOff = d % 40
    for (let x = -gOff; x < WORLD_W; x += 40) ctx.fillRect(x, GROUND_Y + 14, 18, 3)
    ctx.fillRect(0, GROUND_Y, WORLD_W, 2)
  }
  ambient(ctx, d, still ? 0 : elapsed, still)
}

const CITY_BLOCKS = [
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

/** Warga latar: lebih kecil dan agak pudar, berdiri di trotoar di belakang jalan. */
const AMBIENT_H = 34
function ambient(ctx: CanvasRenderingContext2D, distance: number, elapsed: number, still: boolean) {
  const feet = SIDEWALK_Y
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.imageSmoothingEnabled = false
  for (const w of walkersAt(distance, elapsed, WORLD_W, AMBIENT_NPCS.length, still)) {
    const def = AMBIENT_NPCS[w.kind]
    const img = sprite(def.sprite)
    if (!img) continue
    const width = AMBIENT_H * def.aspect
    const y = feet - AMBIENT_H - w.bob
    if (w.flip) {
      ctx.save()
      ctx.translate(w.x + width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, y, width, AMBIENT_H)
      ctx.restore()
    } else {
      ctx.drawImage(img, w.x, y, width, AMBIENT_H)
    }
  }
  ctx.restore()
}

/** Pelari: karakter pangsi tampak samping, menghadap kanan, kaki melangkah. */
function runner(ctx: CanvasRenderingContext2D, s: GameState, still: boolean) {
  const frame = runnerFrame(frameAt(s.elapsed, still), s.onGround)
  if (!frame) return vectorRunner(ctx, s, still)
  const w = GRID_W * PIXEL
  const h = GRID_H * PIXEL
  ctx.imageSmoothingEnabled = false
  // Baris piksel terbawah kosong; geser 2 px agar sandal menapak tanah.
  ctx.drawImage(frame, PLAYER.x + (PLAYER.w - w) / 2, s.playerY - h + PIXEL, w, h)
}

/** NPC di pinggir jalan; tanda "!" selama pelari masih mendekat. */
function npc(ctx: CanvasRenderingContext2D, v: NpcView, def: NpcDef, t: number) {
  const w = CHAR_H * def.aspect
  const img = sprite(def.sprite)
  if (img) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, v.x, GROUND_Y - CHAR_H, w, CHAR_H)
  } else {
    ctx.fillStyle = C.teal
    rect(ctx, v.x, GROUND_Y - CHAR_H, w, CHAR_H, 8)
  }
  if (v.ahead) {
    const y = GROUND_Y - CHAR_H - 18 + Math.sin(t * 5) * 2
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = C.tealGelap
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(v.x + w / 2 - 9, y - 10, 18, 18, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = C.tealGelap
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', v.x + w / 2, y)
  }
}

/** Pelari vektor cadangan bila gambar belum termuat. */
function vectorRunner(ctx: CanvasRenderingContext2D, s: GameState, still: boolean) {
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

export function draw(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  reducedMotion: boolean,
  npcs: { view: NpcView; def: NpcDef }[] = [],
  viewW: number = WORLD_W,
) {
  background(ctx, s.distance, s.elapsed, reducedMotion, viewW)
  for (const n of npcs) npc(ctx, n.view, n.def, reducedMotion ? 0 : s.elapsed)
  for (const o of s.obstacles) obstacle(ctx, o)
  runner(ctx, s, reducedMotion || s.status !== 'running')
}
