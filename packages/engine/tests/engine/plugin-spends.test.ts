import { describe, expect, it } from 'vitest'
import { definePlugin } from '../../src/plugin.ts'
import { renderAction } from '../../src/screen.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'

/** A stall that sells apples: a plugin command that spends coins, and says so for its button's price. */
const stall = definePlugin({
  id: 'stall',
  version: 1,
  commands: {
    apple: {
      spends: (_state, args) => ({ coins: Number(args.price ?? 1) }),
      run: (state) => state,
    },
    look: { run: (state) => state },
  },
})

const game = (): Game => ({ ...fixture(), plugins: [stall] })

describe('a plugin command’s spends', () => {
  it('price its button as an activity’s cost does, written through the stat’s format', () => {
    const g = game()
    const button = renderAction(begin(g), g, { id: 'apple', label: 'Buy an apple', command: { type: 'custom', name: 'stall/apple', with: { price: 2 } } })
    expect(button.price).toEqual({ stats: [{ id: 'coins', amount: 2, text: '2c' }], text: '2c' })
  })

  it('leave a command that spends nothing unpriced', () => {
    const g = game()
    expect(renderAction(begin(g), g, { id: 'look', label: 'Look', command: { type: 'custom', name: 'stall/look' } }).price).toBeUndefined()
  })
})
