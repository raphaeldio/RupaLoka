/**
 * Peta Indonesia interaktif (Leaflet) untuk beranda: batas 38 provinsi dari OpenStreetMap
 * (ODbL), diwarnai per kepulauan dengan palet Rupaloka, tanpa layanan tile pihak ketiga.
 * Data: public/geo/indonesia-provinces.geojson (backend/scripts/build_provinces_geojson.py).
 *
 * Titik kota: lat/lng kota bila sudah diisi; bila belum (koordinat belum diverifikasi),
 * titik diletakkan di tengah provinsinya.
 */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { City, PlacedCity } from '../lib/cities'
import PlaneFlight, { FLIGHT_MS } from './PlaneFlight'
import ProvincePanel from './ProvincePanel'
import TravelConfirm from './TravelConfirm'
import { PROVINCES, type RegionId } from '../lib/provinces'
import './leaflet-map.css'

const GEOJSON_URL = '/geo/indonesia-provinces.geojson'

/** Warna kepulauan (sama dengan legenda beranda). */
const REGION_COLORS: Record<RegionId, string> = {
  sumatera: '#D99C76',
  jawa: '#D5B751',
  kalimantan: '#8CB99A',
  sulawesi: '#91AEC6',
  'bali-nusa-tenggara': '#DF9C9A',
  maluku: '#B6A2CB',
  papua: '#9CB58A',
}

const INDONESIA = L.latLngBounds([-11.2, 94.6], [6.2, 141.2])

interface ProvinceProps {
  code: string
  name: string
}

