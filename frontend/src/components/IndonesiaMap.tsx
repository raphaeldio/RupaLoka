import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import seaUrl from '../assets/figma-map/sea.svg'
import type { PlacedCity } from '../lib/cities'
import {
  depthImageBox,
  MAP_H,
  MAP_W,
  MAP_X,
  MAP_Y,
  PROVINCES,
  STAGE_H,
  STAGE_W,
  surfaceBox,
  type Province,
} from '../lib/provinces'

const surfaceSvgs = import.meta.glob<string>('../assets/figma-map/surface-*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const depthUrls = import.meta.glob<string>('../assets/figma-map/depth-*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
})
const asset = (files: Record<string, string>, kind: string, code: string) =>
  files[`../assets/figma-map/${kind}-${code}.svg`]

/** Label wilayah dan perairan, posisi dari referensi Figma (koordinat panggung). */
const MAP_LABELS: { text: string; x: number; y: number; small?: boolean }[] = [
  { text: 'SUMATERA', x: 105, y: 265 },
  { text: 'KALIMANTAN', x: 450, y: 305 },
  { text: 'SULAWESI', x: 680, y: 345 },
  { text: 'JAWA', x: 396, y: 438 },
  { text: 'BALI & NUSA TENGGARA', x: 614, y: 488 },
  { text: 'MALUKU', x: 852, y: 328 },
  { text: 'PAPUA', x: 1114, y: 444 },
  { text: 'SAMUDRA HINDIA', x: 138, y: 420, small: true },
  { text: 'LAUT JAWA', x: 360, y: 290, small: true },
]

const pct = (v: number, total: number) => `${(v / total) * 100}%`
const LIFT = 'motion-safe:-translate-y-[6px]'

interface Props {
  cities: PlacedCity[]
  selectedId: string | null
  onSelect: (cityId: string) => void
}

