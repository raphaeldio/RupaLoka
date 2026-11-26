/**
 * Gulir halus landing (Lenis + GSAP ScrollTrigger, 26 Nov 2026).
 *
 * Lenis menghaluskan roda tetikus/trackpad sehingga alur bab ke bab terasa menyambung; posisi
 * gulir tetap gulir asli (sticky, tautan #, pembaca layar tetap bekerja). Lenis digerakkan oleh
 * ticker GSAP agar ScrollTrigger diperbarui di frame yang sama (tanpa getar). Sentuh di ponsel
 * memakai gulir asli. Tidak aktif bila `prefers-reduced-motion: reduce`.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect } from 'react'

gsap.registerPlugin(ScrollTrigger)

let aktif: Lenis | null = null

export function useGulirHalus() {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ autoRaf: false, lerp: 0.11, wheelMultiplier: 1 })
    aktif = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
      if (aktif === lenis) aktif = null
    }
  }, [])
}

/** Gulir ke elemen; lewat Lenis bila aktif (agar tidak bertabrakan dengan gulir halus bawaan). */
export function gulirKe(el: HTMLElement, offset = -88) {
  if (aktif) aktif.scrollTo(el, { offset, duration: 1.2 })
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
