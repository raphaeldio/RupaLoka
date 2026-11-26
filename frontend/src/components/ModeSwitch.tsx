import { Link, useLocation, useParams } from 'react-router-dom'
import { galleryEnabled } from '../lib/flags'

/**
 * Pilihan mode tampilan di bawah spanduk path (21 Nov 2026). 2D = path dan game sekarang.
 * 3D = galeri museum (F-060, ADR 40), bagian paket berlangganan (F-061): bila flag demo
 * aktif tombol membuka galeri, selain itu ke halaman langganan dengan alamat untuk kembali.
 */
export default function ModeSwitch() {
  const { pathname } = useLocation()
  const { cityId } = useParams()
  const back = encodeURIComponent(pathname)
  const to3d = galleryEnabled && cityId ? `/kota/${cityId}/galeri` : `/langganan?dari=${back}`
  return (
    <div role="group" aria-label="Mode tampilan" className="inline-flex rounded-full bg-white p-1 shadow-kartu ring-1 ring-emas/40">
      <button
        type="button"
        aria-pressed="true"
        className="rounded-full bg-teal-800 px-4 py-2 text-sm font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        Mode 2D
      </button>
      <Link
        to={to3d}
        onMouseEnter={galleryEnabled ? () => void import('../gallery/GalleryPage') : undefined}
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold text-redup transition hover:bg-amber-50 hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        aria-label={galleryEnabled ? 'Mode 3D: buka galeri museum 3D' : 'Mode 3D, khusus pelanggan: buka halaman langganan'}
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
