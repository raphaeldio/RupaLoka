import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { labelOr } from '../lib/cities'
import ItemModal from '../components/ItemModal'
import { Button } from '../components/primitives'
import type { CityDetail, Item } from '../lib/api.types'
import { createGame, pause, resume, start, step, WORLD_H, WORLD_W, type GameConfig, type GameState } from './engine'
import { debugMultiplier } from './debug'
import { draw } from './render'

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

/** Lebar dunia yang ditampilkan untuk lebar kanvas (px CSS). */
const viewWidth = (cssW: number): number => (cssW < 520 ? 540 : cssW < 760 ? 680 : WORLD_W)

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
}: {
  detail: CityDetail
  onUnlock: (item: Item) => void
  onFinish: (score: number, unlockedIds: string[]) => void
  onAsk: (text: string, lessonId: string) => void
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
  const stateRef = useRef<GameState>(createGame(cfg))
  const jumpRef = useRef(false)
  const cfgRef = useRef(cfg)
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'ready' })
  const [hud, setHud] = useState({ score: 0, items: 0 })
  const overlayRef = useRef<Overlay>(overlay)
  const callbacks = useRef({ onUnlock, onFinish })
  useLayoutEffect(() => {
    cfgRef.current = cfg
    overlayRef.current = overlay
    callbacks.current = { onUnlock, onFinish }
  })

  // Ukuran kanvas mengikuti lebar wadah; rasio WORLD_W:WORLD_H, tajam di layar DPR tinggi.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const w = canvas.parentElement?.clientWidth || WORLD_W
      // Layar sempit: tampilkan bagian kiri dunia saja agar kanvas tidak terlalu pendek.
      // Rintangan tetap muncul di x = WORLD_W dan terlihat ≥0,8 dtk sebelum sampai.
      const viewW = viewWidth(w)
      const h = (w * WORLD_H) / viewW
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.style.height = `${h}px`
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(canvas.width / viewW, 0, 0, canvas.height / WORLD_H, 0, 0)
        draw(ctx, stateRef.current, reducedMotion)
      }
    }
    resize()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement ?? canvas)
    return () => ro.disconnect()
  }, [reducedMotion])

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
        setHud((h) =>
          h.score === state.score && h.items === state.unlocked.length ? h : { score: state.score, items: state.unlocked.length },
        )
      }
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) draw(ctx, state, reducedMotion)
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

  return (
    <div className="relative rounded-3xl border border-garis bg-white p-3 shadow-kartu sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-bold" aria-live="off">
          Skor <span className="text-2xl font-extrabold tabular-nums text-teal">{hud.score}</span>
        </p>
        <p className="text-sm font-bold text-amber">
          Item {hud.items}/{detail.items.length}
        </p>
        <Button variant="secondary" onClick={doPause} disabled={overlay !== null} className="px-3 py-2">
          Jeda
        </Button>
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
        className="relative touch-none select-none overflow-hidden rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-amber"
      >
        <canvas ref={canvasRef} className="block w-full" aria-hidden="true" />

        {overlay?.kind === 'ready' && (
          <div className="absolute inset-0 grid cursor-pointer place-items-center bg-tinta/25 p-4 text-center">
            <div className="rounded-3xl bg-white/95 px-4 py-3 shadow-kartu sm:px-5 sm:py-4">
              <p className="text-base font-extrabold text-teal sm:text-lg">Ketuk atau tekan Spasi untuk mulai</p>
              <p className="mt-1 hidden text-sm text-redup sm:block">
                Lompati rintangan. Tiap {detail.game.unlock_every} poin ada item budaya menantimu!
              </p>
            </div>
          </div>
        )}

        {overlay?.kind === 'paused' && (
          <div role="dialog" aria-label="Game dijeda" className="absolute inset-0 grid place-items-center bg-tinta/40 p-4">
            <div className="rounded-3xl bg-white px-6 py-5 text-center shadow-kartu">
              <p className="text-lg font-extrabold text-teal">Dijeda</p>
              <Button className="mt-3" autoFocus onClick={resumeWithCountdown}>
                Lanjut
              </Button>
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
            <div className="rounded-3xl bg-white px-6 py-5 text-center shadow-kartu">
              <p className="text-lg font-extrabold text-teal">Ups, tersandung!</p>
              <p className="mt-1 text-sm text-redup">Skor akhir: {hud.score}</p>
              <Button className="mt-3" autoFocus onClick={finish}>
                Lihat ringkasan
              </Button>
            </div>
          </div>
        )}
      </div>
      {overlay?.kind === 'item' && (
        <ItemModal
          item={overlay.item}
          number={overlay.number}
          total={detail.items.length}
          template={detail.agent_script.item_unlocked}
          source={detail.sources[overlay.item.chunk]}
          onAsk={() => onAsk(`Ceritakan lebih lanjut tentang ${labelOr(overlay.item.name, 'item ini')}.`, overlay.item.lesson)}
          onContinue={resumeWithCountdown}
        />
      )}

      <p className="mt-2 px-1 text-xs text-redup">
        Ketuk layar, Spasi, atau panah atas untuk melompat. P untuk jeda.
        {cfg.scoreMultiplier && cfg.scoreMultiplier > 1 ? ` Mode debug: skor ×${cfg.scoreMultiplier}.` : ''}
      </p>
    </div>
  )
}
