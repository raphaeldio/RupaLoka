import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Location } from '../lib/api.types'
import LocationButton from './LocationButton'

const base: Location = { name: 'Situs Uji', address: 'Jalan Uji 1', lat: null, lng: null, links: [] }

describe('LocationButton (Kunjungi)', () => {
  it('hanya tautan yang sudah diperiksa (verified_by) dan http(s) yang tampil', () => {
    render(
      <LocationButton
        location={{
          ...base,
          links: [
            { label: 'Jadwal pentas', url: 'https://contoh.test/jadwal', kind: 'jadwal', note: null, verified_by: 'KH' },
            { label: 'Situs resmi', url: 'https://contoh.test', kind: 'situs', note: null, verified_by: 'KH' },
            { label: 'Belum dicek', url: 'https://contoh.test/x', kind: 'sanggar', note: null, verified_by: null },
          ],
        }}
      />,
    )
    expect(screen.getByText('Kunjungi')).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://contoh.test', 'https://contoh.test/jadwal'])
    expect(screen.queryByText('Belum dicek')).not.toBeInTheDocument()
    expect(screen.getByText('Koordinat sedang diverifikasi.')).toBeInTheDocument()
  })

  it('tanpa koordinat, alamat, dan tautan → tidak tampil', () => {
    const { container } = render(<LocationButton location={{ ...base, address: '[PERLU DIISI]' }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
