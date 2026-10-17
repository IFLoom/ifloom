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
      { id: 'study', effects: [{ kind: 'stat', stat: 'intelligence', by: 1 }] },
      { id: 'reset', effects: [{ kind: 'stat', stat: 'intelligence', to: 2 }] },
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
    expect(holds(wearing(sharper), { level: 'intelligence', gte: 1 }, sharper)).toBe(true)
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

describe('rounding a stat as it reads', () => {
  /** The game with `round` on some stats, by id. */
  const roundedGame = (modifiers: StatModifier[], round: Record<string, 'none' | 'floor' | 'round' | 'ceil'>, max?: number): Game => {
    const g = game(modifiers)
    return { ...g, stats: g.stats!.map((stat) => (round[stat.id] ? { ...stat, round: round[stat.id], ...(max !== undefined ? { max } : {}) } : stat)) }
  }

  it('reads as it is unless the stat says, and rounds each way it can', () => {
    const half = [{ stat: 'intelligence', multiply: 1.5 }]
    // 5 × 1.5 = 7.5.
    expect(statValue(wearing(game(half)), game(half), 'intelligence')).toBe(7.5)
    for (const [how, reads] of [['none', 7.5], ['floor', 7], ['round', 8], ['ceil', 8]] as const) {
      const g = roundedGame(half, { intelligence: how })
      const on = wearing(g)
      expect(statValue(on, g, 'intelligence')).toBe(reads)
      expect(view(on, g).statsById.intelligence).toMatchObject({ value: reads, text: String(reads) })
    }
  })

  it('rounds after modifiers and derive, and never the kept value', () => {
    const g = roundedGame([{ stat: 'intelligence', add: 0.4 }], { intelligence: 'round', wits: 'floor' })
    const on = wearing(g)
    // 5 + 0.4 reads 5; the kept value stays 5.
    expect(statValue(on, g, 'intelligence')).toBe(5)
    expect(on.stats.intelligence).toBe(5)
    // A derived stat reads its inputs rounded: 5 × 2, not 5.4 × 2.
    expect(statValue(on, g, 'wits')).toBe(10)
    const study = apply(on, g, { type: 'activity', id: 'study' }).state
    expect(study.stats.intelligence).toBe(6)
    expect(statValue(study, g, 'intelligence')).toBe(6)
    // A derived stat rounds its own result: 2.5 × 1.3 = 3.25 floors to 3.
    const scaled = roundedGame([], { wits: 'floor' })
    const derived = { ...scaled, stats: scaled.stats!.map((stat) => (stat.id === 'wits' ? { ...stat, derive: { scale: 'luck', by: 1.3 } } : stat)) }
    expect(statValue(begin(derived, { stats: { intelligence: 5, coins: 3, luck: 2.5 } }), derived, 'wits')).toBe(3)
  })

  it('holds the rounded value to the range afterwards', () => {
    // 5 × 1.99 = 9.95; held to 9.5 before rounding, ceil gives 10, and the range holds it at 9.5.
    const g = roundedGame([{ stat: 'intelligence', multiply: 1.99 }], { intelligence: 'ceil' }, 9.5)
    expect(statValue(wearing(g), g, 'intelligence')).toBe(9.5)
  })
})
