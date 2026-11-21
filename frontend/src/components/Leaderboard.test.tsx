import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LeaderboardResponse } from '../lib/api.types'
import { usePlayer } from '../lib/player'
import Leaderboard from './Leaderboard'

const PLAYER = '11111111-2222-4333-8444-555555555555'
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

const board = (you: LeaderboardResponse['you'] = null): LeaderboardResponse => ({
  city_id: 'kota-a',
  champion_title: 'Si Paling A',
  max_points: 580,
  entries: [
    { rank: 1, nickname: 'Juara', points: 560, title: 'Si Paling A' },
    { rank: 2, nickname: 'Rani', points: 400, title: null },
  ],
  you,
})

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  localStorage.clear()
  usePlayer.setState({ playerId: PLAYER, nickname: null, submitted: {} })
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { nickname: string }
      if (body.nickname === 'Kasar') return json({ detail: 'nama panggilan tidak pantas; pilih nama lain' }, 422)
      return json(board({ rank: 2, points: 400 }))
    }
    if (url.includes('/api/leaderboard/kota-a')) return json(board())
    return json({ detail: 'tidak ada' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('Leaderboard', () => {
  it('menampilkan peringkat dan gelar juara; hanya baca bila belum menamatkan tur', async () => {
    render(<Leaderboard cityId="kota-a" points={120} canSubmit={false} />)
    expect(await screen.findByText('Juara')).toBeInTheDocument()
    expect(screen.getAllByText('Si Paling A').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/Nama panggilan/)).not.toBeInTheDocument()
    expect(String(fetchMock.mock.calls[0][0])).toContain(`player_id=${PLAYER}`)
  })

  it('mengirim skor dengan nama panggilan, menyimpan nama, menandai baris sendiri', async () => {
    const user = userEvent.setup()
    render(<Leaderboard cityId="kota-a" points={400} canSubmit />)
    await user.type(await screen.findByLabelText(/Nama panggilan/), 'Kasar')
    await user.click(screen.getByRole('button', { name: 'Kirim 400 poin' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('tidak pantas')

    await user.clear(screen.getByLabelText(/Nama panggilan/))
    await user.type(screen.getByLabelText(/Nama panggilan/), 'Rani')
    await user.click(screen.getByRole('button', { name: 'Kirim 400 poin' }))
    expect(await screen.findByText('Kamu peringkat 2 dengan 400 poin.')).toBeInTheDocument()
    expect(screen.getByText('(kamu)')).toBeInTheDocument()
    expect(usePlayer.getState()).toMatchObject({ nickname: 'Rani', submitted: { 'kota-a': 400 } })
    const post = fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST').at(-1)!
    expect(JSON.parse(String((post[1] as RequestInit).body))).toEqual({ player_id: PLAYER, nickname: 'Rani', points: 400 })
  })

  it('nama sudah ada: skor baru terkirim otomatis sekali; skor lama tidak dikirim ulang', async () => {
    usePlayer.setState({ nickname: 'Rani', submitted: { 'kota-a': 300 } })
    const { unmount } = render(<Leaderboard cityId="kota-a" points={400} canSubmit />)
    expect(await screen.findByText('Kamu peringkat 2 dengan 400 poin.')).toBeInTheDocument()
    unmount()
    const posts = () => fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST').length
    expect(posts()).toBe(1)

    render(<Leaderboard cityId="kota-a" points={400} canSubmit />)
    expect(await screen.findByText('Juara')).toBeInTheDocument()
    expect(posts()).toBe(1)
  })

  it('kota tanpa papan (404) tidak menampilkan apa pun; API mati → pesan dan coba lagi', async () => {
    const { container } = render(<Leaderboard cityId="kota-lain" points={0} canSubmit={false} />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())

    fetchMock.mockImplementation(() => json({ detail: 'mati' }, 503))
    render(<Leaderboard cityId="kota-a" points={0} canSubmit={false} />)
    expect(await screen.findByText('Papan peringkat belum bisa dimuat.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
})
