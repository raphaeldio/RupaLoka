import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { VideoRef } from '../lib/api.types'
import { isWatched, recordWatch, requiredSeconds } from '../lib/watch'
import { youtubeEmbed, youtubeId } from '../lib/youtube'
import { loadYouTubeApi, YT_PLAYING, type YTPlayer } from '../lib/ytApi'

export interface WatchProgress {
  /** Detik dari jendela wajib yang sudah ditonton. */
  watched: number
  /** Detik wajib tonton (3 menit pertama, atau hampir seluruh video bila lebih pendek). */
  required: number
  done: boolean
}

/**
 * Pemutar video utama yang mengukur waktu tonton lewat YouTube IFrame API.
 * Bila API gagal dimuat, sematan biasa dipakai dan waktu dihitung selama tab terlihat (cadangan).
 */
function TrackedPlayer({ id, title, onProgress }: { id: string; title: string; onProgress?: (p: WatchProgress) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)
  const report = useRef(onProgress)
  useLayoutEffect(() => {
    report.current = onProgress
  })

  useEffect(() => {
    let seen: ReadonlySet<number> = new Set()
    let required = requiredSeconds(0)
    let player: YTPlayer | null = null
    let poll = 0
    let cancelled = false
    const emit = () => report.current?.({ watched: Math.min(seen.size, required), required, done: isWatched(seen, required) })

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host.current) return
        // Elemen dibuat manual: YT mengganti elemen ini dengan iframe, jadi jangan dikelola React.
        const el = document.createElement('div')
        el.className = 'absolute inset-0 size-full'
        host.current.appendChild(el)
        player = new YT.Player(el, {
          videoId: id,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: { rel: 0, autoplay: 1, playsinline: 1 },
        })
        poll = window.setInterval(() => {
          if (!player || typeof player.getPlayerState !== 'function') return
          required = requiredSeconds(player.getDuration())
          if (player.getPlayerState() !== YT_PLAYING) return
          const next = recordWatch(seen, player.getCurrentTime(), required)
          if (next !== seen) {
            seen = next
            emit()
          }
        }, 500)
        emit()
      })
      .catch(() => {
        if (cancelled) return
        setFallback(true)
        // Cadangan: hitung detik selama sematan terbuka dan tab terlihat.
        poll = window.setInterval(() => {
          if (document.visibilityState !== 'visible') return
          const next = recordWatch(seen, seen.size, required)
          if (next !== seen) {
            seen = next
            emit()
          }
        }, 1000)
        emit()
      })

    return () => {
      cancelled = true
      window.clearInterval(poll)
      try {
        player?.destroy()
      } catch {
        // pemutar sudah hilang
      }
    }
  }, [id])

  return (
    <div ref={host} className="absolute inset-0 size-full">
      {fallback && (
        <iframe
          src={`${youtubeEmbed(id)}&autoplay=1`}
          title={title}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
    </div>
  )
}

/**
 * Video materi: video pertama disematkan (dimuat setelah diklik, agar ringan dan tanpa cookie
 * sebelum diputar), video lain tampil sebagai tautan "tonton juga". Waktu tonton video pertama
 * dilaporkan lewat `onProgress` (syarat poin titik).
 */
export default function LessonVideos({ videos, onProgress }: { videos: VideoRef[]; onProgress?: (p: WatchProgress) => void }) {
  const [playing, setPlaying] = useState(false)
  const valid = videos.filter((v) => youtubeId(v.url))
  if (valid.length === 0) return null
  const [main, ...more] = valid
  const id = youtubeId(main.url) as string

  return (
    <section aria-label="Video materi">
      <div className="relative aspect-video w-full overflow-hidden bg-tinta">
        {playing ? (
          <TrackedPlayer id={id} title={main.title} onProgress={onProgress} />
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