interface Props {
  cities: PlacedCity[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const regionOf = (code: string): RegionId | undefined => PROVINCES.find((p) => p.code === code)?.region

/** Pusat bagian terbesar dari (multi)poligon, untuk titik kota tanpa koordinat. */
function largestPartCenter(layer: L.Polygon): L.LatLng {
  const rings = layer.getLatLngs() as L.LatLng[][] | L.LatLng[][][]
  const polys: L.LatLng[][] = Array.isArray(rings[0]) && Array.isArray((rings[0] as unknown[])[0])
    ? (rings as L.LatLng[][][]).map((p) => p[0])
    : (rings as L.LatLng[][]).slice(0, 1)
  let best = polys[0]
  let bestArea = -1
  for (const ring of polys) {
    const b = L.latLngBounds(ring)
    const area = (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest())
    if (area > bestArea) {
      bestArea = area
      best = ring
    }
  }
  return L.latLngBounds(best).getCenter()
}

function cityIcon(p: PlacedCity, selected: boolean): L.DivIcon {
  const active = p.city.status === 'active'
  const cls = ['kota-pin', active ? 'kota-pin--aktif' : 'kota-pin--segera', selected ? 'kota-pin--dipilih' : ''].join(' ')
  const label = `${p.city.name}${active ? '' : ' · segera hadir'}`
  const html = `<span class="kota-pin__titik"></span><span class="kota-pin__label">${escapeHtml(label)}</span>`
  return L.divIcon({ className: cls, html, iconSize: [18, 18], iconAnchor: [9, 9] })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export default function LeafletMap({ cities, selectedId, onSelect }: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const provincesRef = useRef<Map<string, L.Polygon>>(new Map())
  const markersRef = useRef<L.LayerGroup | null>(null)
  const onSelectRef = useRef(onSelect)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const navigate = useNavigate()
  /** Kota aktif yang menunggu konfirmasi, lalu sedang diterbangi. */
  const [confirm, setConfirm] = useState<{ city: City; pos: L.LatLng } | null>(null)
  const [flight, setFlight] = useState<{ city: City; w: number; h: number } | null>(null)
  /** Provinsi yang diklik: panel daftar kota. */
  const [province, setProvince] = useState<{ code: string; name: string } | null>(null)
  const positionsRef = useRef<Map<string, L.LatLng>>(new Map())

  const closeProvince = () => {
    setProvince(null)
    mapRef.current?.flyToBounds(INDONESIA, { duration: 0.8 })
  }

  /** Klik titik/provinsi: pilih kota; kota aktif → tanya "Yakin ke kota ini?". */
  const pick = useCallback((city: City, pos: L.LatLng) => {
    onSelectRef.current(city.id)
    if (city.status === 'active') setConfirm({ city, pos })
  }, [])

  const depart = () => {
    const map = mapRef.current
    const target = confirm
    setConfirm(null)
    if (!map || !target) return
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      navigate(`/kota/${target.city.id}`)
      return
    }
    // Kunci interaksi selama terbang; kota berakhir di tengah saat pesawat tiba.
    map.dragging.disable()
    map.scrollWheelZoom.disable()
    map.doubleClickZoom.disable()
    const size = map.getSize()
    setFlight({ city: target.city, w: size.x, h: size.y })
    map.flyTo(target.pos, 8, { duration: FLIGHT_MS / 1000, easeLinearity: 0.2 })
  }

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // Peta dibuat sekali.
  useEffect(() => {
    const el = elRef.current
    const provinces = provincesRef.current
    if (!el || mapRef.current) return
    const map = L.map(el, {
      maxBounds: INDONESIA.pad(0.25),
      maxBoundsViscosity: 0.8,
      minZoom: 3,
      maxZoom: 9,
      zoomSnap: 0.25,
      scrollWheelZoom: false, // tidak "menangkap" gulir halaman; aktif setelah peta diklik
      attributionControl: true,
      zoomControl: true,
    })
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>')
    // Label kota "segera hadir" disembunyikan saat peta jauh agar tidak bertumpuk.
    const updateZoomClass = () => el.classList.toggle('peta--jauh', map.getZoom() < 5.5)
    map.on('zoomend', updateZoomClass)
    map.fitBounds(INDONESIA)
    updateZoomClass()
    map.on('click', () => map.scrollWheelZoom.enable())
    map.on('mouseout', () => map.scrollWheelZoom.disable())
    mapRef.current = map
    markersRef.current = L.layerGroup().addTo(map)

    const ctrl = new AbortController()
    fetch(GEOJSON_URL, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, ProvinceProps> & { attribution?: string }>
      })
      .then((data) => {
        const layer = L.geoJSON(data, {
          attribution: '© kontributor <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> (ODbL)',
          style: (f) => {
            const region = f ? regionOf((f.properties as ProvinceProps).code) : undefined
            return {
              className: 'provinsi',
              color: '#fffdf6',
              weight: 1,
              fillColor: region ? REGION_COLORS[region] : '#c9c3b2',
              fillOpacity: 0.9,
            }
          },
          onEachFeature: (f, lyr) => {
            const props = f.properties as ProvinceProps
            const poly = lyr as L.Polygon
            provinces.set(props.code, poly)
            poly.bindTooltip(props.name, { sticky: true, direction: 'top', className: 'provinsi-tooltip', offset: [0, -6] })
            poly.on('mouseover', () => poly.setStyle({ weight: 2.5, fillOpacity: 1 }).bringToFront())
            poly.on('mouseout', () => poly.setStyle({ weight: 1, fillOpacity: 0.9 }))
            // Klik provinsi: perbesar ke provinsi dan tampilkan kota-kotanya.
            poly.on('click', () => {
              setProvince({ code: props.code, name: props.name })
              map.flyToBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 7, duration: 0.8 })
            })
          },
        }).addTo(map)
        layer.bringToBack()
        setStatus('ready')
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus('error')
      })

    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => map.invalidateSize())
    ro?.observe(el)
    return () => {
      ctrl.abort()
      ro?.disconnect()
      map.remove()
      mapRef.current = null
      provinces.clear()
    }
  }, [])

  // Titik kota + klik provinsi yang punya kota.
  useEffect(() => {
    const map = mapRef.current
    const group = markersRef.current
    if (!map || !group) return
    group.clearLayers()
    positionsRef.current.clear()

    for (const p of cities) {
      const poly = p.province ? provincesRef.current.get(p.province.code) : undefined
      const pos =
        p.exact && p.city.lat !== null && p.city.lng !== null
          ? L.latLng(p.city.lat, p.city.lng)
          : poly
            ? largestPartCenter(poly)
            : null
      if (!pos) continue
      const selected = p.city.id === selectedId
      const marker = L.marker(pos, {
        icon: cityIcon(p, selected),
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : p.city.status === 'active' ? 500 : 0,
      })
      positionsRef.current.set(p.city.id, pos)
      marker.on('click', () => pick(p.city, pos))
      marker.addTo(group)
      const el = marker.getElement()
      if (el) {
        el.setAttribute('role', 'button')
        el.setAttribute('aria-pressed', String(selected))
        el.setAttribute(
          'aria-label',
          `${p.city.name}${p.city.province ? `, ${p.city.province}` : ''}: ${p.city.status === 'active' ? 'tersedia' : 'segera hadir'}`,
        )
      }
    }
  }, [cities, selectedId, status, pick])

  // Sorot provinsi kota terpilih.
  useEffect(() => {
    const code = cities.find((c) => c.city.id === selectedId)?.province?.code
    for (const [c, poly] of provincesRef.current) {
      poly.getElement()?.classList.toggle('provinsi--dipilih', c === code)
    }
  }, [cities, selectedId, status])

  return (
    // `isolate`: z-index panel Leaflet (400+) tidak menimpa kartu kota di luar peta.
    <div className="relative isolate">
      <div
        ref={elRef}
        className="peta-leaflet h-[240px] w-full overflow-hidden rounded-[28px] border border-garis sm:h-[420px] lg:h-[540px]"
        aria-label="Peta Indonesia interaktif. Pilih titik kota."
        role="region"
      />
      {status === 'loading' && (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-bold text-redup motion-safe:animate-pulse">
          Memuat peta…
        </p>
      )}
      {status === 'error' && (
        <p className="absolute inset-x-4 top-4 rounded-2xl bg-white/90 p-3 text-center text-sm text-redup shadow-kartu">
          Batas provinsi belum bisa dimuat. Pilih kota dari daftar di bawah peta.
        </p>
      )}
      {province && !flight && (
        <ProvincePanel
          name={province.name}
          cities={cities.filter((c) => c.province?.code === province.code).map((c) => c.city)}
          onPick={(city) => {
            const pos = positionsRef.current.get(city.id)
            if (pos) pick(city, pos)
            else onSelect(city.id)
          }}
          onClose={closeProvince}
        />
      )}
      {confirm && <TravelConfirm city={confirm.city} onYes={depart} onNo={() => setConfirm(null)} />}
      {flight && (
        <div className="absolute inset-0 z-[1000] overflow-hidden rounded-[28px]">
          <PlaneFlight
            width={flight.w}
            height={flight.h}
            cityName={flight.city.name}
            onDone={() => navigate(`/kota/${flight.city.id}`)}
          />
        </div>
      )}
    </div>
  )
}
