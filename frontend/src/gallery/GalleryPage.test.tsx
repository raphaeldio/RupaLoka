import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CityDetail, GalleryOut } from '../lib/api.types'
import { useAgent } from '../lib/agentStore'
import { detailFixture } from '../test/fixtures'

const flags = vi.hoisted(() => ({ galleryEnabled: true }))
vi.mock('../lib/flags', () => ({
  get galleryEnabled() {
    return flags.galleryEnabled
  },
  featureFlags: {},
}))
vi.mock('./GalleryScene', () => ({ default: () => <div data-testid="scene" /> }))

// Data fiktif (bukan konten budaya nyata).
const gallery: GalleryOut = {
  layout: { radius: 6, slots: 12, first_d: 3 },
  room_model: 'assets/models/ruang.glb',
  room_available: false,
  guide_model: null,
  guide_available: false,
  approved: false,
  exhibits: [
    {
      id: 'objek-a',
      kind: 'object',
      name: 'Objek A',
      short_explanation: 'Penjelasan A.',
      short_chunk: 'a-001',
      asal_usul: { text: 'Asal usul A.', chunk: 'b-001' },
      image: null,
      model_src: 'assets/models/a.glb',
      model_available: true,
      accuracy_by: null,
      hotspots: [],
    },
    {
      id: 'objek-b',
      kind: 'object',
      name: 'Objek B',
      short_explanation: null,
      short_chunk: null,
      asal_usul: null,
      image: null,
      model_src: null,
      model_available: false,
      accuracy_by: null,
      hotspots: [],
    },
  ],
}

async function renderGallery(detail: CityDetail = { ...detailFixture, gallery }) {
  const { default: GalleryPage } = await import('./GalleryPage')
  render(
    <MemoryRouter initialEntries={['/kota/kota-a/galeri']}>
      <Routes>
        <Route path="/kota/:cityId" element={<Outlet context={detail} />}>
          <Route path="galeri" element={<GalleryPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  flags.galleryEnabled = true
  useAgent.getState().reset()
  localStorage.clear()
})

describe('GalleryPage', () => {
  it('flag mati: kartu premium dengan tautan langganan', async () => {
    flags.galleryEnabled = false
    await renderGallery()
    expect(screen.getByText(/fitur premium/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /paket langganan/i })).toHaveAttribute(
      'href',
      `/langganan?dari=${encodeURIComponent('/kota/kota-a/galeri')}`,
    )
  })

  it('kota tanpa galeri: segera hadir', async () => {
    await renderGallery({ ...detailFixture, gallery: null })
    expect(screen.getByText(/segera hadir/i)).toBeInTheDocument()
  })

  it('tanpa WebGL: daftar koleksi, teks pending ditampilkan jujur', async () => {
    await renderGallery()
    const list = screen.getByRole('region', { name: /daftar koleksi/i })
    expect(within(list).getByText(/tidak mendukung 3D/i)).toBeInTheDocument()
    expect(within(list).getByText('Penjelasan A.')).toBeInTheDocument()
    expect(within(list).getByText(/sedang disusun tim budaya/i)).toBeInTheDocument()
  })

  it('kartu: penjelasan + asal usul dengan sumber; kosong = sedang disusun', async () => {
    const user = userEvent.setup()
    await renderGallery()
    await user.click(screen.getByRole('button', { name: 'Kartu Objek A' }))
    const dialog = await screen.findByRole('dialog', { name: 'Objek A' })
    expect(within(dialog).getByText('Asal usul A.')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Sumber a-001/ })).toHaveAttribute('href', 'https://contoh.test/a-001')
    expect(within(dialog).getByRole('link', { name: /Sumber b-001/ })).toBeInTheDocument()
    expect(within(dialog).getByText(/belum diperiksa tim budaya/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /Tanya Saloka tentang Objek A/ }))
    expect(useAgent.getState().request?.text).toBe('Ceritakan tentang Objek A')

    await user.click(screen.getByRole('button', { name: 'Kartu Objek B' }))
    const b = await screen.findByRole('dialog', { name: 'Objek B' })
    expect(within(b).getByText(/Cerita asal usul sedang disusun/i)).toBeInTheDocument()
  })

  it('pemandu mengumumkan lewat aria-live, dan T membuka Saloka', async () => {
    await renderGallery()
    expect(screen.getByText(/aku Saloka, pemandumu/i, { selector: '[aria-live] *, [aria-live]' })).toBeInTheDocument()
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }))
    })
    expect(useAgent.getState().open).toBe(true)
  })
})
