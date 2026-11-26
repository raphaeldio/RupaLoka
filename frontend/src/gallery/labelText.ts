/**
 * Pemotongan teks untuk label kotak putih pedestal (digambar ke kanvas). Murni dan diuji;
 * `measure` diberikan pemanggil (mis. `ctx.measureText(t).width`).
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (t: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (measure(next) <= maxWidth || !line) {
      line = next
    } else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last && measure(`${last}…`) > maxWidth) last = last.split(' ').slice(0, -1).join(' ')
  kept[maxLines - 1] = `${last}…`
  return kept
}

/** Teks kotak putih: penjelasan singkat bersumber, atau keterangan pending yang jujur. */
export const PENDING_TEXT = 'Penjelasan sedang disusun tim budaya.'

export const ASAL_PENDING = 'Cerita asal usul sedang disusun tim budaya.'

/** Teks kartu untuk dibacakan suara pemandu (urutan sama dengan tampilan kartu). */
export function cardSpeech(ex: {
  name: string
  short_explanation?: string | null
  asal_usul?: { text: string } | null
}): string {
  return [ex.name + '.', ex.short_explanation ?? PENDING_TEXT, 'Asal usul.', ex.asal_usul?.text ?? ASAL_PENDING].join(' ')
}
