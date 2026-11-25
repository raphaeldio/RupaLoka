import { Link } from 'react-router-dom'
import { labelOr } from '../lib/cities'
import type { Badge, CityDetail } from '../lib/api.types'
import { pathPoints } from '../lib/rewards'
import { useCityProgress } from '../lib/store'
import BadgeIcon from './BadgeIcon'
import Leaderboard from './Leaderboard'
import LocationButton from './LocationButton'
import ReflectionCard from './ReflectionCard'
import { Pop } from './motion'
import CountUp from './reactbits/CountUp'
import { Button, Card, SafeImage } from './primitives'

/** Ringkasan setelah game over (F-045): skor, rekor, item terbuka, main lagi, lokasi asli. */
export default function Summary({
  detail,
  score,
  best,
  unlockedIds,
  collectedIds,
  onReplay,
  onBack,
  pointsGained,
  badges,
  badgeTier,
  pathTotal,
}: {
  detail: CityDetail
  score: number
  best: number
  unlockedIds: string[]
  collectedIds: string[]
  onReplay: () => void
  onBack: () => void
  /** Poin path yang didapat dari menamatkan game (0 bila sudah pernah). */
  pointsGained: number
  /** Lencana baru dari poin tersebut. */
  badges: Badge[]
  badgeTier: (b: Badge) => number
  /** Total poin path kota setelah game; skor papan peringkat. */
  pathTotal: number
}) {
  const unlocked = detail.items.filter((i) => unlockedIds.includes(i.id))
  const allCollected = detail.items.length > 0 && detail.items.every((i) => collectedIds.includes(i.id))
  const sites = detail.lessons.filter((l) => l.location)
  // Total poin terkini (refleksi di bawah bisa menambah poin setelah game selesai).
  const progress = useCityProgress(detail.city.id)
  const liveTotal = Math.max(
    pathTotal,
    pathPoints(
      detail.lessons.map((l) => l.id),
      progress,
      detail.rewards,
    ),
  )
  const reflections = detail.reflection ?? []

  return (
    <Card>
      <p className="eyebrow text-redup">Ringkasan perjalanan</p>
      <h2 className="mt-1 text-2xl font-extrabold text-teal">Keliling {detail.city.name} selesai!</h2>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="border-2 border-tinta bg-teal-50 p-3">
          <dt className="text-[11px] font-semibold text-redup">Skor</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-teal" aria-label={String(score)}>
            <CountUp to={score} duration={1.4} separator="." trigger="load" />
          </dd>
        </div>
        <div className="border-2 border-tinta bg-kertas p-3">
          <dt className="text-[11px] font-semibold text-redup">Rekor</dt>
          <dd className="text-2xl font-extrabold tabular-nums">{best}</dd>
        </div>
        <div className="border-2 border-tinta bg-amber-50 p-3">
          <dt className="text-[11px] font-semibold text-redup">Item baru</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-amber" aria-label={String(unlocked.length)}>
            <CountUp to={unlocked.length} duration={1} trigger="load" />
          </dd>
        </div>
      </dl>

      {pointsGained > 0 && (
        <p className="mt-4 border-2 border-tinta bg-teal-50 p-3 text-sm font-bold text-teal">
          +{pointsGained} poin path (bonus titik game + skor terbaikmu)!
        </p>
      )}
      {badges.length > 0 && (
        <div className="mt-3 border-2 border-tinta bg-emas-100 p-3" role="status">
          <p className="text-sm font-extrabold text-amber">Lencana baru!</p>
          <ul className="mt-2 flex flex-wrap gap-3">
            {badges.map((b) => (
              <li key={b.id} className="flex items-center gap-2">
                <BadgeIcon tier={badgeTier(b)} earned className="h-12 w-10" />
                <span className="text-sm font-extrabold">{b.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {allCollected && (
        <p className="mt-4 border-2 border-tinta bg-emas-100 p-3 text-sm font-bold">
          Selamat! Semua item budaya {detail.city.name} sudah ada di koleksimu.
        </p>
      )}

      <section className="mt-5" aria-label="Item yang ditemukan">
        <h3 className="text-sm font-extrabold">Item yang kamu temukan</h3>
        {unlocked.length === 0 ? (
          <p className="mt-1 text-sm text-redup">
            Belum ada. Lari sejauh {detail.game.unlock_every} m untuk menemukan item pertama!
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {unlocked.map((i) => (
              <li key={i.id} className="border-2 border-tinta bg-white p-2 text-center">
                <Pop delay={0.3}>
                  <SafeImage image={i.image} className="aspect-square w-full rounded-xl" />
                </Pop>
                <p className="mt-1 text-xs font-bold">{labelOr(i.name, 'Item budaya')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reflections.length > 0 && (
        <div className="mt-5 grid gap-3">
          {reflections.map((q) => (
            <ReflectionCard key={q.id} detail={detail} question={q} />
          ))}
        </div>
      )}

      {detail.rewards.leaderboard?.enabled && (
        <div className="mt-5">
          <Leaderboard cityId={detail.city.id} points={liveTotal} canSubmit />
        </div>
      )}

      {sites.length > 0 && (
        <section className="mt-5 grid gap-2" aria-label="Lokasi asli">
          <h3 className="text-sm font-extrabold">Kunjungi lokasi dan komunitas aslinya</h3>
          {sites.map((l) => (
            <LocationButton key={l.id} location={l.location} />
          ))}
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onReplay} autoFocus>
          Main lagi
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Kembali ke path
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
