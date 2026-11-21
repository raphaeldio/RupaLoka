/**
 * Mesin alur satu titik path (SDD §6, diperbarui 21 Nov 2026). Reducer murni.
 *
 *   quiz(i) → lesson → post(i) → done
 *
 * `quiz` = kuis awal (menebak sebelum belajar), `post` = kuis akhir setelah materi.
 * Tahap tanpa soal dilewati. Path, poin, dan lencana: lib/rewards.ts.
 */
import type { QuizQuestion, SourceRef } from '../lib/api.types'

export type NodeStage = 'quiz' | 'lesson' | 'post' | 'done'

export interface NodeState {
  stage: NodeStage
  index: number // soal ke-i saat stage quiz/post
  answers: (number | null)[] // kuis awal
  postAnswers: (number | null)[] // kuis akhir
}

export type NodeEvent =
  | { type: 'ANSWER'; choice: number }
  | { type: 'NEXT' }
  | { type: 'SKIP_QUIZ' }
  | { type: 'FINISH_LESSON' }
  | { type: 'RESET' }

export const initialNode = (questionCount: number, postCount = 0): NodeState => ({
  stage: questionCount > 0 ? 'quiz' : 'lesson',
  index: 0,
  answers: Array<number | null>(questionCount).fill(null),
  postAnswers: Array<number | null>(postCount).fill(null),
})

export function nodeReducer(questionCount: number, postCount = 0) {
  const afterLesson = (s: NodeState): NodeState => ({ ...s, stage: postCount > 0 ? 'post' : 'done', index: 0 })
  return (s: NodeState, e: NodeEvent): NodeState => {
    if (e.type === 'RESET') return initialNode(questionCount, postCount)
    switch (s.stage) {
      case 'quiz':
      case 'post': {
        const key = s.stage === 'quiz' ? 'answers' : 'postAnswers'
        const count = s.stage === 'quiz' ? questionCount : postCount
        const leave = (): NodeState => (s.stage === 'quiz' ? { ...s, stage: 'lesson', index: 0 } : { ...s, stage: 'done', index: 0 })
        if (e.type === 'ANSWER') {
          // Jawaban dikunci setelah dipilih; penjelasan tampil (F-021).
          if (s[key][s.index] !== null || e.choice < 0) return s
          const list = [...s[key]]
          list[s.index] = e.choice
          return { ...s, [key]: list }
        }
        if (e.type === 'NEXT') {
          if (s[key][s.index] === null) return s
          return s.index + 1 < count ? { ...s, index: s.index + 1 } : leave()
        }
        if (e.type === 'SKIP_QUIZ') return leave()
        return s
      }
      case 'lesson':
        return e.type === 'FINISH_LESSON' ? afterLesson(s) : s
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

/**
 * Soal kuis akhir satu titik: soal `outro` milik materi ini bila tim sudah menulisnya;
 * bila belum, soal kuis awal diulang dengan urutan terbalik (pola uji awal-akhir).
 */
export function postQuestionsFor(
  lessonId: string,
  quiz: { intro: QuizQuestion[]; outro: QuizQuestion[] },
  sources: Record<string, SourceRef>,
): QuizQuestion[] {
  const own = questionsFor(lessonId, quiz.outro, sources)
  return own.length > 0 ? own : [...questionsFor(lessonId, quiz.intro, sources)].reverse()
}
