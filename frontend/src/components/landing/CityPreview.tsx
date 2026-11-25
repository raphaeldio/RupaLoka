import type { CityDetail, LeaderboardEntry } from '../../lib/api.types'
import { labelOr } from '../../lib/cities'
import { useProgress } from '../../lib/store'
import { SafeImage } from '../primitives'
import { Chapter, CtaLink, PixelIcon } from './pixel'
import { ICON_PETA, ICON_PIALA } from './pixelIcons'

/** Bab koleksi + papan peringkat: item budaya kota (terbuka/terkunci di perangkat ini) dan 3 teratas. */
export function CollectionPreview({
  no,
  cityId,
  cityName,
  detail,
  board,
  failed,
}: {
  no: number
  cityId: string
  cityName: string
  detail: CityDetail | null
  board: { title: string; entries: LeaderboardEntry[] } | null
  failed: boolean
}) {
  const have = useProgress((s) => s.collected[cityId]) ?? []
  const items = detail?.items ?? []
  return (
    <section aria-labelledby="judul-koleksi" className="px-4 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <Chapter
          id="judul-koleksi"
          no={no}
          tag="Kumpulkan & bersaing"
          tone="emas"
          title="Koleksi & papan peringkat"
          lead={`Tiap item budaya yang kamu temukan di game masuk koleksimu, lengkap dengan kartu budaya dan sumbernya. Poin terbesar datang dari soal nilai dan refleksi, bukan dari lari tercepat.`}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="kotak p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl font-bold uppercase">Item {cityName}</h3>
              <span className="eyebrow text-amber">
                {have.length}/{items.length || '–'} ditemukan
              </span>
            </div>
            {items.length > 0 ? (
              <ul className="mt-4 grid grid-cols-3 gap-3">
                {items.map((it) => {
                  const owned = have.includes(it.id)
                  return (
                    <li key={it.id} className="border-2 border-tinta bg-kertas p-2 text-center">
                      {owned ? (
                        <SafeImage image={it.image} className="aspect-square w-full" />
                      ) : (
                        <div className="grid aspect-square place-items-center bg-pasir font-display text-3xl text-redup" aria-hidden="true">
                          ?
                        </div>
                      )}
                      <p className="mt-2 truncate text-xs font-extrabold">{owned ? labelOr(it.name, 'Item') : 'Terkunci'}</p>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-redup">
                {failed ? 'Koleksi belum bisa dimuat sekarang.' : 'Memuat koleksi…'}
              </p>
            )}
            <div className="mt-5">
              <CtaLink to="/koleksi" variant="ghost">
                Lihat koleksiku
              </CtaLink>
            </div>
          </div>

          <div className="kotak flex flex-col p-5">
            <div className="flex items-center gap-3">
              <PixelIcon rows={ICON_PIALA} className="size-10" />
              <div>
                <h3 className="font-display text-xl font-bold uppercase">Papan peringkat</h3>
                <p className="eyebrow text-redup">Peringkat 1 bergelar {board?.title ?? `Si Paling ${cityName}`}</p>
              </div>
            </div>
            {board && board.entries.length > 0 ? (
              <ol className="mt-4 grid gap-2">
                {board.entries.map((e) => (
                  <li
                    key={e.rank}
                    className={`flex items-center gap-3 border-2 border-tinta px-3 py-2 ${e.rank === 1 ? 'bg-emas-100' : 'bg-white'}`}
                  >
                    <span className="grid size-7 place-items-center border-2 border-tinta bg-white font-mono text-xs font-bold">
                      {e.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold">{e.nickname}</span>
                    <span className="font-mono text-sm font-bold tabular-nums">{e.points}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 flex-1 text-sm text-redup">Belum ada skor. Jadilah penjelajah pertama!</p>
            )}
            <div className="mt-5">
              <CtaLink to={`/kota/${cityId}`} variant="emas">
                Ikut bersaing
              </CtaLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Bab titik-titik budaya kota aktif (judul materi dan nama lokasi dari konten bersumber). */
export function CityStops({ no, cityId, cityName, detail }: { no: number; cityId: string; cityName: string; detail: CityDetail | null }) {
  const lessons = detail?.lessons ?? []
  return (
    <section aria-labelledby="judul-titik" className="px-4 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <Chapter
          id="judul-titik"
          no={no}
          tag={`Dari ${cityName} untuk Nusantara`}
          tone="bata"
          title={`Titik budaya ${cityName}`}
          lead="Setiap titik di path belajar adalah satu kisah budaya. Selesaikan berurutan, lalu kunjungi tempat aslinya."
        />
        {lessons.length > 0 ? (
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lessons.map((l, i) => (
              <li key={l.id} className="kotak flex items-start gap-3 p-4">
                <span className="grid size-10 shrink-0 place-items-center border-2 border-tinta bg-teal font-display text-lg text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold leading-tight">{labelOr(l.title, 'Materi budaya')}</p>
                  {l.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-redup">
                      <PixelIcon rows={ICON_PETA} className="size-4" />
                      {labelOr(l.location.name, 'Lokasi')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-10 h-24 border-2 border-dashed border-tinta/30" aria-hidden="true" />
        )}
        <div className="mt-8">
          <CtaLink to={`/kota/${cityId}`}>Mulai dari titik 1</CtaLink>
        </div>
      </div>
    </section>
  )
}
