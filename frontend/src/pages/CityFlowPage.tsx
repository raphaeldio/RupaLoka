import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AgentPanel, { type AgentRequest } from '../components/AgentPanel'
import LessonCard from '../components/LessonCard'
import { QuizCard, QuizResult } from '../components/QuizCard'
import Summary from '../components/Summary'
import { Button, Card, ContentText } from '../components/ui'
import {
  flowReducer,
  initialFlow,
  phaseOf,
  quizScore,
  suggestLessons,
  type FlowConfig,
  type FlowState,
  type Stage,
} from '../flow/machine'
import GameView from '../game/GameView'
import type { AgentScript, CityDetail, Item } from '../lib/api.types'
import { bundledCities } from '../lib/cities'
import { useProgress } from '../lib/store'
import { useCityDetail } from '../lib/useCityDetail'

const STEPS: { label: string; stages: Stage[] }[] = [
  { label: 'Kuis', stages: ['idle', 'quiz', 'quiz_result'] },
  { label: 'Materi', stages: ['lessons'] },
  { label: 'Game', stages: ['game'] },
  { label: 'Ringkasan', stages: ['summary'] },
]

function scriptFor(stage: Stage, s: AgentScript): string | null {
  switch (phaseOf(stage)) {
    case 'quiz_intro':
      return s.quiz_intro
    case 'lessons':
      return s.lessons_start
    case 'game':
      return s.game_start
    case 'summary':
      return s.summary
  }
}

/** Pulihkan progres tersimpan bila masih cocok dengan konten saat ini. */
function restore(saved: FlowState | null | undefined, cfg: FlowConfig): FlowState {
  if (!saved || saved.answers?.length !== cfg.questionCount) return initialFlow(cfg)
  if (saved.stage === 'lessons' && saved.index >= cfg.lessonCount) return { ...saved, index: 0 }
  if (saved.stage === 'quiz' && saved.index >= cfg.questionCount) return initialFlow(cfg)
  return saved
}

