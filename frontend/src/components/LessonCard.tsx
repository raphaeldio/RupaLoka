import { motion } from 'motion/react'
import { useState } from 'react'
import type { Lesson, SourceRef } from '../lib/api.types'
import { labelOr } from '../lib/cities'
import { featureFlags } from '../lib/flags'
import { formatClock, MIN_WATCH_SECONDS } from '../lib/watch'
import { youtubeId } from '../lib/youtube'
import LessonVideos, { type WatchProgress } from './LessonVideos'
import FeedbackButton from './FeedbackButton'
import LocationButton from './LocationButton'
import { Button, Card, ContentText, SafeImage, SourceChip } from './primitives'

/** Kartu materi (F-030–F-032): video, narasi, fakta kunci bersumber, tanya agen, lokasi asli. Gambar hanya bila tak ada video. */
export default function LessonCard({
  lesson,
  eyebrow,
  sources,
  onAsk,
  onFinish,
  finishLabel = 'Selesai',
  cityId,
}: {
  lesson: Lesson
  /** Teks kecil di atas judul, mis. "Titik 2 · Materi". */
  eyebrow: string
  sources: Record<string, SourceRef>
  onAsk: (question: string) => void
  /** `watched` = syarat tonton terpenuhi (selalu true bila materi tanpa video). */
  onFinish: (watched: boolean) => void
  finishLabel?: string
  /** Untuk tautan "Beri masukan" (tidak tampil bila kosong). */
  cityId?: string
}) {
  const hasVideo = lesson.videos.length > 0
  // Syarat tonton 3 menit hanya bila flag aktif (disembunyikan di MVP).
  const mustWatch = featureFlags.strict_node_requirements && lesson.videos.some((v) => youtubeId(v.url))
  const [watch, setWatch] = useState<WatchProgress>({ watched: 0, required: MIN_WATCH_SECONDS, done: false })
  const watched = !mustWatch || watch.done
  const image = hasVideo ? undefined : lesson.images[0]
  return (
    <Card className="overflow-hidden p-0 sm:p-0">
      {hasVideo && <LessonVideos videos={lesson.videos} onProgress={setWatch} />}
      {image && <SafeImage image={image} className="aspect-[16/9] w-full" />}
      <div className="p-5 sm:p-6">
        <p className="eyebrow text-redup">
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
                  className="border border-emas/40 bg-kertas p-3 text-sm rounded-2xl"
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
                    className="tekan border border-emas/40 bg-white px-3 py-1.5 text-sm font-semibold text-teal shadow-tekan hover:bg-teal hover:text-white rounded-full"
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
        {cityId && (
          <div className="mt-3 flex justify-end">
            <FeedbackButton target={{ cityId, id: lesson.id, title: labelOr(lesson.title, 'Materi budaya') }} />
          </div>
        )}

        {image && !image.license.includes('[PERLU DIISI]') && (
          <p className="mt-3 text-[11px] text-redup">Gambar: {image.license}</p>
        )}

        {mustWatch && (
          <div className="mt-6 border border-emas/40 bg-kertas p-3 rounded-2xl" role="status" aria-live="polite">
            <p className="text-sm font-bold">
              {watched
                ? 'Mantap, video sudah ditonton. Poin titik ini bisa kamu dapat!'
                : `Tonton video minimal ${formatClock(watch.required)} pertama untuk mendapat poin.`}
            </p>
            <div
              className="mt-2 h-3 overflow-hidden border border-emas/40 bg-white rounded-2xl"
              role="progressbar"
              aria-label="Waktu tonton video"
              aria-valuemin={0}
              aria-valuemax={watch.required}
              aria-valuenow={watch.watched}
            >
              <div
                className="h-full bg-teal transition-[width] duration-500"
                style={{ width: `${watched ? 100 : Math.round((watch.watched / watch.required) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs tabular-nums text-redup">
              {formatClock(watch.watched)} / {formatClock(watch.required)} · melompati video tidak dihitung
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {!watched && (
            <Button variant="ghost" onClick={() => onFinish(false)}>
              Lewati materi (tanpa poin)
            </Button>
          )}
          <Button onClick={() => onFinish(true)} disabled={!watched}>
            {finishLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}
