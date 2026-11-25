import { describe, expect, it } from 'vitest'
import type { QuizQuestion, SourceRef } from '../lib/api.types'
import { initialNode, missingParts, nodeComplete, nodeReducer, postQuestionsFor, questionsFor, quizCaps, quizScore, type NodeEvent, type NodeState } from './machine'

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

  it('kuis akhir setelah materi: lesson → post → done; lewati kuis akhir', () => {
    const r = nodeReducer(1, 2)
    let s = ([{ type: 'ANSWER', choice: 0 }, { type: 'NEXT' }, { type: 'FINISH_LESSON' }] as NodeEvent[]).reduce(r, initialNode(1, 2))
    expect(s).toMatchObject({ stage: 'post', index: 0, postAnswers: [null, null] })
    s = r(s, { type: 'NEXT' }) // belum dijawab
    expect(s.index).toBe(0)
    s = ([{ type: 'ANSWER', choice: 1 }, { type: 'NEXT' }, { type: 'ANSWER', choice: 0 }] as NodeEvent[]).reduce(r, s)
    expect(s.postAnswers).toEqual([1, 0])
    expect(s.answers).toEqual([0]) // kuis awal tidak berubah
    expect(r(s, { type: 'NEXT' }).stage).toBe('done')
    const atPost = { ...s, index: 0 }
    expect(r(atPost, { type: 'SKIP_QUIZ' }).stage).toBe('done')
  })

  it('tanpa kuis akhir, materi langsung ke hasil', () => {
    expect(run([{ type: 'SKIP_QUIZ' }, { type: 'FINISH_LESSON' }]).stage).toBe('done')
  })

  it('kejadian tidak relevan diabaikan; RESET ke awal', () => {
    const s0 = initialNode(2)
    expect(run([{ type: 'FINISH_LESSON' }], s0)).toBe(s0)
    expect(run([{ type: 'ANSWER', choice: 0 }, { type: 'RESET' }])).toEqual(s0)
  })
})

const q = (id: string, chunk: string, correct = 0, kind: QuizQuestion['kind'] = 'fakta'): QuizQuestion => ({
  id,
  kind,
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

  it('memisahkan skor dan batas per jenis soal (fakta / nilai)', () => {
    const intro = [q('f1', 'b-001'), q('f2', 'b-002', 1)]
    const outro = [q('n1', 'b-003', 0, 'nilai'), q('f3', 'b-004')]
    expect(quizScore(outro, [0, 0], 'nilai')).toBe(1)
    expect(quizScore(outro, [0, 0], 'fakta')).toBe(1)
    expect(quizScore(outro, [1, 0], 'nilai')).toBe(0)
    const src = {
      'b-001': ref('b-001', 'b'),
      'b-002': ref('b-002', 'b'),
      'b-003': ref('b-003', 'b'),
      'b-004': ref('b-004', 'b'),
    }
    // titik b: kuis awal 2 fakta, kuis akhir 1 nilai + 1 fakta -> fakta maks 2, nilai maks 1
    expect(quizCaps(['b', 'c'], { intro, outro }, src, 1)).toEqual({ facts: 2, values: 1, reflections: 1 })
  })
})

describe('postQuestionsFor', () => {
  const sources = { 'a-1': ref('a-1', 'a'), 'b-1': ref('b-1', 'b') }
  it('memakai soal outro milik titik bila ada', () => {
    const quiz = { intro: [q('q1', 'a-1')], outro: [q('o1', 'a-1'), q('o2', 'b-1')] }
    expect(postQuestionsFor('a', quiz, sources).map((x) => x.id)).toEqual(['o1'])
  })
  it('tanpa outro, mengulang soal kuis awal dengan urutan terbalik', () => {
    const quiz = { intro: [q('q1', 'a-1'), q('q2', 'b-1'), q('q3', 'a-1')], outro: [] }
    expect(postQuestionsFor('a', quiz, sources).map((x) => x.id)).toEqual(['q3', 'q1'])
    expect(quiz.intro.map((x) => x.id)).toEqual(['q1', 'q2', 'q3']) // tidak mengubah asli
  })
})

describe('syarat titik selesai', () => {
  const r = nodeReducer(1, 1)
  const answerNext: NodeEvent[] = [{ type: 'ANSWER', choice: 0 }, { type: 'NEXT' }]
  const go = (events: NodeEvent[]) => events.reduce(r, initialNode(1, 1))

  it('selesai bila kedua kuis dijawab dan video ditonton', () => {
    const s = go([...answerNext, { type: 'FINISH_LESSON', watched: true }, ...answerNext])
    expect(s.stage).toBe('done')
    expect(nodeComplete(s)).toBe(true)
    expect(missingParts(s)).toEqual([])
  })

  it('kuis dilewati → titik tidak selesai', () => {
    const s = go([{ type: 'SKIP_QUIZ' }, { type: 'FINISH_LESSON', watched: true }, ...answerNext])
    expect(s.stage).toBe('done')
    expect(nodeComplete(s)).toBe(false)
    expect(missingParts(s)).toEqual(['Kuis awal belum dijawab semua'])
  })

  it('materi dilewati tanpa menonton → titik tidak selesai', () => {
    const s = go([...answerNext, { type: 'FINISH_LESSON', watched: false }, { type: 'SKIP_QUIZ' }])
    expect(nodeComplete(s)).toBe(false)
    expect(missingParts(s)).toHaveLength(2)
  })

  it('belum sampai tahap hasil → belum selesai', () => {
    expect(nodeComplete(go(answerNext))).toBe(false)
  })
})
