import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { City } from '../lib/cities'
import ProvincePanel from './ProvincePanel'

const city = (id: string, status: City['status']): City => ({
  id,
  name: id.toUpperCase(),
  province: 'Provinsi A',
  status,
  lat: null,
  lng: null,
  summary: null,
})

describe('ProvincePanel', () => {
  it('menampilkan kota provinsi, kota aktif lebih dulu dan difokus', async () => {
    const onPick = vi.fn()
    render(<ProvincePanel name="Provinsi A" cities={[city('b', 'coming_soon'), city('a', 'active')]} onPick={onPick} onClose={() => {}} />)
    const buttons = screen.getAllByRole('button', { name: /^(A|B)/ })
    expect(buttons.map((b) => b.textContent)).toEqual(['ASiap dijelajahiJelajahi →', 'BSegera hadirSegera'])
    expect(buttons[0]).toHaveFocus()
    await userEvent.click(buttons[0])
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('provinsi tanpa kota: pesan segera hadir; Escape menutup', async () => {
    const onClose = vi.fn()
    render(<ProvincePanel name="Provinsi B" cities={[]} onPick={() => {}} onClose={onClose} />)
    expect(screen.getByText(/Belum ada kota/)).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
