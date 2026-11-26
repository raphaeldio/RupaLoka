import { useEffect, useRef } from 'react'

export const FLIGHT_MS = 2600

/**
 * Animasi pesawat (gambar sendiri) yang terbang dari tepi kiri bawah ke tengah peta sambil
 * mengecil ("mendarat"), dengan jejak putus-putus. Dipakai bersama `map.flyTo` sehingga kota
 * tujuan berada di tengah saat pesawat tiba. Memanggil `onDone` saat selesai.
 */
export default function PlaneFlight({
  width,
  height,
  cityName,
  onDone,
}: {
  width: number
  height: number
  cityName: string
  onDone: () => void
}) {
  const planeRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const trailRef = useRef<SVGPathElement>(null)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  const cx = width / 2
  const cy = height / 2
  const d = `M ${-80} ${height * 0.92} Q ${width * 0.18} ${height * 0.05} ${cx} ${cy}`

  useEffect(() => {
    const plane = planeRef.current
    const body = bodyRef.current
    const trail = trailRef.current
    const finish = () => doneRef.current()
    if (!plane || !body || !trail || typeof plane.animate !== 'function') {
      const id = window.setTimeout(finish, 300)
      return () => window.clearTimeout(id)
    }
    const len = trail.getTotalLength?.() ?? 1000
    trail.style.strokeDasharray = `6 10`
    const opts: KeyframeAnimationOptions = { duration: FLIGHT_MS, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' }
    const move = plane.animate([{ offsetDistance: '0%' }, { offsetDistance: '100%' }], opts)
    body.animate(
      [
        { transform: 'scale(1.5)', opacity: 1 },
        { transform: 'scale(1.1)', opacity: 1, offset: 0.6 },
        { transform: 'scale(0.45)', opacity: 0.9, offset: 0.95 },
        { transform: 'scale(0.3)', opacity: 0 },
      ],
      opts,
    )
    trail.animate(
      [
        { strokeDashoffset: `${len}`, clipPath: 'inset(0 100% 0 0)', opacity: 0.9 },
        { strokeDashoffset: '0', clipPath: 'inset(0 0 0 0)', opacity: 0.9, offset: 0.85 },
        { strokeDashoffset: '0', clipPath: 'inset(0 0 0 0)', opacity: 0 },
      ],
      opts,
    )
    move.onfinish = finish
    return () => move.cancel()
  }, [d])

  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] overflow-hidden" role="status" aria-live="polite">
      <span className="sr-only">Terbang ke {cityName}…</span>
      <svg className="absolute inset-0 size-full" aria-hidden="true">
        <path ref={trailRef} d={d} fill="none" stroke="#fffdf6" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div
        ref={planeRef}
        aria-hidden="true"
        className="absolute left-0 top-0"
        style={{ offsetPath: `path('${d}')`, offsetRotate: 'auto', offsetDistance: '0%' }}
      >
        <div ref={bodyRef} className="drop-shadow-[0_10px_8px_rgb(15_76_92_/_0.35)]">
          {/* Pesawat menghadap kanan (arah 0°), digambar sendiri. */}
          <svg viewBox="0 0 64 40" className="-ml-8 -mt-5 h-10 w-16">
            <path d="M6 20c0-2.2 2-3.6 5-3.6h34c7 0 13 1.8 13 3.6s-6 3.6-13 3.6H11c-3 0-5-1.4-5-3.6Z" fill="#fffdf6" stroke="#146b68" strokeWidth="1.6" />
            <path d="M28 16.6 20 3h6l14 13.6ZM28 23.4 20 37h6l14-13.6Z" fill="#146b68" />
            <path d="M8 17.2 4 9h4l6 8ZM8 22.8 4 31h4l6-8Z" fill="#e8b64c" />
            <path d="M50 18.2h4.5" stroke="#146b68" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="36" cy="20" r="1.2" fill="#146b68" />
            <circle cx="41" cy="20" r="1.2" fill="#146b68" />
          </svg>
        </div>
      </div>
      <p className="absolute inset-x-0 bottom-6 mx-auto w-fit rounded-full bg-white/90 px-4 py-1.5 text-sm font-black text-teal-800 shadow-kartu">
        Terbang ke {cityName}…
      </p>
    </div>
  )
}
