import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContentText, SafeImage, SourceChip } from '../components/primitives'
import CultureCard from '../components/CultureCard'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import { getCity } from '../lib/api'
import type { CityDetail } from '../lib/api.types'
import { bundledCities, labelOr } from '../lib/cities'
import { useProgress } from '../lib/store'
import PageHeading from '../components/PageHeading'

/** Koleksi item budaya yang sudah terbuka, tersimpan di perangkat (F-044, F-051). */
export default function CollectionPage() {
  const collected = useProgress((s) => s.collected)
  const [details, setDetails] = useState<CityDetail[]>([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  // Kartu budaya yang sedang dibuka (klik salah satu item koleksi).
  const [open, setOpen] = useState<{ city: CityDetail; itemId: string } | null>(null)
  const openItem = open?.city.items.find((i) => i.id === open.itemId) ?? null

  useEffect(() => {
    const ctrl = new AbortController()
    const ids = bundledCities.filter((c) => c.status === 'active').map((c) => c.id)
    Promise.allSettled(ids.map((id) => getCity(id, ctrl.signal))).then((rs) => {
      if (ctrl.signal.aborted) return
      setDetails(rs.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])))
      setFailed(rs.some((r) => r.status === 'rejected'))
      setLoading(false)
    })
    return () => ctrl.abort()
  }, [])

  const total = Object.values(collected).reduce((n, ids) => n + ids.length, 0)

  return (
    <main id="konten" className="mx-auto w-full max-w-[1000px] px-4 pb-16 sm:px-8">
      <PageHeading chip="Koleksi budaya" title="Koleksi" accent="kamu" />
      <p className="mt-2 text-redup">
        Item budaya yang kamu temukan saat bermain. Tersimpan di perangkat ini saja ({total} item).
      </p>

      {loading && <p className="mt-8 text-redup motion-safe:animate-pulse">Memuat koleksi…</p>}
      {failed && !loading && (
        <p className="mt-6 rounded-2xl bg-amber-50 p-3 text-sm">
          Sebagian data koleksi belum bisa dimuat. Coba muat ulang halaman sebentar lagi.
        </p>
      )}

      {details.map((d) => {
        const have = collected[d.city.id] ?? []
        return (
          <section key={d.city.id} className="mt-8" aria-labelledby={`koleksi-${d.city.id}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`koleksi-${d.city.id}`} className="text-xl font-extrabold">
                {d.city.name}
              </h2>
              <p className="text-sm font-bold text-amber">
                {have.length}/{d.items.length}
              </p>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {d.items.map((item) => {
                const owned = have.includes(item.id)
                const name = labelOr(item.name, 'Item budaya')
                return (
                  <li key={item.id} className="flex">
                    {owned ? (
                      <button
                        type="button"
                        onClick={() => setOpen({ city: d, itemId: item.id })}
                        aria-haspopup="dialog"
                        className="tekan kotak flex w-full flex-col p-3 text-left sm:p-4"
                      >
                        <SafeImage image={item.image} className="aspect-square w-full border border-emas/40 rounded-2xl" />
                        <h3 className="mt-3 text-lg font-black leading-tight text-teal-800">{name}</h3>
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed">
                          <ContentText text={item.short_explanation} fallback="Penjelasan sedang disiapkan." />
                        </p>
                        <span className="eyebrow mt-auto flex items-center gap-1 pt-3 text-teal">
                          Lihat kartu budaya <span aria-hidden="true">→</span>
                        </span>
                      </button>
                    ) : (
                      <div className="flex w-full flex-col border-2 border-dashed border-teal/25 bg-white/60 p-3 sm:p-4">
                        <div className="grid aspect-square place-items-center bg-pasir/60 text-center">
                          <div>
                            <p className="font-display text-4xl text-redup" aria-hidden="true">
                              ?
                            </p>
                            <p className="mt-1 text-xs font-bold text-redup">Belum ditemukan</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {have.length < d.items.length && (
              <Link to={`/kota/${d.city.id}`} className="mt-3 inline-block text-sm font-black text-teal-800 hover:underline">
                Main di {d.city.name} untuk menemukan sisanya →
              </Link>
            )}
          </section>
        )
      })}

      <Dialog open={!!openItem} onOpenChange={(v) => !v && setOpen(null)}>
        {open && openItem && (
          <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto border border-emas/40 bg-white p-0 shadow-kartu sm:max-w-2xl rounded-2xl">
            <div className="grid gap-4 border-b border-garis bg-kertas p-5 sm:grid-cols-[160px_1fr] sm:p-6">
              <SafeImage image={openItem.image} className="aspect-square w-32 border border-emas/40 sm:w-full rounded-2xl" />
              <div className="min-w-0 pr-6">
                <p className="eyebrow text-amber">Kartu budaya · {open.city.city.name}</p>
                <DialogTitle className="mt-1 text-3xl font-black leading-tight text-teal-800">
                  {labelOr(openItem.name, 'Item budaya')}
                </DialogTitle>
                <DialogDescription asChild>
                  <p className="mt-2 text-sm leading-relaxed text-tinta">
                    <ContentText text={openItem.short_explanation} fallback="Penjelasan sedang disiapkan." />
                  </p>
                </DialogDescription>
                <div className="mt-3">
                  <SourceChip source={open.city.sources[openItem.chunk]} label="Sumber" />
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <CultureCard item={openItem} cityId={open.city.city.id} sources={open.city.sources} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  )
}
