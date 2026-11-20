import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, ContentText, SafeImage, SourceChip } from '../components/ui'
import { getCity } from '../lib/api'
import type { CityDetail } from '../lib/api.types'
import { bundledCities, labelOr } from '../lib/cities'
import { useProgress } from '../lib/store'

/** Koleksi item budaya yang sudah terbuka, tersimpan di perangkat (F-044, F-051). */
export default function CollectionPage() {
  const collected = useProgress((s) => s.collected)
  const [details, setDetails] = useState<CityDetail[]>([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)

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
      <h1 className="text-3xl font-extrabold tracking-tight text-teal">Koleksi</h1>
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
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {d.items.map((item) => {
                const owned = have.includes(item.id)
                return (
                  <li key={item.id}>
                    <Card className="h-full p-3 sm:p-4">
                      {owned ? (
                        <>
                          <SafeImage image={item.image} className="aspect-square w-full rounded-2xl" />
                          <h3 className="mt-2 font-extrabold text-teal">{labelOr(item.name, 'Item budaya')}</h3>
                          <p className="mt-1 text-xs leading-relaxed">
                            <ContentText text={item.short_explanation} fallback="Penjelasan sedang disiapkan." />
                          </p>
                          <div className="mt-2">
                            <SourceChip source={d.sources[item.chunk]} />
                          </div>
                        </>
                      ) : (
                        <div className="grid aspect-square place-items-center rounded-2xl bg-pasir/60 text-center">
                          <div>
                            <p className="text-3xl font-extrabold text-redup" aria-hidden="true">
                              ?
                            </p>
                            <p className="mt-1 text-xs font-bold text-redup">Belum ditemukan</p>
                          </div>
                        </div>
                      )}
                    </Card>
                  </li>
                )
              })}
            </ul>
            {have.length < d.items.length && (
              <Link to={`/kota/${d.city.id}`} className="mt-3 inline-block text-sm font-extrabold text-teal hover:underline">
                Main di {d.city.name} untuk menemukan sisanya →
              </Link>
            )}
          </section>
        )
      })}
    </main>
  )
}
