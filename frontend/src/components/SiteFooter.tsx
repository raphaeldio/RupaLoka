import { Link } from 'react-router-dom'
import { LogoMark } from './landing/Logo'

export default function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-teal-800 text-white">
      <svg
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-6 w-full text-kertas"
        aria-hidden="true"
      >
        <path d="M0 0h1440v8c-240 30-480 30-720 10S240-6 0 22z" fill="currentColor" />
      </svg>
      <div className="mx-auto flex max-w-[1360px] flex-col gap-6 px-6 pb-8 pt-12 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <div className="flex items-center gap-4">
          <LogoMark className="size-10 text-teal" />
          <div>
            <p className="text-lg font-black tracking-[0.06em]">RUPALOKA</p>
            <p className="text-sm italic text-white/75">Menjaga Budaya, Merangkai Masa Depan</p>
          </div>
        </div>
        <nav aria-label="Tautan kaki" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/80">
          <Link to="/tentang" className="hover:text-emas">
            Tentang
          </Link>
          <Link to="/koleksi" className="hover:text-emas">
            Koleksi
          </Link>
          <Link to="/sumber" className="hover:text-emas">
            Sumber dan atribusi
          </Link>
        </nav>
      </div>
      <p className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/60">
        Tim KamiPemenang, Bandung · BUDAYA GO! 2026
      </p>
    </footer>
  )
}
