import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Layar penuh lewat Fullscreen API untuk SELURUH halaman (bukan hanya kanvas), agar panel
 * chat Saloka dan kartu tetap tampil. Tidak didukung (mis. iPhone Safari) = tombol disembunyikan;
 * galeri tetap memenuhi viewport.
 */
export function useFullscreen() {
  const supported = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled)
  const [active, setActive] = useState(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement))

  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      // keluar galeri = keluar layar penuh
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [])

  const toggle = useCallback(() => {
    if (!supported) return
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void document.documentElement.requestFullscreen().catch(() => {})
  }, [supported])

  return useMemo(() => ({ supported, active, toggle }), [supported, active, toggle])
}
