import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { City } from '../lib/cities'
import { isPlaceholder } from '../lib/cities'
import { Badge } from './ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet'

/**
 * Panel kota-kota di provinsi yang diklik pada peta. Kota aktif dapat langsung dijelajahi
 * (memicu konfirmasi + penerbangan); kota lain berlabel "segera hadir".
 * Ponsel: shadcn Sheet dari bawah. Desktop: kartu melayang di pojok kanan atas peta.
 */
export default function ProvincePanel({
  name,
  cities,
  onPick,
  onClose,
}: {
  name: string
  cities: City[]
  onPick: (city: City) => void
  onClose: () => void
}) {
  const small = useSmallScreen()
  const sorted = [...cities].sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active'))
  const hasActive = sorted.some((c) => c.status === 'active')
  const closeRef = useRef<HTMLButtonElement>(null)
  // Tanpa kota aktif, fokus ke tombol tutup agar Escape/Enter tetap bekerja.
  useEffect(() => {
    if (!small && !hasActive) closeRef.current?.focus({ preventScroll: true })
  }, [small, hasActive, name])

  if (small) {
    return (
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="z-[1001] max-h-[70vh] rounded-t-3xl border-garis px-4 pb-6">
          <SheetHeader className="px-0 pb-0">
            <p className="eyebrow text-redup">Provinsi</p>
            <SheetTitle className="text-lg font-extrabold text-teal">{name}</SheetTitle>
            <SheetDescription>{sorted.length ? 'Kota yang bisa dijelajahi:' : 'Belum ada kota di provinsi ini.'}</SheetDescription>
          </SheetHeader>
          <CityList cities={sorted} onPick={onPick} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <motion.section
      aria-labelledby="panel-provinsi"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="absolute right-4 top-4 z-[900] max-h-[70%] w-72 overflow-y-auto rounded-3xl border border-garis bg-white/95 p-4 shadow-melayang backdrop-blur"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow text-redup">Provinsi</p>
          <h2 id="panel-provinsi" className="text-lg font-extrabold leading-tight text-teal">
            {name}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup daftar kota dan kembali ke peta Indonesia"
          className="grid size-8 shrink-0 place-items-center rounded-full text-redup hover:bg-pasir hover:text-tinta"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {sorted.length > 0 && <p className="mt-1 text-xs text-redup">Kota yang bisa dijelajahi:</p>}
      <CityList cities={sorted} onPick={onPick} autoFocus />
    </motion.section>
  )
}

function CityList({ cities, onPick, autoFocus = false }: { cities: City[]; onPick: (c: City) => void; autoFocus?: boolean }) {
  const firstRef = useRef<HTMLButtonElement>(null)
  const firstActiveId = cities.find((c) => c.status === 'active')?.id
  useEffect(() => {
    if (autoFocus) firstRef.current?.focus({ preventScroll: true })
  }, [autoFocus, firstActiveId])

  if (cities.length === 0) {
    return (
      <p className="mt-3 rounded-2xl bg-kertas p-3 text-sm text-redup">
        Belum ada kota yang bisa dijelajahi di provinsi ini. Segera hadir!
      </p>
    )
  }
  return (
    <ul className="mt-2 grid gap-2">
      {cities.map((c, i) => {
        const active = c.status === 'active'
        return (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
          >
            <motion.button
              ref={c.id === firstActiveId ? firstRef : undefined}
              type="button"
              onClick={() => onPick(c)}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                active ? 'border-teal/30 bg-teal-50 hover:border-teal' : 'border-garis bg-white hover:border-redup'
              }`}
            >
              <span
                aria-hidden="true"
                className={`relative size-3 shrink-0 rounded-full ring-2 ring-white ${active ? 'bg-emas' : 'bg-[#9aa39a]'}`}
              >
                {active && <span className="absolute inset-0 rounded-full bg-emas motion-safe:animate-ping" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{c.name}</span>
                <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-redup">
                  {active ? (isPlaceholder(c.summary) ? 'Siap dijelajahi' : c.summary) : 'Segera hadir'}
                </span>
              </span>
              {active ? (
                <Badge className="rounded-full">Jelajahi →</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full bg-pasir text-redup">
                  Segera
                </Badge>
              )}
            </motion.button>
          </motion.li>
        )
      })}
    </ul>
  )
}

function useSmallScreen(): boolean {
  const q = '(max-width: 639px)'
  const [small, setSmall] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(q)
    const on = () => setSmall(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return small
}
