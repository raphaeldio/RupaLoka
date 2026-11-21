/**
 * Engine game runner (SDD §7). Murni: tanpa DOM/kanvas, sehingga kolisi, spawner,
 * unlock, dan resume dapat diuji unit. Render ada di ./render.ts, loop di GameView.
 *
 * Satuan: piksel dunia logis (WORLD_W × WORLD_H) dan detik.
 */

export const WORLD_W = 800
export const WORLD_H = 300
export const GROUND_Y = 252 // garis tanah (kaki pelari)

export const PLAYER = { x: 72, w: 34, h: 50 } as const
export const GRAVITY = 2400
export const JUMP_V = 820
/** Waktu di udara untuk satu lompatan penuh. */
export const AIR_TIME = (2 * JUMP_V) / GRAVITY
/** Jeda reaksi minimum yang diberikan pemain antara mendarat dan lompatan berikutnya. */
export const REACTION_TIME = 0.28
/** Kotak tabrakan dikecilkan agar terasa adil. */
export const HITBOX_INSET = 5
export const MAX_OBSTACLE_H = 60

export interface ObstacleSpec {
  w: number
  h: number
}

/** Ukuran per id rintangan (city.yaml game.obstacles). Id tak dikenal memakai DEFAULT. */
export const OBSTACLE_SPECS: Record<string, ObstacleSpec> = {
  batu: { w: 34, h: 28 },
  pagar: { w: 22, h: 50 },
  becak: { w: 58, h: 46 },
}
export const DEFAULT_OBSTACLE: ObstacleSpec = { w: 32, h: 40 }

export const specOf = (kind: string): ObstacleSpec => OBSTACLE_SPECS[kind] ?? DEFAULT_OBSTACLE

export interface Obstacle {
  kind: string
  x: number
  w: number
  h: number
}

export type Status = 'ready' | 'running' | 'paused' | 'over'

export interface GameState {
  status: Status
  /** Jarak tempuh (px). Skor = floor(jarak / 10) × scoreMultiplier. */
  distance: number
  score: number
  speed: number
  playerY: number // bawah pelari; GROUND_Y saat di tanah
  vy: number
  onGround: boolean
  obstacles: Obstacle[]
  /** Jarak tersisa sampai rintangan berikutnya muncul di tepi kanan. */
  gapLeft: number
  /** Ambang berikutnya (k, mulai 1): unlock saat jarak ≥ k × unlockEvery meter. */
  nextUnlock: number
  /** Indeks item (0-based) yang sudah terbuka di sesi ini, berurutan. */
  unlocked: number[]
  seed: number
  elapsed: number
}

export interface GameConfig {
  /** Jarak antar-item dalam meter (city.yaml game.unlock_every). */
  unlockEvery: number
  itemCount: number
  obstacles: string[]
  speed: { start: number; max: number; ramp_per_100: number }
  /** prefers-reduced-motion → kecepatan lebih rendah (F-046). */
  reducedMotion?: boolean
  /** ?debug=1 (non-produksi): skor dan meter ambang naik lebih cepat (T-055). */
  scoreMultiplier?: number
}

/** threshold = ambang dalam meter. */
export type GameEvent = { type: 'UNLOCK'; index: number; threshold: number } | { type: 'GAME_OVER' } | { type: 'JUMP' }

const REDUCED_FACTOR = 0.75

/** RNG deterministik (mulberry32) agar spawner dapat diuji. */
export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, (seed + 0x6d2b79f5) | 0]
}

export function speedLimits(cfg: GameConfig): { start: number; max: number } {
  const f = cfg.reducedMotion ? REDUCED_FACTOR : 1
  return { start: cfg.speed.start * f, max: Math.max(cfg.speed.start, cfg.speed.max) * f }
}

/** Kecepatan naik bertahap per 100 poin sampai maksimum (F-041). */
export function speedAt(score: number, cfg: GameConfig): number {
  const { start, max } = speedLimits(cfg)
  const f = cfg.reducedMotion ? REDUCED_FACTOR : 1
  return Math.min(max, start + Math.floor(score / 100) * cfg.speed.ramp_per_100 * f)
}

/** Jarak bebas minimum antara dua rintangan pada kecepatan tertentu. */
export const minGap = (speed: number): number => speed * (AIR_TIME + REACTION_TIME)

/** Lama pelari berada di atas ketinggian h dalam satu lompatan. */
export function timeAbove(h: number): number {
  const d = JUMP_V * JUMP_V - 2 * GRAVITY * h
  return d <= 0 ? 0 : (2 * Math.sqrt(d)) / GRAVITY
}

