import { useEffect, useMemo } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import ChatWidget from '../../components/ChatWidget'
import { Button } from '../../components/primitives'
import { useAgent } from '../../lib/agentStore'
import type { CityDetail } from '../../lib/api.types'
import { demoEnabled, withDemoQuiz } from '../../lib/demo'
import { bundledCities } from '../../lib/cities'
import { useCityDetail } from '../../lib/useCityDetail'

/** Rute /kota/:cityId/*: memuat CityDetail sekali, memasang chatbot pemandu. */
export default function CityLayout() {
  const { cityId } = useParams()
  const state = useCityDetail(cityId)
  const known = bundledCities.find((c) => c.id === cityId)
  const reset = useAgent((s) => s.reset)

  // Percakapan baru per kota.
  useEffect(() => {
    reset()
    return () => reset()
  }, [cityId, reset])

  if (state.status === 'loading') {
    return (
      <main id="konten" className="mx-auto max-w-2xl px-4 py-20 text-center" aria-busy="true">
        <p className="text-lg font-bold text-teal motion-safe:animate-pulse">Menyiapkan perjalanan…</p>
      </main>
    )
  }
  if (state.status === 'error') {
    const soon = state.notFound && known?.status === 'coming_soon'
    return (
      <main id="konten" className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold text-teal">
          {soon ? `${known.name}: segera hadir` : state.notFound ? 'Kota tidak ditemukan' : 'Gagal memuat'}
        </h1>
        <p className="mt-3 text-redup">{soon ? 'Kota ini sedang disiapkan bersama mitra.' : state.message}</p>
        <div className="mt-6 flex gap-2">
          {!state.notFound && <Button onClick={state.retry}>Coba lagi</Button>}
          <Link to="/" className="rounded-2xl border border-garis bg-white px-5 py-3 text-sm font-extrabold text-teal">
            Kembali ke peta
          </Link>
        </div>
      </main>
    )
  }
  return <Ready data={state.data} />
}

function Ready({ data }: { data: CityDetail }) {
  const { search } = useLocation()
  const demo = demoEnabled(search)
  const detail = useMemo(() => (demo ? withDemoQuiz(data) : data), [demo, data])
  return (
    <>
      {demo && (
        <p role="note" className="mx-auto mb-3 w-fit rounded-full bg-amber-50 px-4 py-1.5 text-center text-xs font-bold text-amber">
          Mode uji: kuis memakai soal contoh, bukan materi budaya. Buka <code>?demo=0</code> untuk keluar.
        </p>
      )}
      <Outlet context={detail} />
      <ChatWidget cityId={detail.city.id} />
    </>
  )
}
