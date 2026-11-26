import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetSpeechForTest, speak, voiceSource } from './speech'

const played: string[] = []
const spoken: string[] = []

class FakeAudio {
  src: string
  constructor(src: string) {
    this.src = src
  }
  play() {
    played.push(this.src)
    return Promise.resolve()
  }
  pause() {}
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  played.length = 0
  spoken.length = 0
  __resetSpeechForTest()
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('URL', { ...URL, createObjectURL: (b: Blob) => `blob:${b.size}`, revokeObjectURL: () => {} })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      lang = ''
      voice: unknown = null
      text: string
      constructor(text: string) {
        this.text = text
      }
    },
  )
  vi.stubGlobal('speechSynthesis', {
    cancel: () => {},
    getVoices: () => [],
    speak: (u: { text: string }) => spoken.push(u.text),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('suara Saloka', () => {
  it('memakai suara ElevenLabs dari /api/tts dan menyimpan cache per kalimat', async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(['mp3']), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    speak('Halo, aku Saloka.')
    await flush()
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/tts')
    expect(JSON.parse(String(init.body))).toEqual({ text: 'Halo, aku Saloka.' })
    expect(played).toHaveLength(1)
    expect(voiceSource()).toBe('saloka')

    speak('Halo, aku Saloka.')
    await flush()
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1) // dari cache
    expect(played).toHaveLength(2)
    expect(spoken).toEqual([])
  })

  it('503 (belum dikonfigurasi) → suara peramban, dan tidak mencoba server lagi', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    speak('Kalimat satu.')
    await flush()
    await flush()
    expect(spoken).toEqual(['Kalimat satu.'])
    expect(voiceSource()).toBe('peramban')
    speak('Kalimat dua.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(spoken).toEqual(['Kalimat satu.', 'Kalimat dua.'])
  })

  it('jaringan gagal → suara peramban untuk kalimat itu', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))
    speak('Tetap terdengar.')
    await flush()
    await flush()
    expect(spoken).toEqual(['Tetap terdengar.'])
    expect(played).toEqual([])
  })

  it('kalimat baru menggantikan yang lama (yang lama tidak diputar)', async () => {
    let release: (r: Response) => void = () => {}
    const slow = new Promise<Response>((r) => (release = r))
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => slow)
      .mockImplementation(async () => new Response('baru', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    speak('Lama.')
    speak('Baru.')
    release(new Response('audio-lama-panjang', { status: 200 }))
    await flush()
    await flush()
    await flush()
    expect(played).toEqual(['blob:4']) // hanya audio kalimat baru
  })
})
