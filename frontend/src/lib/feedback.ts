/**
 * Tautan "Beri masukan" ke Google Form (masukan juri, 25 Nov 2026): ruang bagi masyarakat
 * dan komunitas pemilik budaya untuk memberi saran atau koreksi atas kartu dan materi.
 *
 * VITE_FEEDBACK_FORM_URL   URL form (https://docs.google.com/forms/d/e/.../viewform). Kosong = tombol disembunyikan.
 * VITE_FEEDBACK_FORM_ENTRY id isian otomatis, mis. "entry.123456789" (opsional): diisi "<kota> / <judul> (<id>)".
 */

export interface FeedbackTarget {
  cityId: string
  /** id item atau materi yang dimaksud. */
  id: string
  title: string
}

export function feedbackUrl(
  target: FeedbackTarget,
  formUrl: string | undefined = import.meta.env.VITE_FEEDBACK_FORM_URL,
  entry: string | undefined = import.meta.env.VITE_FEEDBACK_FORM_ENTRY,
): string | null {
  const base = formUrl?.trim()
  if (!base) return null
  let url: URL
  try {
    url = new URL(base)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const field = entry?.trim()
  if (field && /^entry\.\d+$/.test(field)) {
    url.searchParams.set('usp', 'pp_url')
    url.searchParams.set(field, `${target.cityId} / ${target.title} (${target.id})`)
  }
  return url.toString()
}
