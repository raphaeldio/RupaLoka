import { useEffect, useRef } from 'react'
import { fillTemplate } from '../lib/api'
import type { Item, SourceRef } from '../lib/api.types'
import { isPlaceholder, labelOr } from '../lib/cities'
import { Button, SafeImage, SourceChip } from './ui'

/**
 * Item budaya terbuka (F-012, F-043): gambar, nama, penjelasan singkat bersumber,
 * "Tanya lebih lanjut", "Lanjut". Game tetap dijeda selama modal terbuka.
 */
export default function ItemModal({
  item,
  number,
  total,
  template,
  source,
  onAsk,
  onContinue,
}: {
  item: Item
  number: number
  total: number
  template: string
  source: SourceRef | undefined
  onAsk: () => void
  onContinue: () => void
}) {
  const continueRef = useRef<HTMLButtonElement>(null)
  useEffect(() => continueRef.current?.focus(), [])

  const explanation = isPlaceholder(item.short_explanation)
    ? 'Penjelasan item ini sedang disiapkan tim konten.'
    : item.short_explanation
  const text = isPlaceholder(template)
    ? `Kamu menemukan ${labelOr(item.name, 'item budaya')}! ${explanation}`
    : fillTemplate(template, { item: labelOr(item.name, 'item budaya'), short_explanation: explanation })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-judul"
      aria-describedby="item-teks"
      className="mt-3 sm:absolute sm:inset-0 sm:z-20 sm:mt-0 sm:grid sm:place-items-center sm:rounded-3xl sm:bg-tinta/45 sm:p-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onContinue()
        e.stopPropagation()
      }}
    >
      <div className="w-full rounded-3xl border border-garis bg-white p-5 shadow-melayang sm:max-h-full sm:max-w-sm sm:overflow-y-auto sm:border-0 motion-safe:animate-[card-in_260ms_ease-out]">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-amber">
          Item budaya {number} dari {total}
        </p>
        <h2 id="item-judul" className="mt-1 text-2xl font-extrabold text-teal">
          {labelOr(item.name, 'Item budaya')}
        </h2>
        <SafeImage image={item.image} className="mt-3 aspect-square w-28 rounded-2xl" />
        <p id="item-teks" className="mt-3 text-[15px] leading-relaxed">
          {text}
        </p>
        <div className="mt-3">
          <SourceChip source={source} label="Sumber" />
        </div>
        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <Button variant="secondary" onClick={onAsk}>
            Tanya lebih lanjut
          </Button>
          <Button ref={continueRef} onClick={onContinue}>
            Lanjut
          </Button>
        </div>
      </div>
    </div>
  )
}
