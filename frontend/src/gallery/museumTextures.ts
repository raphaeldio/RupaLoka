/**
 * Tekstur ruangan museum yang digambar sendiri di kanvas (gaya piksel, tanpa aset luar):
 * panel kayu dinding, ubin lantai, dan dua lukisan hiasan abstrak. Semua orisinal.
 */
import * as THREE from 'three'

/** RNG berbiji agar pola piksel selalu sama di tiap muat. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestMipmapNearestFilter
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  return t
}

export const MUSEUM = {
  wall: '#5c2c20',
  wallDark: '#3b1a12',
  wallLight: '#713828',
  cove: '#efe6d3',
  ceiling: '#f2ebdc',
  base: '#3a1d13',
  brass: '#b8913f',
  floor: '#e6d9bf',
  floorLine: '#cbb994',
  pedestalBody: '#6a3d24',
  pedestalPlinth: '#3a2016',
  pedestalTop: '#6b1e1e',
  plaque: '#c9a14a',
  frame: '#3b2116',
  background: '#2b1710',
}

/** Satu panel kayu dinding (diulang mengelilingi cincin). */
export function wallPanelTexture(repeatX: number): THREE.CanvasTexture {
  const t = canvasTexture(32, 64, (ctx) => {
    const r = rng(7)
    ctx.fillStyle = MUSEUM.wall
    ctx.fillRect(0, 0, 32, 64)
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = r() < 0.5 ? '#552819' : '#643124'
      ctx.fillRect(Math.floor(r() * 32), Math.floor(r() * 64), 2, 1 + Math.floor(r() * 3))
    }
    ctx.fillStyle = MUSEUM.wallDark
    ctx.fillRect(0, 0, 2, 64) // sambungan panel
    ctx.fillStyle = MUSEUM.wallLight
    ctx.fillRect(2, 0, 1, 64)
  })
  t.repeat.set(repeatX, 1)
  return t
}

/** Ubin lantai krem dengan garis nat. */
export function floorTexture(repeat: number): THREE.CanvasTexture {
  const t = canvasTexture(32, 32, (ctx) => {
    const r = rng(11)
    ctx.fillStyle = MUSEUM.floor
    ctx.fillRect(0, 0, 32, 32)
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = r() < 0.5 ? '#e0d2b6' : '#ece1ca'
      ctx.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1)
    }
    ctx.fillStyle = MUSEUM.floorLine
    ctx.fillRect(0, 31, 32, 1)
    ctx.fillRect(31, 0, 1, 32)
  })
  t.repeat.set(repeat, repeat)
  return t
}

/** Lukisan hiasan abstrak (bukan karya/klaim budaya): 0 = lanskap balok, 1 = papan kotak. */
export function artTexture(kind: 0 | 1): THREE.CanvasTexture {
  return canvasTexture(48, 30, (ctx) => {
    ctx.fillStyle = '#efe7d6'
    ctx.fillRect(0, 0, 48, 30)
    ctx.fillStyle = MUSEUM.plaque
    ctx.fillRect(0, 0, 48, 2)
    if (kind === 0) {
      for (const x of [3, 25]) {
        ctx.fillStyle = '#3f6f97'
        ctx.fillRect(x, 4, 20, 8)
        ctx.fillStyle = '#4f8a3c'
        ctx.fillRect(x, 10, 20, 5)
        ctx.fillStyle = '#7d7466'
        ctx.fillRect(x + 1, 18, 8, 8)
        ctx.fillRect(x + 11, 18, 8, 8)
      }
    } else {
      ctx.fillStyle = '#8d877c'
      for (let y = 6; y < 27; y += 5) ctx.fillRect(3, y, 15, 2)
      for (let y = 0; y < 6; y++)
        for (let x = 0; x < 6; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#8c2a28' : '#3f7a45'
          ctx.fillRect(22 + x * 4, 4 + y * 4, 4, 4)
        }
    }
  })
}
