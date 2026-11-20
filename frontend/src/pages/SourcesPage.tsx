import { useEffect, useState } from 'react'
import { Button, Card } from '../components/ui'
import { getSources } from '../lib/api'
import type { SourcesResponse } from '../lib/api.types'
import { isPlaceholder } from '../lib/cities'

const show = (s: string | null | undefined, fallback = 'Sedang diverifikasi') => (isPlaceholder(s) ? fallback : s)

/** Sumber dan atribusi (F-052), langsung dari content/sources.yaml dan chunk pengetahuan. */
export default function SourcesPage() {
  const [data, setData] = useState<SourcesResponse | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    getSources(ctrl.signal)
      .then(setData)
      .catch(() => !ctrl.signal.aborted && setError(true))
    return () => ctrl.abort()
  }, [attempt])

  const refs = data?.references.filter((r) => !isPlaceholder(r.title)) ?? []

  return (
    <main id="konten" className="mx-auto w-full max-w-[900px] px-4 pb-16 sm:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-teal">Sumber dan atribusi</h1>
      <p className="mt-2 text-redup">
        Semua fakta budaya di Rupaloka berasal dari sumber di bawah dan diperiksa tim. Pemandu AI hanya menjawab dari
        sumber ini.
      </p>

      {error && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm">
          Daftar sumber belum bisa dimuat.
          <Button variant="secondary" onClick={() => {
              setError(false)
              setAttempt((n) => n + 1)
            }} className="px-3 py-2">
            Coba lagi
          </Button>
        </div>
      )}
      {!data && !error && <p className="mt-8 text-redup motion-safe:animate-pulse">Memuat…</p>}

      {data && (
        <>
          <section className="mt-8" aria-labelledby="rujukan">
            <h2 id="rujukan" className="text-xl font-extrabold">
              Rujukan
            </h2>
            {refs.length === 0 ? (
              <p className="mt-2 text-sm italic text-redup">Daftar rujukan sedang dilengkapi tim konten.</p>
            ) : (
              <ol className="mt-3 grid gap-2">
                {refs.map((r, i) => (
                  <li key={`${r.title}-${i}`}>
                    <Card className="p-4 sm:p-4">
                      <p className="font-bold">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
                            {r.title}
                          </a>
                        ) : (
                          r.title
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-redup">
                        {show(r.type, 'Jenis belum diisi')}
                        {r.accessed ? ` · diakses ${r.accessed}` : ''}
                      </p>
                    </Card>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="mt-10" aria-labelledby="aset">
            <h2 id="aset" className="text-xl font-extrabold">
              Gambar dan aset
            </h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-garis bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-kertas text-xs uppercase tracking-wide text-redup">
                  <tr>
                    <th className="px-4 py-2">Berkas</th>
                    <th className="px-4 py-2">Lisensi</th>
                    <th className="px-4 py-2">Pembuat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((a) => (
                    <tr key={a.path} className="border-t border-garis">
                      <td className="px-4 py-2 font-mono text-xs">{a.path.replace(/^assets\//, '')}</td>
                      <td className="px-4 py-2">{show(a.license)}</td>
                      <td className="px-4 py-2">
                        {a.url ? (
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
                            {show(a.author, 'Lihat asal')}
                          </a>
                        ) : (
                          show(a.author)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10 text-sm text-redup" aria-labelledby="lainnya">
            <h2 id="lainnya" className="text-xl font-extrabold text-tinta">
              Lainnya
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {/* TODO(T-061a): isi sumber dan lisensi data batas wilayah peta setelah diverifikasi. */}
              <li>Peta provinsi: sumber dan lisensi data batas wilayah sedang diverifikasi.</li>
              <li>Huruf: Nunito Sans (SIL Open Font License 1.1).</li>
              <li>Karakter pelari dan ilustrasi game: dibuat sendiri oleh tim (sementara, menunggu aset final).</li>
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
