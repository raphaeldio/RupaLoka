/**
 * Kepala halaman bergaya landing (26 Nov 2026): label pil dengan bintang emas, judul teal tebal
 * dengan kata aksen emas. Dipakai halaman di luar beranda agar nuansanya sama.
 */
export default function PageHeading({ chip, title, accent }: { chip: string; title: string; accent?: string }) {
  return (
    <>
      <p className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-teal-800 shadow-[0_8px_20px_-10px_rgb(14_77_75/0.35)] ring-1 ring-emas/30">
        <svg viewBox="0 0 16 16" className="size-3.5 text-emas" aria-hidden="true">
          <path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z" fill="currentColor" />
        </svg>
        {chip}
      </p>
      <h1 className="mt-4 text-[34px] font-black leading-[1.06] tracking-[-0.015em] text-teal-800 sm:text-[46px]">
        {title}
        {accent && <> <span className="teks-emas">{accent}</span></>}
      </h1>
    </>
  )
}
