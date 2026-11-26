import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatResponse } from '../lib/api.types'
import AgentPanel, { AGENT_NAME } from './AgentPanel'

const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))

let reply: ChatResponse
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => json(reply)))
})
afterEach(() => vi.unstubAllGlobals())

async function askOnce(text: string) {
  const user = userEvent.setup()
  render(<AgentPanel cityId="kota-a" />)
  await user.type(screen.getByLabelText(`Tanya ${AGENT_NAME}`), text)
  await user.click(screen.getByRole('button', { name: 'Tanya' }))
}

describe('AgentPanel (Saloka)', () => {
  it('nama Saloka dan keterangan asisten AI di kepala panel', () => {
    reply = { answer: '', grounded: false, citations: [], refusal_reason: null, suggestions: [], intent: 'question' }
    render(<AgentPanel cityId="kota-a" />)
    expect(AGENT_NAME).toBe('Saloka')
    expect(screen.getByText(/Asisten AI/)).toBeInTheDocument()
  })

  it('jawaban bersumber → label "Dijawab AI" dan jumlah sumber', async () => {
    reply = {
      answer: 'Jawaban [1].',
      grounded: true,
      citations: [{ chunk_id: 'a-001', title: 'Sumber A', url: 'https://contoh.test/a' }],
      refusal_reason: null,
      suggestions: [],
      intent: 'question',
    }
    await askOnce('Apa itu A?')
    const log = screen.getByRole('log')
    expect(await within(log).findByText('Dijawab AI')).toBeInTheDocument()
    expect(within(log).getByText('1 sumber')).toBeInTheDocument()
  })

  it('penolakan → tanpa label AI', async () => {
    reply = {
      answer: 'Maaf, aku belum punya informasi tentang itu.',
      grounded: false,
      citations: [],
      refusal_reason: 'out_of_scope',
      suggestions: [],
      intent: 'question',
    }
    await askOnce('Siapa presiden Mars?')
    const log = screen.getByRole('log')
    expect(await within(log).findByText('Belum ada sumber yang cocok')).toBeInTheDocument()
    expect(within(log).queryByText('Dijawab AI')).not.toBeInTheDocument()
  })

  it('basa-basi → label "Pesan pemandu" dan saran pertanyaan, tanpa label AI', async () => {
    reply = {
      answer: 'Halo! Aku Saloka.',
      grounded: false,
      citations: [],
      refusal_reason: null,
      suggestions: ['Apa itu A?'],
      intent: 'small_talk',
    }
    await askOnce('halo')
    const log = screen.getByRole('log')
    expect(await within(log).findByText('Pesan pemandu')).toBeInTheDocument()
    expect(within(log).queryByText('Dijawab AI')).not.toBeInTheDocument()
    expect(within(log).queryByText('Belum ada sumber yang cocok')).not.toBeInTheDocument()
    expect(within(log).getByRole('button', { name: 'Apa itu A?' })).toBeInTheDocument()
  })

  it('jawaban bersumber menampilkan saran "Tanya lagi" yang bisa diklik', async () => {
    reply = {
      answer: 'Jawaban [1].',
      grounded: true,
      citations: [{ chunk_id: 'a-001', title: 'Sumber A', url: null }],
      refusal_reason: null,
      suggestions: ['Siapa pembuat A?'],
      intent: 'question',
    }
    await askOnce('Apa itu A?')
    const log = screen.getByRole('log')
    expect(await within(log).findByText('Tanya lagi:')).toBeInTheDocument()
    await userEvent.setup().click(within(log).getByRole('button', { name: 'Siapa pembuat A?' }))
    expect(await within(log).findByText('Siapa pembuat A?', { selector: 'p, div, span' })).toBeInTheDocument()
  })
})
