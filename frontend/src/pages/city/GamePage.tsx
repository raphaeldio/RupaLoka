import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Summary from '../../components/Summary'
import GameView from '../../game/GameView'
import { useAgent } from '../../lib/agentStore'
import { celebrateBadges } from '../../lib/celebrate'
import type { Badge, Item } from '../../lib/api.types'
import { GAME_NODE, newBadges, pathNodes, pathPoints } from '../../lib/rewards'
import { useCityProgress, useProgress } from '../../lib/store'
import { useCity } from './useCity'

interface Result {
  score: number
  unlocked: string[]
  gained: number
  badges: Badge[]
  total: number
}

/** Titik terakhir path: game runner keliling kota, lalu ringkasan (F-040–F-045). */
export default function GamePage() {
  const detail = useCity()
  const navigate = useNavigate()
  const cityId = detail.city.id
  const progress = useCityProgress(cityId)
  const collected = useProgress((s) => s.collected[cityId]) ?? []
  const collect = useProgress((s) => s.collect)
  const finishGame = useProgress((s) => s.finishGame)
  const say = useAgent((s) => s.say)
  const ask = useAgent((s) => s.ask)
  const setContext = useAgent((s) => s.setContext)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  const lessonIds = useMemo(() => detail.lessons.map((l) => l.id), [detail])
  const status = pathNodes(lessonIds, progress).find((n) => n.id === GAME_NODE)?.status

  useEffect(() => {
    setContext({ phase: result ? 'summary' : 'game', lesson_id: null })
    say(result ? detail.agent_script.summary : detail.agent_script.game_start)
  }, [result, detail, say, setContext])

  const onUnlock = useCallback((item: Item) => collect(cityId, item.id), [cityId, collect])
  const onFinish = useCallback(
    (score: number, unlocked: string[]) => {
      const p = useProgress.getState().cities[cityId] ?? progress
      const before = pathPoints(lessonIds, p, detail.rewards)
      const after = pathPoints(lessonIds, { ...p, gameDone: true, best: Math.max(p.best, score) }, detail.rewards)
      finishGame(cityId, score)
      const badges = newBadges(before, after, detail.rewards.badges)
      setResult({ score, unlocked, gained: after - before, badges, total: after })
      celebrateBadges(badges)
    },
    [cityId, progress, lessonIds, detail, finishGame],
  )
  const onAsk = useCallback((text: string, lessonId: string) => ask(text, lessonId), [ask])

  if (status === 'locked' && !result) return <Navigate to={`/kota/${cityId}`} replace />

  return (
    <main id="konten" className="mx-auto w-full max-w-[900px] px-4 pb-28 sm:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to={`/kota/${cityId}`} className="text-sm font-bold text-redup hover:text-teal">
          ← Path {detail.city.name}
        </Link>
        <p className="eyebrow text-redup">Titik {lessonIds.length + 1} · Game</p>
      </div>
      {result ? (
        <Summary
          detail={detail}
          score={result.score}
          best={useProgress.getState().cities[cityId]?.best ?? result.score}
          unlockedIds={result.unlocked}
          collectedIds={collected}
          pointsGained={result.gained}
          badges={result.badges}
          badgeTier={(b) => detail.rewards.badges.indexOf(b)}
          pathTotal={result.total}
          onReplay={() => {
            setResult(null)
            setRound((r) => r + 1)
          }}
          onBack={() => navigate(`/kota/${cityId}`)}
        />
      ) : (
        <GameView
          key={round}
          detail={detail}
          onUnlock={onUnlock}
          onFinish={onFinish}
          onAsk={onAsk}
          onExit={() => navigate(`/kota/${cityId}`)}
        />
      )}
    </main>
  )
}
