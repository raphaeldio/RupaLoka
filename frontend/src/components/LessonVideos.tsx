import { useState } from 'react'
import type { VideoRef } from '../lib/api.types'
import { youtubeEmbed, youtubeId } from '../lib/youtube'

/**
 * Video materi: video pertama disematkan (dimuat setelah diklik, agar ringan dan tanpa cookie
 * sebelum diputar), video lain tampil sebagai tautan "tonton juga".
 */
export default function LessonVideos({ videos }: { videos: VideoRef[] }) {
  const [playing, setPlaying] = useState(false)
  const valid = videos.filter((v) => youtubeId(v.url))
  if (valid.length === 0) return null
  const [main, ...more] = valid
  const id = youtubeId(main.url) as string

  return (
    <section aria-label="Video materi">
      <div className="relative aspect-video w-full overflow-hidden bg-tinta">
        {playing ? (
          <iframe
            src={`${youtubeEmbed(id)}&autoplay=1`}
            title={main.title}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Putar video: ${main.title}`}
            className="group absolute inset-0 grid place-items-center"
          >
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover opacity-80 transition group-hover:opacity-95"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="relative grid size-16 place-items-center rounded-full bg-white/95 text-teal shadow-melayang transition group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 size-7" aria-hidden="true">
                <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <p className="px-5 pt-3 text-xs text-redup sm:px-6">
        Video: <span className="font-bold text-tinta">{main.title}</span> · {main.channel} ·{' '}
        <a href={main.url} target="_blank" rel="noopener noreferrer" className="font-bold text-teal hover:underline">
          buka di YouTube
        </a>
      </p>
      {more.length > 0 && (
        <div className="px-5 pt-2 sm:px-6">
          <p className="text-xs font-extrabold text-redup">Tonton juga</p>
          <ul className="mt-1 grid gap-1">
            {more.map((v) => (
              <li key={v.url} className="text-sm">
                <a href={v.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal hover:underline">
                  ▶ {v.title}
                </a>
                <span className="text-xs text-redup"> · {v.channel}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
