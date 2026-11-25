import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProgress } from '../lib/store'
import { detailFixture } from '../test/fixtures'
import CollectionPage from './CollectionPage'

beforeEach(() => {
  useProgress.setState({ cities: {}, collected: { 'kota-a': ['item-x'] }, lastCity: null })
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(detailFixture), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      ),
    ),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('CollectionPage', () => {
  it('klik item koleksi → dialog kartu budaya langsung terbuka (tidak ditumpuk di halaman)', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CollectionPage />
      </MemoryRouter>,
    )
    const card = (await screen.findAllByRole('button', { name: /Item X/ }))[0]
    expect(screen.queryByText('Sedang disusun tim budaya.')).not.toBeInTheDocument()

    await user.click(card)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Item X' })).toBeInTheDocument()
    expect(within(dialog).getAllByText('Sedang disusun tim budaya.')).toHaveLength(4)

    await user.click(within(dialog).getByRole('button', { name: 'Tutup' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
