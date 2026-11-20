import { Link, NavLink } from 'react-router-dom'
import titikAktifUrl from '../assets/figma-map/titik-aktif.svg'

const NAV = [
  { to: '/koleksi', label: 'Koleksi' },
  { to: '/tentang', label: 'Tentang' },
  { to: '/sumber', label: 'Sumber' },
]

export default function SiteHeader() {
  return (
    <header className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-24 sm:px-8 lg:px-16">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>
      <Link to="/" className="flex items-center gap-3" aria-label="Rupaloka, beranda">
        {/* Monogram sementara; identitas visual final menunggu T-005 */}
        <span className="grid size-10 place-items-center rounded-xl bg-teal text-[26px] font-extrabold leading-none text-white">
          r.
        </span>
        <span className="text-[26px] font-extrabold tracking-tight text-teal sm:text-[30px]">Rupaloka</span>
      </Link>

      <nav aria-label="Navigasi utama" className="flex items-center gap-1 sm:gap-2">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                isActive ? 'bg-teal-50 text-teal' : 'text-redup hover:text-teal'
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
        <span className="ml-2 hidden items-center gap-2 text-sm font-bold text-teal md:flex">
          <img src={titikAktifUrl} alt="" width={8} height={8} />
          Peta interaktif
        </span>
      </nav>
    </header>
  )
}
