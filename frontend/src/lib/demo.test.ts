import { describe, expect, it } from 'vitest'
import { detailFixture } from '../test/fixtures'
import { questionsFor } from '../flow/machine'
import { demoEnabled, withDemoQuiz } from './demo'

describe('mode uji kuis', () => {
  it('memberi 2 soal uji per titik materi, jawaban benar valid', () => {
    const d = withDemoQuiz(detailFixture)
    for (const l of d.lessons) {
      const qs = questionsFor(l.id, d.quiz.intro, d.sources)
      expect(qs).toHaveLength(2)
      for (const q of qs) {
        expect(q.question).toMatch(/^\[Soal uji\]/)
        expect(q.correct).toBeGreaterThanOrEqual(0)
        expect(q.correct).toBeLessThan(q.options.length)
      }
    }
    expect(new Set(d.quiz.intro.map((q) => q.id)).size).toBe(d.quiz.intro.length)
  })

  it('flag dari URL bertahan di sesi dan dapat dimatikan', () => {
    sessionStorage.clear()
    expect(demoEnabled('')).toBe(false)
    expect(demoEnabled('?demo=1')).toBe(true)
    expect(demoEnabled('')).toBe(true)
    expect(demoEnabled('?demo=0')).toBe(false)
  })
})
