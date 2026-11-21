import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAgent } from '../../lib/agentStore'
import { useProgress } from '../../lib/store'
import { clearCityCache } from '../../lib/useCityDetail'
import { detailFixture } from '../../test/fixtures'
import { renderApp } from '../../test/render'
import CityLayout from './CityLayout'
import GamePage from './GamePage'
import NodePage from './NodePage'
import PathPage from './PathPage'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

let chatStatus = 200
beforeEach(() => {
  localStorage.clear()
  clearCityCache()
  useProgress.setState({ cities: {}, collected: {}, lastCity: null })
  useAgent.getState().reset()
  chatStatus = 200
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.endsWith('/api/content/cities/kota-a')) return json(detailFixture)
      if (url.endsWith('/api/chat')) {
        if (chatStatus !== 200) return json({ detail: 'x' }, chatStatus)
        return json({
          answer: 'A adalah contoh [1].',
          grounded: true,
          citations: [{ chunk_id: 'a-001', title: 'Sumber a-001', url: 'https://contoh.test/a-001' }],
          refusal_reason: null,
          suggestions: [],
        })
      }
      return json({ detail: 'tidak ada' }, 404)
    }),
  )
  globalThis.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof matchMedia
})
afterEach(() => vi.unstubAllGlobals())

const renderAt = (path: string) =>
  renderApp(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/kota/:cityId" element={<CityLayout />}>
          <Route index element={<PathPage />} />
          <Route path="titik/:lessonId" element={<NodePage />} />
          <Route path="game" element={<GamePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

const pathList = () => screen.getByRole('list', { name: 'Path belajar' })

describe('path kota', () => {
  it('menampilkan titik berurutan: pertama terbuka, sisanya terkunci, game terakhir', async () => {
    renderAt('/kota/kota-a')
    expect(await screen.findByRole('heading', { name: 'Jelajah Kota A' })).toBeInTheDocument()
    const list = pathList()
    expect(within(list).getByRole('link', { name: /Titik 1: Materi A.*Terbuka/ })).toHaveAttribute('href', '/kota/kota-a/titik/a')
    expect(within(list).getByRole('img', { name: /Titik 2: Materi B.*Terkunci/ })).toBeInTheDocument()
    expect(within(list).getByRole('img', { name: /Titik 3: Keliling Kota A.*Terkunci/ })).toBeInTheDocument()
    expect(within(list).getByText('Mulai')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Menuju lencana Lencana Satu' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('titik terkunci tidak bisa dibuka lewat URL', async () => {
    renderAt('/kota/kota-a/titik/b')
    expect(await screen.findByRole('heading', { name: 'Jelajah Kota A' })).toBeInTheDocument()
  })
})

describe('titik path', () => {
  it('kuis awal → materi → kuis akhir → hasil: poin bertambah dan lencana baru (F-021, F-030)', async () => {
    const user = userEvent.setup()
    renderAt('/kota/kota-a/titik/a')
    // Titik A hanya punya soal q1 (chunk a-001).
    expect(await screen.findByText('Kuis awal · Soal 1 dari 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lanjut ke materi' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Benar/ }))
    expect(screen.getByText('Penjelasan satu.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lanjut ke materi' }))

    expect(screen.getByRole('heading', { name: 'Materi A' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Lihat lokasi asli/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=-6.9,107.6',
    )
    await user.click(screen.getByRole('button', { name: 'Lanjut ke kuis akhir' }))

    // Kuis akhir: soal yang sama diulang setelah materi (belum ada soal outro).
    expect(screen.getByText('Kuis akhir · Soal 1 dari 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Benar/ }))
    await user.click(screen.getByRole('button', { name: 'Lihat hasil' }))

    expect(screen.getByLabelText('Bertambah 110 poin')).toBeInTheDocument()
    expect(screen.getByText('Lencana baru!')).toBeInTheDocument()
    expect(screen.getByText('Lencana Satu')).toBeInTheDocument()
    expect(useProgress.getState().cities['kota-a']).toMatchObject({ completed: ['a'], correct: { a: 1 } })
    // Pindah ke titik berikutnya memulai titik baru (bukan layar hasil titik sebelumnya).
    await user.click(screen.getByRole('button', { name: 'Lanjut: Materi B →' }))
    expect(await screen.findByText('Kuis awal · Soal 1 dari 1')).toBeInTheDocument()
    expect(screen.getByText('Titik 2: Materi B')).toBeInTheDocument()
  })

  it('mengulang titik tidak menambah poin ganda', async () => {
    useProgress.getState().completeNode('kota-a', 'a', 1)
    const user = userEvent.setup()
    renderAt('/kota/kota-a/titik/a')
    await user.click(await screen.findByRole('button', { name: 'Lewati kuis' }))
    await user.click(screen.getByRole('button', { name: 'Lanjut ke kuis akhir' }))
    await user.click(screen.getByRole('button', { name: 'Lewati kuis' }))
    expect(screen.getByLabelText('Bertambah 0 poin')).toBeInTheDocument()
    expect(useProgress.getState().cities['kota-a'].correct.a).toBe(1)
  })
})

describe('chatbot pemandu', () => {
  it('"Tanya" dari kartu materi membuka chatbot, mengirim konteks materi, menampilkan sitasi (F-031)', async () => {
    const user = userEvent.setup()
    renderAt('/kota/kota-a/titik/a')
    await user.click(await screen.findByRole('button', { name: 'Lewati kuis' }))
    expect(screen.getByRole('button', { name: /Buka chat Pemandu/ })).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: 'Apa itu A?' }))

    expect(screen.getByRole('button', { name: /Tutup chat Pemandu/ })).toHaveAttribute('aria-expanded', 'true')
    const log = screen.getByRole('log')
    expect(await within(log).findByText(/A adalah contoh/)).toBeInTheDocument()
    expect(within(log).getByRole('link', { name: /1: sumber Sumber a-001/ })).toHaveAttribute('href', 'https://contoh.test/a-001')
    const call = vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith('/api/chat'))!
    expect(JSON.parse(String((call[1] as RequestInit).body))).toMatchObject({
      city_id: 'kota-a',
      context: { phase: 'lessons', lesson_id: 'a' },
      message: 'Apa itu A?',
    })
  })

  it('AI gagal (503) → pemberitahuan; skrip tetap ada (F-014)', async () => {
    chatStatus = 503
    const user = userEvent.setup()
    renderAt('/kota/kota-a')
    await user.click(await screen.findByRole('button', { name: /Buka chat Pemandu/ }))
    expect(within(screen.getByRole('log')).getByText('Skrip kuis.')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Tanya Pemandu/), 'Halo?')
    await user.click(screen.getByRole('button', { name: 'Tanya' }))
    expect(await screen.findByText(/pemandu belum bisa menjawab/)).toBeInTheDocument()
  })
})

describe('titik game', () => {
  it('terbuka setelah semua materi selesai; menampilkan layar mulai', async () => {
    useProgress.getState().completeNode('kota-a', 'a', 0)
    useProgress.getState().completeNode('kota-a', 'b', 0)
    renderAt('/kota/kota-a/game')
    expect(await screen.findByText('Ketuk atau tekan Spasi untuk mulai')).toBeInTheDocument()
  })

  it('terkunci → kembali ke path', async () => {
    renderAt('/kota/kota-a/game')
    expect(await screen.findByRole('heading', { name: 'Jelajah Kota A' })).toBeInTheDocument()
  })

  it('API gagal → pesan dan tombol coba lagi', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.reject(new TypeError('offline')))
    renderAt('/kota/kota-a')
    expect(await screen.findByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
})
