/** Komponen kecil bersama: gambar aman, teks konten, chip sumber, tombol. */
import { forwardRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { assetUrl } from '../lib/api'
import SpotlightCard from './reactbits/SpotlightCard'
import { Button as UIButton } from './ui/button'
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
  const cls = 'inline-flex max-w-full items-center gap-1 rounded-sm border border-teal/40 bg-teal-50 px-2 py-1 font-mono text-[11px] font-bold text-teal'
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

type Variant = 'primary' | 'secondary' | 'ghost' | 'emas'
const VARIANTS = { primary: 'default', secondary: 'outline', ghost: 'ghost', emas: 'emas' } as const

/** Tombol Rupaloka = Button shadcn/ui dengan varian palet sendiri. */
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }
>(function Button({ variant = 'primary', ...rest }, ref) {
  return <UIButton ref={ref} type="button" variant={VARIANTS[variant]} {...rest} />
})

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border-2 border-tinta bg-white p-5 shadow-kartu sm:p-6 ${className ?? ''}`}>{children}</div>
}

/** Kartu dengan sorotan cahaya mengikuti kursor (React Bits SpotlightCard, palet Rupaloka). */
export function GlowCard({ children, className, ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <SpotlightCard
      theme="light"
      spotlightColor="#e8b64c"
      intensity={0.22}
      spotlightSize={260}
      borderGlow={0.8}
      className={`border-2 border-tinta !p-5 shadow-kartu sm:!p-6 ${className ?? ''}`}
      {...rest}
    >
      {children}
    </SpotlightCard>
  )
}
