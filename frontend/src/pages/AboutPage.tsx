import { Link } from 'react-router-dom'
import { Reveal } from '../components/motion'
import { GlowCard } from '../components/primitives'
import BlurText from '../components/reactbits/BlurText'

const STEPS = [
  { title: 'Pilih kota di peta', text: 'Mulai dari peta Nusantara. Saat ini Bandung sudah bisa dijelajahi; kota lain segera hadir.' },
  { title: 'Kuis pemanasan', text: 'Lima soal singkat untuk mengukur apa yang sudah kamu tahu, lengkap dengan penjelasan.' },
  { title: 'Kartu materi', text: 'Cerita budaya kota, fakta kunci, dan sumbernya. Penasaran? Tanya pemandu.' },
  { title: 'Game keliling kota', text: 'Lompati rintangan. Tiap kelipatan 1.000 poin, kamu menemukan item budaya untuk koleksimu.' },
]

/** Halaman Tentang (F-052). Tanpa klaim capaian yang belum diukur. */
export default function AboutPage() {
  return (
    <main id="konten" className="mx-auto w-full max-w-[900px] px-4 pb-16 sm:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-teal" aria-label="Tentang Rupaloka">
        <BlurText text="Tentang Rupaloka" animateBy="words" delay={80} className="inline-flex" />
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed">
        Rupaloka adalah web edukasi budaya Nusantara yang mengajak pelajar belajar lewat kuis, kartu materi, dan game,
        ditemani pemandu AI yang hanya menjawab dari sumber yang sudah diperiksa tim.
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Reveal delay={i * 0.08} className="h-full">
            <GlowCard className="h-full">
              <p className="text-xs font-extrabold text-amber">Langkah {i + 1}</p>
              <h2 className="mt-1 text-lg font-extrabold text-teal">{s.title}</h2>
              <p className="mt-1 text-sm text-redup">{s.text}</p>
            </GlowCard>
            </Reveal>
          </li>
        ))}
      </ol>

      <section className="mt-8" aria-labelledby="prinsip">
        <h2 id="prinsip" className="text-xl font-extrabold">
          Prinsip kami
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]">
          <li>Fakta budaya ditulis dan diperiksa manusia, dengan sumber yang bisa kamu buka.</li>
          <li>Pemandu AI menyertakan rujukan di setiap jawaban, atau mengaku tidak tahu.</li>
          <li>Objek budaya adalah hadiah dan koleksi, bukan rintangan yang ditabrak.</li>
          <li>Tanpa akun: progres dan koleksi tersimpan di perangkatmu saja.</li>
        </ul>
        <p className="mt-4 text-sm">
          Lihat <Link to="/sumber" className="font-bold text-teal hover:underline">Sumber dan atribusi</Link>.
        </p>
      </section>

      <section className="mt-8 text-sm text-redup" aria-labelledby="tim">
        <h2 id="tim" className="text-xl font-extrabold text-tinta">
          Tim
        </h2>
        <p className="mt-2">Tim KamiPemenang, Bandung. Dibuat untuk BUDAYA GO! 2026, cabang Inovasi Digital.</p>
      </section>
    </main>
  )
}
