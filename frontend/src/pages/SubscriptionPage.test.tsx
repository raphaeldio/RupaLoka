import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ModeSwitch from '../components/ModeSwitch'
import { renderApp } from '../test/render'
import SubscriptionPage from './SubscriptionPage'

const renderAt = (path: string) =>
  renderApp(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/kota/:cityId" element={<ModeSwitch />} />
        <Route path="/langganan" element={<SubscriptionPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('mode 2D/3D dan halaman langganan', () => {
  it('2D aktif; 3D membuka halaman langganan dan bisa kembali ke path', async () => {
    const user = userEvent.setup()
    renderAt('/kota/bandung')
    expect(screen.getByRole('button', { name: 'Mode 2D' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('link', { name: /Mode 3D/ }))
    expect(screen.getByRole('heading', { name: 'Mode 3D khusus pelanggan' })).toBeInTheDocument()
    expect(screen.getAllByText('Harga akan diumumkan')).toHaveLength(2)
    await user.click(screen.getByRole('link', { name: 'Lanjut belajar di mode 2D' }))
    expect(screen.getByRole('button', { name: 'Mode 2D' })).toBeInTheDocument()
  })

  it('alamat kembali dari luar situs diabaikan (tanpa open redirect)', () => {
    renderAt('/langganan?dari=//jahat.test')
    expect(screen.getByRole('link', { name: /Kembali ke peta/ })).toHaveAttribute('href', '/')
  })
})
