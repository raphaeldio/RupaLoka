import { Link } from 'react-router-dom'

/** Halaman sementara untuk rute yang dibangun di tugas berikutnya (lihat docs/TASKS.md). */
export default function PlaceholderPage({ title, task }: { title: string; task: string }) {
  return (
    <main id="konten" className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center">
      <h1 className="text-3xl font-black text-teal-800">{title}</h1>
      <p className="mt-3 text-redup">Halaman ini sedang dibangun ({task}).</p>
      <Link to="/" className="pil pil-teal mt-6">
        Kembali ke peta
      </Link>
    </main>
  )
}
