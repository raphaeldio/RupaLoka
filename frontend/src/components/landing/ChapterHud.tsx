/**
 * Penanda bab di pojok bawah landing ("BAB 02 · PILIH KOTA" + kotak kemajuan), mengikuti
 * bagian yang sedang dibaca. Hanya hiasan: disembunyikan dari pembaca layar dan di layar kecil.
 */
const TOTAL = 7 // bab 00–06

export default function ChapterHud({ label }: { label: string }) {
  if (!label) return null
  const [no, name] = label.split(' · ')
  const idx = Number(no)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-4 left-4 z-40 hidden items-center gap-3 md:flex"
    >
      <span className="eyebrow border-2 border-tinta bg-teal px-2 py-1 text-white shadow-tekan">Bab {no}</span>
      <span key={label} className="eyebrow border-2 border-tinta bg-white px-2 py-1 text-tinta shadow-tekan motion-safe:animate-[card-in_240ms_ease-out]">
        {name}
      </span>
      <span className="flex gap-1">
        {Array.from({ length: TOTAL }, (_, i) => (
          <span key={i} className={`size-3 border-2 border-tinta ${i <= idx ? 'bg-emas' : 'bg-white'}`} />
        ))}
      </span>
    </div>
  )
}
