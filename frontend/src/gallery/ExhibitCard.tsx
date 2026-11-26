import type { ExhibitOut, SourceRef } from '../lib/api.types'
import { ASAL_PENDING, PENDING_TEXT } from './labelText'


function SourceLine({ chunk, sources }: { chunk: string | null | undefined; sources: Record<string, SourceRef> }) {
  const src = chunk ? sources[chunk] : undefined
  if (!src) return null
  return (
    <p className="mt-1 text-xs text-redup">
      Sumber:{' '}
      {src.url ? (
        <a href={src.url} target="_blank" rel="noreferrer noopener" className="font-bold text-teal underline">
          {src.title}
          <span className="sr-only"> (membuka tab baru)</span>
        </a>
      ) : (
        <span className="font-bold">{src.title}</span>
      )}
    </p>
  )
}

/**
 * Isi kartu pameran: penjelasan singkat + cerita asal usul, masing-masing dengan sumbernya.
 * Teks hanya dari konten bersumber; kolom kosong ditampilkan jujur sebagai "sedang disusun".
 */
export default function ExhibitCard({
  exhibit,
  sources,
  canSpeak,
  onRead,
  onAsk,
}: {
  exhibit: ExhibitOut
  sources: Record<string, SourceRef>
  canSpeak: boolean
  onRead: () => void
  onAsk: () => void
}) {
  return (
    <div className="grid gap-4 text-tinta">
      <section aria-labelledby="kartu-penjelasan">
        <h3 id="kartu-penjelasan" className="eyebrow text-redup">
          Penjelasan singkat
        </h3>
        <p className={exhibit.short_explanation ? 'mt-1 leading-relaxed' : 'mt-1 italic text-redup'}>
          {exhibit.short_explanation ?? PENDING_TEXT}
        </p>
        <SourceLine chunk={exhibit.short_chunk} sources={sources} />
      </section>
      <section aria-labelledby="kartu-asal">
        <h3 id="kartu-asal" className="eyebrow text-redup">
          Asal usul
        </h3>
        <p className={exhibit.asal_usul ? 'mt-1 leading-relaxed' : 'mt-1 italic text-redup'}>
          {exhibit.asal_usul?.text ?? ASAL_PENDING}
        </p>
        <SourceLine chunk={exhibit.asal_usul?.chunk} sources={sources} />
      </section>
      {exhibit.model_src && (
        <p className="rounded-xl bg-pasir/60 px-3 py-2 text-xs text-redup">
          {exhibit.accuracy_by
            ? `Model 3D buatan tim, bentuknya dicek oleh ${exhibit.accuracy_by}.`
            : 'Model 3D buatan tim; bentuknya belum diperiksa tim budaya.'}
          {!exhibit.model_available && ' Model belum tersedia, yang tampil adalah pengganti.'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canSpeak && (
          <button type="button" onClick={onRead} className="tekan rounded-xl border border-emas/40 bg-white px-3 py-2 text-sm font-extrabold">
            Bacakan kartu
          </button>
        )}
        <button type="button" onClick={onAsk} className="tekan rounded-xl border border-emas/40 bg-emas px-3 py-2 text-sm font-extrabold">
          Tanya Saloka tentang {exhibit.name}
        </button>
      </div>
    </div>
  )
}
