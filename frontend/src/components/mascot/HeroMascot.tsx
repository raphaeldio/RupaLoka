import { useCallback, useEffect, useRef, useState } from 'react'
import PixelMascot, { type MascotFace } from './PixelMascot'
import { CLICK_LINES, GREETING, lookToward } from './lines'
import './mascot-hero.css'

/**
 * Maskot interaktif di hero: menyapa saat halaman dibuka (melambai + gelembung kata),
 * matanya mengikuti kursor, berkedip berkala, dan bereaksi saat diklik.
 * Semua gerak dimatikan bila prefers-reduced-motion (sapaan tetap tampil).
 */
export default function HeroMascot({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [look, setLook] = useState({ x: 0, y: 0 })
  const [blink, setBlink] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [waving, setWaving] = useState(false)
  const [happy, setHappy] = useState(false)
  const [hop, setHop] = useState(0)
  const lineRef = useRef(-1)
  const timers = useRef<number[]>([])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const bubbleId = useRef(0)
  const say = useCallback(
    (text: string, ms: number) => {
      setBubble(text)
      const id = ++bubbleId.current
      later(() => {
        if (bubbleId.current === id) setBubble(null)
      }, ms)
    },
    [later],
  )

  // Menyapa saat halaman dibuka.
  useEffect(() => {
    later(() => {
      setWaving(true)
      say(GREETING, 5200)
    }, 700)
    later(() => setWaving(false), 3400)
  }, [later, say])

  // Mata mengikuti kursor (seluruh jendela).
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        // Pusat mata kira-kira sepertiga atas gambar.
        setLook(lookToward(r.left + r.width / 2, r.top + r.height * 0.36, e.clientX, e.clientY))
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  // Berkedip tiap 2,5-5 detik.
  useEffect(() => {
    let t = 0
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true)
        window.setTimeout(() => setBlink(false), 140)
        loop()
      }, 2500 + Math.random() * 2500)
    }
    loop()
    return () => clearTimeout(t)
  }, [])

  const onClick = () => {
    lineRef.current = (lineRef.current + 1) % CLICK_LINES.length
    say(CLICK_LINES[lineRef.current], 2800)
    setHappy(true)
    setHop((n) => n + 1)
    setWaving(true)
    later(() => setHappy(false), 900)
    later(() => setWaving(false), 1400)
  }

  const face: MascotFace = happy ? 'happy' : blink ? 'blink' : 'normal'

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <div
        aria-live="polite"
        className={`maskot-gelembung relative z-10 mb-3 max-w-[300px] rounded-2xl border-2 border-teal/15 bg-white px-4 py-3 text-center text-[15px] font-bold leading-snug text-teal shadow-kartu transition duration-300 ${
          bubble ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {bubble ?? GREETING}
        <span
          aria-hidden="true"
          className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-teal/15 bg-white"
        />
      </div>

      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label="Maskot Rupaloka. Klik untuk menyapa."
        className="group relative cursor-pointer rounded-[40%] outline-none focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-emas"
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-[18%] bottom-[2%] h-[7%] rounded-[50%] bg-teal-800/20 blur-[2px] maskot-bayangan"
        />
        <span key={hop} className={`block maskot-hero ${hop > 0 ? 'maskot-lompat' : ''}`}>
          <PixelMascot
            look={look}
            face={face}
            talking={!!bubble && !happy}
            waving={waving}
            className="block h-auto w-full transition-transform duration-200 group-hover:scale-[1.03]"
          />
        </span>
      </button>
    </div>
  )
}
