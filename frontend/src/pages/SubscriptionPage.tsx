import { Link, useSearchParams } from 'react-router-dom'

/**
 * Halaman langganan (placeholder, 21 Nov 2026). Isi paket diambil dari PRD (F-060 penampil 3D,
 * F-061 paket individu, model bisnis: paket sekolah dengan mode kelas dan laporan). Langganan dan
 * pembayaran masih P2: tidak ada formulir, harga, atau pengumpulan data di halaman ini.
 */

/** Hanya alamat internal yang boleh dipakai sebagai tujuan kembali (cegah open redirect). */
function safeBack(raw: string | null): string | null {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null
}

const PLANS = [
  {
    name: 'Individu',
    points: ['Mode 3D: lihat model objek budaya dari segala sisi', 'Konten dan kota tambahan', 'Fitur khusus pelanggan'],
  },
  {
    name: 'Sekolah',
    points: ['Semua isi paket Individu', 'Mode kelas untuk guru dan murid', 'Laporan belajar kelas'],
  },
]

export default function SubscriptionPage() {
  const [params] = useSearchParams()
  const back = safeBack(params.get('dari'))
  return (
    <main id="konten" className="mx-auto w-full max-w-[880px] px-4 pb-28 pt-4 sm:px-8">
      <Link to={back ?? '/'} className="text-sm font-bold text-redup hover:text-teal">
        ← {back ? 'Kembali ke path' : 'Kembali ke peta'}
      </Link>

      <section className="mt-4 rounded-[32px] bg-teal px-6 py-8 text-white shadow-melayang sm:px-10">
        <p className="eyebrow text-white/70">Langganan Rupaloka</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Mode 3D khusus pelanggan</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">
          Di mode 3D kamu bisa memutar dan mengamati objek budaya lebih dekat. Fitur ini sedang disiapkan dan akan tersedia
          lewat paket langganan.
        </p>
        <span className="mt-4 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">Segera hadir</span>
      </section>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Paket langganan">
        {PLANS.map((p) => (
          <li key={p.name} className="rounded-3xl border border-garis bg-white p-6 shadow-kartu">
            <h2 className="text-xl font-extrabold text-teal">Paket {p.name}</h2>
            <p className="mt-1 text-sm font-bold text-redup">Harga akan diumumkan</p>
            <ul className="mt-4 grid gap-2 text-sm">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-2">
                  <span aria-hidden="true" className="text-teal">
                    ✓
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-2xl bg-kertas px-3 py-2 text-xs font-bold text-redup">
              Pendaftaran langganan belum dibuka.
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          to={back ?? '/'}
          className="rounded-2xl bg-teal px-5 py-3 text-sm font-extrabold text-white hover:bg-teal-600"
        >
          Lanjut belajar di mode 2D
        </Link>
        <p className="text-xs text-redup">Semua materi, kuis, dan game di mode 2D tetap gratis.</p>
      </div>
    </main>
  )
}
