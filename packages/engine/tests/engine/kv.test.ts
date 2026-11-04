import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { applyEffects } from '../../src/reduce.ts'
import { fillTokens } from '../../src/prose.ts'
import { checkGame } from '../../src/check.ts'
import { loadGame } from '../../src/loader.ts'
import { startingState } from '../../src/intake.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'

/** The town, with Ana on the staff and a minigame of counting. */
function town(): Game {
  const base = fixture()
  return {
    ...base,
    kinds: [{ id: 'staff', label: 'Staff' }],
    entities: [{ id: 'ana', of: 'staff', name: 'Ana', kv: { role: 'cook' } }],
    minigames: [{ id: 'count', start: 'go', kv: { score: 0 }, states: { go: { final: {} } } }],
  }
}

describe('one kv vocabulary, with whose store in `of`', () => {
  it('reads and writes the player’s, an entity’s, a storyline’s and the running minigame’s keys', () => {
    const game = town()
    const playing = { ...begin(game), minigame: { id: 'count', state: 'go', elapsed: 0, kv: { score: 0 }, steps: 0 } }
    const state = applyEffects(playing, game, [
      { kv: 'visits', by: 2 },
      { kv: 'role', of: 'staff:ana', to: 'waiter' },
      { kv: 'visits', of: 'storyline:rosa', by: 1 },
      { kv: 'score', of: 'minigame', by: 3 },
    ])
    expect(state.kv.visits).toBe(2)
    expect(state.storylines.rosa.kv.visits).toBe(1)
    expect(state.minigame?.kv.score).toBe(3)
    expect(holds(state, game, { kv: 'role', of: 'staff:ana', is: 'waiter' })).toBe(true)
    expect(holds(state, game, { kv: 'visits', of: 'storyline:rosa', gte: 1 })).toBe(true)
    expect(holds(state, game, { kv: 'score', of: 'minigame', gte: 3 })).toBe(true)
    // With no minigame running, its keys aren't there to read or write.
    expect(holds({ ...state, minigame: null }, game, { kv: 'score', of: 'minigame' })).toBe(false)
  })

  it('takes a list in `is`, for any one of them', () => {
    const game = town()
    const state = begin(game, { kv: { phase: 'open' } })
    expect(holds(state, game, { kv: 'phase', is: ['arrival', 'open'] })).toBe(true)
    expect(holds(state, game, { kv: 'phase', is: ['arrival'] })).toBe(false)
  })

  it('reads a key nobody has set as 0 in `is`, and as nothing else', () => {
    const game = town()
    const state = begin(game)
    expect(holds(state, game, { kv: 'swipe', is: 0 })).toBe(true)
    expect(holds(state, game, { kv: 'swipe', is: [0, 1] })).toBe(true)
    expect(holds(state, game, { kv: 'swipe', is: 1 })).toBe(false)
    expect(holds(state, game, { kv: 'swipe', is: false })).toBe(false)
    expect(holds(state, game, { kv: 'swipe', is: '' })).toBe(false)
    expect(holds(state, game, { kv: 'swipe' })).toBe(false)
    expect(holds(state, game, { kv: 'mood', of: 'staff:ana', is: 0 })).toBe(true)
    expect(holds(state, game, { kv: 'visits', of: 'storyline:rosa', is: 0 })).toBe(true)
    // A key set to text is that text, not 0.
    expect(holds(state, game, { kv: 'role', of: 'staff:ana', is: 0 })).toBe(false)
  })

  it('draws a whole number from `random`, seeded by the save, the same on every replay', () => {
    const game = town()
    const once = applyEffects(begin(game), game, [{ kv: 'dice', random: [1, 6] }])
    const again = applyEffects(begin(game), game, [{ kv: 'dice', random: [1, 6] }])
    expect(once.kv.dice).toBe(again.kv.dice)
    expect(once.kv.dice).toBeGreaterThanOrEqual(1)
    expect(once.kv.dice).toBeLessThanOrEqual(6)
  })

  it('prints a key with {{kv:key}}, someone else’s with of', () => {
    const game = town()
    const state = { ...begin(game, { kv: { visits: 4 } }), storylines: { ...begin(game).storylines, rosa: { closedUntil: null, kv: { visits: 2 } } } }
    expect(fillTokens(state, game, '{{visits}}, {{kv:visits}}, {{kv:visits of=storyline:rosa}} and {{kv:role of=staff:ana}}')).toBe('4, 4, 2 and cook')
  })

  it('starts a new game with the content’s kv, under what startingState is given', () => {
    const { game, problems } = loadGame(
      [{ name: 'story', kv: { phase: 'arrival', lives: 3 }, scenes: [{ id: 'door', body: [], choices: [] }], introScene: 'door' }],
      { id: 'yard', title: 'Yard' },
    )
    expect(problems).toEqual([])
    expect(startingState(game).kv).toEqual({ phase: 'arrival', lives: 3 })
    expect(startingState(game, { kv: { lives: 1 } }).kv).toEqual({ phase: 'arrival', lives: 1 })
  })

  it('reports a storyline, a kind or a minigame key that isn’t there', () => {
    const game = {
      ...town(),
      actions: [
        {
          id: 'x',
          effects: [
            { kv: 'met', of: 'storyline:nobody', to: true },
            { kv: 'lives', of: 'minigame', by: 1 },
          ],
        },
      ],
    }
    const problems = checkGame(game).problems.map((problem) => problem.what)
    expect(problems).toEqual(expect.arrayContaining(['unknown storyline "nobody"', 'minigame key "lives" is not in any minigame\'s kv']))
  })
})
