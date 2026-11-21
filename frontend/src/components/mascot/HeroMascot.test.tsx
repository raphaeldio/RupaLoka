import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HeroMascot from './HeroMascot'
import { CLICK_LINES, GREETING, lookToward } from './lines'

describe('lookToward', () => {
  it('nol bila kursor di pusat', () => {
    expect(lookToward(100, 100, 100, 100)).toEqual({ x: 0, y: 0 })
  })
  it('arah benar dan dibatasi panjang 1', () => {
    const l = lookToward(0, 0, 1000, 0)
    expect(l.x).toBeCloseTo(1)
    expect(l.y).toBeCloseTo(0)
    const near = lookToward(0, 0, 0, -55, 220)
    expect(near.y).toBeCloseTo(-0.25)
  })
})

describe('HeroMascot', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('menyapa saat dibuka dan berganti kalimat saat diklik', () => {
    render(<HeroMascot />)
    act(() => vi.advanceTimersByTime(800))
    expect(screen.getByText(GREETING)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /maskot rupaloka/i }))
    expect(screen.getByText(CLICK_LINES[0])).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /maskot rupaloka/i }))
    expect(screen.getByText(CLICK_LINES[1])).toBeInTheDocument()
  })
})