export default function IndonesiaMap({ cities, selectedId, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hovered, setHovered] = useState<string | null>(null)

  const citiesByProvince = useMemo(() => {
    const m = new Map<string, PlacedCity[]>()
    for (const c of cities) {
      if (!c.province) continue
      m.set(c.province.code, [...(m.get(c.province.code) ?? []), c])
    }
    return m
  }, [cities])

  // Panggung digambar pada ukuran desain lalu diskalakan agar geometri aset tetap utuh.
  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / STAGE_W || 1)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Di layar sempit peta bisa digeser; pusatkan pada kota aktif pertama.
  const focusTarget = cities.find((c) => c.city.status === 'active')
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc || !focusTarget || sc.scrollWidth <= sc.clientWidth) return
    const x = ((MAP_X + focusTarget.x) / STAGE_W) * sc.scrollWidth
    sc.scrollLeft = Math.max(0, x - sc.clientWidth / 2)
  }, [focusTarget, scale])

  const provinceAt = (target: EventTarget | null) =>
    target instanceof Element ? (target.closest('[data-province]')?.getAttribute('data-province') ?? null) : null

  const onPlaneOver = (e: PointerEvent) => setHovered(provinceAt(e.target))

  const onPlaneClick = (e: React.MouseEvent) => {
    const code = provinceAt(e.target)
    if (!code) return
    setHovered(code)
    const inProvince = citiesByProvince.get(code) ?? []
    const pick = inProvince.find((c) => c.city.status === 'active') ?? inProvince[0]
    if (pick) onSelect(pick.city.id)
  }

  const hoveredProvince = PROVINCES.find((p) => p.code === hovered)

  return (
    <div
      ref={scrollerRef}
      className="-mx-4 overflow-x-auto overflow-y-hidden px-4 [scrollbar-width:thin] sm:mx-0 sm:px-0"
      onKeyDown={(e) => e.key === 'Escape' && setHovered(null)}
    >
      <div
        ref={frameRef}
        className="relative w-full min-w-[680px] select-none"
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
      >
        {/* Panggung berskala (dekoratif + bentuk provinsi) */}
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
        >
          <img
            src={seaUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{ left: 0, top: 28, width: 1260, height: 430 }}
          />

          {MAP_LABELS.map((l) => (
            <span
              key={l.text}
              aria-hidden="true"
              className={`pointer-events-none absolute whitespace-nowrap font-bold text-samar transition-opacity duration-300 ${
                l.small ? 'text-[9px] tracking-[1.5px] opacity-80' : 'text-[11px] tracking-[1.5px]'
              } ${hovered ? 'opacity-40' : ''}`}
              style={{ left: l.x, top: l.y }}
            >
              {l.text}
            </span>
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute whitespace-nowrap text-[10px] font-semibold tracking-[1px] text-[#6e7a69]"
            style={{ left: 28, top: 504 }}
          >
            06° LU — 11° LS
          </span>

          {/* Bidang peta: hover/ketuk provinsi */}
          <div
            className="absolute"
            style={{ left: MAP_X, top: MAP_Y, width: MAP_W, height: MAP_H }}
            onPointerOver={onPlaneOver}
            onPointerLeave={() => setHovered(null)}
            onClick={onPlaneClick}
          >
            {PROVINCES.map((p) => (
              <ProvinceShape
                key={p.code}
                province={p}
                state={hovered === p.code ? 'lifted' : hovered ? 'dim' : 'flat'}
              />
            ))}
          </div>
        </div>

        {/* Lapisan antarmuka tidak diskalakan: titik kota dan label tetap terbaca di ponsel */}
        <div className="pointer-events-none absolute inset-0">
          {cities.map((pc) => (
            <CityMarker
              key={pc.city.id}
              placed={pc}
              selected={pc.city.id === selectedId}
              lifted={pc.province?.code === hovered}
              showName={pc.city.status === 'active' && pc.province?.code !== hovered}
              onFocus={() => setHovered(pc.province?.code ?? null)}
              onBlur={() => setHovered(null)}
              onSelect={() => onSelect(pc.city.id)}
            />
          ))}
          {hoveredProvince && (
            <ProvinceTooltip province={hoveredProvince} cities={citiesByProvince.get(hoveredProvince.code) ?? []} />
          )}
        </div>
      </div>
    </div>
  )
}

function ProvinceShape({ province: p, state }: { province: Province; state: 'flat' | 'lifted' | 'dim' }) {
  const s = surfaceBox(p)
  const d = depthImageBox(p)
  const lifted = state === 'lifted'
  return (
    <div
      className="province pointer-events-none absolute inset-0"
      data-state={state}
      style={{ zIndex: lifted ? 20 : 1 }}
    >
      {/* Ketebalan: tersembunyi saat datar, muncul dari bawah permukaan saat timbul */}
      <img
        src={asset(depthUrls, 'depth', p.code)}
        alt=""
        aria-hidden="true"
        className={`absolute max-w-none transition-[opacity,translate] duration-300 ease-out ${
          lifted ? `opacity-100 ${LIFT}` : 'opacity-0 motion-safe:-translate-y-[13px]'
        }`}
        style={{ left: d.x, top: d.y, width: d.w, height: d.h }}
      />
      <div
        data-province={p.code}
        className={`province-surface absolute transition-[translate,scale,opacity] duration-300 ease-out ${
          lifted ? LIFT : ''
        } ${state === 'dim' ? 'opacity-70' : 'opacity-100'}`}
        style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
      >
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          // Aset SVG lokal dari Figma (statis, bukan masukan pengguna); disisipkan agar hover mengikuti bentuk provinsi.
          dangerouslySetInnerHTML={{ __html: asset(surfaceSvgs, 'surface', p.code) ?? '' }}
        />
      </div>
    </div>
  )
}

function stagePos(mapX: number, mapY: number) {
  return { left: pct(MAP_X + mapX, STAGE_W), top: pct(MAP_Y + mapY, STAGE_H) }
}

function CityMarker({
  placed,
  selected,
  lifted,
  showName,
  onFocus,
  onBlur,
  onSelect,
}: {
  placed: PlacedCity
  selected: boolean
  lifted: boolean
  showName: boolean
  onFocus: () => void
  onBlur: () => void
  onSelect: () => void
}) {
  const { city } = placed
  const active = city.status === 'active'
  const label = `${city.name}${city.province ? `, ${city.province}` : ''}: ${active ? 'tersedia' : 'segera hadir'}`
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={onFocus}
      onClick={onSelect}
      className={`group pointer-events-auto absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full p-2.5 transition-transform duration-300 ease-out ${
        lifted ? 'motion-safe:-translate-y-[calc(50%+6px)]' : ''
      }`}
      style={stagePos(placed.x, placed.y)}
    >
      <span className="relative flex size-3.5 items-center justify-center">
        {active && (
          <span className="absolute inline-flex size-full rounded-full bg-amber/50 motion-safe:animate-ping" />
        )}
        <span
          className={`relative inline-flex size-3.5 rounded-full border-2 border-white shadow-[0_1px_4px_rgb(0_0_0/0.3)] transition-transform group-hover:scale-125 ${
            active ? 'bg-amber' : 'bg-[#9aa39a]'
          } ${selected ? 'scale-125 ring-2 ring-teal ring-offset-1' : ''}`}
        />
      </span>
      {showName && (
        <span className="absolute left-full top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-teal shadow-kartu backdrop-blur">
          {city.name}
        </span>
      )}
    </button>
  )
}

function ProvinceTooltip({ province, cities }: { province: Province; cities: PlacedCity[] }) {
  const b = surfaceBox(province)
  const pos = stagePos(b.x + b.w / 2, b.y)
  const xRatio = (MAP_X + b.x + b.w / 2) / STAGE_W
  const flipBelow = MAP_Y + b.y < 90
  const alignX = xRatio > 0.85 ? '-100%' : xRatio < 0.12 ? '0%' : '-50%'
  const primary = cities.find((c) => c.city.status === 'active') ?? cities[0]

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute z-40 motion-safe:animate-[tooltip-in_200ms_ease-out]"
      style={{
        left: pos.left,
        top: flipBelow ? pct(MAP_Y + b.y + b.h, STAGE_H) : pos.top,
        transform: `translate(${alignX}, ${flipBelow ? '12px' : 'calc(-100% - 14px)'})`,
      }}
    >
      <div className="min-w-36 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-melayang backdrop-blur">
        <p className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-redup">{province.name}</p>
        {primary ? (
          <>
            <p className="mt-0.5 text-lg font-extrabold leading-tight text-teal">
              {cities.map((c) => c.city.name).join(' · ')}
            </p>
            <p
              className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                primary.city.status === 'active' ? 'bg-amber-50 text-amber' : 'bg-[#eef0ea] text-redup'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${primary.city.status === 'active' ? 'bg-amber' : 'bg-[#9aa39a]'}`}
              />
              {primary.city.status === 'active' ? 'Siap dijelajahi · ketuk untuk mulai' : 'Segera hadir'}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-sm font-semibold text-redup">Belum ada kota di provinsi ini</p>
        )}
      </div>
    </div>
  )
}
