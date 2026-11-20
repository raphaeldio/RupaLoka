import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Ilustrasi hero orisinal: perbukitan, kota, dan gedung bersejarah bergaya bebas.
 * Lapisan bergeser mengikuti kursor (parallax); dimatikan bila prefers-reduced-motion.
 */
export default function HeroIllustration() {
  const ref = useRef<HTMLDivElement>(null)
  const [p, setP] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = ref.current?.closest('section')
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() =>
        setP({
          x: (e.clientX - r.left) / r.width - 0.5,
          y: (e.clientY - r.top) / r.height - 0.5,
        }),
      )
    }
    const onLeave = () => setP({ x: 0, y: 0 })
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  const layer = (depth: number, children: ReactNode) => (
    <g
      className="parallax"
      style={{
        transform: `translate(${p.x * depth}px, ${p.y * depth * 0.5}px)`,
        transition: 'transform 400ms cubic-bezier(0.2, 0.7, 0.2, 1)',
      }}
    >
      {children}
    </g>
  )

  return (
    <div ref={ref} className="relative w-full">
      <svg viewBox="0 0 640 420" className="h-auto w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="hero-langit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dcebe2" stopOpacity="0" />
            <stop offset="1" stopColor="#dcebe2" stopOpacity=".9" />
          </linearGradient>
          <linearGradient id="hero-sungai" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5f1e8" />
            <stop offset="1" stopColor="#dcebe2" />
          </linearGradient>
          <clipPath id="hero-pulau">
            <path d="M24 300C4 190 120 96 300 92c150-4 250 30 310 120 40 60 30 150-30 190-40 26-130 30-280 30-170 0-260-40-276-132z" />
          </clipPath>
        </defs>

        <ellipse cx="350" cy="250" rx="330" ry="190" fill="url(#hero-langit)" />

        {/* Matahari */}
        {layer(
          -6,
          <g transform="translate(560 70)">
            <circle
              r="46"
              fill="#e8b64c"
              opacity=".18"
              className="anim-sinar origin-center motion-safe:animate-[sinar_5s_ease-in-out_infinite]"
              style={{ transformBox: 'fill-box' }}
            />
            <circle r="26" fill="#e8b64c" />
          </g>,
        )}

        {/* Awan */}
        {layer(
          -10,
          <g fill="#fff">
            <g className="anim-awan motion-safe:animate-[awan_14s_ease-in-out_infinite_alternate]">
              <path d="M70 92c-14 0-18-18-4-22 2-16 26-18 32-4 10-10 30-2 26 12 12 2 10 14 0 14z" />
            </g>
            <g className="anim-awan motion-safe:animate-[awan_18s_ease-in-out_infinite_alternate-reverse]">
              <path d="M330 58c-12 0-14-15-3-18 2-13 22-15 27-3 9-8 25-2 22 10 10 2 8 11 0 11z" />
            </g>
          </g>,
        )}

        <g clipPath="url(#hero-pulau)">
        {/* Gunung jauh */}
        {layer(
          4,
          <>
            <path d="M-20 270 80 190l60 40 90-90 110 100 70-50 120 80 110-60 60 60v80H-20z" fill="#dcebe2" />
            <path d="M-20 290 60 240l90 40 100-60 120 70 90-40 110 50 90-30v90H-20z" fill="#bcd8c8" />
          </>,
        )}

        {/* Siluet kota */}
        {layer(
          8,
          <g fill="#a9cdb9">
            <rect x="96" y="206" width="22" height="90" rx="2" />
            <rect x="122" y="180" width="26" height="116" rx="2" />
            <rect x="152" y="222" width="18" height="74" rx="2" />
            <rect x="174" y="196" width="24" height="100" rx="2" />
            <rect x="520" y="214" width="22" height="82" rx="2" />
            <rect x="546" y="192" width="26" height="104" rx="2" />
            <g fill="#dcebe2" opacity=".8">
              {[0, 1, 2, 3, 4].map((r) => (
                <rect key={r} x="128" y={190 + r * 18} width="14" height="6" rx="1" />
              ))}
              {[0, 1, 2, 3].map((r) => (
                <rect key={r} x="552" y={202 + r * 18} width="14" height="6" rx="1" />
              ))}
            </g>
          </g>,
        )}

        {/* Gedung bersejarah (bergaya bebas) */}
        {layer(
          14,
          <g>
            <rect x="236" y="300" width="290" height="10" rx="3" fill="#e3dccb" />
            {/* sayap */}
            <rect x="244" y="248" width="274" height="54" rx="2" fill="#fffdf7" />
            <path d="M232 252h298l-22-22H254z" fill="#0e4d4b" />
            <g fill="#cfe3dc">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <rect key={i} x={256 + i * 26} y="262" width="12" height="26" rx="6" />
              ))}
            </g>
            {/* menara tengah */}
            <rect x="344" y="196" width="74" height="106" rx="2" fill="#fffdf7" />
            <path d="M334 200h94l-16-18h-62z" fill="#146b68" />
            <rect x="360" y="160" width="42" height="24" rx="2" fill="#fffdf7" />
            <path d="M352 164h58l-12-14h-34z" fill="#0e4d4b" />
            <path d="M381 150v-30" stroke="#0e4d4b" strokeWidth="3" strokeLinecap="round" />
            <g fill="#e8b64c">
              <circle cx="381" cy="140" r="3.5" />
              <circle cx="381" cy="130" r="3" />
              <circle cx="381" cy="121" r="2.5" />
            </g>
            <path d="M366 302v-36a15 15 0 0 1 30 0v36z" fill="#146b68" />
            <g fill="#cfe3dc">
              <rect x="352" y="212" width="12" height="22" rx="6" />
              <rect x="398" y="212" width="12" height="22" rx="6" />
              <rect x="371" y="166" width="20" height="12" rx="3" />
            </g>
          </g>,
        )}

        {/* Pepohonan dan tanah depan */}
        {layer(
          22,
          <g>
            <path d="M-20 330c90-40 200-30 300-10s210 20 380-20v140H-20z" fill="#8bb9a0" />
            <path
              d="M210 420c30-50 120-80 200-96 70-14 110-10 150-20-60 30-120 40-170 60-50 18-80 40-90 56z"
              fill="url(#hero-sungai)"
            />
            {[
              [214, 300, 24],
              [194, 312, 18],
              [548, 298, 26],
              [578, 312, 18],
              [470, 316, 16],
              [290, 318, 15],
            ].map(([x, y, r]) => (
              <g key={`${x}-${y}`}>
                <rect x={x - 2} y={y} width="4" height={r} fill="#0e4d4b" />
                <circle cx={x} cy={y} r={r} fill="#146b68" />
                <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.45} fill="#1d7f7b" />
              </g>
            ))}
          </g>,
        )}

        </g>

        {/* Bunga di depan */}
        {layer(
          34,
          <g className="anim-melayang motion-safe:animate-[melayang_6s_ease-in-out_infinite]">
            <path d="M40 420c10-60 40-90 80-100-20 30-40 60-46 100z" fill="#146b68" />
            <path d="M84 420c4-40 20-64 46-74-10 24-20 48-22 74z" fill="#1d7f7b" />
            {[
              [96, 334],
              [62, 360],
            ].map(([cx, cy]) => (
              <g key={cx} transform={`translate(${cx} ${cy})`}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <ellipse key={a} cx="0" cy="-8" rx="5" ry="8" fill="#fff" transform={`rotate(${a})`} />
                ))}
                <circle r="4" fill="#e8b64c" />
              </g>
            ))}
          </g>,
        )}
      </svg>
    </div>
  )
}
