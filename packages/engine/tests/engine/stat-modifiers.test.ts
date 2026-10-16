import { describe, expect, it } from 'vitest'
import { definePlugin, type StatModifier } from '../../src/plugin.ts'
import { holds } from '../../src/condition.ts'
import { apply } from '../../src/reduce.ts'
import { whyNot } from '../../src/availability.ts'
import { view } from '../../src/view.ts'
import { statValue } from '../../src/stats.ts'
import { loadState } from '../../src/intake.ts'
import type { Game } from '../../src/game.ts'
import type { GameState } from '../../src/types.ts'
import { begin, fixture } from '../fixtures/town.ts'

/**
 * A pair of reading glasses: worn, they add to intelligence. What the
 * plugin keeps is only whether they're on; the stat underneath never changes.
 */
const glasses = (modifiers: StatModifier[]) =>
  definePlugin<{ on: boolean }>({
    id: 'glasses',
    version: 1,
    start: () => ({ on: false }),
    effects: { wear: (_state, _args, { set }) => set({ on: true }) },
    statModifiers: (_state, { slice }) => (slice.on ? modifiers : undefined),
  })

function game(modifiers: StatModifier[], more: Partial<Game> = {}): Game {
  const base = fixture()
  return {
    ...base,
    stats: [...base.stats!, { id: 'wits', label: 'Wits', derive: { scale: 'intelligence', by: 2 } }, { id: 'baking', label: 'Baking', of: 'baker' }],
    kinds: [{ id: 'baker', label: 'Baker' }],
    activities: [
      ...base.activities,
      { id: 'put-on', effects: [{ custom: 'glasses/wear' }] },
      { id: 'crossword', cost: { stats: { intelligence: 8 } } },
      { id: 'study', effects: [{ kind: 'stat', key: 'intelligence', by: 1 }] },
      { id: 'reset', effects: [{ kind: 'setStat', key: 'intelligence', to: 2 }] },
    ],
    plugins: [glasses(modifiers)],
    ...more,
  }
}

const wearing = (g: Game, patch: Partial<GameState> = {}) => apply(begin(g, patch), g, { type: 'activity', id: 'put-on' }).state

describe('stat modifiers', () => {
  it('change what the player’s stat reads, everywhere it is read', () => {
    const g = game([{ stat: 'intelligence', add: 4 }])
    const off = begin(g)
    const on = wearing(g)
    expect(statValue(off, g, 'intelligence')).toBe(5)
    expect(statValue(on, g, 'intelligence')).toBe(9)
    expect(holds(on, { stat: 'intelligence', gte: 9 }, g)).toBe(true)
    expect(holds(off, { stat: 'intelligence', gte: 9 }, g)).toBe(false)
    expect(view(on, g).statsById.intelligence).toMatchObject({ value: 9 })
    // Bands read the changed value too: 10 and up is band 1.
    const sharper = game([{ stat: 'intelligence', add: 5 }])
    expect(holds(wearing(sharper), { tier: 'intelligence', gte: 1 }, sharper)).toBe(true)
  })

  it('are never written: effects change the kept value underneath', () => {
    const g = game([{ stat: 'intelligence', add: 4 }])
    const on = wearing(g)
    expect(on.stats.intelligence).toBe(5)
    const studied = apply(on, g, { type: 'activity', id: 'study' }).state
    expect(studied.stats.intelligence).toBe(6)
    expect(statValue(studied, g, 'intelligence')).toBe(10)
    const reset = apply(on, g, { type: 'activity', id: 'reset' }).state
    expect(reset.stats.intelligence).toBe(2)
    expect(statValue(reset, g, 'intelligence')).toBe(6)
  })

  it('sum the adds, then multiply, then hold the value to the stat’s range', () => {
    const g = game([
      { stat: 'intelligence', add: 3 },
      { stat: 'intelligence', multiply: 2 },
      { stat: 'intelligence', add: 2, multiply: 1.5 },
    ])
    // (5 + 3 + 2) × 2 × 1.5
    expect(statValue(wearing(g), g, 'intelligence')).toBe(30)
    const huge = game([{ stat: 'intelligence', add: 500 }])
    expect(statValue(wearing(huge), huge, 'intelligence')).toBe(100)
    const low = game([{ stat: 'intelligence', add: -50 }])
    expect(statValue(wearing(low), low, 'intelligence')).toBe(0)
  })

  it('feed derived stats, which can have modifiers of their own', () => {
    const g = game([{ stat: 'intelligence', add: 1 }])
    expect(statValue(wearing(g), g, 'wits')).toBe(12)
    const both = game([{ stat: 'intelligence', add: 1 }, { stat: 'wits', add: 3 }])
    expect(statValue(wearing(both), both, 'wits')).toBe(15)
  })

  it('let a cost check the changed value, and pay from the kept one', () => {
    const g = game([{ stat: 'intelligence', add: 4 }])
    expect(whyNot(begin(g), g, { type: 'activity', id: 'crossword' })).toBeTruthy()
    const on = wearing(g)
    expect(whyNot(on, g, { type: 'activity', id: 'crossword' })).toBeUndefined()
    const done = apply(on, g, { type: 'activity', id: 'crossword' })
    expect(done.refused).toBeUndefined()
    // 5 kept, less 8, held at 0: the glasses' 4 is still added on top.
    expect(done.state.stats.intelligence).toBe(0)
    expect(statValue(done.state, g, 'intelligence')).toBe(4)
  })

  it('leave entities’ stats alone', () => {
    const g = game([{ stat: 'baking', add: 10 }], {
      entities: [{ id: 'rosa', of: 'baker', name: 'Rosa', stats: { baking: 3 } }],
    })
    const on = wearing(g)
    expect(statValue(on, g, 'baking', 'baker:rosa')).toBe(3)
  })

  it('read nothing from a save that has no state for the plugin', () => {
    const g = game([{ stat: 'intelligence', add: 4 }])
    const { plugins: _gone, ...old } = begin(g)
    const loaded = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (typeof loaded === 'string') throw new Error(loaded)
    expect(statValue(loaded, g, 'intelligence')).toBe(5)
  })
})
