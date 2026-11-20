/**
 * Logo sementara Rupaloka: atap bertingkat bergaya bebas + titik emas.
 * Gambar orisinal; identitas visual final menunggu T-005.
 */
export function LogoMark({ className = 'size-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="currentColor" />
      <path d="M20 7.5 30 15H10z" fill="#f5f1e8" />
      <path d="M8 21 20 14.5 32 21H8z" fill="#e8b64c" />
      <rect x="11" y="21" width="18" height="10" rx="1.5" fill="#f5f1e8" />
      <path d="M17.5 31v-5a2.5 2.5 0 0 1 5 0v5" fill="currentColor" />
      <rect x="9" y="31" width="22" height="2.5" rx="1.25" fill="#8bb9a0" />
    </svg>
  )
}
