import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../lib/store'
import { detailFixture } from '../test/fixtures'
import CityFlowPage from './CityFlowPage'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

let chatStatus = 200
beforeEach(() => {
  localStorage.clear()
  useProgress.setState({ cities: {}, collected: {}, lastCity: null })
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
  Element.prototype.scrollIntoView ??= () => {}
})
afterEach(() => vi.unstubAllGlobals())

const renderFlow = () =>
  render(
    <MemoryRouter initialEntries={['/kota/kota-a']}>
      <Routes>
        <Route path="/kota/:cityId" element={<CityFlowPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('CityFlowPage', () => {
  it('kuis → hasil dengan saran materi → materi → game (F-020–F-022, F-030)', async () => {
    const user = userEvent.setup()
    renderFlow()
    await user.click(await screen.findByRole('button', { name: 'Mulai petualangan' }))
    expect(screen.getByText('Skrip kuis.')).toBeInTheDocument()

    // Soal 1 benar
    expect(screen.getByRole('button', { name: 'Soal berikutnya' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Benar/ }))
    expect(screen.getByText('Penjelasan satu.')).toBeInTheDocument()
    expect(screen.getByText('Tepat sekali!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Soal berikutnya' }))

    // Soal 2 salah → saran materi B
    await user.click(screen.getByRole('button', { name: /Salah/ }))
    expect(screen.getByText('Belum tepat, tidak apa-apa.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lihat hasil' }))
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Materi B', { selector: 'li' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mulai materi' }))
    expect(screen.getByRole('heading', { name: 'Materi A' })).toBeInTheDocument()
    expect(screen.getByText('Skrip materi.')).toBeInTheDocument()
    const loc = screen.getByRole('link', { name: /Lihat lokasi asli/ })
    expect(loc).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=-6.9,107.6')
    expect(loc).toHaveAttribute('target', '_blank')

    await user.click(screen.getByRole('button', { name: 'Materi berikutnya' }))
    await user.click(screen.getByRole('button', { name: 'Mulai game' }))
    expect(screen.getByText('Ketuk atau tekan Spasi untuk mulai')).toBeInTheDocument()
    expect(screen.getByText('Skrip game.')).toBeInTheDocument()
  })

  it('"Tanya agen" dari kartu materi mengirim konteks materi dan menampilkan sitasi (F-031)', async () => {
    const user = userEvent.setup()
    renderFlow()
    await user.click(await screen.findByRole('button', { name: 'Mulai petualangan' }))
    await user.click(screen.getByRole('button', { name: 'Lewati kuis' }))
    await user.click(screen.getByRole('button', { name: 'Mulai materi' }))
    await user.click(screen.getByRole('button', { name: 'Apa itu A?' }))

    const log = screen.getByRole('log')
    expect(await within(log).findByText(/A adalah contoh/)).toBeInTheDocument()
    expect(within(log).getByRole('link', { name: /1: sumber Sumber a-001/ })).toHaveAttribute(
      'href',
      'https://contoh.test/a-001',
    )
    const call = vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith('/api/chat'))!
    const body = JSON.parse(String((call[1] as RequestInit).body))
    expect(body).toMatchObject({ city_id: 'kota-a', context: { phase: 'lessons', lesson_id: 'a' }, message: 'Apa itu A?' })
  })

  it('AI gagal (503) → pemberitahuan, skrip dan alur tetap jalan (F-014)', async () => {
    chatStatus = 503
    const user = userEvent.setup()
    renderFlow()
    await user.click(await screen.findByRole('button', { name: 'Mulai petualangan' }))
    await user.type(screen.getByLabelText(/Tanya Pemandu/), 'Halo?')
    await user.click(screen.getByRole('button', { name: 'Tanya' }))
    expect(await screen.findByText(/pemandu belum bisa menjawab/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lewati kuis' }))
    expect(screen.getByRole('button', { name: 'Mulai materi' })).toBeEnabled()
  })

  it('progres tersimpan dan dipulihkan', async () => {
    const user = userEvent.setup()
    const { unmount } = renderFlow()
    await user.click(await screen.findByRole('button', { name: 'Mulai petualangan' }))
    await user.click(screen.getByRole('button', { name: /Benar/ }))
    unmount()
    renderFlow()
    expect(await screen.findByText('Penjelasan satu.')).toBeInTheDocument()
  })

  it('API gagal → pesan dan tombol coba lagi', async () => {
    vi.mocked(fetch).mockImplementation(() => Promise.reject(new TypeError('offline')))
    renderFlow()
    expect(await screen.findByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
})
