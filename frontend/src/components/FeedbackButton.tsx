import { feedbackUrl, type FeedbackTarget } from '../lib/feedback'

/** Tautan "Beri masukan" (Google Form di tab baru). Tidak tampil bila URL form belum diatur. */
export default function FeedbackButton({ target, className }: { target: FeedbackTarget; className?: string }) {
  const href = feedbackUrl(target)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded-full border border-garis bg-white px-3 py-1.5 text-xs font-extrabold text-redup transition hover:border-teal hover:text-teal ${className ?? ''}`}
    >
      <span aria-hidden="true">💬</span>
      Beri masukan
      <span className="sr-only">tentang {target.title} (membuka tab baru)</span>
    </a>
  )
}
