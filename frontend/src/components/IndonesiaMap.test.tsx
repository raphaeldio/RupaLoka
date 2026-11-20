import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { placeCity, type City } from '../lib/cities'
import IndonesiaMap from './IndonesiaMap'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const cities: City[] = [
  { id: 'bandung', name: 'Bandung', province: 'Jawa Barat', status: 'active', lat: null, lng: null, summary: null },
  {
    id: 'yogyakarta',
    name: 'Yogyakarta',
    province: 'DI Yogyakarta',
    status: 'coming_soon',
    lat: null,
    lng: null,
    summary: null,
  },
]
const placed = cities.map((c) => placeCity(c)!)
const layerOf = (container: HTMLElement, code: string) =>
  container.querySelector(`[data-province="${code}"]`)!.closest('.province')

describe('IndonesiaMap', () => {
  it('merender 38 provinsi dan titik kota yang dapat dioperasikan keyboard', async () => {
    const onSelect = vi.fn()
    const { container } = render(<IndonesiaMap cities={placed} selectedId={null} onSelect={onSelect} />)
    expect(container.querySelectorAll('[data-province]')).toHaveLength(38)

    await userEvent.tab()
    expect(screen.getByRole('button', { name: /Bandung, Jawa Barat: tersedia/ })).toHaveFocus()
    // Fokus menimbulkan provinsinya dan memunculkan nama kota
    expect(layerOf(container, 'JB')).toHaveAttribute('data-state', 'lifted')
    expect(screen.getByRole('status')).toHaveTextContent('Bandung')

    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('bandung')
  })

  it('awalnya datar; hover provinsi menimbulkannya dan meredupkan lainnya', () => {
    const { container } = render(<IndonesiaMap cities={placed} selectedId={null} onSelect={() => {}} />)
    const states = () => [...container.querySelectorAll('.province')].map((n) => n.getAttribute('data-state'))
    expect(new Set(states())).toEqual(new Set(['flat']))

    fireEvent.pointerOver(container.querySelector('[data-province="YO"]')!)
    expect(layerOf(container, 'YO')).toHaveAttribute('data-state', 'lifted')
    expect(states().filter((s) => s === 'dim')).toHaveLength(37)
    expect(screen.getByRole('status')).toHaveTextContent(/Yogyakarta.*Segera hadir/)
  })

  it('provinsi tanpa kota menampilkan namanya saja', () => {
    const { container } = render(<IndonesiaMap cities={placed} selectedId={null} onSelect={() => {}} />)
    fireEvent.pointerOver(container.querySelector('[data-province="PA"]')!)
    expect(screen.getByRole('status')).toHaveTextContent('Belum ada kota di provinsi ini')
  })

  it('klik provinsi dengan kota aktif memilih kota itu', () => {
    const onSelect = vi.fn()
    const { container } = render(<IndonesiaMap cities={placed} selectedId={null} onSelect={onSelect} />)
    fireEvent.click(container.querySelector('[data-province="JB"]')!)
    expect(onSelect).toHaveBeenCalledWith('bandung')
  })
})
