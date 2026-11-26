import { useEffect, useState } from 'react'
import './rotator.css'

/**
 * Nama kota berganti bergiliran (Bandung → Jakarta → ...): kata lama naik keluar,
 * kata baru naik masuk (animasi CSS). Kedua kata ditumpuk di sel grid yang sama, jadi
 * lebar mengikuti kata terpanjang selama transisi. Bila prefers-reduced-motion, kata tidak berganti.
 */
export default function CityRotator({ words, interval = 2200 }: { words: string[]; interval?: number }) {
  const [{ cur, prev, tick }, set] = useState({ cur: 0, prev: -1, tick: 0 })

  useEffect(() => {
    if (words.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(
      () => set((s) => ({ cur: (s.cur + 1) % words.length, prev: s.cur, tick: s.tick + 1 })),
      interval,
    )
    return () => window.clearInterval(id)
  }, [words.length, interval])

  // Kata terpanjang dipakai sebagai pengukur tak terlihat agar lebar dan baris judul tetap.
  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), '')

  return (
    <span className="relative -mb-[0.2em] inline-grid overflow-y-clip pb-[0.2em] align-bottom">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-nowrap">
        {longest}
      </span>
      {prev >= 0 && (
        <span
          key={`p${tick}`}
          className="rotator-keluar col-start-1 row-start-1 whitespace-nowrap"
          onAnimationEnd={() => set((s) => (s.tick === tick ? { ...s, prev: -1 } : s))}
        >
          {words[prev % words.length]}
        </span>
      )}
      <span key={`c${tick}`} className={`col-start-1 row-start-1 whitespace-nowrap ${tick > 0 ? 'rotator-masuk' : ''}`}>
        {words[cur % words.length]}
      </span>
    </span>
  )
}
