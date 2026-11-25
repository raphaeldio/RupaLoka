import { useEffect, useState, type KeyboardEvent } from 'react'
import { useReveal } from '../../lib/useReveal'

/** Alur belajar sesuai PRD v0.3; hanya menjelaskan produk, bukan fakta budaya. */
const STEPS = [
  {
    title: 'Pilih kota',
    text: 'Mulai dari peta Indonesia. Bandung sudah bisa dijelajahi; kota lain segera hadir.',
    emoji: '🗺️',
  },
  {
    title: 'Ditemani pemandu AI',
    text: 'Tanya apa saja tentang budaya kota. Saloka, pemandu AI, hanya menjawab dari catatan bersumber dan menyertakan rujukannya.',
    emoji: '💬',
  },
  {
    title: 'Kuis pemanasan',
    text: 'Lima soal singkat untuk mengenal pengetahuan awalmu. Penjelasan muncul setelah kamu menjawab.',
    emoji: '❓',
  },
  {
    title: 'Materi budaya',
    text: 'Kartu materi pendek dengan gambar, sumber, dan tombol untuk melihat lokasi aslinya.',
    emoji: '📖',
  },
  {
    title: 'Game keliling kota',
    text: 'Berlari, lompati rintangan, dan buka satu item budaya setiap kelipatan 1.000 poin.',
    emoji: '🏃',
  },
]

const AUTO_MS = 4500

export default function JourneySteps() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [ref, shown] = useReveal<HTMLDivElement>()

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!shown || paused || reduce) return
    const t = window.setTimeout(() => setActive((a) => (a + 1) % STEPS.length), AUTO_MS)
    return () => window.clearTimeout(t)
  }, [active, paused, shown])

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const d =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = (active + d + STEPS.length) % STEPS.length
    setActive(next)
    document.getElementById(`langkah-${next}`)?.focus()
  }

  const step = STEPS[active]

  return (
    <div
      ref={ref}
      className="reveal grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center"
      data-shown={shown}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        role="tablist"
        aria-label="Langkah belajar"
        aria-orientation="vertical"
        className="relative flex flex-col gap-1.5"
      >
        <span aria-hidden="true" className="absolute bottom-6 left-[26px] top-6 w-0.5 rounded bg-daun-100" />
        <span
          aria-hidden="true"
          className="absolute left-[26px] top-6 w-0.5 rounded bg-teal transition-[height] duration-500"
          style={{
            height: `calc((100% - 48px) * ${active / (STEPS.length - 1)})`,
          }}
        />
        {STEPS.map((s, i) => {
          const on = i === active
          const done = i < active
          return (
            <button
              key={s.title}
              id={`langkah-${i}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="panel-langkah"
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={onKey}
              className={`relative flex items-center gap-4 rounded-2xl px-3 py-2.5 text-left transition ${
                on ? 'bg-white shadow-kartu' : 'hover:bg-white/60'
              }`}
            >
              <span
                className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold transition ${
                  on
                    ? 'bg-emas text-teal-800 ring-4 ring-emas/30'
                    : done
                      ? 'bg-teal text-white'
                      : 'bg-white text-teal ring-2 ring-daun-100'
                }`}
              >
                {i + 1}
              </span>
              <span className={`font-bold ${on ? 'text-teal' : 'text-tinta/70'}`}>{s.title}</span>
            </button>
          )
        })}
      </div>

      <div
        id="panel-langkah"
        role="tabpanel"
        aria-labelledby={`langkah-${active}`}
        className="relative overflow-hidden rounded-[28px] bg-teal p-6 text-white shadow-melayang sm:p-8"
      >
        <svg viewBox="0 0 200 200" className="absolute -right-10 -top-10 size-48 text-white/10" aria-hidden="true">
          <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="18" />
          <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="12" />
        </svg>
        <div key={active} className="relative motion-safe:animate-[card-in_320ms_ease-out]">
          <span className="text-5xl" aria-hidden="true">
            {step.emoji}
          </span>
          <p className="mt-4 text-xs font-extrabold uppercase tracking-[2px] text-emas">
            Langkah {active + 1} dari {STEPS.length}
          </p>
          <h3 className="mt-1 text-2xl font-extrabold sm:text-3xl">{step.title}</h3>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85">{step.text}</p>
        </div>
        <div className="relative mt-6 flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.title} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
              <span
                className={`block h-full rounded-full bg-emas ${i < active ? 'w-full' : 'w-0'} ${
                  i === active && !paused ? 'motion-safe:animate-[isi_4500ms_linear_forwards]' : ''
                } ${i === active && paused ? 'w-full' : ''}`}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
