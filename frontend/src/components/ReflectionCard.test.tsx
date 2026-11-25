import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReflectionResult } from '../lib/api.types'
import { useProgress } from '../lib/store'
import { detailFixture as cityDetail } from '../test/fixtures'
import ReflectionCard from './ReflectionCard'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

const question = { id: 'refleksi-a', lesson: 'a', prompt: 'Nilai apa yang bisa kamu pakai?' }
let reply: ReflectionResult
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  useProgress.setState({ cities: {}, collected: {}, lastCity: null })
  reply = { matched: [], method: 'none', feedback: 'Coba pikirkan lagi.' }
  fetchMock = vi.fn(() => json(reply))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('ReflectionCard', () => {
  it('jawaban dikenali AI → label AI, penjelasan bersumber, poin sekali', async () => {
    reply = {
      matched: [{ id: 'tekun', label: 'Tekun', explanation: 'Penjelasan tekun.', chunk: 'a-001' }],
      method: 'ai',
      feedback: 'Keren!',
    }
    const user = userEvent.setup()
    render(<ReflectionCard detail={cityDetail} question={question} />)
    await user.type(screen.getByLabelText(/kata-katamu sendiri/), 'aku terus mencoba')
    await user.click(screen.getByRole('button', { name: 'Kirim jawaban' }))

    expect(await screen.findByText('Keren!')).toBeInTheDocument()
    expect(screen.getByText('Tekun')).toBeInTheDocument()
    expect(screen.getByText('Dinilai dengan bantuan AI')).toBeInTheDocument()
    expect(screen.getByText('+50 poin path!')).toBeInTheDocument()
    expect(useProgress.getState().cities['kota-a'].reflection).toEqual({ 'refleksi-a': true })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as Record<string, string>
    expect(body).toEqual({ city_id: 'kota-a', question_id: 'refleksi-a', answer: 'aku terus mencoba' })
  })

  it('tidak cocok → umpan balik konten tanpa poin dan tanpa label AI', async () => {
    const user = userEvent.setup()
    render(<ReflectionCard detail={cityDetail} question={question} />)
    await user.type(screen.getByLabelText(/kata-katamu sendiri/), 'entah')
    await user.click(screen.getByRole('button', { name: 'Kirim jawaban' }))
    expect(await screen.findByText('Coba pikirkan lagi.')).toBeInTheDocument()
    expect(screen.queryByText('Dinilai dengan bantuan AI')).not.toBeInTheDocument()
    expect(useProgress.getState().cities['kota-a']).toBeUndefined()
  })

  it('API gagal → pesan ramah, tanpa layar kosong', async () => {
    fetchMock.mockImplementation(() => json({ detail: 'x' }, 503))
    const user = userEvent.setup()
    render(<ReflectionCard detail={cityDetail} question={question} />)
    await user.type(screen.getByLabelText(/kata-katamu sendiri/), 'jawaban')
    await user.click(screen.getByRole('button', { name: 'Kirim jawaban' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('belum bisa diperiksa')
  })
})
