import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { labelOr } from '../lib/cities'
import ItemModal from '../components/ItemModal'
import { Button } from '../components/primitives'
import type { CityDetail, Item } from '../lib/api.types'
import {
  createGame,
  metersOf,
  pause,
  resume,
  start,
  step,
  visibleNpcs,
  WORLD_H,
  WORLD_W,
  type GameConfig,
  type GameState,
} from './engine'
import { fitCanvas } from './fit'
import { npcFor } from './npcs'
import { debugMultiplier } from './debug'
import { draw, preloadSprites } from './render'

/** NPC yang tampil di kanvas untuk state ini (tiap ambang = satu NPC per item). */
function npcsOf(s: GameState, cfg: GameConfig, items: Item[]) {
  return visibleNpcs(s, cfg).map((view) => ({ view, def: npcFor(items[view.index]?.id) }))
}

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(query)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

type Overlay =
  | { kind: 'ready' }
  | { kind: 'paused' }
  | { kind: 'item'; item: Item; number: number }
  | { kind: 'countdown'; n: number }
  | { kind: 'over' }
  | null

/**
 * Game runner (F-040–F-046). Loop rAF memanggil engine murni; React hanya untuk HUD,
 * modal item, dan overlay.
 */
export default function GameView({
  detail,
  onUnlock,
  onFinish,
  onAsk,
  onExit,
}: {
  detail: CityDetail
  onUnlock: (item: Item) => void
  onFinish: (score: number, unlockedIds: string[]) => void
  onAsk: (text: string, lessonId: string) => void
  /** Keluar dari game kembali ke path (tombol di bilah atas). */
  onExit?: () => void
}) {
  const reducedMotion = usePrefersReducedMotion()
  const cfg: GameConfig = useMemo(
    () => ({
      unlockEvery: detail.game.unlock_every,
      itemCount: detail.items.length,
      obstacles: detail.game.obstacles,
      speed: detail.game.speed,
      reducedMotion,
      scoreMultiplier: debugMultiplier(window.location.search),
    }),
    [detail, reducedMotion],
  )

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  /** Lebar dunia yang tampil (untuk latar statis yang dipusatkan). */
  const viewWRef = useRef(WORLD_W)
  const stateRef = useRef<GameState>(createGame(cfg))
  const jumpRef = useRef(false)
  const cfgRef = useRef(cfg)
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'ready' })
  const [hud, setHud] = useState({ score: 0, meters: 0, items: 0 })
  const overlayRef = useRef<Overlay>(overlay)
  const callbacks = useRef({ onUnlock, onFinish })
  useLayoutEffect(() => {
    cfgRef.current = cfg
    overlayRef.current = overlay
    callbacks.current = { onUnlock, onFinish }
  })

  // Kanvas mengisi area layar penuh: tinggi dunia (WORLD_H) dipetakan ke tinggi layar,
  // lebar dunia yang tampil menyesuaikan rasio layar (540..WORLD_W). Layar terlalu lebar
  // diberi pita samping, layar potret diberi pita atas-bawah. Tajam di layar DPR tinggi.
  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const resize = () => {
      const { w, h, viewW } = fitCanvas(stage.clientWidth || WORLD_W, stage.clientHeight || WORLD_H)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      viewWRef.current = viewW
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(canvas.width / viewW, 0, 0, canvas.height / WORLD_H, 0, 0)
        draw(ctx, stateRef.current, reducedMotion, npcsOf(stateRef.current, cfgRef.current, detail.items), viewW)
      }
    }
    resize()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(resize)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [reducedMotion, detail])

  // Mode layar penuh: halaman di belakang tidak bisa digulir selama game tampil.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [])
  const [browserFull, setBrowserFull] = useState(false)
  useEffect(() => {
    const on = () => setBrowserFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const toggleBrowserFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  useEffect(preloadSprites, [])

  // Loop utama
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastHud = 0
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const { state, events } = step(stateRef.current, dt, jumpRef.current, cfgRef.current)
      jumpRef.current = false
      stateRef.current = state
      for (const e of events) {
        if (e.type === 'UNLOCK') {
          const item = detail.items[e.index]
          if (item) {
            callbacks.current.onUnlock(item)
            setOverlay({ kind: 'item', item, number: e.index + 1 })
          }
        } else if (e.type === 'GAME_OVER') {
          setOverlay({ kind: 'over' })
        }
      }
      if (events.length > 0 || now - lastHud > 100) {
        lastHud = now
        const meters = metersOf(state.distance)
        setHud((h) =>
          h.score === state.score && h.items === state.unlocked.length && h.meters === meters
            ? h
            : { score: state.score, meters, items: state.unlocked.length },
        )
      }
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) draw(ctx, state, reducedMotion, npcsOf(state, cfgRef.current, detail.items), viewWRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [detail, reducedMotion])

  const doPause = useCallback(() => {
    if (stateRef.current.status !== 'running') return
    stateRef.current = pause(stateRef.current)
    setOverlay({ kind: 'paused' })
  }, [])

  // Hitung mundur 3 detik lalu resume tanpa mengubah skor (F-043).
  const resumeWithCountdown = useCallback(() => {
    setOverlay({ kind: 'countdown', n: 3 })
  }, [])
  useEffect(() => {
    if (overlay?.kind !== 'countdown') return
    const id = window.setTimeout(() => {
      if (overlay.n > 1) setOverlay({ kind: 'countdown', n: overlay.n - 1 })
      else {
        stateRef.current = resume(stateRef.current)
        setOverlay(null)
        stageRef.current?.focus()
      }
    }, 1000)
    return () => window.clearTimeout(id)
  }, [overlay])

  const action = useCallback(() => {
    const o = overlayRef.current
    if (o?.kind === 'ready') {
      stateRef.current = start(stateRef.current)
      setOverlay(null)
      jumpRef.current = false
      return
    }
    if (o === null) jumpRef.current = true
  }, [])

  // Keyboard: Spasi / panah atas / W untuk lompat; P / Escape untuk jeda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const o = overlayRef.current
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        if (o === null || o.kind === 'ready') {
          // Jangan menggulir halaman atau mengaktifkan tombol yang sedang difokus.
          if (target?.tagName !== 'BUTTON' || o === null) e.preventDefault()
          if (target?.tagName !== 'BUTTON' || o === null) action()
        }
      } else if ((e.key === 'p' || e.key === 'Escape') && o === null) {
        doPause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action, doPause])

  // Jeda otomatis saat tab tidak aktif (F-046).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) doPause()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', doPause)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', doPause)
    }
  }, [doPause])

  const finish = () => {
    const s = stateRef.current
    callbacks.current.onFinish(
      s.score,
      s.unlocked.map((i) => detail.items[i]?.id).filter((x): x is string => !!x),
    )
  }

  const hudBtn =
    'grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-emas'

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-teal-800 text-white" role="region" aria-label="Game layar penuh">
      <div className="flex items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5">
        {onExit && (
          <button type="button" onClick={onExit} className={hudBtn} aria-label="Keluar dari game">
            <HudIcon d="M15 5l-7 7 7 7" />
          </button>
        )}
        <p className="text-sm font-bold" aria-live="off">
          Skor <span className="text-2xl font-extrabold tabular-nums text-emas">{hud.score}</span>
          <span className="ml-2 tabular-nums text-white/70">{hud.meters} m</span>
        </p>
        <p className="ml-auto rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-emas-100">
          Item {hud.items}/{detail.items.length}
        </p>
        <button
          type="button"
          onClick={toggleBrowserFull}
          className={`${hudBtn} hidden sm:grid`}
          aria-label={browserFull ? 'Keluar dari layar penuh' : 'Layar penuh'}
          aria-pressed={browserFull}
        >
          <HudIcon d={browserFull ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} />
        </button>
        <button type="button" onClick={doPause} disabled={overlay !== null} className={hudBtn} aria-label="Jeda">
          <HudIcon d="M9 5v14M15 5v14" />
        </button>
      </div>

      <div
        ref={stageRef}
        tabIndex={0}
        aria-label="Area game. Ketuk atau tekan Spasi untuk melompat."
        onPointerDown={(e) => {
          if (overlayRef.current === null || overlayRef.current.kind === 'ready') {
            e.preventDefault()
            action()
          }
        }}
        className="relative grid min-h-0 flex-1 touch-none select-none place-items-center overflow-hidden outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emas"
      >
        <canvas ref={canvasRef} className="block" aria-hidden="true" />

        {overlay?.kind === 'ready' && (
          <div className="absolute inset-0 grid cursor-pointer place-items-center bg-tinta/25 p-4 text-center">
            <div className="rounded-3xl bg-white/95 px-4 py-3 text-tinta shadow-kartu sm:px-5 sm:py-4">
              <p className="text-base font-extrabold text-teal sm:text-lg">Ketuk atau tekan Spasi untuk mulai</p>
              <p className="mt-1 hidden text-sm text-redup sm:block">
                Lompati rintangan. Tiap {detail.game.unlock_every} m kamu bertemu warga yang
                menceritakan item budaya!
              </p>
              <p className="mt-1 text-xs text-redup landscape:hidden">Putar ponsel ke posisi mendatar agar layar lebih luas.</p>
            </div>
          </div>
        )}

        {overlay?.kind === 'paused' && (
          <div role="dialog" aria-label="Game dijeda" className="absolute inset-0 grid place-items-center bg-tinta/40 p-4">
            <div className="rounded-3xl bg-white px-6 py-5 text-center text-tinta shadow-kartu">
              <p className="text-lg font-extrabold text-teal">Dijeda</p>
              <div className="mt-3 flex justify-center gap-2">
                {onExit && (
                  <Button variant="secondary" onClick={onExit}>
                    Keluar
                  </Button>
                )}
                <Button autoFocus onClick={resumeWithCountdown}>
                  Lanjut
                </Button>
              </div>
            </div>
          </div>
        )}

        {overlay?.kind === 'countdown' && (
          <div className="absolute inset-0 grid place-items-center bg-tinta/20" role="status" aria-live="assertive">
            <p className="text-6xl font-extrabold text-white drop-shadow-lg">{overlay.n}</p>
          </div>
        )}

        {overlay?.kind === 'over' && (
          <div role="dialog" aria-label="Permainan selesai" className="absolute inset-0 grid place-items-center bg-tinta/45 p-4">
            <div className="rounded-3xl bg-white px-6 py-5 text-center text-tinta shadow-kartu">
              <p className="text-lg font-extrabold text-teal">Ups, tersandung!</p>
              <p className="mt-1 text-sm text-redup">Skor akhir: {hud.score}</p>
              <Button className="mt-3" autoFocus onClick={finish}>
                Lihat ringkasan
              </Button>
            </div>
          </div>
        )}

        {overlay?.kind === 'item' && (
          <div className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-tinta/45 p-3 text-tinta">
            <ItemModal
              item={overlay.item}
              npc={npcFor(overlay.item.id)}
              number={overlay.number}
              total={detail.items.length}
              template={detail.agent_script.item_unlocked}
              source={detail.sources[overlay.item.chunk]}
              onAsk={() => onAsk(`Ceritakan lebih lanjut tentang ${labelOr(overlay.item.name, 'item ini')}.`, overlay.item.lesson)}
              onContinue={resumeWithCountdown}
              cityId={detail.city.id}
              sources={detail.sources}
            />
          </div>
        )}
      </div>

      <p className="px-4 py-2 text-center text-xs text-white/70">
        Ketuk layar, Spasi, atau panah atas untuk melompat. P untuk jeda.
        {cfg.scoreMultiplier && cfg.scoreMultiplier > 1 ? ` Mode debug: skor ×${cfg.scoreMultiplier}.` : ''}
      </p>
    </div>
  )
}

function HudIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
