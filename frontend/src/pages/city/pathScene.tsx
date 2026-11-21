/**
 * Hiasan latar path belajar (referensi desain Bandung, 21 Nov 2026).
 * - Bingkai: sudut dan sisi batik menempel di tepi kartu dan spanduk (tombol titik polos) (src/assets/budaya/).
 * - Adegan: pagar bambu + tanaman di dasar spanduk (di dalam, terpotong tepinya), elemen budaya per titik.
 * - Satu elemen budaya per titik (rumah Sunda, pemain angklung, wayang golek, gamelan).
 * - Penari merayakan saat semua titik selesai.
 * Semua hiasan dekoratif (aria-hidden), tidak bisa diklik; objek budaya hanya hiasan, bukan rintangan.
 * Aset tercatat di content/sources.yaml.
 */
import batikSisiKanan from '../../assets/budaya/batik-sisi-kanan.webp'
import batikSisiKiri from '../../assets/budaya/batik-sisi-kiri.webp'
import sudutKananAtas from '../../assets/budaya/batik-sudut-kanan-atas.webp'
import sudutKananBawah from '../../assets/budaya/batik-sudut-kanan-bawah.webp'
import sudutKiriAtas from '../../assets/budaya/batik-sudut-kiri-atas.webp'
import sudutKiriBawah from '../../assets/budaya/batik-sudut-kiri-bawah.webp'
import gamelan from '../../assets/budaya/gamelan.webp'
import pemainAngklung from '../../assets/budaya/pemain-angklung.webp'
import penari1 from '../../assets/budaya/penari-1.webp'
import penari2 from '../../assets/budaya/penari-2.webp'
import rumahSunda from '../../assets/budaya/rumah-sunda.webp'
import tanaman from '../../assets/budaya/tanaman.webp'
import wayangGolek from '../../assets/budaya/wayang-golek.webp'
import type { SyntheticEvent } from 'react'
import gedungSate from '../../game/sprites/scene/gedung-sate.webp'

interface Decor {
  src: string
  /** Tinggi tampil (px); lebar mengikuti rasio gambar. */
  height: number
  /** Geser vertikal (px, positif = turun) relatif ke dasar titik. */
  dy?: number
  /** Jarak dari titik (px). */
  gap?: number
  flip?: boolean
}

interface NodeDecor {
  left?: Decor[]
  right?: Decor[]
}

/** Hiasan per id titik path. Titik tanpa entri tampil polos. */
const PATH_DECOR: Record<string, NodeDecor> = {
  'pengenalan-bandung': {
    left: [{ src: rumahSunda, height: 132, dy: 30, gap: 36 }],
    right: [{ src: gedungSate, height: 92, dy: 10, gap: 48 }],
  },
  angklung: {
    left: [{ src: pemainAngklung, height: 110, dy: 14, gap: 26 }],
  },
  'wayang-golek': {
    right: [{ src: wayangGolek, height: 118, dy: 14, gap: 24 }],
  },
  'museum-sri-baduga': {
    left: [{ src: gamelan, height: 92, dy: 8, gap: 26 }],
  },
}

function DecorImg({ d, side }: { d: Decor; side: 'left' | 'right' }) {
  const gap = d.gap ?? 16
  return (
    <img
      src={d.src}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        // Gagal dengan anggun: hiasan hilang, path tetap utuh.
        e.currentTarget.style.display = 'none'
      }}
      className="pointer-events-none absolute w-auto max-w-none select-none pixel-art"
      style={{
        height: d.height,
        bottom: -(d.dy ?? 0),
        [side === 'left' ? 'right' : 'left']: `calc(100% + ${gap}px)`,
        transform: d.flip ? 'scaleX(-1)' : undefined,
      }}
    />
  )
}

/** Hiasan di kiri dan kanan sebuah titik; dipasang di dalam pembungkus `relative` titik. */
export function NodeScene({ nodeId }: { nodeId: string }) {
  const decor = PATH_DECOR[nodeId]
  if (!decor) return null
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
      {decor.left?.map((d, i) => (
        <DecorImg key={`l${i}`} d={d} side="left" />
      ))}
      {decor.right?.map((d, i) => (
        <DecorImg key={`r${i}`} d={d} side="right" />
      ))}
    </span>
  )
}

