import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
})

const renderHome = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )

describe('HomePage', () => {
  it('Bandung membuka alur; kota segera hadir tidak punya tombol Mulai (F-002)', async () => {
    renderHome()
    const card = () => screen.getByRole('article')
    const mulaiBtn = within(card()).getByRole('button', { name: /Mulai jelajah Bandung/ })
    expect(mulaiBtn).toBeInTheDocument()

    await userEvent.click(mulaiBtn)
    expect(screen.getByRole('alertdialog', { name: /Yakin ke Bandung/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }))

    await userEvent.click(screen.getByRole('button', { name: /^Yogyakarta/ }))
    expect(within(card()).queryByRole('button', { name: /Mulai jelajah/ })).toBeNull()
    expect(within(card()).getByText('Segera hadir')).toBeInTheDocument()
  })

  it('pengantar tidak lebih dari 60 kata (F-004)', () => {
    const { container } = renderHome()
    const intro = container.querySelector('section')!.textContent!
    expect(intro.trim().split(/\s+/).length).toBeLessThanOrEqual(60)
  })
})
