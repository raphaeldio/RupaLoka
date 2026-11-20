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
    expect(within(card()).getByRole('link', { name: /Mulai jelajah Bandung/ })).toHaveAttribute(
      'href',
      '/kota/bandung',
    )

    await userEvent.click(screen.getByRole('button', { name: /^Yogyakarta, DI Yogyakarta: segera hadir/ }))
    expect(within(card()).queryByRole('link')).toBeNull()
    expect(within(card()).getByText('Segera hadir')).toBeInTheDocument()
  })

  it('pengantar tidak lebih dari 60 kata (F-004)', () => {
    const { container } = renderHome()
    const intro = container.querySelector('section')!.textContent!
    expect(intro.trim().split(/\s+/).length).toBeLessThanOrEqual(60)
  })
})
