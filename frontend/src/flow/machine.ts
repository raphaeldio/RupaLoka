/**
 * Mesin alur belajar per kota (SDD §6). Reducer murni agar mudah diuji.
 *
 *   idle → quiz → quiz_result → lessons(i) → game → summary → (game | lessons | peta)
 *
 * `quiz` dan `quiz_result` adalah rincian fase `quiz_intro` di city.yaml.
 */
import type { QuizQuestion, SourceRef } from '../lib/api.types'

export type Stage = 'idle' | 'quiz' | 'quiz_result' | 'lessons' | 'game' | 'summary'

export interface FlowState {
  stage: Stage
  /** Indeks soal (stage quiz) atau materi (stage lessons). */
  index: number
  /** Jawaban kuis per soal; null = belum dijawab/dilewati. */
  answers: (number | null)[]
  /** Hasil game terakhir (stage summary). */
  lastScore: number
  lastUnlocked: string[]
}

export type FlowEvent =
  | { type: 'START' }
  | { type: 'ANSWER'; choice: number }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SKIP' }
  | { type: 'FINISH_GAME'; score: number; unlocked: string[] }
  | { type: 'REPLAY' }
  | { type: 'REVIEW_LESSONS' }
  | { type: 'RESET' }

export interface FlowConfig {
  questionCount: number
  lessonCount: number
}

export const initialFlow = (cfg: FlowConfig): FlowState => ({
  stage: 'idle',
  index: 0,
  answers: Array<number | null>(cfg.questionCount).fill(null),
  lastScore: 0,
  lastUnlocked: [],
})

const toLessons = (s: FlowState, cfg: FlowConfig): FlowState =>
  cfg.lessonCount > 0 ? { ...s, stage: 'lessons', index: 0 } : { ...s, stage: 'game', index: 0 }

export function flowReducer(cfg: FlowConfig) {
  return (s: FlowState, e: FlowEvent): FlowState => {
    if (e.type === 'RESET') return initialFlow(cfg)

    switch (s.stage) {
      case 'idle':
        if (e.type === 'START') {
          return cfg.questionCount > 0
            ? { ...initialFlow(cfg), stage: 'quiz' }
            : toLessons(initialFlow(cfg), cfg)
        }
        return s

      case 'quiz':
        if (e.type === 'ANSWER') {
          // Jawaban dikunci setelah dipilih (penjelasan tampil, F-021).
          if (s.answers[s.index] !== null || e.choice < 0) return s
          const answers = [...s.answers]
          answers[s.index] = e.choice
          return { ...s, answers }
        }
        if (e.type === 'NEXT') {
          if (s.answers[s.index] === null) return s
          return s.index + 1 < cfg.questionCount
            ? { ...s, index: s.index + 1 }
            : { ...s, stage: 'quiz_result', index: 0 }
        }
        if (e.type === 'SKIP') return { ...s, stage: 'quiz_result', index: 0 }
        return s

      case 'quiz_result':
        if (e.type === 'NEXT' || e.type === 'SKIP') return toLessons(s, cfg)
        return s

      case 'lessons':
        if (e.type === 'NEXT') {
          return s.index + 1 < cfg.lessonCount
            ? { ...s, index: s.index + 1 }
            : { ...s, stage: 'game', index: 0 }
        }
        if (e.type === 'BACK') return s.index > 0 ? { ...s, index: s.index - 1 } : s
        if (e.type === 'SKIP') return { ...s, stage: 'game', index: 0 }
        return s

      case 'game':
        if (e.type === 'FINISH_GAME') {
          return { ...s, stage: 'summary', lastScore: e.score, lastUnlocked: e.unlocked }
        }
        return s

      case 'summary':
        if (e.type === 'REPLAY') return { ...s, stage: 'game', index: 0 }
        if (e.type === 'REVIEW_LESSONS') return toLessons(s, cfg)
        return s
    }
  }
}

/** Jumlah jawaban benar. */
export function quizScore(questions: QuizQuestion[], answers: (number | null)[]): number {
  return questions.reduce((n, q, i) => n + (answers[i] === q.correct ? 1 : 0), 0)
}

/**
 * Saran materi (F-022): soal salah/dilewati → chunk → lesson_id, unik, urut sesuai
 * daftar materi kota.
 */
export function suggestLessons(
  questions: QuizQuestion[],
  answers: (number | null)[],
  sources: Record<string, SourceRef>,
  lessonOrder: string[],
): string[] {
  const wrong = new Set<string>()
  questions.forEach((q, i) => {
    if (answers[i] === q.correct) return
    const lesson = sources[q.chunk]?.lesson_id
    if (lesson) wrong.add(lesson)
  })
  return lessonOrder.filter((id) => wrong.has(id))
}

/** Fase konten (untuk konteks chat dan skrip agen) dari stage klien. */
export function phaseOf(stage: Stage): 'quiz_intro' | 'lessons' | 'game' | 'summary' {
  if (stage === 'lessons') return 'lessons'
  if (stage === 'game') return 'game'
  if (stage === 'summary') return 'summary'
  return 'quiz_intro'
}