/** Apakah rintangan dapat dilompati pada kecepatan tertentu (dengan hitbox). */
export function clearable(spec: ObstacleSpec, speed: number): boolean {
  const effH = spec.h - HITBOX_INSET
  const span = spec.w + PLAYER.w - 4 * HITBOX_INSET
  return effH <= MAX_OBSTACLE_H && speed * timeAbove(effH) >= span
}

// --- Jarak (meter) dan pertemuan NPC -------------------------------------------------

/** 1 meter = 100 px dunia (skor = jarak/10, jadi 1 m = 10 poin). */
export const PX_PER_METER = 100
export const metersOf = (distance: number): number => Math.floor(distance / PX_PER_METER)

/** NPC berdiri tepat di depan pelari saat bertemu. */
export const NPC_MEET_X = PLAYER.x + PLAYER.w + 6
/** Ruang bebas rintangan di sekitar titik temu (px jarak), sebelum dan sesudahnya. */
export const MEET_CLEAR_BEFORE = 200
export const MEET_CLEAR_AFTER = 260

/** Meter yang dihitung untuk ambang unlock (pengali debug ikut mempercepat). */
export const unlockMeters = (distance: number, cfg: GameConfig): number =>
  metersOf(distance) * (cfg.scoreMultiplier ?? 1)

/** Jarak (px) saat pelari pertama kali mencapai ambang ke-k (k mulai 1). */
export function meetDistance(k: number, cfg: GameConfig): number {
  const mult = cfg.scoreMultiplier ?? 1
  return Math.ceil((k * cfg.unlockEvery) / mult) * PX_PER_METER
}

export interface NpcView {
  /** Indeks item (0-based) yang dijelaskan NPC ini. */
  index: number
  /** Posisi kiri NPC di dunia (px). */
  x: number
  /** true = belum ditemui (pelari sedang mendekat). */
  ahead: boolean
}

/**
 * NPC yang terlihat: NPC ambang berikutnya saat mendekat dari kanan, dan NPC yang baru
 * ditemui saat tertinggal ke kiri. Murni dari state, tidak memengaruhi tabrakan.
 */
export function visibleNpcs(s: Pick<GameState, 'distance' | 'nextUnlock'>, cfg: GameConfig): NpcView[] {
  if (cfg.unlockEvery <= 0) return []
  const out: NpcView[] = []
  for (const k of [s.nextUnlock - 1, s.nextUnlock]) {
    if (k < 1 || k > cfg.itemCount) continue
    const x = NPC_MEET_X + meetDistance(k, cfg) - s.distance
    if (x < WORLD_W + 40 && x > -120) out.push({ index: k - 1, x, ahead: k === s.nextUnlock })
  }
  return out
}

/** Apakah rintangan yang muncul sekarang akan tiba di dekat titik temu NPC berikutnya. */
function nearMeet(s: GameState, cfg: GameConfig, spec: ObstacleSpec): number | null {
  if (cfg.unlockEvery <= 0) return null
  // Rintangan muncul di x = WORLD_W; tiba di pelari setelah menempuh WORLD_W - PLAYER.x.
  const arrive = s.distance + WORLD_W - PLAYER.x
  for (const k of [s.nextUnlock - 1, s.nextUnlock]) {
    if (k < 1 || k > cfg.itemCount) continue
    const meet = meetDistance(k, cfg)
    if (arrive + spec.w > meet - MEET_CLEAR_BEFORE && arrive < meet + MEET_CLEAR_AFTER) {
      return meet + MEET_CLEAR_AFTER - arrive
    }
  }
  return null
}

/** Pilih rintangan dan jarak berikutnya. Jarak selalu ≥ minGap(speed). */
export function spawn(seed: number, speed: number, kinds: string[]): { obstacle: Obstacle; gap: number; seed: number } {
  const [r1, s1] = nextRandom(seed)
  const [r2, s2] = nextRandom(s1)
  const pool = kinds.length > 0 ? kinds : ['_']
  const kind = pool[Math.floor(r1 * pool.length) % pool.length]
  const spec = specOf(kind)
  const h = Math.min(spec.h, MAX_OBSTACLE_H)
  return {
    obstacle: { kind, x: WORLD_W, w: spec.w, h },
    gap: spec.w + minGap(speed) * (1 + r2 * 1.1),
    seed: s2,
  }
}

