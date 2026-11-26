import type { CityDetail, LeaderboardEntry } from '../../lib/api.types'
import { labelOr } from '../../lib/cities'
import { useProgress } from '../../lib/store'
import { SafeImage } from '../primitives'
import LatarBudaya from './LatarBudaya'
import { Chapter, CtaLink, PixelIcon } from './pixel'
import { ICON_PIALA } from './pixelIcons'
import JalanKota from './JalanKota'

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
    <section
      data-chapter="04 · Koleksi"
      data-warna="#0e4d4b"
      aria-labelledby="judul-koleksi"
      className="relative isolate overflow-clip px-4 pb-40 pt-40 sm:px-8 lg:px-12"
    >
      <LatarBudaya corak="truntum" />
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <Chapter
          id="judul-koleksi"
          no={no}
          tag="Kumpulkan & bersaing"
          tone="gelap"
          title="Koleksi &"
          accent="papan peringkat"
          lead={`Tiap item budaya yang kamu temukan di game masuk koleksimu, lengkap dengan kartu budaya dan sumbernya. Poin terbesar datang dari soal nilai dan refleksi, bukan dari lari tercepat.`}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div data-anim="card" data-angkat className="kartu-nuansa p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[20px] font-black uppercase text-teal-800">Item {cityName}</h3>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[12px] font-extrabold text-amber">
                {have.length}/{items.length || '–'} ditemukan
              </span>
            </div>
            {items.length > 0 ? (
              <ul className="mt-4 grid grid-cols-3 gap-3">
                {items.map((it) => {
                  const owned = have.includes(it.id)
                  return (
                    <li key={it.id} className="rounded-2xl bg-[#fbf5e7] p-2 text-center ring-1 ring-emas/40">
                      {owned ? (
                        <SafeImage image={it.image} className="aspect-square w-full rounded-xl" />
                      ) : (
                        <div
                          className="koleksi-terkunci grid aspect-square place-items-center rounded-xl text-3xl font-black text-teal-800/50"
                          aria-hidden="true"
                        >
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

          <div data-anim="card" data-angkat className="kartu-nuansa flex flex-col p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="ikon-lompat grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emas-100 to-[#f1d38b]">
                <PixelIcon rows={ICON_PIALA} className="size-9" />
              </span>
              <div>
                <h3 className="text-[20px] font-black uppercase text-teal-800">Papan peringkat</h3>
                <p className="text-[12px] font-bold text-redup">Peringkat 1 bergelar {board?.title ?? `Si Paling ${cityName}`}</p>
              </div>
            </div>
            {board && board.entries.length > 0 ? (
              <ol className="mt-4 grid gap-2">
                {board.entries.map((e) => (
                  <li
                    key={e.rank}
                    className={`flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 ${
                      e.rank === 1 ? 'bg-gradient-to-r from-emas-100 to-[#f6dfa3] ring-1 ring-emas' : 'bg-[#f6f2e8]'
                    }`}
                  >
                    <span
                      className={`grid size-8 place-items-center rounded-full text-xs font-black ${
                        e.rank === 1 ? 'bg-amber text-white' : 'bg-white text-teal-800'
                      }`}
                    >
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

/**
 * Bab titik budaya kota aktif: judul bab, lalu perjalanan menyusuri jalan kota (JalanKota) dengan
 * papan tiap titik (judul materi dan nama lokasi dari konten bersumber).
 */
export function CityStops({ no, cityId, cityName, detail }: { no: number; cityId: string; cityName: string; detail: CityDetail | null }) {
  const lessons = detail?.lessons ?? []
  return (
    <section
      data-chapter="05 · Titik budaya"
      data-warna="#b4e0f3"
      aria-labelledby="judul-titik"
      className="relative isolate bg-[linear-gradient(180deg,rgb(180_224_243/0)_0,#b4e0f3_150px)] pt-44"
    >
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-8 lg:px-12">
        <Chapter
          id="judul-titik"
          no={no}
          tag={`Path belajar ${cityName}`}
          title="Titik budaya"
          accent={cityName}
          lead="Setiap titik di path belajar adalah satu kisah budaya. Gulir untuk menyusuri jalan kota: selesaikan berurutan, lalu kunjungi tempat aslinya."
        />
      </div>
      {lessons.length > 0 ? (
        <>
          <ol className="sr-only">
            {lessons.map((l) => (
              <li key={l.id}>
                {labelOr(l.title, 'Materi budaya')}
                {l.location && `, ${labelOr(l.location.name, 'Lokasi')}`}
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <JalanKota cityId={cityId} lessons={lessons} />
          </div>
        </>
      ) : (
        <div className="mx-auto mt-10 h-40 max-w-[1200px] px-4 sm:px-8 lg:px-12" aria-hidden="true">
          <div className="h-full rounded-[22px] border-2 border-dashed border-teal/25" />
        </div>
      )}
    </section>
  )
}
