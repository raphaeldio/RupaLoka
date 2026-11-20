import { useEffect, useRef, useState } from 'react'

/**
 * Tandai elemen "tampil" saat masuk viewport (animasi muncul saat gulir).
 * Tanpa IntersectionObserver (jsdom, peramban lama) elemen langsung tampil.
 */
export function useReveal<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown, threshold])

  return [ref, shown] as const
}
