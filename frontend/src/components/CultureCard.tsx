import type { CardAspect, Item, SourceRef } from '../lib/api.types'
import { isPlaceholder, labelOr } from '../lib/cities'
import FeedbackButton from './FeedbackButton'
import { SourceChip } from './primitives'

const ASPECTS: { key: 'nilai' | 'pengetahuan' | 'ekspresi' | 'fungsi'; label: string; hint: string }[] = [
  { key: 'nilai', label: 'Nilai', hint: 'Makna dan sikap yang diajarkan' },
  { key: 'pengetahuan', label: 'Pengetahuan', hint: 'Apa yang diketahui dan diwariskan' },
  { key: 'ekspresi', label: 'Ekspresi', hint: 'Bagaimana budaya ini ditampilkan' },
  { key: 'fungsi', label: 'Fungsi', hint: 'Kegunaannya bagi masyarakat' },
]

const PENDING = 'Sedang disusun tim budaya.'

const filled = (a: CardAspect | null | undefined): a is CardAspect => !!a && !isPlaceholder(a.text)

/**
 * Kartu budaya lengkap (masukan juri, 25 Nov 2026): nilai, pengetahuan, ekspresi, fungsi,
 * asal komunitas, rujukan utama, dan validator. Bagian yang belum diisi tim budaya tampil
 * sebagai placeholder, bukan teks karangan.
 */
export default function CultureCard({
  item,
  cityId,
  sources,
  compact,
}: {
  item: Item
  cityId: string
  sources: Record<string, SourceRef>
  /** Tampilan ringkas (mis. di modal game): judul aspek dan teks lebih kecil. */
  compact?: boolean
}) {
  const card = item.card
  const name = labelOr(item.name, 'Item budaya')
  const aspects = [...ASPECTS.map((a) => card?.[a.key]), card?.community].filter(filled)
  // Rujukan utama: sumber unik dari chunk tiap aspek, ditambah sumber item.
  const refIds = [...new Set([...aspects.map((a) => a.chunk), item.chunk])]
  const refs = refIds.map((id) => sources[id]).filter((s): s is SourceRef => !!s)
  const uniqueRefs = refs.filter((s, i) => refs.findIndex((o) => o.title === s.title && o.url === s.url) === i)
  const validator = card?.validator && !isPlaceholder(card.validator.name) ? card.validator : null
  const text = compact ? 'text-[13px]' : 'text-sm'

  return (
    <div className="grid gap-3">
      {filled(card?.community) ? (
        <p className={`${text} font-bold text-amber`}>{card.community.text}</p>
      ) : (
        <p className={`${text} italic text-redup`}>Asal komunitas: {PENDING.toLowerCase()}</p>
      )}

      <dl className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {ASPECTS.map(({ key, label, hint }) => {
          const a = card?.[key]
          return (
            <div key={key} className="border border-emas/40 bg-kertas p-3 rounded-2xl">
              <dt className="eyebrow text-teal">
                {label}
                <span className="sr-only"> ({hint})</span>
              </dt>
              <dd className={`mt-1 ${text} leading-relaxed`}>
                {filled(a) ? a.text : <span className="italic text-redup">{PENDING}</span>}
              </dd>
            </div>
          )
        })}
      </dl>

      <div>
        <p className="text-xs font-extrabold text-redup">Rujukan utama</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {uniqueRefs.length > 0 ? (
            uniqueRefs.map((s) => (
              <li key={s.chunk_id}>
                <SourceChip source={s} />
              </li>
            ))
          ) : (
            <li className="text-xs italic text-redup">Sumber sedang diverifikasi.</li>
          )}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-redup">
          {validator ? (
            <>
              Divalidasi oleh <strong className="text-tinta">{validator.name}</strong>
              {validator.role ? `, ${validator.role}` : ''}
            </>
          ) : (
            'Menunggu validasi budayawan.'
          )}
        </p>
        <FeedbackButton target={{ cityId, id: item.id, title: name }} />
      </div>
    </div>
  )
}
