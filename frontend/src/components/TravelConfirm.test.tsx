import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TravelConfirm from './TravelConfirm'

const city = { id: 'kota-a', name: 'Kota A', province: 'Provinsi A', status: 'active' as const, lat: null, lng: null, summary: null }

describe('TravelConfirm', () => {
  it('menanyakan kota, fokus awal di "Batal", "Ya" memanggil onYes', async () => {
    const onYes = vi.fn()
    render(<TravelConfirm city={city} onYes={onYes} onNo={() => {}} />)
    expect(screen.getByRole('alertdialog', { name: 'Yakin ke Kota A?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Ya, berangkat!' }))
    expect(onYes).toHaveBeenCalledOnce()
  })

  it('Escape membatalkan', async () => {
    const onNo = vi.fn()
    render(<TravelConfirm city={city} onYes={() => {}} onNo={onNo} />)
    await userEvent.keyboard('{Escape}')
    expect(onNo).toHaveBeenCalledTimes(1)
  })
})
