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
import {
  initialNode,
  missingParts,
  nodeComplete,
  nodeReducer,
  postQuestionsFor,
  questionsFor,
  quizScore,
  type NodeStage,
} from '../../flow/machine'
import { useAgent } from '../../lib/agentStore'
import type { Badge } from '../../lib/api.types'
import { labelOr } from '../../lib/cities'
import { GAME_NODE, newBadges, nextNode, pathNodes, pathPoints } from '../../lib/rewards'
import { useCityProgress, useProgress } from '../../lib/store'
import { featureFlags } from '../../lib/flags'
import { useCity } from './useCity'

function Steps({ stage, hasQuiz, hasPost }: { stage: NodeStage; hasQuiz: boolean; hasPost: boolean }) {
  const steps: NodeStage[] = [...(hasQuiz ? (['quiz'] as const) : []), 'lesson', ...(hasPost ? (['post'] as const) : []), 'done']
  const names: Record<NodeStage, string> = { quiz: 'Kuis awal', lesson: 'Materi', post: 'Kuis akhir', done: 'Hasil' }
  const current = steps.indexOf(stage)
  return (
    <ol className="flex items-center gap-1.5 text-xs font-bold" aria-label="Tahap titik">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined}>
          <span
            className={`border-2 border-tinta px-2 py-0.5 font-mono text-[11px] ${
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
  const postQuestions = useMemo(() => (lesson ? postQuestionsFor(lesson.id, detail.quiz, detail.sources) : []), [lesson, detail])
  const reducer = useMemo(() => nodeReducer(questions.length, postQuestions.length), [questions.length, postQuestions.length])
  const [state, dispatch] = useReducer(reducer, undefined, () => initialNode(questions.length, postQuestions.length))

  const [result, setResult] = useState<{ before: number; after: number; badges: Badge[]; complete: boolean } | null>(null)
  // Poin jawaban benar per jenis soal (fakta / nilai) memakai hasil terbaik dari kuis awal dan akhir
  // (cocok dengan quizCaps/maxPathPoints dan max_points backend).
  const preCorrect = quizScore(questions, state.answers)
  const postCorrect = quizScore(postQuestions, state.postAnswers)
  const correct = Math.max(quizScore(questions, state.answers, 'fakta'), quizScore(postQuestions, state.postAnswers, 'fakta'))
  const valueCorrect = Math.max(
    quizScore(questions, state.answers, 'nilai'),
    quizScore(postQuestions, state.postAnswers, 'nilai'),
  )

  useEffect(() => {
    if (!lesson) return
    setContext({ phase: state.stage === 'quiz' || state.stage === 'post' ? 'quiz_intro' : 'lessons', lesson_id: lesson.id })
    if (state.stage === 'lesson') say(detail.agent_script.lessons_start)
  }, [lesson, state.stage, detail, say, setContext])

  /** Simpan progres titik dan hitung poin + lencana baru, lalu tampilkan hasil. */
  const finish = () => {
    if (!lesson) return
    const p = useProgress.getState().cities[cityId] ?? progress
    const before = pathPoints(lessonIds, p, detail.rewards)
    // Syarat ketat (flag, mati di MVP): kuis/materi dilewati → titik tidak selesai, tanpa poin.
    const complete = featureFlags.strict_node_requirements ? nodeComplete(state) : true
    if (!complete) {
      setResult({ before, after: before, badges: [], complete })
      return
    }
    completeNode(cityId, lesson.id, correct, valueCorrect)
    const after = pathPoints(lessonIds, useProgress.getState().cities[cityId] ?? p, detail.rewards)
    const badges = newBadges(before, after, detail.rewards.badges)
    setResult({ before, after, badges, complete })
    celebrateBadges(badges)
  }

  // Simpan progres tepat sekali saat titik mencapai tahap hasil (dari materi atau dari kuis akhir).
  useEffect(() => {
    if (state.stage === 'done' && !result) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage])

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
  } else if (state.stage === 'post') {
    const q = postQuestions[state.index]
    body = (
      <QuizCard
        key={`post-${q.id}`}
        kind="Kuis akhir"
        finalLabel="Lihat hasil"
        question={q}
        number={state.index + 1}
        total={postQuestions.length}
        answer={state.postAnswers[state.index]}
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
        onFinish={(watched) => dispatch({ type: 'FINISH_LESSON', watched })}
        finishLabel={postQuestions.length > 0 ? 'Lanjut ke kuis akhir' : 'Selesaikan titik'}
        cityId={cityId}
      />
    )
  } else if (result && !result.complete) {
    const alreadyDone = progress.completed.includes(lesson.id)
    body = (
      <Card className="text-center">
        <p className="eyebrow text-redup">Titik {position} belum selesai</p>
        <h2 className="mt-1 text-2xl font-extrabold text-teal">{title}</h2>
        <p className="mt-3 text-sm text-redup">
          Kamu melewati sebagian titik ini, jadi belum ada poin{alreadyDone ? ' baru' : ''} dan path belum bisa dilanjutkan
          {alreadyDone ? ' dari percobaan ini' : ''}. Lengkapi dulu:
        </p>
        <ul className="mx-auto mt-3 grid max-w-sm gap-2 text-left text-sm">
          {missingParts(state).map((m) => (
            <li key={m} className="flex items-start gap-2 border-2 border-tinta bg-kertas p-3 font-semibold">
              <span aria-hidden="true" className="text-amber">
                ●
              </span>
              {m}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate(`/kota/${cityId}`)}>
            Kembali ke path
          </Button>
          <Button
            autoFocus
            onClick={() => {
              setResult(null)
              dispatch({ type: 'RESET' })
            }}
          >
            Ulangi titik ini
          </Button>
        </div>
      </Card>
    )
  } else {
    const r = result
    const gained = r ? r.after - r.before : 0
    const next = nextNode(pathNodes(lessonIds, progress))
    const nextTo = next ? (next.id === GAME_NODE ? `/kota/${cityId}/game` : `/kota/${cityId}/titik/${next.id}`) : null
    const nextTitle = labelOr(detail.lessons.find((l) => l.id === next?.id)?.title, 'titik berikutnya')
    body = (
      <Card className="text-center">
        <p className="eyebrow text-redup">Titik {position} selesai</p>
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
        </p>
        {(questions.length > 0 || postQuestions.length > 0) && (
          <div className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-2 text-sm">
            {questions.length > 0 && (
              <p className="border-2 border-tinta bg-kertas p-3">
                <span className="block text-xs font-bold text-redup">Kuis awal</span>
                <strong className="text-lg tabular-nums">
                  {preCorrect}/{questions.length}
                </strong>
              </p>
            )}
            {postQuestions.length > 0 && (
              <p className="border-2 border-tinta bg-teal-50 p-3">
                <span className="block text-xs font-bold text-redup">Kuis akhir</span>
                <strong className="text-lg tabular-nums text-teal">
                  {postCorrect}/{postQuestions.length}
                </strong>
              </p>
            )}
          </div>
        )}
        {gained === 0 && <p className="mt-2 text-xs text-redup">Titik ini sudah pernah diselesaikan; poin dihitung dari hasil terbaik.</p>}

        {r && r.badges.length > 0 && (
          <Pop delay={0.5} className="mx-auto mt-6 max-w-sm border-2 border-tinta bg-emas-100 p-4 shadow-melayang">
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
              {next?.id === GAME_NODE ? `Lanjut: main game keliling ${detail.city.name} →` : `Lanjut: ${nextTitle} →`}
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
        <Steps stage={state.stage} hasQuiz={questions.length > 0} hasPost={postQuestions.length > 0} />
      </div>
      <p className="mb-2 eyebrow text-redup">
        Titik {position}: {title}
      </p>
      {body}
    </main>
  )
}
