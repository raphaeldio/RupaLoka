import { motion } from 'motion/react'
import type { Lesson, SourceRef } from '../lib/api.types'
import { labelOr } from '../lib/cities'
import LocationButton from './LocationButton'
import { Button, Card, ContentText, SafeImage, SourceChip } from './primitives'

/** Kartu materi (F-030–F-032): narasi, fakta kunci bersumber, gambar, tanya agen, lokasi asli. */
export default function LessonCard({
  lesson,
  eyebrow,
  sources,
  onAsk,
  onFinish,
  finishLabel = 'Selesai',
}: {
  lesson: Lesson
  /** Teks kecil di atas judul, mis. "Titik 2 · Materi". */
  eyebrow: string
  sources: Record<string, SourceRef>
  onAsk: (question: string) => void
  onFinish: () => void
  finishLabel?: string
}) {
  const image = lesson.images[0]
  return (
    <Card className="overflow-hidden p-0 sm:p-0">
      {image && <SafeImage image={image} className="aspect-[16/9] w-full" />}
      <div className="p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-redup">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-teal">{labelOr(lesson.title, 'Materi budaya')}</h2>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">
          <ContentText text={lesson.narrative} fallback="Narasi materi sedang ditulis dan diverifikasi tim konten." />
        </p>

        {lesson.key_facts.length > 0 && (
          <section className="mt-5" aria-label="Fakta kunci">
            <h3 className="text-sm font-extrabold">Fakta kunci</h3>
            <ul className="mt-2 grid gap-2">
              {lesson.key_facts.map((f, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl bg-kertas p-3 text-sm"
                >
                  <ContentText text={f.text} fallback="Fakta sedang diverifikasi." />
                  <div className="mt-2">
                    <SourceChip source={sources[f.chunk]} />
                  </div>
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        {lesson.suggested_questions.length > 0 && (
          <section className="mt-5" aria-label="Tanya pemandu">
            <h3 className="text-sm font-extrabold">Penasaran? Tanya pemandu</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {lesson.suggested_questions.map((q) => (
                <li key={q}>
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => onAsk(q)}
                    className="rounded-full border border-teal/40 bg-white px-3 py-1.5 text-sm font-semibold text-teal transition hover:bg-teal hover:text-white"
                  >
                    {q}
                  </motion.button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-5">
          <LocationButton location={lesson.location} />
        </div>

        {image && !image.license.includes('[PERLU DIISI]') && (
          <p className="mt-3 text-[11px] text-redup">Gambar: {image.license}</p>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onFinish}>{finishLabel}</Button>
        </div>
      </div>
    </Card>
  )
}
