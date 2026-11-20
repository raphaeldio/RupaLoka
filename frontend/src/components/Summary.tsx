import { Link } from 'react-router-dom'
import { labelOr } from '../lib/cities'
import type { CityDetail } from '../lib/api.types'
import LocationButton from './LocationButton'
import { Button, Card, SafeImage } from './ui'

/** Ringkasan setelah game over (F-045): skor, rekor, item terbuka, main lagi, lokasi asli. */
export default function Summary({
  detail,
  score,
  best,
  unlockedIds,
  collectedIds,
  onReplay,
  onReview,
}: {
  detail: CityDetail
  score: number
  best: number
  unlockedIds: string[]
  collectedIds: string[]
  onReplay: () => void
  onReview: () => void
}) {
  const unlocked = detail.items.filter((i) => unlockedIds.includes(i.id))
  const allCollected = detail.items.length > 0 && detail.items.every((i) => collectedIds.includes(i.id))
  const sites = detail.lessons.filter((l) => l.location)

  return (
    <Card>
      <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-redup">Ringkasan perjalanan</p>
      <h2 className="mt-1 text-2xl font-extrabold text-teal">Keliling {detail.city.name} selesai!</h2>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-teal-50 p-3">
          <dt className="text-[11px] font-semibold text-redup">Skor</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-teal">{score}</dd>
        </div>
        <div className="rounded-2xl bg-kertas p-3">
          <dt className="text-[11px] font-semibold text-redup">Rekor</dt>
          <dd className="text-2xl font-extrabold tabular-nums">{best}</dd>
        </div>
        <div className="rounded-2xl bg-amber-50 p-3">
          <dt className="text-[11px] font-semibold text-redup">Item baru</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-amber">{unlocked.length}</dd>
        </div>
      </dl>

      {allCollected && (
        <p className="mt-4 rounded-2xl bg-emas-100 p-3 text-sm font-bold">
          Selamat! Semua item budaya {detail.city.name} sudah ada di koleksimu.
        </p>
      )}

      <section className="mt-5" aria-label="Item yang ditemukan">
        <h3 className="text-sm font-extrabold">Item yang kamu temukan</h3>
        {unlocked.length === 0 ? (
          <p className="mt-1 text-sm text-redup">
            Belum ada. Capai {detail.game.unlock_every} poin untuk menemukan item pertama!
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {unlocked.map((i) => (
              <li key={i.id} className="rounded-2xl border border-garis p-2 text-center">
                <SafeImage image={i.image} className="aspect-square w-full rounded-xl" />
                <p className="mt-1 text-xs font-bold">{labelOr(i.name, 'Item budaya')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sites.length > 0 && (
        <section className="mt-5 grid gap-2" aria-label="Lokasi asli">
          <h3 className="text-sm font-extrabold">Kunjungi lokasi aslinya</h3>
          {sites.map((l) => (
            <LocationButton key={l.id} location={l.location} />
          ))}
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onReplay} autoFocus>
          Main lagi
        </Button>
        <Button variant="secondary" onClick={onReview}>
          Ulas materi
        </Button>
        <Link to="/koleksi" className="inline-flex items-center rounded-2xl px-4 py-3 text-sm font-extrabold text-teal hover:underline">
          Lihat koleksi
        </Link>
        <Link to="/" className="inline-flex items-center rounded-2xl px-4 py-3 text-sm font-extrabold text-redup hover:text-teal">
          Kembali ke peta
        </Link>
      </div>
    </Card>
  )
}
