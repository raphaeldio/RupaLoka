import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { QuizQuestion, SourceRef } from '../lib/api.types'
import { Button, Card, ContentText, SourceChip } from './primitives'
import ClickSpark from './reactbits/ClickSpark'

const LETTERS = 'ABCDEFGH'

/** Satu soal kuis dasar (F-020, F-021): pilih jawaban → umpan balik + penjelasan + sumber. */
export function QuizCard({
  question,
  number,
  total,
  answer,
  source,
  onAnswer,
  onNext,
  onSkip,
}: {
  question: QuizQuestion
  number: number
  total: number
  answer: number | null
  source: SourceRef | undefined
  onAnswer: (choice: number) => void
  onNext: () => void
  onSkip: () => void
}) {
  const answered = answer !== null
  const correct = answer === question.correct
  const feedbackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (answered) feedbackRef.current?.focus()
  }, [answered])

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-redup">
          Soal {number} dari {total}
        </p>
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i < number ? 'bg-teal' : 'bg-pasir'}`} />
          ))}
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xl font-extrabold leading-snug text-tinta">
          <ContentText text={question.question} fallback="Soal sedang disiapkan tim konten." />
        </legend>
        <ClickSpark sparkColor={['#e8b64c', '#146b68', '#8bb9a0']} sparkCount={10} sparkRadius={26} sparkSize={11}>
        <ul className="mt-4 grid gap-2">
          {question.options.map((opt, i) => {
            const isChosen = answer === i
            const isRight = i === question.correct
            let tone = 'border-garis bg-white hover:border-teal'
            if (answered && isRight) tone = 'border-teal bg-teal-50'
            else if (answered && isChosen) tone = 'border-[#c0563f] bg-[#fbe9e4]'
            else if (answered) tone = 'border-garis bg-white opacity-70'
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={answered}
                  aria-pressed={isChosen}
                  onClick={() => onAnswer(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-semibold transition ${tone}`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pasir text-xs font-extrabold">
                    {LETTERS[i]}
                  </span>
                  <ContentText text={opt} fallback={`Pilihan ${LETTERS[i]} (segera hadir)`} />
                  {answered && isRight && <span className="ml-auto text-xs font-extrabold text-teal">Benar</span>}
                  {answered && isChosen && !isRight && (
                    <span className="ml-auto text-xs font-extrabold text-[#a8442f]">Pilihanmu</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        </ClickSpark>
      </fieldset>

      {answered && (
        <motion.div
          ref={feedbackRef}
          tabIndex={-1}
          role="status"
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={correct ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -5, 5, 0] }}
          transition={{ duration: 0.45 }}
          className={`mt-4 rounded-2xl p-4 outline-none ${correct ? 'bg-teal-50' : 'bg-amber-50'}`}
        >
          <p className={`font-extrabold ${correct ? 'text-teal' : 'text-amber'}`}>
            {correct ? 'Tepat sekali!' : 'Belum tepat, tidak apa-apa.'}
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            <ContentText text={question.explanation} fallback="Penjelasan sedang disiapkan tim konten." />
          </p>
          <div className="mt-3">
            <SourceChip source={source} label="Sumber" />
          </div>
        </motion.div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onSkip} className="px-2">
          Lewati kuis
        </Button>
        <Button onClick={onNext} disabled={!answered}>
          {number < total ? 'Soal berikutnya' : 'Lanjut ke materi'}
        </Button>
      </div>
    </Card>
  )
}
