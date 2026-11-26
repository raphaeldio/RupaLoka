/**
 * Animasi landing (GSAP + ScrollTrigger, redesain 25 Nov 2026).
 *
 * Elemen ditandai `data-anim` di JSX; hook ini hanya membaca penanda itu dalam `scope`.
 * Semua animasi memakai `gsap.from` sehingga konten tetap terbaca bila JS/animasi gagal,
 * hanya berjalan bila `prefers-reduced-motion: no-preference`, dan dibersihkan otomatis
 * saat komponen dilepas (useGSAP + matchMedia).
 *
 * Prinsip "heboh tapi terbaca": gerak besar hanya saat elemen masuk (sekali), lalu teks diam.
 * Efek yang terus bergerak (parallax, kemiringan pita berjalan) kecil dan tidak menggeser teks panjang.
 */
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { RefObject } from 'react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const q = (root: HTMLElement, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel))

/**
 * `deps`: ubah nilainya saat isi yang dimuat belakangan muncul (mis. data kota) agar kartu baru
 * ikut dianimasikan. Animasi masuk hero hanya diputar sekali.
 */
export function useLandingMotion(
  scope: RefObject<HTMLElement | null>,
  onChapter?: (label: string) => void,
  deps: unknown[] = [],
) {
  useGSAP(
    () => {
      const root = scope.current
      if (!root || typeof window.matchMedia !== 'function') return
      const mm = gsap.matchMedia()

      // Penanda bab untuk HUD tetap jalan juga saat gerak dikurangi (bukan animasi).
      for (const sec of q(root, '[data-chapter]')) {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && onChapter?.(sec.dataset.chapter ?? ''),
        })
      }

      /* ---------- Latar bersama: warna bergradasi antarbab (juga saat gerak dikurangi; bukan animasi) ---------- */
      const latar = root.querySelector<HTMLElement>('[data-alur-latar]')
      const bab = q(root, '[data-warna]')
      if (latar && bab.length) {
        let titik: { y: number; c: string }[] = []
        let terakhir = ''
        const ukur = () => {
          titik = bab.map((b) => ({ y: b.getBoundingClientRect().top + window.scrollY, c: b.dataset.warna ?? '#f6efdf' }))
        }
        const warnai = (scroll: number) => {
          const tengah = scroll + window.innerHeight * 0.55
          const zona = window.innerHeight * 0.4
          let i = -1
          for (let k = 0; k < titik.length; k++) if (titik[k].y <= tengah) i = k
          let c: string
          if (i < 0) c = titik[0].c
          else {
            const t = (tengah - titik[i].y) / zona
            const dari = i > 0 ? titik[i - 1].c : titik[i].c
            c = t >= 1 ? titik[i].c : (gsap.utils.interpolate(dari, titik[i].c, Math.max(0, t)) as string)
          }
          if (c !== terakhir) latar.style.backgroundColor = terakhir = c
        }
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onRefresh: (self) => {
            ukur()
            warnai(self.scroll())
          },
          onUpdate: (self) => warnai(self.scroll()),
        })
      }

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* ---------- Pita berjalan: miring mengikuti kecepatan gulir ---------- */
        const marquee = root.querySelector<HTMLElement>('[data-anim="marquee"]')
        if (marquee) {
          const skew = gsap.quickTo(marquee, 'skewX', { duration: 0.4, ease: 'power3' })
          ScrollTrigger.create({
            trigger: marquee,
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: (self) => skew(gsap.utils.clamp(-8, 8, self.getVelocity() / -250)),
            onLeave: () => skew(0),
            onLeaveBack: () => skew(0),
          })
        }

        /* ---------- Judul bab: nomor meletup, judul naik, teks menyusul ---------- */
        for (const ch of q(root, '[data-anim="chapter"]')) {
          gsap
            .timeline({
              defaults: { ease: 'power3.out' },
              scrollTrigger: { trigger: ch, start: 'top 82%', once: true },
            })
            .from(ch.querySelector('[data-anim-part="no"]'), { scale: 0, rotation: -90, duration: 0.45, ease: 'back.out(3)' })
            .from(
              ch.querySelector('[data-anim-part="pita"]'),
              { y: 34, autoAlpha: 0, duration: 0.7, ease: 'power4.out' },
              '-=0.2',
            )
            .from(ch.querySelector('[data-anim-part="lead"]'), { y: 20, autoAlpha: 0, duration: 0.5 }, '-=0.3')
        }

        // Ikon piksel di kartu level: "melompat" sekali saat terlihat.
        for (const icon of q(root, '[data-anim="pixel-icon"]')) {
          gsap.from(icon, {
            y: -30,
            scale: 0.6,
            duration: 0.8,
            ease: 'bounce.out',
            scrollTrigger: { trigger: icon, start: 'top 85%', once: true },
          })
        }

        /* ---------- Statistik peta: kotak meletup ---------- */
        gsap.from(q(root, '[data-anim="stat"]'), {
          scale: 0.6,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'back.out(2.5)',
          stagger: 0.12,
          scrollTrigger: { trigger: root.querySelector('[data-anim="stats"]'), start: 'top 90%', once: true },
        })

        /* ---------- Ajakan akhir: membesar mengikuti gulir, lalu tombol meletup ---------- */
        const cta = root.querySelector('[data-anim="cta-final"]')
        if (cta) {
          gsap.from(cta, {
            scale: 0.86,
            rotation: -2,
            ease: 'none',
            scrollTrigger: { trigger: cta, start: 'top bottom', end: 'top 55%', scrub: 0.5 },
          })
          gsap.from(cta.querySelectorAll('[data-anim-part="cta-btn"]'), {
            y: 20,
            scale: 0.8,
            autoAlpha: 0,
            duration: 0.5,
            ease: 'back.out(2.4)',
            stagger: 0.12,
            scrollTrigger: { trigger: cta, start: 'top 60%', once: true },
          })
        }
      })

      // Gambar/peta yang dimuat belakangan menggeser tata letak; hitung ulang posisi pemicu.
      const refresh = () => ScrollTrigger.refresh()
      window.addEventListener('load', refresh)
      return () => {
        window.removeEventListener('load', refresh)
        mm.revert()
      }
    },
    { scope },
  )

  // Kartu dibuat ulang saat isi yang dimuat belakangan muncul (deps berubah).
  useGSAP(
    () => {
      const root = scope.current
      if (!root || typeof window.matchMedia !== 'function') return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* ---------- Kartu: muncul bertumpuk per baris ---------- */
        gsap.set(q(root, '[data-anim="card"]'), { transformOrigin: '50% 100%' })
        ScrollTrigger.batch(q(root, '[data-anim="card"]'), {
          start: 'top 88%',
          once: true,
          interval: 0.12,
          onEnter: (batch) =>
            gsap.from(batch, {
              y: 70,
              rotation: (i: number) => (i % 2 ? 3 : -3),
              autoAlpha: 0,
              duration: 0.7,
              ease: 'back.out(1.6)',
              stagger: 0.12,
              overwrite: true,
              // Lepas transform setelah masuk agar efek angkat saat hover (CSS) berfungsi.
              clearProps: 'transform',
            }),
        })
      })
      ScrollTrigger.refresh()
      return () => mm.revert()
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  )
}
