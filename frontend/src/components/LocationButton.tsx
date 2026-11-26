import type { Location, VisitLink } from '../lib/api.types'
import { isPlaceholder } from '../lib/cities'
import { coordsOf, googleDirections, googleDirectionsTo, osmDirections } from '../lib/mapLinks'

const KIND_LABEL: Record<VisitLink['kind'], { label: string; icon: string }> = {
  situs: { label: 'Situs resmi', icon: '🌐' },
  sanggar: { label: 'Sanggar', icon: '🎶' },
  perajin: { label: 'Perajin', icon: '🛠️' },
  jadwal: { label: 'Jadwal pertunjukan', icon: '📅' },
}
const KIND_ORDER: VisitLink['kind'][] = ['situs', 'jadwal', 'sanggar', 'perajin']

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="6.5" r="1.8" fill="currentColor" />
    </svg>
  )
}

/** Hanya tautan http(s) yang sudah diperiksa tim budaya (verified_by) yang ditampilkan. */
const visibleLinks = (location: Location): VisitLink[] =>
  (location.links ?? [])
    .filter((l) => /^https?:\/\//.test(l.url) && !isPlaceholder(l.label) && !isPlaceholder(l.verified_by))
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))

/**
 * "Kunjungi" (F-032, F-050; diperluas 25 Nov 2026): rute ke lokasi asli bila koordinat ada,
 * alamat sebagai cadangan, ditambah tautan ke situs resmi, sanggar, perajin, dan jadwal
 * pertunjukan agar pemain terhubung dengan komunitas pemilik budaya.
 */
export default function LocationButton({ location, compact = false }: { location: Location | null; compact?: boolean }) {
  if (!location) return null
  const coords = coordsOf(location)
  const name = isPlaceholder(location.name) ? null : location.name
  const address = isPlaceholder(location.address) ? null : location.address
  const links = visibleLinks(location)
  if (!coords && !address && links.length === 0) return null

  return (
    <div className={compact ? '' : 'rounded-2xl border border-garis bg-kertas p-4'}>
      {!compact && (
        <>
          <p className="eyebrow text-redup">Kunjungi</p>
          {name && <p className="mt-1 font-bold">{name}</p>}
          {address && <p className="text-sm text-redup">{address}</p>}
        </>
      )}
      {coords ? (
        <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-3'}`}>
          <a
            href={googleDirections(coords.lat, coords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-emas px-4 py-2.5 text-sm font-extrabold text-tinta transition hover:brightness-95"
          >
            <PinIcon />
            Lihat lokasi asli{compact && name ? `: ${name}` : ''}
            <span className="sr-only"> (membuka Google Maps di tab baru)</span>
          </a>
          <a
            href={osmDirections(coords.lat, coords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-teal underline-offset-2 hover:underline"
          >
            OpenStreetMap<span className="sr-only"> (tab baru)</span>
          </a>
        </div>
      ) : address ? (
        <div className={compact ? '' : 'mt-3'}>
          <a
            href={googleDirectionsTo([name, address].filter(Boolean).join(', '))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-emas px-4 py-2.5 text-sm font-extrabold text-tinta transition hover:brightness-95"
          >
            <PinIcon />
            Buka rute di Google Maps{compact && name ? `: ${name}` : ''}
            <span className="sr-only"> (membuka Google Maps di tab baru)</span>
          </a>
          <p className="mt-2 text-xs italic text-redup">Rute dicari dari alamat; koordinat sedang diverifikasi.</p>
        </div>
      ) : (
        <p className="mt-2 text-xs italic text-redup">Koordinat sedang diverifikasi.</p>
      )}
      {links.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Tautan komunitas${name ? ` ${name}` : ''}`}>
          {links.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-white px-3 py-1.5 text-xs font-black text-teal-800 transition hover:bg-teal hover:text-white"
              >
                <span aria-hidden="true">{KIND_LABEL[l.kind].icon}</span>
                <span className="sr-only">{KIND_LABEL[l.kind].label}: </span>
                {l.label}
                <span className="sr-only"> (tab baru)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
