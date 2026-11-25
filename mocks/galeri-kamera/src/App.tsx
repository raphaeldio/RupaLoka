import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene'
import { currentIndex, makeLayout, reduce, type CamAction, type CamState, type LayoutKind } from './flow'

// Label saja; tanpa fakta budaya. Teks hotspot asli menunggu tim budaya (KH).
const ITEMS = [
  { id: 'angklung', label: 'Angklung' },
  { id: 'wayang', label: 'Wayang golek' },
  { id: 'cepot', label: 'Cepot' },
]
// Lorong lurus memakai 2 slot kosong; lorong melingkar mengisi sisa kelilingnya sendiri.
const STRAIGHT_ITEMS = [
  ...ITEMS,
  { id: 'slot-4', label: 'Segera hadir', placeholder: true },
  { id: 'slot-5', label: 'Segera hadir', placeholder: true },
]

const HINT: Record<CamState['kind'], string> = {
  intro: 'Memasuki galeri…',
  walk: 'Scroll / geser ke atas untuk maju · klik objek di samping untuk mendekat',
  focus: 'Klik objek lagi untuk memeriksa · Esc / klik area kosong untuk mundur',
  inspect: 'Geser untuk memutar objek · klik titik emas · Esc untuk mundur',
}

export default function App() {
  const [kind, setKind] = useState<LayoutKind>('melingkar')
  // key: ganti tata letak = mulai ulang galeri dari pintu masuk
  return <Gallery key={kind} kind={kind} onKind={setKind} />
}

