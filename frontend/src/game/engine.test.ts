import { describe, expect, it } from 'vitest'
import {
  AIR_TIME,
  clearable,
  collides,
  createGame,
  GROUND_Y,
  minGap,
  OBSTACLE_SPECS,
  pause,
  PLAYER,
  resume,
  spawn,
  speedAt,
  start,
  step,
  type GameConfig,
  type GameEvent,
  type GameState,
} from './engine'

const cfg: GameConfig = {
  unlockEvery: 100,
  itemCount: 3,
  obstacles: ['batu', 'pagar', 'becak'],
  speed: { start: 240, max: 520, ramp_per_100: 25 },
}

/** Dunia tanpa rintangan untuk menguji skor/unlock. */
const noObstacles = (s: GameState): GameState => ({ ...s, obstacles: [], gapLeft: 1e12 })

function runUntil(s: GameState, c: GameConfig, pred: (e: GameEvent[], s: GameState) => boolean, maxSteps = 100000) {
  for (let i = 0; i < maxSteps; i++) {
    const r = step(s, 1 / 60, false, c)
    s = r.state
    if (pred(r.events, s)) return { state: s, events: r.events }
  }
  throw new Error('tidak tercapai')
}

describe('kolisi', () => {
  const o = { kind: 'batu', x: PLAYER.x, w: 30, h: 30 }
  it('menabrak saat di tanah, aman saat cukup tinggi', () => {
    expect(collides({ playerY: GROUND_Y }, o)).toBe(true)
    expect(collides({ playerY: GROUND_Y - 40 }, o)).toBe(false)
  })
  it('tidak menabrak rintangan yang jauh', () => {
    expect(collides({ playerY: GROUND_Y }, { ...o, x: PLAYER.x + 200 })).toBe(false)
  })
})

describe('spawner', () => {
  it('semua rintangan dapat dilompati pada seluruh rentang kecepatan', () => {
    for (const spec of Object.values(OBSTACLE_SPECS)) {
      for (let v = cfg.speed.start * 0.75; v <= cfg.speed.max; v += 10) expect(clearable(spec, v)).toBe(true)
    }
  })

  it('jarak antar rintangan selalu ≥ jarak minimum', () => {
    let seed = 42
    for (let v = 180; v <= 520; v += 20) {
      for (let i = 0; i < 200; i++) {
        const r = spawn(seed, v, cfg.obstacles)
        seed = r.seed
        expect(r.gap - r.obstacle.w).toBeGreaterThanOrEqual(minGap(v))
        expect(minGap(v)).toBeGreaterThan(v * AIR_TIME) // cukup waktu untuk mendarat lalu melompat lagi
      }
    }
  })

  it('pemain yang selalu melompat tepat waktu tidak pernah kalah (rintangan tidak mustahil)', () => {
    let s = start(createGame({ ...cfg, itemCount: 0 }, 7))
    for (let i = 0; i < 60 * 120; i++) {
      // Bot: lompat bila rintangan berikutnya sudah dekat.
      const next = s.obstacles.find((o) => o.x + o.w > PLAYER.x)
      const jump = !!next && next.x - (PLAYER.x + PLAYER.w) < s.speed * 0.12
      s = step(s, 1 / 60, jump, { ...cfg, itemCount: 0 }).state
      expect(s.status).toBe('running')
    }
    expect(s.score).toBeGreaterThan(500)
  })
})

describe('kecepatan', () => {
  it('naik bertahap dan dibatasi maksimum', () => {
    expect(speedAt(0, cfg)).toBe(240)
    expect(speedAt(199, cfg)).toBe(265)
    expect(speedAt(100000, cfg)).toBe(520)
  })
  it('lebih rendah saat prefers-reduced-motion', () => {
    expect(speedAt(0, { ...cfg, reducedMotion: true })).toBeLessThan(240)
    expect(speedAt(100000, { ...cfg, reducedMotion: true })).toBeLessThan(520)
  })
})

describe('unlock', () => {
  it('memancarkan UNLOCK tepat sekali per ambang, berurutan, lalu berhenti saat item habis', () => {
    let s = noObstacles(start(createGame(cfg, 1)))
    const unlocks: number[] = []
    for (let k = 1; k <= 3; k++) {
      const r = runUntil(s, cfg, (e) => e.some((x) => x.type === 'UNLOCK'))
      const ev = r.events.find((x) => x.type === 'UNLOCK')!
      expect(ev).toEqual({ type: 'UNLOCK', index: k - 1, threshold: k * 100 })
      expect(r.state.status).toBe('paused')
      expect(r.state.score).toBeGreaterThanOrEqual(k * 100)
      expect(r.state.score).toBeLessThan(k * 100 + 5)
      // Saat dijeda, step tidak mengubah apa pun dan tidak memancarkan ulang.
      expect(step(r.state, 1, false, cfg)).toEqual({ state: r.state, events: [] })
      unlocks.push(ev.index)
      s = noObstacles(resume(r.state))
    }
    expect(unlocks).toEqual([0, 1, 2])
    // Setelah semua item terbuka, ambang 400/500 tidak menjeda.
    const r = runUntil(s, cfg, (_, st) => st.score >= 520)
    expect(r.state.status).toBe('running')
    expect(r.state.unlocked).toEqual([0, 1, 2])
  })

  it('resume tidak mengubah skor, jarak, atau rintangan', () => {
    const s0 = start(createGame(cfg, 3))
    const s1 = runUntil(s0, cfg, (_, st) => st.score > 30).state
    const p = pause(s1)
    const r = resume(p)
    expect(r.score).toBe(s1.score)
    expect(r.distance).toBe(s1.distance)
    expect(r.obstacles).toEqual(s1.obstacles)
    expect(r.status).toBe('running')
  })

  it('pengali debug mempercepat skor', () => {
    const c = { ...cfg, scoreMultiplier: 5 }
    const r = runUntil(noObstacles(start(createGame(c, 1))), c, (e) => e.some((x) => x.type === 'UNLOCK'))
    expect(r.state.elapsed).toBeLessThan(2)
  })
})

describe('lompat dan game over', () => {
  it('melompat hanya dari tanah', () => {
    const s = noObstacles(start(createGame(cfg, 1)))
    const r1 = step(s, 1 / 60, true, cfg)
    expect(r1.events).toContainEqual({ type: 'JUMP' })
    expect(r1.state.onGround).toBe(false)
    expect(step(r1.state, 1 / 60, true, cfg).events).not.toContainEqual({ type: 'JUMP' })
  })

  it('menabrak rintangan → GAME_OVER dan berhenti', () => {
    const s = { ...start(createGame(cfg, 1)), obstacles: [{ kind: 'batu', x: PLAYER.x + 20, w: 30, h: 30 }] }
    const r = runUntil(s, cfg, (e) => e.some((x) => x.type === 'GAME_OVER'))
    expect(r.state.status).toBe('over')
    expect(step(r.state, 1 / 60, true, cfg).events).toEqual([])
  })
})
