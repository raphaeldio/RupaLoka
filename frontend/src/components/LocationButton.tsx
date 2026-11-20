import type { Location } from '../lib/api.types'
import { isPlaceholder } from '../lib/cities'
import { coordsOf, googleDirections, osmDirections } from '../lib/mapLinks'

/** "Lihat lokasi asli" (F-032, F-050): tautan arah bila koordinat ada, alamat sebagai cadangan. */
export default function LocationButton({ location, compact = false }: { location: Location | null; compact?: boolean }) {
  if (!location) return null
  const coords = coordsOf(location)
  const name = isPlaceholder(location.name) ? null : location.name
  const address = isPlaceholder(location.address) ? null : location.address
  if (!coords && !address) return null

  return (
    <div className={compact ? '' : 'rounded-2xl border border-garis bg-kertas p-4'}>
      {!compact && (
        <>
          <p className="text-xs font-extrabold uppercase tracking-[1.4px] text-redup">Lokasi asli</p>
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
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
              <path
                d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="8" cy="6.5" r="1.8" fill="currentColor" />
            </svg>
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
      ) : (
        <p className="mt-2 text-xs italic text-redup">Koordinat sedang diverifikasi.</p>
      )}
    </div>
  )
}
