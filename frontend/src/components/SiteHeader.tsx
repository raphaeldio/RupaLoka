import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { gulirKe } from '../lib/gulirHalus'
import { LogoMark } from './landing/Logo'

const icon = (d: string): ReactNode => (
  <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const NAV: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  {
    to: '/',
    label: 'Beranda',
    end: true,
    icon: icon('M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z'),
  },
  {
    to: '/#peta',
    label: 'Jelajah Budaya',
    icon: icon('M10 17s-5-4.6-5-8.5a5 5 0 0 1 10 0C15 12.4 10 17 10 17zm0-7a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z'),
  },
  {
    to: '/koleksi',
    label: 'Koleksi',
    icon: icon(
      'M6 3h8v4a4 4 0 0 1-8 0zM4 4H2.5v1.5A2.5 2.5 0 0 0 5 8m11-4h1.5v1.5A2.5 2.5 0 0 1 15 8m-5 3v3m-3 3h6m-5-3h4',
    ),
  },
  {
    to: '/tentang',
    label: 'Tentang',
    icon: icon('M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm0-4V9.5M10 7h.01'),
  },
  {
    to: '/sumber',
    label: 'Sumber',
    icon: icon('M5 3h7l3 3v11H5zm7 0v3h3M8 10h4m-4 3h4'),
  },
]

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (to: string, navActive: boolean) =>
    to.includes('#') ? location.pathname === '/' && location.hash === to.slice(1) : navActive && !location.hash

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 lg:px-10">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>
      <div
        className={`mx-auto flex max-w-[1360px] items-center justify-between gap-3 rounded-full bg-white/92 py-1.5 pl-2 pr-1.5 ring-1 ring-emas/40 transition-shadow duration-300 sm:pl-3 ${
          scrolled ? 'shadow-[0_16px_34px_-16px_rgb(14_77_75/0.5)]' : 'shadow-[0_10px_26px_-16px_rgb(14_77_75/0.4)]'
        }`}
      >
        <Link to="/" className="flex items-center gap-2.5" aria-label="Rupaloka, beranda">
          <LogoMark className="size-10 rounded-full text-teal" />
          <span className="leading-none">
            <span className="block font-piksel text-xl font-bold tracking-[0.06em] text-teal-800">RUPALOKA</span>
            <span className="mt-0.5 hidden text-[11px] font-semibold text-redup sm:block">
              Belajar, Bermain, Kunjungi.
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive: a }) =>
                `relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  isActive(n.to, a)
                    ? 'bg-teal-800 text-white shadow-[0_8px_18px_-8px_rgb(14_77_75/0.6)]'
                    : 'text-tinta/75 hover:-translate-y-0.5 hover:bg-amber-50 hover:text-teal-800'
                }`
              }
            >
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/#peta"
            onClick={(e) => {
              // Sudah di beranda: gulir langsung (hash yang sama tidak memicu efek gulir).
              const peta = location.pathname === '/' ? document.getElementById('peta') : null
              if (!peta) return
              e.preventDefault()
              gulirKe(peta)
              window.history.pushState(null, '', '#peta')
            }}
            className="pil pil-emas group hidden !px-5 !py-2.5 !text-sm sm:inline-flex"
          >
            Mulai belajar
            <svg viewBox="0 0 16 16" className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="menu-ponsel"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            className="grid size-10 place-items-center rounded-full bg-teal-800 text-white transition hover:bg-teal lg:hidden"
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
              <path
                d={open ? 'M5 5l10 10M15 5 5 15' : 'M3 6h14M3 10h14M3 14h14'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="menu-ponsel"
          aria-label="Navigasi utama (ponsel)"
          className="mx-auto mt-2 grid max-w-[1360px] gap-1 rounded-[26px] bg-white/96 p-2 shadow-[0_16px_34px_-16px_rgb(14_77_75/0.5)] ring-1 ring-emas/40 motion-safe:animate-[card-in_200ms_ease-out] lg:hidden"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive: a }) =>
                `flex items-center gap-3 rounded-full px-4 py-3 text-[15px] font-extrabold ${
                  isActive(n.to, a) ? 'bg-teal-800 text-white' : 'text-tinta hover:bg-amber-50 hover:text-teal-800'
                }`
              }
            >
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
