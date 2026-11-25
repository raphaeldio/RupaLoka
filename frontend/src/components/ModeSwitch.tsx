import { Link, useLocation } from 'react-router-dom'
import { featureFlags } from '../lib/flags'

/**
 * Pilihan mode tampilan di bawah spanduk path (21 Nov 2026). 2D = path dan game sekarang.
 * 3D (penampil model, F-060) belum dibangun dan menjadi bagian paket berlangganan (F-061),
 * jadi tombol 3D mengarah ke halaman langganan, membawa alamat path untuk kembali.
 */
export default function ModeSwitch() {
  const { pathname } = useLocation()
  const back = encodeURIComponent(pathname)
  return (
    <div role="group" aria-label="Mode tampilan" className="inline-flex rounded-2xl border border-garis bg-white p-1 shadow-kartu">
      <button
        type="button"
        aria-pressed="true"
        className="rounded-xl bg-teal px-4 py-2 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        Mode 2D
      </button>
      <Link
        to={featureFlags.viewer3d ? `${pathname}?mode=3d` : `/langganan?dari=${back}`}
        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold text-redup transition hover:bg-pasir/60 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        aria-label="Mode 3D, khusus pelanggan: buka halaman langganan"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
        Mode 3D
        <span className="rounded-full bg-emas-100 px-2 py-0.5 eyebrow text-amber">
          Langganan
        </span>
      </Link>
    </div>
  )
}
