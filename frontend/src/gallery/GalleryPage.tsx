import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFullscreen } from './useFullscreen'
import { useAgent } from '../lib/agentStore'
import type { ExhibitOut } from '../lib/api.types'
import { galleryEnabled } from '../lib/flags'
import { useCity } from '../pages/city/useCity'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import { currentIndex, makeLayout, reduce, type CamAction, type CamState } from './cameraFlow'
import ExhibitCard from './ExhibitCard'
import { nextLine, type GuideEvent, type GuideMemory, IDLE_AFTER_MS } from './guide'
import { cardSpeech, PENDING_TEXT } from './labelText'
import { speak, speechAvailable, stopSpeaking } from './speech'

const GalleryScene = lazy(() => import('./GalleryScene'))

const AUDIO_KEY = 'rupaloka-galeri-suara'

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Galeri 3D Bandung (SDD ADR 40): lorong melingkar, kotak putih berlabel, kartu, maskot. */
export default function GalleryPage() {
  const detail = useCity()
  if (!galleryEnabled) return <PremiumGate cityId={detail.city.id} />
  if (!detail.gallery || detail.gallery.exhibits.length === 0) {
    return (
      <main id="konten" className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Galeri 3D {detail.city.name}</h1>
        <p className="mt-3 text-redup">Galeri kota ini segera hadir.</p>
      </main>
    )
  }
  return <Gallery />
}

function PremiumGate({ cityId }: { cityId: string }) {
  return (
    <main id="konten" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold">Galeri 3D</h1>
      <p className="mt-3 text-redup">Galeri 3D dan VR adalah fitur premium.</p>
      <Link
        to={`/langganan?dari=${encodeURIComponent(`/kota/${cityId}/galeri`)}`}
        className="tekan mt-6 inline-block rounded-xl border border-emas/40 bg-emas px-4 py-2 font-extrabold"
      >
        Lihat paket langganan
      </Link>
    </main>
  )
}

