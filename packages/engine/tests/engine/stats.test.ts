import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import type { Game } from '../../src/game.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { formatStat, statDef, statMax } from '../../src/stats.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { view } from '../../src/view.ts'
import { begin, fixture } from '../fixtures/town.ts'

describe('stats', () => {
  it('starts every declared stat where the game says, and keeps no others', () => {
    const game = fixture()
    expect(startingState(game).stats).toEqual({ intelligence: 5, coins: 3, luck: 0 })
    const none = { ...fixture(), stats: [] }
    expect(startingState(none).stats).toEqual({})
  })

  it('holds a change to the stat’s own range', () => {
    const game = fixture()
    const state = begin(game, { stats: { intelligence: 99, coins: 998, luck: 0 } })
    const read = apply(state, game, { type: 'activity', id: 'read' }).state
    expect(read.stats.intelligence).toBe(100)
    const rich = apply(
      begin(game, { stats: { intelligence: 5, coins: 998, luck: 0 } }),
      { ...game, activities: [{ id: 'find', effects: [{ kind: 'stat', stat: 'coins', by: 5 }] }] },
      { type: 'activity', id: 'find' },
    ).state
    expect(rich.stats.coins).toBe(999)
  })

  it('answers tier conditions from the declared bands, never showing them', () => {
    const game = fixture()
    const sharp = begin(game, { stats: { intelligence: 12, coins: 0, luck: 0 } })
    expect(holds(sharp, { tier: 'intelligence', gte: 1 }, game)).toBe(true)
    expect(holds(sharp, { tier: 'intelligence', gte: 2 }, game)).toBe(false)
    expect(holds(sharp, { tier: 'coins', gte: 1 }, game)).toBe(false)
  })

  it('shows the stats the player can see, in the declared order', () => {
    const game = fixture()
    expect(view(begin(game), game).stats.map((stat) => stat.key)).toEqual(['intelligence', 'coins'])
    const lucky = begin(game, { kv: { feelingLucky: true } })
    expect(view(lucky, game).stats.map((stat) => stat.label)).toEqual(['Intelligence', 'Coins', 'Luck'])
  })

  it('writes a value through the stat’s format', () => {
    const game = fixture()
    expect(formatStat(statDef(game, 'coins'), 12)).toBe('12c')
    expect(formatStat(statDef(game, 'intelligence'), 12)).toBe('12')
  })

  it('reports an effect on a stat the game never declared', () => {
    const game = {
      ...fixture(),
      activities: [{ id: 'train', effects: [{ kind: 'stat' as const, stat: 'strength', by: 1 }] }],
    }
    expect(problemsOf(game)).toContain('activity train: unknown stat "strength"')
  })
})

describe('spending stats', () => {
  const game: Game = {
    ...fixture(),
    stats: [
      { id: 'coins', label: 'Coins', start: 10, max: 999, format: '{n}c', spendable: true, listed: false, lacking: 'Short by a few.' },
      { id: 'puff', label: 'Puff', start: 5, max: { value: 'puffMax' }, spendable: true, listed: false },
      { id: 'charm', label: 'Charm', start: 1 },
    ],
    activities: [
      { id: 'cake', cost: { stats: { coins: 4, puff: 2 } } },
      { id: 'feast', cost: { stats: { coins: 40 } } },
      { id: 'run', cost: { stats: { puff: 9 } } },
    ],
  }

  it('prices a button in the stats it spends, each written through its format', () => {
    const house = begin(game, { stats: { coins: 10, puff: 5, charm: 1 } })
    const withButton: Game = { ...game, actions: [{ id: 'cake', label: 'Cake', command: { type: 'activity', id: 'cake' } }] }
    const cake = view(house, withButton).actions.find((action) => action.id === 'cake')
    expect(cake?.price?.stats?.map((spent) => spent.text)).toEqual(['4c', '2'])
  })

  it('spends the cost, and refuses in the stat’s own words when it cannot be covered', () => {
    const house = begin(game, { stats: { coins: 10, puff: 5, charm: 1 } })
    const ate = apply(house, game, { type: 'activity', id: 'cake' })
    expect(ate.state.stats).toMatchObject({ coins: 6, puff: 3 })
    expect(apply(house, game, { type: 'activity', id: 'feast' }).refused).toBe('Short by a few.')
    expect(apply(house, game, { type: 'activity', id: 'run' }).refused).toBe('Not enough puff.')
  })

  it('works a moving ceiling out from a named value', () => {
    const ceiling: Game = {
      ...game,
      custom: { values: { puffMax: (state) => 10 + (state.stats.charm ?? 0) } },
    }
    const fit = begin(ceiling, { stats: { coins: 0, puff: 0, charm: 5 } })
    expect(statMax(fit, ceiling, 'puff')).toBe(15)
    expect(view(fit, ceiling).statsById.puff).toMatchObject({ value: 0, max: 15 })
    // Another game without the value falls back to the default ceiling.
    expect(statMax(fit, game, 'puff')).toBe(100)
  })

  it('lists only listed stats, and keeps every stat by id for a UI that shows its own', () => {
    const shown = view(begin(game, { stats: { coins: 3, puff: 1, charm: 1 } }), game)
    expect(shown.stats.map((stat) => stat.key)).toEqual(['charm'])
    expect(shown.statsById.coins.text).toBe('3c')
  })

  it('can put a stat at a value, held to its range', () => {
    const topUp: Game = { ...game, activities: [{ id: 'nap', effects: [{ kind: 'stat' as const, stat: 'coins', to: 5000 }] }] }
    expect(apply(begin(topUp), topUp, { type: 'activity', id: 'nap' }).state.stats.coins).toBe(999)
  })
})

describe('checking declared stats', () => {
  it('reports costs, set effects and ceilings that name what is not there', () => {
    const game: Game = {
      ...fixture(),
      stats: [{ id: 'puff', label: 'Puff', max: { value: 'neverRegistered' } }],
      activities: [
        { id: 'buy', cost: { stats: { gold: 1 } } },
        { id: 'rest', effects: [{ kind: 'stat', stat: 'sleep', to: 1 }] },
      ],
    }
    const problems = problemsOf(game)
    expect(problems).toContain('activity buy: spends unknown stat "gold"')
    expect(problems).toContain('activity rest: unknown stat "sleep"')
    expect(problems).toContain('stat puff: no custom value named "neverRegistered"')
  })
})

describe('how a stat is drawn', () => {
  it('passes display and the range through the view, as a number if the game does not say', () => {
    const game = { ...fixture(), stats: [
      { id: 'energy', label: 'Energy', start: 60, display: 'bar' as const },
      { id: 'hearts', label: 'Hearts', start: 3, min: 0, max: 5, display: 'pips' as const },
      { id: 'coins', label: 'Coins', start: 3, min: -50, max: 999 },
    ] }
    const shown = view(begin(game), game).statsById
    expect(shown.energy).toMatchObject({ value: 60, min: 0, max: 100, display: 'bar' })
    expect(shown.hearts).toMatchObject({ value: 3, min: 0, max: 5, display: 'pips' })
    expect(shown.coins).toMatchObject({ min: -50, max: 999, display: 'number' })
  })

  it('reports pips on a range wider than 20', () => {
    const game = { ...fixture(), stats: [
      { id: 'energy', label: 'Energy', display: 'pips' as const },
      { id: 'hearts', label: 'Hearts', max: 20, display: 'pips' as const },
    ] }
    expect(problemsOf(game).filter((line) => line.includes('pips'))).toEqual(['stat energy: display pips needs a range of 20 or less; this one is 100'])
  })
})
