import { motion } from 'motion/react'
import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import BadgeIcon from '../../components/BadgeIcon'
import LessonCard from '../../components/LessonCard'
import { Pop } from '../../components/motion'
import CountUp from '../../components/reactbits/CountUp'
import { celebrateBadges } from '../../lib/celebrate'
import { QuizCard } from '../../components/QuizCard'
import { Button, Card } from '../../components/primitives'
import { initialNode, nodeReducer, questionsFor, quizScore } from '../../flow/machine'
import { useAgent } from '../../lib/agentStore'
import type { Badge } from '../../lib/api.types'
import { labelOr } from '../../lib/cities'
import { GAME_NODE, newBadges, nextNode, pathNodes, pathPoints } from '../../lib/rewards'
import { useCityProgress, useProgress } from '../../lib/store'
import { useCity } from './useCity'

function Steps({ stage, hasQuiz }: { stage: 'quiz' | 'lesson' | 'done'; hasQuiz: boolean }) {
  const steps = [...(hasQuiz ? (['quiz'] as const) : []), 'lesson', 'done'] as const
  const names = { quiz: 'Kuis', lesson: 'Materi', done: 'Hasil' }
  const current = steps.indexOf(stage as never)
  return (
    <ol className="flex items-center gap-1.5 text-xs font-bold" aria-label="Tahap titik">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined}>
          <span
            className={`rounded-full px-2.5 py-1 ${
              i === current ? 'bg-teal text-white' : i < current ? 'bg-teal-50 text-teal' : 'bg-pasir/70 text-redup'
            }`}
          >
            {names[s]}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Pasang ulang per titik agar state kuis/hasil tidak terbawa ke titik berikutnya. */
export default function NodePageRoute() {
  const { lessonId } = useParams()
  return <NodePage key={lessonId} />
}

/** Satu titik path: kuis topik → kartu materi → hasil (poin + lencana baru). */
function NodePage() {
  const detail = useCity()
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const cityId = detail.city.id
  const progress = useCityProgress(cityId)
  const completeNode = useProgress((s) => s.completeNode)
  const say = useAgent((s) => s.say)
  const ask = useAgent((s) => s.ask)
  const setContext = useAgent((s) => s.setContext)

  const lessonIds = useMemo(() => detail.lessons.map((l) => l.id), [detail])
  const lesson = detail.lessons.find((l) => l.id === lessonId)
  const questions = useMemo(
    () => (lesson ? questionsFor(lesson.id, detail.quiz.intro, detail.sources) : []),
    [lesson, detail],
  )
  const reducer = useMemo(() => nodeReducer(questions.length), [questions.length])
  const [state, dispatch] = useReducer(reducer, questions.length, initialNode)

  const [result, setResult] = useState<{ before: number; after: number; badges: Badge[] } | null>(null)
  const correct = quizScore(questions, state.answers)

  useEffect(() => {
    if (!lesson) return
    setContext({ phase: state.stage === 'quiz' ? 'quiz_intro' : 'lessons', lesson_id: lesson.id })
    if (state.stage === 'lesson') say(detail.agent_script.lessons_start)
  }, [lesson, state.stage, detail, say, setContext])

  /** Simpan progres titik dan hitung poin + lencana baru, lalu tampilkan hasil. */
  const finish = () => {
    if (!lesson) return
    const p = useProgress.getState().cities[cityId] ?? progress
    const before = pathPoints(lessonIds, p, detail.rewards)
    completeNode(cityId, lesson.id, correct)
    const after = pathPoints(lessonIds, useProgress.getState().cities[cityId] ?? p, detail.rewards)
    const badges = newBadges(before, after, detail.rewards.badges)
    setResult({ before, after, badges })
    celebrateBadges(badges)
    dispatch({ type: 'FINISH_LESSON' })
  }

  if (!lesson) return <Navigate to={`/kota/${cityId}`} replace />
  const node = pathNodes(lessonIds, progress).find((n) => n.id === lesson.id)
  if (node?.status === 'locked' && state.stage !== 'done') return <Navigate to={`/kota/${cityId}`} replace />

  const position = lessonIds.indexOf(lesson.id) + 1
  const title = labelOr(lesson.title, 'Materi budaya')

  let body: React.ReactNode
  if (state.stage === 'quiz') {
    const q = questions[state.index]
    body = (
      <QuizCard
        key={q.id}
        question={q}
        number={state.index + 1}
        total={questions.length}
        answer={state.answers[state.index]}
        source={detail.sources[q.chunk]}
        onAnswer={(choice) => dispatch({ type: 'ANSWER', choice })}
        onNext={() => dispatch({ type: 'NEXT' })}
        onSkip={() => dispatch({ type: 'SKIP_QUIZ' })}
      />
    )
  } else if (state.stage === 'lesson') {
    body = (
      <LessonCard
        lesson={lesson}
        eyebrow={`Titik ${position} · Materi`}
        sources={detail.sources}
        onAsk={(q) => ask(q, lesson.id)}
        onFinish={finish}
        finishLabel="Selesaikan titik"
      />
    )
  } else {
    const r = result
    const gained = r ? r.after - r.before : 0
    const next = nextNode(pathNodes(lessonIds, progress))
    const nextTo = next ? (next.id === GAME_NODE ? `/kota/${cityId}/game` : `/kota/${cityId}/titik/${next.id}`) : null
    body = (
      <Card className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-redup">Titik {position} selesai</p>
        <h2 className="mt-1 text-2xl font-extrabold text-teal">{title}</h2>
        <Pop className="mt-4">
          <p className="text-5xl font-extrabold tabular-nums text-amber" aria-label={`Bertambah ${gained} poin`}>
            <span aria-hidden="true">
              <CountUp to={gained} prefix="+" duration={1} trigger="load" />
            </span>
          </p>
        </Pop>
        <p className="text-sm text-redup">
          poin · total {r?.after ?? 0}
          {questions.length > 0 && ` · kuis ${correct}/${questions.length} benar`}
        </p>
        {gained === 0 && <p className="mt-2 text-xs text-redup">Titik ini sudah pernah diselesaikan; poin dihitung dari hasil terbaik.</p>}

        {r && r.badges.length > 0 && (
          <Pop delay={0.5} className="mx-auto mt-6 max-w-sm rounded-3xl bg-emas-100 p-4">
          <div role="status">
            <p className="text-sm font-extrabold text-amber">Lencana baru!</p>
            <ul className="mt-2 grid gap-2">
              {r.badges.map((b) => (
                <li key={b.id} className="flex items-center justify-center gap-3">
                  <motion.span
                    initial={{ rotate: -25, scale: 0.4 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 10, delay: 0.7 }}
                  >
                    <BadgeIcon tier={detail.rewards.badges.indexOf(b)} earned className="h-14 w-12" />
                  </motion.span>
                  <div className="text-left">
                    <p className="font-extrabold">{b.name}</p>
                    <p className="text-xs text-redup">{b.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          </Pop>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate(`/kota/${cityId}`)}>
            Kembali ke path
          </Button>
          {nextTo && (
            <Button autoFocus onClick={() => navigate(nextTo)}>
              {next?.id === GAME_NODE ? 'Main game' : 'Titik berikutnya'}
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <main id="konten" className="mx-auto w-full max-w-[760px] px-4 pb-28 sm:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/kota/${cityId}`} className="text-sm font-bold text-redup hover:text-teal">
          ← Path {detail.city.name}
        </Link>
        <Steps stage={state.stage} hasQuiz={questions.length > 0} />
      </div>
      <p className="mb-2 text-xs font-extrabold uppercase tracking-[1.6px] text-redup">
        Titik {position}: {title}
      </p>
      {body}
    </main>
  )
}
