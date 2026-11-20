import { motion } from 'motion/react'
import { Fragment, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import BadgeIcon from '../../components/BadgeIcon'
import { ContentText, GlowCard } from '../../components/primitives'
import BlurText from '../../components/reactbits/BlurText'
import CountUp from '../../components/reactbits/CountUp'
import Magnet from '../../components/reactbits/Magnet'
import ShinyText from '../../components/reactbits/ShinyText'
import { Progress } from '../../components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip'
import { questionsFor } from '../../flow/machine'
import { useAgent } from '../../lib/agentStore'
import type { CityDetail } from '../../lib/api.types'
import { labelOr } from '../../lib/cities'
import {
  earnedBadges,
  GAME_NODE,
  maxPathPoints,
  nextBadge,
  nextNode,
  pathNodes,
  pathPoints,
  type PathNode,
} from '../../lib/rewards'
import { useCityProgress, useProgress } from '../../lib/store'
import { useCity } from './useCity'

/** Geser horizontal titik (px) agar path berkelok; pola berulang. */
const OFFSETS = [0, 64, 96, 64, 0, -64, -96, -64]

function NodeIcon({ node }: { node: PathNode }) {
  if (node.status === 'locked') {
    return (
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    )
  }
  if (node.status === 'done') {
    return (
      <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (node.id === GAME_NODE) {
    return (
      <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true">
        <circle cx="14" cy="4.5" r="2.2" fill="currentColor" />
        <path
          d="M10 21l2.2-5.2L15 18v3M7 12.5l3.2-3.5 4 1.2 2.3 2.8M10.2 9l1.6 6.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return <span className="text-2xl font-extrabold">{node.index + 1}</span>
}

function nodeMeta(detail: CityDetail, node: PathNode) {
  if (node.id === GAME_NODE) {
    return {
      title: `Keliling ${detail.city.name}`,
      meta: `Game · item tiap ${detail.game.unlock_every.toLocaleString('id-ID')} poin`,
      to: `/kota/${detail.city.id}/game`,
    }
  }
  const lesson = detail.lessons.find((l) => l.id === node.id)
  const n = questionsFor(node.id, detail.quiz.intro, detail.sources).length
  return {
    title: labelOr(lesson?.title, 'Materi budaya'),
    meta: n > 0 ? `${n} soal · 1 materi` : '1 materi',
    to: `/kota/${detail.city.id}/titik/${node.id}`,
  }
}

function PathStep({ detail, node, isNext, offset }: { detail: CityDetail; node: PathNode; isNext: boolean; offset: number }) {
  const delay = node.index * 0.08
  const { title, meta, to } = nodeMeta(detail, node)
  const locked = node.status === 'locked'
  const tone =
    node.status === 'done'
      ? 'bg-teal text-white shadow-[0_6px_0_#0e4d4b]'
      : locked
        ? 'bg-[#e4e1d7] text-[#a7aa9c] shadow-[0_6px_0_#cfcbbd]'
        : node.id === GAME_NODE
          ? 'bg-emas text-tinta shadow-[0_6px_0_#a8761a]'
          : 'bg-white text-teal ring-4 ring-teal shadow-[0_6px_0_#146b68]'
  const label = `Titik ${node.index + 1}: ${title}. ${meta}. ${
    locked ? 'Terkunci' : node.status === 'done' ? 'Selesai' : 'Terbuka'
  }`

  const circle = (
    <span
      className={`relative grid size-[76px] place-items-center rounded-[28px] transition ${tone} ${
        locked ? '' : 'group-hover:-translate-y-0.5 group-active:translate-y-1 group-active:shadow-none'
      }`}
    >
      <NodeIcon node={node} />
    </span>
  )

  return (
    <motion.li
      className="relative flex flex-col items-center"
      style={{ x: offset }}
      initial={{ opacity: 0, y: 24, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
    >
      {isNext && (
        <span className="mb-2 rounded-xl bg-teal px-3 py-1 text-xs font-extrabold shadow-kartu motion-safe:animate-bounce">
          <ShinyText text={node.status === 'open' && node.index === 0 ? 'Mulai' : 'Lanjut'} color="#ffffff" shineColor="#f8e9c4" speed={2.4} />
        </span>
      )}
      {locked ? (
        <div aria-label={label} role="img" className="cursor-not-allowed">
          {circle}
        </div>
      ) : (
        <Magnet padding={50} magnetStrength={5} disabled={!isNext}>
          <Link to={to} aria-label={label} className="group block rounded-[28px]">
            {circle}
          </Link>
        </Magnet>
      )}
      <p className={`mt-3 max-w-[200px] text-center text-[15px] font-extrabold leading-tight ${locked ? 'text-redup' : 'text-tinta'}`}>
        {title}
      </p>
      <p className="text-xs font-semibold text-redup">{meta}</p>
    </motion.li>
  )
}

/** Garis putus-putus berkelok antar titik. */
function Connector({ from, to }: { from: number; to: number }) {
  return (
    <svg aria-hidden="true" className="mx-auto -my-1 block h-12 w-[260px] overflow-visible" viewBox="0 0 260 48">
      <path
        d={`M${130 + from} 0 C ${130 + from} 24, ${130 + to} 24, ${130 + to} 48`}
        fill="none"
        stroke="#c9c3b2"
        strokeWidth="4"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Path belajar kota (beranda kota): titik materi berurutan lalu game, poin, dan lencana. */
export default function PathPage() {
  const detail = useCity()
  const cityId = detail.city.id
  const progress = useCityProgress(cityId)
  const collected = useProgress((s) => s.collected[cityId])
  const resetCity = useProgress((s) => s.resetCity)
  const say = useAgent((s) => s.say)
  const setContext = useAgent((s) => s.setContext)

  const lessonIds = useMemo(() => detail.lessons.map((l) => l.id), [detail])
  const nodes = pathNodes(lessonIds, progress)
  const next = nextNode(nodes)
  const points = pathPoints(lessonIds, progress, detail.rewards)
  const badges = detail.rewards.badges
  const earned = earnedBadges(points, badges)
  const upcoming = nextBadge(points, badges)
  const doneCount = nodes.filter((n) => n.status === 'done').length
  const max = maxPathPoints(lessonIds, detail.quiz.intro.length, detail.rewards)

  useEffect(() => {
    setContext({ phase: 'quiz_intro', lesson_id: null })
    say(detail.agent_script.quiz_intro)
  }, [detail, say, setContext])

  const prevMin = upcoming ? (badges[badges.indexOf(upcoming) - 1]?.min_points ?? 0) : 0
  const toNext = upcoming ? Math.round(((points - prevMin) / (upcoming.min_points - prevMin)) * 100) : 100

  return (
    <main id="konten" className="mx-auto w-full max-w-[1200px] px-4 pb-28 sm:px-8">
      <Link to="/" className="text-sm font-bold text-redup hover:text-teal">
        ← Peta
      </Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>
          {/* Spanduk kota */}
          <section
            aria-labelledby="judul-kota"
            className="relative overflow-hidden rounded-[32px] bg-teal px-6 py-6 text-white shadow-melayang sm:px-8"
          >
            <svg aria-hidden="true" viewBox="0 0 400 120" className="pointer-events-none absolute -right-10 bottom-0 w-[420px] opacity-20">
              <path d="M0 120 C60 40 120 60 170 90 S280 20 400 70 V120Z" fill="#e8b64c" />
              <path d="M0 120 C80 80 150 100 220 110 S330 80 400 100 V120Z" fill="#8bb9a0" />
            </svg>
            <div className="relative flex items-center gap-5">
              <div
                className="grid size-16 shrink-0 place-items-center rounded-full border-4 border-white/30 text-lg font-extrabold"
                aria-label={`${doneCount} dari ${nodes.length} titik selesai`}
              >
                {doneCount}/{nodes.length}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[2px] text-white/70">{detail.city.province}</p>
                <h1 id="judul-kota" className="text-3xl font-extrabold tracking-tight" aria-label={`Jelajah ${detail.city.name}`}>
                  <BlurText text={`Jelajah ${detail.city.name}`} animateBy="words" delay={90} className="inline-flex" />
                </h1>
                <p className="mt-0.5 text-sm text-white/80">
                  {detail.lessons.length} titik materi · 1 game · {detail.items.length} item budaya
                </p>
              </div>
            </div>
            <p className="relative mt-4 max-w-xl text-sm leading-relaxed text-white/85">
              <ContentText text={detail.city.summary} fallback="Ringkasan kota sedang disiapkan tim konten." className="text-white/85" />
            </p>
          </section>

          {/* Path */}
          <ol className="mt-10 flex flex-col items-center" aria-label="Path belajar">
            {nodes.map((node, i) => (
              <Fragment key={node.id}>
                {i > 0 && (
                  <li aria-hidden="true" className="list-none">
                    <Connector from={OFFSETS[(i - 1) % OFFSETS.length]} to={OFFSETS[i % OFFSETS.length]} />
                  </li>
                )}
                <PathStep detail={detail} node={node} isNext={next?.id === node.id} offset={OFFSETS[i % OFFSETS.length]} />
              </Fragment>
            ))}
          </ol>

          {doneCount > 0 && (
            <p className="mt-10 text-center">
              <button
                type="button"
                onClick={() => resetCity(cityId)}
                className="text-xs font-bold text-redup underline-offset-2 hover:text-teal hover:underline"
              >
                Ulang path dari awal
              </button>
            </p>
          )}
        </div>

        {/* Panel samping: poin, lencana, koleksi */}
        <aside className="grid gap-4 lg:sticky lg:top-24" aria-label="Poin dan lencana">
          <GlowCard>
            <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-redup">Poin {detail.city.name}</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums text-teal">
              <CountUp to={points} duration={1.2} trigger="load" />
              <span className="text-base text-redup"> / {max}</span>
            </p>
            {upcoming ? (
              <>
                <Progress
                  value={toNext}
                  // Radix menganggap 0 sebagai indeterminate; 0% tetap nilai yang sah.
                  aria-valuenow={toNext}
                  aria-label={`Menuju lencana ${upcoming.name}`}
                  className="mt-3 h-2.5 bg-pasir [&>[data-slot=progress-indicator]]:bg-emas [&>[data-slot=progress-indicator]]:duration-700"
                />
                <p className="mt-2 text-sm text-redup">
                  {upcoming.min_points - points} poin lagi untuk <strong className="text-tinta">{upcoming.name}</strong>.
                </p>
              </>
            ) : (
              badges.length > 0 && <p className="mt-2 text-sm font-bold text-teal">Semua lencana kota ini sudah kamu dapat!</p>
            )}
            <p className="mt-3 text-xs text-redup">
              +{detail.rewards.points_per_node} per titik selesai, +{detail.rewards.points_per_correct} per jawaban benar, +
              {detail.rewards.game_node_points} saat menamatkan game.
            </p>
          </GlowCard>

          {badges.length > 0 && (
            <section className="rounded-3xl border border-garis bg-white p-5 shadow-kartu" aria-labelledby="judul-lencana">
              <h2 id="judul-lencana" className="font-extrabold">
                Lencana <span className="text-sm text-redup">({earned.length}/{badges.length})</span>
              </h2>
              <ul className="mt-3 grid gap-3">
                {badges.map((b, i) => {
                  const got = points >= b.min_points
                  return (
                    <li key={b.id} className="flex items-center gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.span
                            tabIndex={0}
                            aria-label={`Lencana ${b.name}: ${got ? 'sudah didapat' : `butuh ${b.min_points} poin`}`}
                            whileHover={{ scale: 1.15, rotate: got ? -6 : 0 }}
                            className="shrink-0 rounded-xl"
                          >
                            <BadgeIcon tier={i} earned={got} className="h-12 w-10" />
                          </motion.span>
                        </TooltipTrigger>
                        <TooltipContent>{got ? b.description : `Kumpulkan ${b.min_points} poin`}</TooltipContent>
                      </Tooltip>
                      <div className="min-w-0">
                        <p className={`text-sm font-extrabold ${got ? 'text-tinta' : 'text-redup'}`}>{b.name}</p>
                        <p className="text-xs text-redup">{got ? b.description : `Butuh ${b.min_points} poin`}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="rounded-3xl border border-garis bg-white p-5 shadow-kartu">
            <h2 className="font-extrabold">Koleksi item</h2>
            <p className="mt-1 text-sm text-redup">
              {collected?.length ?? 0}/{detail.items.length} item budaya ditemukan di game.
            </p>
            <Link to="/koleksi" className="mt-3 inline-block text-sm font-extrabold text-teal hover:underline">
              Lihat koleksi →
            </Link>
          </section>
        </aside>
      </div>
    </main>
  )
}