function Progress({ stage }: { stage: Stage }) {
  const current = STEPS.findIndex((s) => s.stages.includes(stage))
  return (
    <ol className="flex items-center gap-1 text-[11px] font-bold sm:gap-2 sm:text-xs" aria-label="Tahap perjalanan">
      {STEPS.map((s, i) => (
        <li key={s.label} className="flex items-center gap-1 sm:gap-2" aria-current={i === current ? 'step' : undefined}>
          <span
            className={`rounded-full px-2.5 py-1 ${
              i === current ? 'bg-teal text-white' : i < current ? 'bg-teal-50 text-teal' : 'bg-pasir/70 text-redup'
            }`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-2 bg-garis sm:w-4" />}
        </li>
      ))}
    </ol>
  )
}

function Flow({ detail }: { detail: CityDetail }) {
  const cityId = detail.city.id
  const questions = detail.quiz.intro
  const cfg = useMemo<FlowConfig>(
    () => ({ questionCount: questions.length, lessonCount: detail.lessons.length }),
    [questions.length, detail.lessons.length],
  )
  const saved = useProgress((s) => s.cities[cityId])
  const collected = useProgress((s) => s.collected[cityId]) ?? []
  const { saveFlow, markLesson, collect, recordScore } = useProgress.getState()

  const reducer = useMemo(() => flowReducer(cfg), [cfg])
  const [flow, dispatch] = useReducer(reducer, undefined, () => restore(saved?.flow, cfg))
  const [request, setRequest] = useState<AgentRequest | null>(null)
  const [gameKey, setGameKey] = useState(0)
  const agentRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => saveFlow(cityId, flow), [cityId, flow, saveFlow])

  // Fokus ke konten tahap baru (aksesibilitas) tanpa melompat saat game.
  const stageKey = `${flow.stage}-${flow.index}`
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
    mainRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [stageKey])

  const lesson = flow.stage === 'lessons' ? detail.lessons[flow.index] : undefined
  useEffect(() => {
    if (lesson) markLesson(cityId, lesson.id)
  }, [cityId, lesson, markLesson])

  const ask = useCallback((text: string, lessonId?: string | null) => {
    setRequest((r) => ({ id: (r?.id ?? 0) + 1, text, lessonId }))
    // Di ponsel panel agen ada di bawah; gulir agar jawabannya terlihat.
    if (window.matchMedia?.('(max-width: 1023px)').matches) {
      agentRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [])

  const onUnlock = useCallback((item: Item) => collect(cityId, item.id), [cityId, collect])
  const onFinish = useCallback(
    (score: number, unlocked: string[]) => {
      recordScore(cityId, score)
      dispatch({ type: 'FINISH_GAME', score, unlocked })
    },
    [cityId, recordScore],
  )

  let body: React.ReactNode
  switch (flow.stage) {
    case 'idle':
      body = (
        <Card>
          <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-redup">{detail.city.province}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-teal">Jelajah {detail.city.name}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-redup">
            <ContentText text={detail.city.summary} fallback="Ringkasan kota sedang disiapkan tim konten." />
          </p>
          <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <li className="rounded-2xl bg-kertas p-3">
              <strong>{questions.length} soal</strong> kuis pemanasan
            </li>
            <li className="rounded-2xl bg-kertas p-3">
              <strong>{detail.lessons.length} materi</strong> budaya bersumber
            </li>
            <li className="rounded-2xl bg-kertas p-3">
              <strong>Game</strong> keliling kota, {detail.items.length} item untuk dikoleksi
            </li>
          </ol>
          <Button className="mt-6 w-full sm:w-auto" onClick={() => dispatch({ type: 'START' })}>
            Mulai petualangan
          </Button>
        </Card>
      )
      break
    case 'quiz': {
      const q = questions[flow.index]
      body = (
        <QuizCard
          key={q.id}
          question={q}
          number={flow.index + 1}
          total={questions.length}
          answer={flow.answers[flow.index]}
          source={detail.sources[q.chunk]}
          onAnswer={(choice) => dispatch({ type: 'ANSWER', choice })}
          onNext={() => dispatch({ type: 'NEXT' })}
          onSkip={() => dispatch({ type: 'SKIP' })}
        />
      )
      break
    }
    case 'quiz_result': {
      const ids = suggestLessons(
        questions,
        flow.answers,
        detail.sources,
        detail.lessons.map((l) => l.id),
      )
      body = (
        <QuizResult
          score={quizScore(questions, flow.answers)}
          total={questions.length}
          suggested={detail.lessons.filter((l) => ids.includes(l.id))}
          onNext={() => dispatch({ type: 'NEXT' })}
        />
      )
      break
    }
    case 'lessons':
      body = lesson && (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          number={flow.index + 1}
          total={detail.lessons.length}
          sources={detail.sources}
          onAsk={(q) => ask(q, lesson.id)}
          onBack={flow.index > 0 ? () => dispatch({ type: 'BACK' }) : undefined}
          onNext={() => dispatch({ type: 'NEXT' })}
          onSkip={() => dispatch({ type: 'SKIP' })}
        />
      )
      break
    case 'game':
      body = <GameView key={gameKey} detail={detail} onUnlock={onUnlock} onFinish={onFinish} onAsk={ask} />
      break
    case 'summary':
      body = (
        <Summary
          detail={detail}
          score={flow.lastScore}
          best={saved?.best ?? flow.lastScore}
          unlockedIds={flow.lastUnlocked}
          collectedIds={collected}
          onReplay={() => {
            setGameKey((k) => k + 1)
            dispatch({ type: 'REPLAY' })
          }}
          onReview={() => dispatch({ type: 'REVIEW_LESSONS' })}
        />
      )
      break
  }

  return (
    <main id="konten" className="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-sm font-bold text-redup hover:text-teal">
          ← Peta
        </Link>
        <Progress stage={flow.stage} />
        {flow.stage !== 'idle' && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET' })}
            className="text-xs font-bold text-redup underline-offset-2 hover:text-teal hover:underline"
          >
            Ulang dari awal
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div ref={mainRef} tabIndex={-1} className="scroll-mt-28 outline-none">
          {body}
        </div>
        <div ref={agentRef} className="h-[440px] scroll-mt-28 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:max-h-[680px]">
          <AgentPanel
            cityId={cityId}
            context={{ phase: phaseOf(flow.stage), lesson_id: lesson?.id ?? null }}
            script={scriptFor(flow.stage, detail.agent_script)}
            request={request}
          />
        </div>
      </div>
    </main>
  )
}

export default function CityFlowPage() {
  const { cityId } = useParams()
  const state = useCityDetail(cityId)
  const known = bundledCities.find((c) => c.id === cityId)

  if (state.status === 'loading') {
    return (
      <main id="konten" className="mx-auto max-w-2xl px-4 py-20 text-center" aria-busy="true">
        <p className="text-lg font-bold text-teal motion-safe:animate-pulse">Menyiapkan perjalanan…</p>
      </main>
    )
  }
  if (state.status === 'error') {
    const soon = state.notFound && known?.status === 'coming_soon'
    return (
      <main id="konten" className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold text-teal">
          {soon ? `${known.name}: segera hadir` : state.notFound ? 'Kota tidak ditemukan' : 'Gagal memuat'}
        </h1>
        <p className="mt-3 text-redup">{soon ? 'Kota ini sedang disiapkan bersama mitra.' : state.message}</p>
        <div className="mt-6 flex gap-2">
          {!state.notFound && <Button onClick={state.retry}>Coba lagi</Button>}
          <Link to="/" className="rounded-2xl border border-garis bg-white px-5 py-3 text-sm font-extrabold text-teal">
            Kembali ke peta
          </Link>
        </div>
      </main>
    )
  }
  return <Flow key={state.data.city.id} detail={state.data} />
}
