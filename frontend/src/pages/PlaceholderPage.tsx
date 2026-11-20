import { Link } from 'react-router-dom'

/** Halaman sementara untuk rute yang dibangun di tugas berikutnya (lihat docs/TASKS.md). */
export default function PlaceholderPage({ title, task }: { title: string; task: string }) {
  return (
    <main id="konten" className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold text-teal">{title}</h1>
      <p className="mt-3 text-redup">Halaman ini sedang dibangun ({task}).</p>
      <Link to="/" className="mt-6 rounded-2xl bg-teal px-5 py-3 text-sm font-extrabold text-white hover:bg-teal-600">
        Kembali ke peta
      </Link>
    </main>
  )
}
