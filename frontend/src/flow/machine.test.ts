import { describe, expect, it } from 'vitest'
import type { QuizQuestion, SourceRef } from '../lib/api.types'
import { initialNode, nodeReducer, questionsFor, quizScore, type NodeEvent, type NodeState } from './machine'

const reduce = nodeReducer(2)
const run = (events: NodeEvent[], from: NodeState = initialNode(2)) => events.reduce(reduce, from)

describe('nodeReducer', () => {
  it('kuis → materi → selesai; jawaban terkunci', () => {
    let s = run([{ type: 'NEXT' }])
    expect(s).toMatchObject({ stage: 'quiz', index: 0 }) // belum dijawab
    s = run([{ type: 'ANSWER', choice: 1 }, { type: 'ANSWER', choice: 0 }], s)
    expect(s.answers).toEqual([1, null])
    s = run([{ type: 'NEXT' }, { type: 'ANSWER', choice: 0 }, { type: 'NEXT' }], s)
    expect(s.stage).toBe('lesson')
    expect(run([{ type: 'FINISH_LESSON' }], s).stage).toBe('done')
  })

  it('lewati kuis; titik tanpa soal mulai di materi', () => {
    expect(run([{ type: 'SKIP_QUIZ' }]).stage).toBe('lesson')
    expect(initialNode(0).stage).toBe('lesson')
  })

  it('kejadian tidak relevan diabaikan; RESET ke awal', () => {
    const s0 = initialNode(2)
    expect(run([{ type: 'FINISH_LESSON' }], s0)).toBe(s0)
    expect(run([{ type: 'ANSWER', choice: 0 }, { type: 'RESET' }])).toEqual(s0)
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

describe('kuis per titik', () => {
  const questions = [q('q1', 'b-1'), q('q2', 'a-1', 1), q('q3', 'b-2')]
  const sources = { 'a-1': ref('a-1', 'a'), 'b-1': ref('b-1', 'b'), 'b-2': ref('b-2', 'b') }

  it('memilih soal milik materi', () => {
    expect(questionsFor('b', questions, sources).map((x) => x.id)).toEqual(['q1', 'q3'])
    expect(questionsFor('c', questions, sources)).toEqual([])
  })

  it('menghitung skor', () => {
    expect(quizScore(questions, [0, 1, 1])).toBe(2)
    expect(quizScore(questions, [null, null, null])).toBe(0)
  })
})
