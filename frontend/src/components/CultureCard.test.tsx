import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item } from '../lib/api.types'
import { detailFixture } from '../test/fixtures'
import CultureCard from './CultureCard'

const base = detailFixture.items[0]
afterEach(() => vi.unstubAllEnvs())

describe('CultureCard', () => {
  it('kartu belum disusun → placeholder, bukan teks karangan; tanpa form → tanpa tombol masukan', () => {
    vi.stubEnv('VITE_FEEDBACK_FORM_URL', '')
    render(<CultureCard item={base} cityId="kota-a" sources={detailFixture.sources} />)
    expect(screen.getAllByText('Sedang disusun tim budaya.')).toHaveLength(4)
    expect(screen.getByText('Menunggu validasi budayawan.')).toBeInTheDocument()
    expect(screen.queryByText('Beri masukan')).not.toBeInTheDocument()
  })

  it('kartu lengkap → aspek, komunitas, rujukan, validator, tombol masukan', () => {
    vi.stubEnv('VITE_FEEDBACK_FORM_URL', 'https://docs.google.com/forms/d/e/abc/viewform')
    const item: Item = {
      ...base,
      card: {
        nilai: { text: 'Teks nilai.', chunk: 'b-001' },
        pengetahuan: { text: 'Teks pengetahuan.', chunk: 'a-001' },
        ekspresi: null,
        fungsi: { text: 'Teks fungsi.', chunk: 'a-001' },
        community: { text: 'Ekspresi budaya komunitas uji.', chunk: 'a-001' },
        validator: { name: 'Ibu Uji', role: 'budayawan', validated_at: null },
      },
    }
    render(<CultureCard item={item} cityId="kota-a" sources={detailFixture.sources} />)
    expect(screen.getByText('Teks nilai.')).toBeInTheDocument()
    expect(screen.getByText('Ekspresi budaya komunitas uji.')).toBeInTheDocument()
    expect(screen.getAllByText('Sedang disusun tim budaya.')).toHaveLength(1)
    expect(screen.getByText('Ibu Uji')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Beri masukan/ })).toHaveAttribute('target', '_blank')
  })
})