function Gallery({ kind, onKind }: { kind: LayoutKind; onKind: (k: LayoutKind) => void }) {
  const layout = useMemo(() => makeLayout(kind, kind === 'lurus' ? STRAIGHT_ITEMS : ITEMS), [kind])
  const exhibits = layout.exhibits
  const [state, dispatchRaw] = useReducer(
    (s: CamState, a: CamAction) => reduce(s, a, layout),
    { kind: 'intro' } as CamState,
  )
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [view, setView] = useState<'galeri' | 'daftar'>('galeri')
  const [hotspot, setHotspot] = useState<{ i: number; h: number } | null>(null)
  const [fade, setFade] = useState(false)

  // Gerak dikurangi: ganti luncuran kamera dengan kedipan pudar singkat.
  const dispatch = useCallback(
    (a: CamAction) => {
      if (reducedMotion && a.type !== 'walkBy') {
        setFade(true)
        window.setTimeout(() => setFade(false), 180)
      }
      if (a.type === 'back' || a.type === 'step' || a.type === 'walkBy') setHotspot(null)
      dispatchRaw(a)
    },
    [reducedMotion],
  )

  useEffect(() => {
    const t = window.setTimeout(() => dispatchRaw({ type: 'introDone' }), reducedMotion ? 0 : 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drag: berjalan (walk) atau memutar objek (inspect). Bedakan drag dari klik.
  const drag = useRef({ down: false, x: 0, y: 0, moved: 0 })
  const lastWasDrag = useRef(false)
  const spin = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { down: true, x: e.clientX, y: e.clientY, moved: 0 }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    drag.current.x = e.clientX
    drag.current.y = e.clientY
    drag.current.moved += Math.abs(dx) + Math.abs(dy)
    if (drag.current.moved < 6) return
    const k = stateRef.current.kind
    // geser ke atas = maju (seperti mendorong diri ke depan)
    if (k === 'walk') dispatch({ type: 'walkBy', delta: dy * 0.012 })
    if (k === 'inspect') spin.current += dx * 0.012
  }
  const onPointerUp = () => {
    lastWasDrag.current = drag.current.moved >= 6
    drag.current.down = false
  }
  const onWheel = (e: React.WheelEvent) => {
    if (view !== 'galeri' || stateRef.current.kind === 'inspect') return
    dispatch({ type: 'walkBy', delta: e.deltaY * 0.006 })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') dispatch({ type: 'step', dir: -1 })
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') dispatch({ type: 'step', dir: 1 })
      if (e.key === 'Escape') dispatch({ type: 'back' })
      if (e.key === 'Enter' && stateRef.current.kind === 'focus')
        dispatch({ type: 'clickExhibit', index: stateRef.current.index })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  useEffect(() => {
    if (state.kind !== 'inspect') spin.current = 0
  }, [state.kind])

  const idx = currentIndex(state, layout)
  const current = exhibits[idx]

  return (
    <div className="app">
      <div
        className="stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 55, near: 0.05, far: 60, position: [0, 2, 6] }}
          onPointerMissed={() => {
            if (!lastWasDrag.current) dispatch({ type: 'back' })
          }}
        >
          <Scene
            state={state}
            layout={layout}
            reducedMotion={reducedMotion}
            wasDrag={() => lastWasDrag.current}
            spin={spin}
            onExhibit={(i) => dispatch({ type: 'clickExhibit', index: i })}
            onHotspot={(i, h) => setHotspot({ i, h })}
            onMiss={() => dispatch({ type: 'back' })}
          />
        </Canvas>
        <div className={`fade ${fade ? 'on' : ''}`} aria-hidden />
      </div>

      <header className="top">
        <div className="brand">
          <span className="tag">MOCK</span> Rupaloka · Galeri 3D — alur kamera
        </div>
        <div className="seg" role="group" aria-label="Bentuk lorong">
          <button aria-pressed={kind === 'lurus'} onClick={() => onKind('lurus')}>
            Lurus
          </button>
          <button aria-pressed={kind === 'melingkar'} onClick={() => onKind('melingkar')}>
            Melingkar
          </button>
        </div>
        <div className="seg" role="group" aria-label="Tampilan">
          <button aria-pressed={view === 'galeri'} onClick={() => setView('galeri')}>
            Galeri
          </button>
          <button aria-pressed={view === 'daftar'} onClick={() => setView('daftar')}>
            Daftar
          </button>
        </div>
      </header>

      {view === 'daftar' && (
        <section className="list" aria-label="Daftar koleksi">
          <h2>Koleksi di galeri</h2>
          <ol>
            {exhibits.map((ex, i) => (
              <li key={ex.id}>
                <button
                  disabled={ex.placeholder}
                  onClick={() => {
                    setView('galeri')
                    dispatch({ type: 'goto', index: i })
                  }}
                >
                  {String(i + 1).padStart(2, '0')} · {ex.label}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {hotspot && (
        <aside className="panel" role="dialog" aria-label="Hotspot">
          <div className="eyebrow">
            {exhibits[hotspot.i].label} · titik {hotspot.h + 1}
          </div>
          <p>Teks hotspot ditulis dan bersumber dari tim budaya (TODO). Mock tidak memuat fakta.</p>
          <button onClick={() => setHotspot(null)}>Tutup</button>
        </aside>
      )}

      <footer className="bottom">
        <div className="caption" aria-live="polite">
          <div className="eyebrow">
            {state.kind === 'walk' || state.kind === 'intro' ? 'Kamu sedang melewati' : state.kind === 'focus' ? 'Di depanmu' : 'Memeriksa'}
          </div>
          <div className="title">{current.label}</div>
          <div className="hint">{HINT[state.kind]}</div>
        </div>
        <div className="nav">
          {(state.kind === 'focus' || state.kind === 'inspect') && (
            <button onClick={() => dispatch({ type: 'back' })} aria-label="Mundur">
              ↩ Mundur
            </button>
          )}
          <button onClick={() => dispatch({ type: 'step', dir: -1 })} aria-label="Sebelumnya">
            ↓
          </button>
          <button onClick={() => dispatch({ type: 'step', dir: 1 })} aria-label="Berikutnya">
            ↑
          </button>
        </div>
      </footer>

      <div className="debug">
        <label>
          <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} /> Gerak
          dikurangi
        </label>
        <span>
          state: {state.kind}
          {state.kind === 'walk' ? ` d=${state.d.toFixed(1)}m` : ''}
        </span>
      </div>
    </div>
  )
}