function Gallery() {
  const detail = useCity()
  const gallery = detail.gallery!
  const exhibits = gallery.exhibits
  const layout = useMemo(
    () => makeLayout(exhibits.map((e) => ({ id: e.id, label: e.name })), gallery.layout),
    [exhibits, gallery.layout],
  )
  const [state, dispatchRaw] = useReducer((s: CamState, a: CamAction) => reduce(s, a, layout), { kind: 'intro' } as CamState)
  const [webgl] = useState(hasWebGL)
  const [view, setView] = useState<'galeri' | 'daftar'>(() => (hasWebGL() ? 'galeri' : 'daftar'))
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [audio, setAudio] = useState(() => localStorage.getItem(AUDIO_KEY) === '1')
  const [card, setCard] = useState<number | null>(null)
  const [line, setLine] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const [help, setHelp] = useState(false)
  // Popup sambutan saat masuk; intro kamera dan sapaan Saloka mulai setelah ditutup.
  const [welcome, setWelcome] = useState(true)
  const mem = useRef<GuideMemory>({ lastKey: null, lastAt: -Infinity })
  const lastInput = useRef(Date.now())
  const stateRef = useRef(state)
  stateRef.current = state
  const spin = useRef(0)
  const canSpeak = speechAvailable()
  const fs = useFullscreen()

  // Galeri menutupi seluruh layar: kunci gulir halaman di belakangnya.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const dataAt = (i: number): ExhibitOut | null => {
    const src = layout.exhibits[i]?.source
    return src === null || src === undefined ? null : exhibits[src]
  }
  const idx = currentIndex(state, layout)
  const current = dataAt(idx)

  const dispatch = useCallback((a: CamAction) => {
    lastInput.current = Date.now()
    if (a.type !== 'walkBy') stopSpeaking()
    dispatchRaw(a)
  }, [])

  /** Pemandu bicara: gelembung maskot + aria-live (+ suara bila diaktifkan). */
  const guide = useCallback(
    (e: GuideEvent, force = false) => {
      const r = nextLine(force ? { lastKey: null, lastAt: -Infinity } : mem.current, e, Date.now())
      mem.current = r.mem
      if (!r.say) return
      setLine(r.say)
      setAnnounce(r.say)
      if (audio) speak(r.say)
    },
    [audio],
  )

  useEffect(() => {
    if (welcome) return
    lastInput.current = Date.now()
    const t = window.setTimeout(() => dispatchRaw({ type: 'introDone' }), reducedMotion ? 0 : 900)
    guide({ type: 'enter' })
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcome])

  // Navigasi berkala: tiap pindah pameran/state, dan pengingat saat lama diam.
  useEffect(() => {
    const e = layout.exhibits[idx]
    const name = current?.name ?? 'Segera hadir'
    if (state.kind === 'walk') guide({ type: 'pass', index: idx, name, side: e.side, empty: current === null })
    if (state.kind === 'focus') guide({ type: 'focus', index: idx, name })
    if (state.kind === 'inspect') guide({ type: 'inspect', index: idx, name })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, idx])

  useEffect(() => {
    const t = window.setInterval(() => {
      if (welcome || card !== null || Date.now() - lastInput.current < IDLE_AFTER_MS) return
      guide({ type: 'idle', name: dataAt(currentIndex(stateRef.current, layout))?.name ?? 'koleksi ini' })
    }, 5000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcome, card, guide, layout])

  useEffect(() => () => stopSpeaking(), [])

  const openCard = useCallback(
    (i: number) => {
      if (!dataAt(i)) return
      lastInput.current = Date.now()
      stopSpeaking()
      setCard(i)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, exhibits],
  )
  const askSaloka = useCallback((name?: string) => {
    stopSpeaking()
    const { ask, setOpen } = useAgent.getState()
    if (name) ask(`Ceritakan tentang ${name}`)
    else setOpen(true)
  }, [])

  // Keyboard (juga untuk pengguna tuna netra): panah, Enter, K, T, Esc, H.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (welcome || card !== null || ev.altKey || ev.ctrlKey || ev.metaKey) return
      const target = ev.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const s = stateRef.current
      const i = currentIndex(s, layout)
      switch (ev.key) {
        case 'ArrowUp':
          dispatch({ type: 'step', dir: 1 })
          break
        case 'ArrowDown':
          dispatch({ type: 'step', dir: -1 })
          break
        case 'ArrowRight':
          if (s.kind === 'inspect') spin.current -= 0.5
          else dispatch({ type: 'step', dir: 1 })
          break
        case 'ArrowLeft':
          if (s.kind === 'inspect') spin.current += 0.5
          else dispatch({ type: 'step', dir: -1 })
          break
        case 'Enter':
          if (target?.tagName === 'BUTTON' || target?.tagName === 'A') return
          dispatch({ type: 'clickExhibit', index: i })
          break
        case 'k':
        case 'K':
          openCard(i)
          break
        case 't':
        case 'T':
          askSaloka()
          break
        case 'f':
        case 'F':
          fs.toggle()
          break
        case 'h':
        case 'H':
        case '?':
          setHelp((v) => !v)
          break
        case 'Escape':
          dispatch({ type: 'back' })
          break
        default:
          return
      }
      ev.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [welcome, card, layout, dispatch, openCard, askSaloka, fs])

  // Drag: geser vertikal = berjalan; horizontal saat periksa = memutar objek.
  const drag = useRef({ down: false, x: 0, y: 0, moved: 0 })
  const lastWasDrag = useRef(false)
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
    if (k === 'walk' || k === 'focus') dispatch({ type: 'walkBy', delta: dy * 0.012 })
    if (k === 'inspect') spin.current += dx * 0.012
  }
  const onPointerUp = () => {
    lastWasDrag.current = drag.current.moved >= 6
    drag.current.down = false
  }
  const onWheel = (e: React.WheelEvent) => {
    if (stateRef.current.kind === 'inspect') return
    dispatch({ type: 'walkBy', delta: e.deltaY * 0.006 })
  }

  const toggleAudio = () => {
    const next = !audio
    setAudio(next)
    localStorage.setItem(AUDIO_KEY, next ? '1' : '0')
    if (next) speak('Suara pemandu aktif. ' + (line ?? ''))
    else stopSpeaking()
  }

  const cardData = card === null ? null : dataAt(card)
  const position = `${idx + 1} dari ${layout.exhibits.length}`

  return (
    <main id="konten" className="fixed inset-0 z-[55] bg-[#0e4d4b]">
      <h1 className="sr-only">Galeri 3D {detail.city.name}</h1>
      <p className="sr-only" id="petunjuk-galeri">
        Museum 3D berbentuk lorong melingkar. Panah atas dan bawah untuk berpindah koleksi, Enter untuk mendekat
        dan memeriksa, K untuk membaca kartu, T untuk bertanya kepada Saloka, F untuk layar penuh, Esc untuk mundur,
        H untuk bantuan.
        Pemandu akan mengumumkan posisimu. Tombol Daftar menampilkan semua koleksi sebagai daftar.
      </p>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </div>

      <div className="relative h-dvh overflow-hidden">
        {view === 'galeri' && webgl && (
          <div
            className="absolute inset-0 touch-none"
            role="application"
            aria-label="Lorong galeri 3D"
            aria-describedby="petunjuk-galeri"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
          >
            <Suspense fallback={<Loading />}>
              <GalleryScene
                layout={layout}
                exhibits={exhibits}
                state={state}
                reducedMotion={reducedMotion}
                guideModel={gallery.guide_available ? gallery.guide_model ?? null : null}
                decor={gallery.decor ?? []}
                guideLine={line}
                spin={spin}
                wasDrag={() => lastWasDrag.current}
                onExhibit={(i) => dispatch({ type: 'clickExhibit', index: i })}
                onCard={openCard}
                onMascot={() => askSaloka()}
                onMiss={() => dispatch({ type: 'back' })}
              />
            </Suspense>
          </div>
        )}

        {view === 'daftar' && (
          <ExhibitList
            exhibits={exhibits}
            webgl={webgl}
            onCard={(src) => openCard(layout.exhibits.findIndex((e) => e.source === src))}
            onGo={(src) => {
              setView('galeri')
              dispatch({ type: 'goto', index: layout.exhibits.findIndex((e) => e.source === src) })
            }}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-3">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link to={`/kota/${detail.city.id}`} className={btn(false)} aria-label="Keluar dari galeri, kembali ke path belajar">
              ← Keluar
            </Link>
            <span className="rounded-xl bg-tinta/80 px-2 py-1 text-sm font-extrabold text-kertas">
              Museum Rupaloka · {detail.city.name}
            </span>
          </div>
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {fs.supported && (
              <button type="button" aria-pressed={fs.active} onClick={fs.toggle} className={btn(fs.active)}>
                {fs.active ? 'Keluar layar penuh' : 'Layar penuh'}
              </button>
            )}
            {canSpeak && (
              <button type="button" aria-pressed={audio} onClick={toggleAudio} className={btn(audio)}>
                Suara pemandu: {audio ? 'nyala' : 'mati'}
              </button>
            )}
            <button type="button" aria-pressed={help} onClick={() => setHelp((v) => !v)} className={btn(help)}>
              Bantuan
            </button>
            {webgl && (
              <div role="group" aria-label="Tampilan" className="flex gap-2">
                <button type="button" aria-pressed={view === 'galeri'} onClick={() => setView('galeri')} className={btn(view === 'galeri')}>
                  Galeri
                </button>
                <button type="button" aria-pressed={view === 'daftar'} onClick={() => setView('daftar')} className={btn(view === 'daftar')}>
                  Daftar
                </button>
              </div>
            )}
          </div>
        </div>

        {help && (
          <section aria-label="Bantuan keyboard" className="absolute right-3 top-16 z-10 w-72 rounded-xl border border-emas/40 bg-white p-3 text-sm text-tinta shadow-kartu">
            <h2 className="font-extrabold">Cara menjelajah</h2>
            <ul className="mt-2 grid gap-1">
              <li>↑ / ↓, gulir, atau geser: pindah koleksi</li>
              <li>Enter atau klik benda: mendekat, lalu periksa</li>
              <li>← / → saat memeriksa: memutar benda</li>
              <li>K atau klik kotak putih: kartu penjelasan</li>
              <li>T atau klik Saloka: bertanya</li>
              <li>F: layar penuh</li>
              <li>Esc: mundur · H: tutup bantuan</li>
            </ul>
          </section>
        )}

        {view === 'galeri' && webgl && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-3">
            <div className="pointer-events-auto max-w-md rounded-xl border-l-4 border-emas bg-tinta/85 px-3 py-2 text-kertas">
              <p className="eyebrow opacity-80">
                {state.kind === 'focus' ? 'Di depanmu' : state.kind === 'inspect' ? 'Memeriksa' : 'Kamu sedang melewati'} · {position}
              </p>
              <p className="text-lg font-extrabold">{current?.name ?? 'Pedestal kosong'}</p>
              <p className="line-clamp-2 text-sm opacity-90">{current ? current.short_explanation ?? PENDING_TEXT : 'Koleksi berikutnya segera hadir.'}</p>
            </div>
            <nav aria-label="Navigasi galeri" className="pointer-events-auto flex flex-wrap gap-2">
              {(state.kind === 'focus' || state.kind === 'inspect') && (
                <button type="button" onClick={() => dispatch({ type: 'back' })} className={btn(false)}>
                  ↩ Mundur
                </button>
              )}
              <button type="button" onClick={() => dispatch({ type: 'step', dir: -1 })} className={btn(false)} aria-label="Koleksi sebelumnya">
                ↓
              </button>
              <button type="button" onClick={() => dispatch({ type: 'step', dir: 1 })} className={btn(false)} aria-label="Koleksi berikutnya">
                ↑
              </button>
              {current && (
                <button type="button" onClick={() => openCard(idx)} className={btn(true)}>
                  Kartu {current.name}
                </button>
              )}
              <button type="button" onClick={() => askSaloka()} className={btn(false)}>
                Tanya Saloka
              </button>
            </nav>
          </div>
        )}
      </div>

      {(cardData || welcome) && <div className="fixed inset-0 z-[56] bg-black/50" aria-hidden="true" />}
      <Dialog open={welcome} onOpenChange={(o) => !o && setWelcome(false)}>
        <DialogContent className="z-[57] max-w-md border-2 border-emas bg-kertas text-center" showCloseButton={false}>
          <p className="eyebrow text-redup">Galeri virtual Rupaloka</p>
          <DialogTitle className="text-3xl font-extrabold leading-tight text-tinta">Selamat Datang Di Museum Sri Baduga</DialogTitle>
          <DialogDescription className="text-redup">
            Berjalanlah menyusuri lorong, dekati koleksi, dan baca kartunya. Saloka akan memandumu.
          </DialogDescription>
          <button
            type="button"
            autoFocus
            onClick={() => setWelcome(false)}
            className="tekan mx-auto mt-2 rounded-xl border border-emas/40 bg-emas px-5 py-2.5 text-base font-extrabold text-tinta"
          >
            Mulai menjelajah
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={cardData !== null} onOpenChange={(o) => !o && setCard(null)}>
        {cardData && (
          <DialogContent className="z-[57] max-h-[85dvh] overflow-y-auto border border-emas/40 bg-kertas rounded-2xl">
            <DialogTitle className="text-2xl font-extrabold">{cardData.name}</DialogTitle>
            <DialogDescription className="sr-only">Kartu penjelasan dan cerita asal usul {cardData.name}</DialogDescription>
            <ExhibitCard
              exhibit={cardData}
              sources={detail.sources}
              canSpeak={canSpeak}
              onRead={() => speak(cardSpeech(cardData))}
              onAsk={() => {
                setCard(null)
                askSaloka(cardData.name)
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </main>
  )
}

const btn = (on: boolean) =>
  `tekan rounded-xl border border-emas/40 px-3 py-1.5 text-sm font-extrabold text-tinta focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emas ${on ? 'bg-emas' : 'bg-white'}`

function Loading() {
  return (
    <div className="grid h-full place-items-center text-kertas" role="status">
      Memuat galeri…
    </div>
  )
}

/** Tampilan Daftar: alternatif tanpa 3D (pembaca layar, perangkat tanpa WebGL). */
function ExhibitList({
  exhibits,
  webgl,
  onCard,
  onGo,
}: {
  exhibits: ExhibitOut[]
  webgl: boolean
  onCard: (i: number) => void
  onGo: (i: number) => void
}) {
  return (
    <section aria-label="Daftar koleksi museum" className="absolute inset-0 overflow-y-auto bg-kertas px-4 pb-6 pt-20 text-tinta">
      {!webgl && <p className="mb-3 text-sm text-redup">Perangkat ini tidak mendukung 3D, jadi koleksi ditampilkan sebagai daftar.</p>}
      <ol className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
        {exhibits.map((e, i) => (
          <li key={e.id} className="rounded-xl border border-emas/40 bg-white p-3 shadow-kartu">
            <h2 className="text-lg font-extrabold">
              {i + 1}. {e.name}
            </h2>
            <p className={e.short_explanation ? 'mt-1 text-sm' : 'mt-1 text-sm italic text-redup'}>{e.short_explanation ?? PENDING_TEXT}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onCard(i)} className={btn(true)}>
                Kartu {e.name}
              </button>
              {webgl && (
                <button type="button" onClick={() => onGo(i)} className={btn(false)}>
                  Lihat di 3D
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
