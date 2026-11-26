import { useEffect, useRef } from 'react'
import { GRID_H, GRID_W, runnerFrame } from '../../game/runnerSprite'
import { stopAt, strideFrame, trackProgress } from './trackMath'

/**
 * Jalan setapak piksel di atas kartu titik budaya: pelari game (karakter milik tim) berjalan
 * mengikuti gulir dan menyalakan patok yang dilewati. Hiasan saja (aria-hidden), hanya di layar
 * lebar; dengan `prefers-reduced-motion` pelari diam di awal jalur.
 */
export default function StopsTrack({ count }: { count: number }) {
  const track = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = track.current
    const cv = canvas.current
    const section = el?.closest('section')
    const ctx = cv?.getContext('2d')
    if (!el || !cv || !section || !ctx) return
    const posts = Array.from(el.querySelectorAll<HTMLElement>('[data-patok]'))
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    const draw = (frame: number) => {
      const img = runnerFrame(frame, true)
      ctx.clearRect(0, 0, GRID_W, GRID_H)
      if (img) ctx.drawImage(img, 0, 0)
    }

    let raf = 0
    const paint = () => {
      raf = 0
      const r = section.getBoundingClientRect()
      const k = still ? 0 : trackProgress(r.top, r.height, window.innerHeight)
      const width = el.clientWidth - cv.clientWidth
      const x = k * width
      cv.style.transform = `translateX(${x}px)`
      draw(still ? 0 : strideFrame(x))
      posts.forEach((p, i) => {
        p.dataset.lewat = String(!still && k * 100 >= stopAt(i, posts.length))
      })
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint)
    }
    paint()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [count])

  if (count <= 0) return null
  return (
    <div ref={track} className="jalur-titik mt-10 hidden md:block" aria-hidden="true">
      <span className="jalur-titik-jalan" />
      <span className="jalur-titik-akhir" />
      {Array.from({ length: count }, (_, i) => (
        <span key={i} data-patok className="jalur-titik-patok" style={{ left: `${stopAt(i, count)}%` }}>
          {i + 1}
        </span>
      ))}
      <canvas ref={canvas} width={GRID_W} height={GRID_H} className="jalur-titik-pelari" />
    </div>
  )
}
