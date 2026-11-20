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

const files = import.meta.glob<string>('../assets/maskot/maskot*.{svg,png,webp,gif}', {
  query: '?url',
  import: 'default',
  eager: true,
})

function srcFor(mood: MascotMood): string | null {
  const pick = (name: string) => Object.entries(files).find(([path]) => /\/(maskot[^/]*)\.\w+$/.exec(path)?.[1] === name)?.[1]
  return pick(`maskot-${mood}`) ?? pick('maskot') ?? null
}

/** Wajah sementara (orisinal, sederhana) sampai gambar maskot tersedia. */
function Placeholder({ mood }: { mood: MascotMood }) {
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
      <circle cx="32" cy="34" r="26" fill="#146b68" />
      <circle cx="32" cy="34" r="26" fill="none" stroke="#e8b64c" strokeWidth="3" />
      <ellipse cx="23" cy="31" rx="3.2" ry={mood === 'thinking' ? 1.6 : 3.6} fill="#fff" />
      <ellipse cx="41" cy="31" rx="3.2" ry={mood === 'thinking' ? 1.6 : 3.6} fill="#fff" />
      {mood === 'talking' ? (
        <ellipse cx="32" cy="43" rx="5" ry="4" fill="#fff" />
      ) : (
        <path d="M24 42c4 4 12 4 16 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      )}
      <circle cx="17" cy="39" r="3" fill="#e8b64c" opacity=".55" />
      <circle cx="47" cy="39" r="3" fill="#e8b64c" opacity=".55" />
    </svg>
  )
}

export default function Mascot({ mood = 'idle', className }: { mood?: MascotMood; className?: string }) {
  const src = srcFor(mood)
  return (
    <span data-mood={mood} className={`maskot inline-block ${className ?? ''}`}>
      {src ? <img src={src} alt="" className="size-full object-contain" draggable={false} /> : <Placeholder mood={mood} />}
    </span>
  )
}
