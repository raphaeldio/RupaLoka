/**
 * Hiasan latar path belajar (referensi desain Bandung, 21 Nov 2026): ilustrasi piksel milik tim
 * di kiri/kanan titik, bambu di samping spanduk, dan ornamen awan di sudut kartu.
 * Semua hiasan bersifat dekoratif (aria-hidden), tidak bisa diklik, dan disembunyikan di layar sempit.
 * Aset: content/sources.yaml (rumah adat, Gedung Sate, NPC angklung/wayang). Objek budaya hanya hiasan.
 */
import npcAngklung from '../../game/sprites/npc-angklung.png'
import npcAngklung2 from '../../game/sprites/npc-angklung-2.png'
import npcWayang from '../../game/sprites/npc-wayang.png'
import gedungSate from '../../game/sprites/scene/gedung-sate.webp'
import rumahAdat from '../../game/sprites/scene/rumah-adat.webp'

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
    left: [{ src: rumahAdat, height: 170, dy: 36, gap: 40 }],
    right: [{ src: gedungSate, height: 96, dy: 10, gap: 56 }],
  },
  angklung: {
    left: [{ src: npcAngklung, height: 96, dy: 8, gap: 14 }],
    right: [{ src: npcAngklung2, height: 96, dy: 8, gap: 14, flip: true }],
  },
  'wayang-golek': {
    right: [{ src: npcWayang, height: 104, dy: 8, gap: 10 }],
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
      className="pointer-events-none absolute w-auto max-w-none select-none [image-rendering:pixelated]"
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

/** Ornamen awan berulir untuk sudut kartu (digambar sendiri, bukan salinan motif tertentu). */
export function CloudOrnament({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 70" className={className}>
      <g fill="#f1e3cf" stroke="#8a5534" strokeWidth="3" strokeLinejoin="round">
        <path d="M8 58 C8 44 22 38 32 44 C34 28 54 22 64 34 C70 20 94 20 98 38 C112 36 118 52 108 60 Z" />
        <path d="M24 58 C24 50 32 46 40 50 C44 40 58 40 62 50 C68 44 80 46 82 56 Z" fill="#e7d2b4" />
      </g>
      <g fill="none" stroke="#8a5534" strokeWidth="2.5" strokeLinecap="round">
        <path d="M44 34 c6 -6 14 -2 12 5 c-1 4 -7 4 -7 0" />
        <path d="M76 32 c6 -6 14 -2 12 5 c-1 4 -7 4 -7 0" />
      </g>
    </svg>
  )
}