export function createGame(cfg: GameConfig, seed = Date.now() | 0): GameState {
  return {
    status: 'ready',
    distance: 0,
    score: 0,
    speed: speedAt(0, cfg),
    playerY: GROUND_Y,
    vy: 0,
    onGround: true,
    obstacles: [],
    gapLeft: WORLD_W * 0.6,
    nextUnlock: 1,
    unlocked: [],
    seed,
    elapsed: 0,
  }
}

export function start(s: GameState): GameState {
  return s.status === 'ready' ? { ...s, status: 'running' } : s
}

export function pause(s: GameState): GameState {
  return s.status === 'running' ? { ...s, status: 'paused' } : s
}

/** Melanjutkan tanpa mengubah skor, jarak, atau posisi (F-043). */
export function resume(s: GameState): GameState {
  return s.status === 'paused' ? { ...s, status: 'running' } : s
}

export function collides(s: Pick<GameState, 'playerY'>, o: Obstacle): boolean {
  const i = HITBOX_INSET
  const pl = PLAYER.x + i
  const pr = PLAYER.x + PLAYER.w - i
  const pb = s.playerY - i
  const pt = s.playerY - PLAYER.h + i
  const ol = o.x + i
  const or = o.x + o.w - i
  const ot = GROUND_Y - o.h + i
  return pr > ol && pl < or && pb > ot && pt < GROUND_Y
}

const SUBSTEP = 1 / 120

/**
 * Majukan dunia sebanyak dt detik. `jump` = input lompat ditekan sejak langkah terakhir.
 * Mengembalikan state baru dan kejadian (UNLOCK tepat sekali per ambang, GAME_OVER).
 */
export function step(
  prev: GameState,
  dt: number,
  jump: boolean,
  cfg: GameConfig,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  if (prev.status !== 'running') return { state: prev, events }

  const s: GameState = { ...prev, obstacles: prev.obstacles.map((o) => ({ ...o })), unlocked: [...prev.unlocked] }
  if (jump && s.onGround) {
    s.vy = -JUMP_V
    s.onGround = false
    events.push({ type: 'JUMP' })
  }

  let remaining = Math.min(Math.max(dt, 0), 0.1) // batasi lonjakan dt (tab kembali aktif)
  const mult = cfg.scoreMultiplier ?? 1
  while (remaining > 1e-9) {
    const h = Math.min(SUBSTEP, remaining)
    remaining -= h
    s.elapsed += h

    // Fisika pelari
    if (!s.onGround) {
      s.vy += GRAVITY * h
      s.playerY += s.vy * h
      if (s.playerY >= GROUND_Y) {
        s.playerY = GROUND_Y
        s.vy = 0
        s.onGround = true
      }
    }

    // Dunia bergerak
    const dx = s.speed * h
    s.distance += dx
    for (const o of s.obstacles) o.x -= dx
    s.obstacles = s.obstacles.filter((o) => o.x + o.w > -10)
    s.gapLeft -= dx
    if (s.gapLeft <= 0) {
      const sp = spawn(s.seed, s.speed, cfg.obstacles)
      const delay = nearMeet(s, cfg, sp.obstacle)
      if (delay !== null) {
        // Jangan menaruh rintangan di dekat NPC: tunda sampai lewat titik temu.
        s.gapLeft = delay
      } else {
        s.obstacles.push(sp.obstacle)
        s.gapLeft = sp.gap
      }
      s.seed = sp.seed
    }

    // Tabrakan
    if (s.obstacles.some((o) => collides(s, o))) {
      s.status = 'over'
      events.push({ type: 'GAME_OVER' })
      return { state: s, events }
    }

    // Skor dan kecepatan
    s.score = Math.floor(s.distance / 10) * mult
    s.speed = speedAt(s.score, cfg)

    // Unlock: satu ambang per kejadian; game dijeda sampai pemain menekan "Lanjut".
    const threshold = s.nextUnlock * cfg.unlockEvery
    if (cfg.unlockEvery > 0 && unlockMeters(s.distance, cfg) >= threshold) {
      if (s.nextUnlock <= cfg.itemCount) {
        const index = s.nextUnlock - 1
        s.unlocked.push(index)
        s.nextUnlock += 1
        s.status = 'paused'
        events.push({ type: 'UNLOCK', index, threshold })
        return { state: s, events }
      }
      // Semua item sudah terbuka: ambang berikutnya tidak memicu apa pun.
      s.nextUnlock += 1
    }
  }
  return { state: s, events }
}
