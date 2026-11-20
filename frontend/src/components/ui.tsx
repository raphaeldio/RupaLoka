/** Komponen kecil bersama: gambar aman, teks konten, chip sumber, tombol. */
import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { assetUrl } from '../lib/api'
import type { ImageRef, SourceRef } from '../lib/api.types'
import { isPlaceholder } from '../lib/cities'

/** Teks dari konten; penanda [PERLU DIISI] tampil sebagai placeholder, bukan fakta. */
export function ContentText({ text, fallback, className }: { text: string | null | undefined; fallback: string; className?: string }) {
  if (isPlaceholder(text)) {
    return <span className={`italic text-redup ${className ?? ''}`}>{fallback}</span>
  }
  return <span className={className}>{text}</span>
}

/** Gambar konten; bila gagal dimuat atau belum ada, tampil placeholder (gagal dengan anggun). */
export function SafeImage({ image, className }: { image: ImageRef; className?: string }) {
  const [failed, setFailed] = useState(false)
  const alt = isPlaceholder(image.alt) ? '' : image.alt
  if (failed) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className={`grid place-items-center bg-pasir text-xs font-semibold text-redup ${className ?? ''}`}
      >
        <span aria-hidden="true">Gambar segera hadir</span>
      </div>
    )
  }
  return <img src={assetUrl(image.src)} alt={alt} onError={() => setFailed(true)} className={`object-cover ${className ?? ''}`} />
}

/** Rujukan sumber untuk satu chunk. */
export function SourceChip({ source, label }: { source: SourceRef | undefined; label?: string }) {
  const title = source && !isPlaceholder(source.title) ? source.title : 'Sumber sedang diverifikasi'
  const cls = 'inline-flex max-w-full items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal'
  const body = (
    <>
      <span aria-hidden="true">📖</span>
      <span className="truncate">
        {label ? `${label}: ` : ''}
        {title}
      </span>
    </>
  )
  if (source?.url) {
    return (
      <a href={source.url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:bg-teal hover:text-white`}>
        {body}
      </a>
    )
  }
  return <span className={cls}>{body}</span>
}

type Variant = 'primary' | 'secondary' | 'ghost'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-teal text-white shadow-melayang hover:bg-teal-600',
  secondary: 'border border-garis bg-white text-teal hover:border-teal',
  ghost: 'text-redup hover:text-teal',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }
>(function Button({ variant = 'primary', className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className ?? ''}`}
    >
      {children}
    </button>
  )
})

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-garis bg-white p-5 shadow-kartu sm:p-6 ${className ?? ''}`}>{children}</div>
}
