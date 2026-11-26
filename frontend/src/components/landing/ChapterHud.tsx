import { useEffect, useRef } from 'react'

/**
 * Penanda bab di pojok bawah landing ("BAB 02 · PILIH KOTA") dengan satu segmen per bab.
 * Segmen terisi mengikuti posisi gulir di bab itu (gaya bilah bersegmen dari referensi desain tim,
 * dipindah dari header ke HUD). Gaya ditulis langsung tiap frame agar menggulir tidak me-render ulang.
 * Hanya hiasan: disembunyikan dari pembaca layar dan di layar kecil.
 */
export default function ChapterHud({ label }: { label: string }) {
  const bar = useRef<HTMLSpanElement>(null)
  const shown = label !== ''

  useEffect(() => {
    if (!shown) return
    const root = bar.current
    if (!root) return
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
    // Satu segmen per bab yang benar-benar ada di halaman.
    root.replaceChildren(
      ...sections.map(() => {
        const seg = document.createElement('span')
        seg.className = 'hud-segmen'
        seg.appendChild(document.createElement('span'))
        return seg
      }),
    )
    const fills = Array.from(root.querySelectorAll<HTMLElement>('.hud-segmen > span'))
    let frame = 0
    const paint = () => {
      frame = 0
      const eye = window.innerHeight * 0.55
      sections.forEach((sec, i) => {
        const r = sec.getBoundingClientRect()
        const k = r.height > 0 ? (eye - r.top) / r.height : 0
        const v = Math.min(1, Math.max(0, k))
        fills[i].style.transform = `scaleY(${v})`
        // Bab yang sudah lewat diwarnai teal; tulis hanya bila berubah.
        const penuh = v >= 1
        const seg = fills[i].parentElement
        if (seg && seg.hasAttribute('data-penuh') !== penuh) seg.toggleAttribute('data-penuh', penuh)
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    paint()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [shown])

  if (!label) return null
  const [no, name] = label.split(' · ')
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-4 left-4 z-40 hidden items-center gap-3 rounded-full bg-white/92 py-1.5 pl-1.5 pr-4 shadow-[0_12px_30px_-12px_rgb(14_77_75/0.45)] ring-1 ring-emas/40 md:flex"
    >
      <span className="rounded-full bg-teal-800 px-3.5 py-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-white">
        Bab {no}
      </span>
      <span key={label} className="text-[14px] font-bold text-tinta motion-safe:animate-[card-in_240ms_ease-out]">
        {name}
      </span>
      <span ref={bar} className="flex gap-1.5" />
    </div>
  )
}
