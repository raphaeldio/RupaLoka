import { describe, expect, it } from 'vitest'
import type { QuizQuestion, SourceRef } from '../lib/api.types'
import { flowReducer, initialFlow, quizScore, suggestLessons, type FlowEvent, type FlowState } from './machine'

const cfg = { questionCount: 2, lessonCount: 2 }
const reduce = flowReducer(cfg)
const run = (events: FlowEvent[], from: FlowState = initialFlow(cfg)) => events.reduce(reduce, from)

describe('flowReducer', () => {
  it('alur penuh: kuis → hasil → materi → game → ringkasan', () => {
    let s = run([{ type: 'START' }])
    expect(s.stage).toBe('quiz')
    s = run([{ type: 'NEXT' }], s)
    expect(s.index).toBe(0) // belum dijawab, tidak maju
    s = run([{ type: 'ANSWER', choice: 1 }, { type: 'ANSWER', choice: 2 }], s)
    expect(s.answers).toEqual([1, null]) // jawaban terkunci
    s = run([{ type: 'NEXT' }, { type: 'ANSWER', choice: 0 }, { type: 'NEXT' }], s)
    expect(s.stage).toBe('quiz_result')
    s = run([{ type: 'NEXT' }], s)
    expect(s).toMatchObject({ stage: 'lessons', index: 0 })
    s = run([{ type: 'NEXT' }, { type: 'BACK' }, { type: 'NEXT' }, { type: 'NEXT' }], s)
    expect(s.stage).toBe('game')
    s = run([{ type: 'FINISH_GAME', score: 230, unlocked: ['a', 'b'] }], s)
    expect(s).toMatchObject({ stage: 'summary', lastScore: 230, lastUnlocked: ['a', 'b'] })
    expect(run([{ type: 'REPLAY' }], s).stage).toBe('game')
    expect(run([{ type: 'REVIEW_LESSONS' }], s)).toMatchObject({ stage: 'lessons', index: 0 })
  })

  it('SKIP melewati kuis dan materi', () => {
    const s = run([{ type: 'START' }, { type: 'SKIP' }])
    expect(s.stage).toBe('quiz_result')
    expect(run([{ type: 'SKIP' }, { type: 'SKIP' }], s).stage).toBe('game')
  })

  it('kejadian yang tidak relevan diabaikan', () => {
    const s0 = initialFlow(cfg)
    expect(run([{ type: 'NEXT' }, { type: 'FINISH_GAME', score: 1, unlocked: [] }], s0)).toBe(s0)
  })

  it('tanpa soal/materi langsung ke tahap berikutnya', () => {
    const r = flowReducer({ questionCount: 0, lessonCount: 0 })
    expect(r(initialFlow({ questionCount: 0, lessonCount: 0 }), { type: 'START' }).stage).toBe('game')
  })

  it('RESET kembali ke awal', () => {
    expect(run([{ type: 'START' }, { type: 'RESET' }])).toEqual(initialFlow(cfg))
  })
})

const q = (id: string, chunk: string, correct = 0): QuizQuestion => ({
  id,
  question: id,
  options: ['a', 'b'],
  correct,
  explanation: '',
  chunk,
})
const ref = (chunk_id: string, lesson_id: string): SourceRef => ({
  chunk_id,
  lesson_id,
  title: 't',
  url: null,
  type: 'web',
  accessed: null,
})

describe('kuis', () => {
  const questions = [q('q1', 'b-1'), q('q2', 'a-1', 1), q('q3', 'b-2')]
  const sources = { 'a-1': ref('a-1', 'a'), 'b-1': ref('b-1', 'b'), 'b-2': ref('b-2', 'b') }

  it('menghitung skor', () => {
    expect(quizScore(questions, [0, 1, 1])).toBe(2)
    expect(quizScore(questions, [null, null, null])).toBe(0)
  })

  it('menyarankan materi dari soal salah, unik dan berurutan (F-022)', () => {
    expect(suggestLessons(questions, [1, 0, 1], sources, ['a', 'b', 'c'])).toEqual(['a', 'b'])
    expect(suggestLessons(questions, [0, 1, 0], sources, ['a', 'b'])).toEqual([])
    expect(suggestLessons([q('x', 'tidak-ada')], [1], sources, ['a'])).toEqual([])
  })
})