/** Rumpun bambu sederhana (digambar sendiri). */
export function Bamboo({ className }: { className?: string }) {
  const stalks = [
    { x: 18, h: 170, w: 9 },
    { x: 34, h: 200, w: 10 },
    { x: 50, h: 150, w: 8 },
  ]
  return (
    <svg aria-hidden="true" viewBox="0 0 80 210" className={className}>
      {stalks.map((s, i) => (
        <g key={i}>
          <rect x={s.x - s.w / 2} y={210 - s.h} width={s.w} height={s.h} rx={3} fill={i === 1 ? '#7fa64a' : '#94b85a'} />
          {Array.from({ length: Math.floor(s.h / 34) }, (_, k) => (
            <rect key={k} x={s.x - s.w / 2 - 1} y={210 - s.h + 30 + k * 34} width={s.w + 2} height={3} rx={1.5} fill="#5d7f33" />
          ))}
        </g>
      ))}
      {[
        [34, 22, -1],
        [34, 60, 1],
        [18, 52, -1],
        [50, 70, 1],
        [18, 96, -1],
        [50, 110, 1],
      ].map(([x, y, dir], i) => (
        <path
          key={i}
          d={`M${x} ${y} q ${dir * 14} -10 ${dir * 30} -4 q ${dir * -16} 8 ${dir * -30} 4Z`}
          fill={i % 2 ? '#6f9a3d' : '#8dbb55'}
        />
      ))}
    </svg>
  )
}

/** Ornamen piksel: tidak bisa diklik/dipilih, tetap tajam (`.pixel-art` = crisp-edges + pixelated). */
const PIXEL = 'pointer-events-none select-none pixel-art'

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  // Gagal dengan anggun: hiasan hilang, path tetap utuh.
  e.currentTarget.style.display = 'none'
}

/**
 * Sudut batik untuk bingkai kartu/spanduk. Dipasang DI DALAM kartu (`relative overflow-hidden/clip`)
 * dengan posisi 0 di sudutnya, sehingga ikut terpotong lengkung border; konten kartu diberi `relative z-10`.
 */
export function BatikCorner({
  corner = 'kanan-atas',
  className,
}: {
  corner?: 'kanan-atas' | 'kiri-atas' | 'kanan-bawah' | 'kiri-bawah'
  className?: string
}) {
  const src = {
    'kanan-atas': sudutKananAtas,
    'kiri-atas': sudutKiriAtas,
    'kanan-bawah': sudutKananBawah,
    'kiri-bawah': sudutKiriBawah,
  }[corner]
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={hideOnError}
      className={`${PIXEL} absolute z-0 ${className ?? ''}`}
    />
  )
}

/** Potongan sisi batik yang menempel di tepi kiri/kanan kartu. */
export function BatikEdge({ side, className }: { side: 'kiri' | 'kanan'; className?: string }) {
  return (
    <img
      src={side === 'kiri' ? batikSisiKiri : batikSisiKanan}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={hideOnError}
      className={`${PIXEL} absolute z-10 ${className ?? ''}`}
    />
  )
}

/**
 * Ilustrasi adegan (bukan border): deret pagar bambu dan tanaman hias, berulang mendatar.
 * Dipasang di dalam area yang memotongnya (mis. dasar spanduk), di bawah lapisan konten.
 */
export function PlantScene({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${PIXEL} block bg-bottom bg-repeat-x ${className ?? ''}`}
      style={{ backgroundImage: `url(${tanaman})`, backgroundSize: 'auto 100%' }}
    />
  )
}

/** Perayaan akhir: penari menari setelah semua titik (termasuk game) selesai. */
export function DancerFinale({ cityName }: { cityName: string }) {
  return (
    <section aria-labelledby="judul-tamat" className="mt-8 flex flex-col items-center text-center">
      <div aria-hidden="true" className="flex items-end justify-center gap-2 sm:gap-6">
        <img
          src={penari1}
          alt=""
          draggable={false}
          onError={hideOnError}
          className={`${PIXEL} anim-menari h-[130px] w-auto sm:h-[170px]`}
        />
        <img
          src={penari2}
          alt=""
          draggable={false}
          onError={hideOnError}
          className={`${PIXEL} anim-menari-2 h-[128px] w-auto sm:h-[166px]`}
        />
        <img
          src={penari1}
          alt=""
          draggable={false}
          onError={hideOnError}
          className={`${PIXEL} anim-menari-3 h-[130px] w-auto sm:h-[170px]`}
        />
      </div>
      <h2 id="judul-tamat" className="mt-3 text-xl font-extrabold text-teal">
        Hore, path {cityName} tamat!
      </h2>
      <p className="mt-1 max-w-sm text-sm text-redup">Para penari ikut merayakan. Semua titik dan game sudah kamu selesaikan.</p>
    </section>
  )
}
