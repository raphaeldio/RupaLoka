import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { npcFor } from '../game/npcs'
import { detailFixture } from '../test/fixtures'
import ItemModal from './ItemModal'

describe('ItemModal dengan NPC', () => {
  it('NPC yang ditemui menceritakan penjelasan item', () => {
    const item = { ...detailFixture.items[0], id: 'item-angklung', short_explanation: 'Angklung dari bambu.' }
    render(
      <ItemModal
        item={item}
        npc={npcFor(item.id)}
        number={1}
        total={3}
        template="Kamu menemukan {item}! {short_explanation}"
        source={undefined}
        onAsk={vi.fn()}
        onContinue={vi.fn()}
      />,
    )
    expect(screen.getByText('Pemain angklung bercerita:')).toBeInTheDocument()
    expect(screen.getByAltText('Pemain angklung')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/Angklung dari bambu\./)
  })

  it('item tanpa NPC khusus ditemani warga Bandung', () => {
    expect(npcFor('item-sri-baduga').label).toBe('Warga Bandung')
    expect(npcFor(undefined).label).toBe('Warga Bandung')
  })
})
