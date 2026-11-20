/**
 * Mesin alur satu titik path (SDD §6, diperbarui 20 Nov 2026). Reducer murni.
 *
 *   quiz(i) → lesson → done
 *
 * Titik tanpa soal langsung mulai dari `lesson`. Path, poin, dan lencana: lib/rewards.ts.
 */
import type { QuizQuestion, SourceRef } from '../lib/api.types'

export type NodeStage = 'quiz' | 'lesson' | 'done'

export interface NodeState {
  stage: NodeStage
  index: number // soal ke-i saat stage quiz
  answers: (number | null)[]
}

export type NodeEvent =
  | { type: 'ANSWER'; choice: number }
  | { type: 'NEXT' }
  | { type: 'SKIP_QUIZ' }
  | { type: 'FINISH_LESSON' }
  | { type: 'RESET' }

export const initialNode = (questionCount: number): NodeState => ({
  stage: questionCount > 0 ? 'quiz' : 'lesson',
  index: 0,
  answers: Array<number | null>(questionCount).fill(null),
})

export function nodeReducer(questionCount: number) {
  return (s: NodeState, e: NodeEvent): NodeState => {
    if (e.type === 'RESET') return initialNode(questionCount)
    switch (s.stage) {
      case 'quiz':
        if (e.type === 'ANSWER') {
          // Jawaban dikunci setelah dipilih; penjelasan tampil (F-021).
          if (s.answers[s.index] !== null || e.choice < 0) return s
          const answers = [...s.answers]
          answers[s.index] = e.choice
          return { ...s, answers }
        }
        if (e.type === 'NEXT') {
          if (s.answers[s.index] === null) return s
          return s.index + 1 < questionCount ? { ...s, index: s.index + 1 } : { ...s, stage: 'lesson', index: 0 }
        }
        if (e.type === 'SKIP_QUIZ') return { ...s, stage: 'lesson', index: 0 }
        return s
      case 'lesson':
        return e.type === 'FINISH_LESSON' ? { ...s, stage: 'done' } : s
      case 'done':
        return s
    }
  }
}

/** Jumlah jawaban benar. */
export function quizScore(questions: QuizQuestion[], answers: (number | null)[]): number {
  return questions.reduce((n, q, i) => n + (answers[i] === q.correct ? 1 : 0), 0)
}

/** Soal kuis milik satu titik: soal yang chunk-nya berasal dari materi tersebut. */
export function questionsFor(
  lessonId: string,
  questions: QuizQuestion[],
  sources: Record<string, SourceRef>,
): QuizQuestion[] {
  return questions.filter((q) => sources[q.chunk]?.lesson_id === lessonId)
}
