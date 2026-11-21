import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detailFixture } from '../test/fixtures'
import { renderApp } from '../test/render'
import LessonCard from './LessonCard'

const mockFlags = vi.hoisted(() => ({
  viewer3d: false,
  class_mode: false,
  premium_content: false,
  strict_node_requirements: false,
}))
vi.mock('../lib/flags', () => ({ featureFlags: mockFlags }))

const lessonWithVideo = {
  ...detailFixture.lessons[0],
  videos: [
    {
      url: 'https://www.youtube.com/watch?v=gxwPUVEXPtI',
      title: 'Video uji',
      channel: 'Kanal uji',
      note: null,
      checked_by: null,
    },
  ],
}

function renderCard(onFinish = vi.fn()) {
  renderApp(
    <LessonCard
      lesson={lessonWithVideo}
      eyebrow="Titik 1 · Materi"
      sources={detailFixture.sources}
      onAsk={() => {}}
      onFinish={onFinish}
      finishLabel="Selesaikan titik"
    />,
  )
  return onFinish
}

describe('LessonCard: syarat tonton video', () => {
  afterEach(() => {
    mockFlags.strict_node_requirements = false
  })

  it('MVP (flag mati): tanpa syarat tonton, tombol selesai langsung aktif', async () => {
    const onFinish = renderCard()
    expect(screen.queryByRole('progressbar', { name: 'Waktu tonton video' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lewati materi/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Selesaikan titik' }))
    expect(onFinish).toHaveBeenCalledWith(true)
  })

  it('flag aktif: ada kemajuan tonton, tombol selesai terkunci, lewati = tanpa poin', async () => {
    mockFlags.strict_node_requirements = true
    const onFinish = renderCard()
    expect(screen.getByRole('progressbar', { name: 'Waktu tonton video' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Selesaikan titik' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Lewati materi (tanpa poin)' }))
    expect(onFinish).toHaveBeenCalledWith(false)
  })
})
