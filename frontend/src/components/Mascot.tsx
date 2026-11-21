/**
 * Maskot pemandu (nama dan visual final: T-005).
 *
 * CARA MENGGANTI: taruh gambar maskot di `src/assets/maskot/` dengan nama
 * `maskot.svg` / `maskot.png` / `maskot.webp` / `maskot.gif`; komponen ini otomatis
 * memakainya. Gambar per suasana (opsional): `maskot-thinking.*`, `maskot-talking.*`.
 *
 * CARA MEMBUAT INTERAKTIF: komponen menerima `mood` ('idle' | 'thinking' | 'talking') dan
 * memasang `data-mood` untuk animasi CSS (lihat `mascot.css`). Untuk animasi
 * kompleks (Lottie/Rive/sprite), ganti isi komponen ini; pemanggil tidak perlu diubah.
 * Catat lisensi/atribusi maskot di content/sources.yaml (milik sendiri).
 */
import type { MascotMood } from '../lib/agentStore'
import './mascot.css'
import PixelMascot from './mascot/PixelMascot'

const files = import.meta.glob<string>('../assets/maskot/maskot*.{svg,png,webp,gif}', {
  query: '?url',
  import: 'default',
  eager: true,
})

function srcFor(mood: MascotMood): string | null {
  const pick = (name: string) => Object.entries(files).find(([path]) => /\/(maskot[^/]*)\.\w+$/.exec(path)?.[1] === name)?.[1]
  return pick(`maskot-${mood}`) ?? pick('maskot') ?? null
}

/** Maskot piksel bawaan (warna tema) bila belum ada berkas gambar di assets/maskot. */
function Pixel({ mood }: { mood: MascotMood }) {
  return <PixelMascot face={mood === 'thinking' ? 'thinking' : 'normal'} talking={mood === 'talking'} className="size-full" />
}

export default function Mascot({ mood = 'idle', className }: { mood?: MascotMood; className?: string }) {
  const src = srcFor(mood)
  return (
    <span data-mood={mood} className={`maskot inline-block ${className ?? ''}`}>
      {src ? <img src={src} alt="" className="size-full object-contain" draggable={false} /> : <Pixel mood={mood} />}
    </span>
  )
}
