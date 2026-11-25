import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import type { Game } from '../../src/game.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { formatStat, lackingLine, statOf, statLevel, statMax } from '../../src/stats.ts'
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
    const read = apply(state, game, { type: 'action', id: 'read' }).state
    expect(read.stats.intelligence).toBe(100)
    const rich = apply(
      begin(game, { stats: { intelligence: 5, coins: 998, luck: 0 } }),
      { ...game, actions: [{ id: 'find', effects: [{ stat: 'coins', by: 5 }] }] },
      { type: 'action', id: 'find' },
    ).state
    expect(rich.stats.coins).toBe(999)
  })

  it('answers level conditions from hidden levels, never showing them', () => {
    const game = fixture()
    const sharp = begin(game, { stats: { intelligence: 12, coins: 0, luck: 0 } })
    expect(holds(sharp, game, { level: 'intelligence', gte: 1 })).toBe(true)
    expect(holds(sharp, game, { level: 'intelligence', gte: 2 })).toBe(false)
    expect(holds(sharp, game, { level: 'coins', gte: 1 })).toBe(false)
    expect(statLevel(sharp, game, 'intelligence')).toEqual({ level: 1, name: null, next: 20, progress: 0.2 })
    expect(view(sharp, game).statsById.intelligence?.level).toBeUndefined()
  })

  it('shows the stats the player can see, in the declared order', () => {
    const game = fixture()
    expect(view(begin(game), game).stats.map((stat) => stat.key)).toEqual(['intelligence', 'coins'])
    const lucky = begin(game, { kv: { feelingLucky: true } })
    expect(view(lucky, game).stats.map((stat) => stat.label)).toEqual(['Intelligence', 'Coins', 'Luck'])
  })

  it('writes a value through the stat’s format', () => {
    const game = fixture()
    expect(formatStat(statOf(game, 'coins'), 12)).toBe('12c')
    expect(formatStat(statOf(game, 'intelligence'), 12)).toBe('12')
  })

  it('writes 1 and any other number in their own words, when the stat gives both', () => {
    const coins = { id: 'coins', label: 'Coins', format: { one: '{n} coin', other: '{n} coins' }, lacking: { one: 'Need {n} coin.', other: 'Need {n} coins.' } }
    expect([0, 1, 2].map((n) => formatStat(coins, n))).toEqual(['0 coins', '1 coin', '2 coins'])
    const game: Game = { ...fixture(), stats: [coins] }
    expect([1, 3].map((n) => lackingLine(game, 'coins', n))).toEqual(['Need 1 coin.', 'Need 3 coins.'])
  })

  it('reports an effect on a stat the game never declared', () => {
    const game = {
      ...fixture(),
      actions: [{ id: 'train', effects: [{ stat: 'strength', by: 1 }] }],
    }
    expect(problemsOf(game)).toContain('action train: unknown stat "strength"')
  })
})

describe('spending stats', () => {
  const game: Game = {
    ...fixture(),
    stats: [
      { id: 'coins', label: 'Coins', start: 10, max: 999, format: '{n}c', spendable: true, listed: false, lacking: 'Short by a few.' },
      { id: 'puff', label: 'Puff', start: 5, max: { value: 'game/puffMax' }, spendable: true, listed: false },
      { id: 'charm', label: 'Charm', start: 1 },
    ],
    actions: [
      { id: 'cake', cost: { stats: { coins: 4, puff: 2 } } },
      { id: 'feast', cost: { stats: { coins: 40 } } },
      { id: 'run', cost: { stats: { puff: 9 } } },
    ],
  }

  it('prices a button in the stats it spends, each written through its format', () => {
    const house = begin(game, { stats: { coins: 10, puff: 5, charm: 1 } })
    const withButton: Game = { ...game, actions: game.actions!.map((action) => (action.id === 'cake' ? { ...action, label: 'Cake' } : action)) }
    const cake = view(house, withButton).actions.find((action) => action.id === 'cake')
    expect(cake?.price?.stats?.map((spent) => spent.text)).toEqual(['4c', '2'])
  })

  it('spends the cost, and refuses in the stat’s own words when it cannot be covered', () => {
    const house = begin(game, { stats: { coins: 10, puff: 5, charm: 1 } })
    const ate = apply(house, game, { type: 'action', id: 'cake' })
    expect(ate.state.stats).toMatchObject({ coins: 6, puff: 3 })
    expect(apply(house, game, { type: 'action', id: 'feast' }).reason).toBe('Short by a few.')
    expect(apply(house, game, { type: 'action', id: 'run' }).reason).toBe('Not enough puff.')
  })

  it('works a moving ceiling out from a named value', () => {
    const ceiling: Game = {
      ...game,
      rules: { values: { puffMax: (state) => 10 + (state.stats.charm ?? 0) } },
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
    const topUp: Game = { ...game, actions: [{ id: 'nap', effects: [{ stat: 'coins', to: 5000 }] }] }
    expect(apply(begin(topUp), topUp, { type: 'action', id: 'nap' }).state.stats.coins).toBe(999)
  })
})

describe('checking declared stats', () => {
  it('reports costs, set effects and ceilings that name what is not there', () => {
    const game: Game = {
      ...fixture(),
      stats: [{ id: 'puff', label: 'Puff', max: { value: 'game/neverRegistered' } }],
      actions: [
        { id: 'buy', cost: { stats: { gold: 1 } } },
        { id: 'rest', effects: [{ stat: 'sleep', to: 1 }] },
      ],
    }
    const problems = problemsOf(game)
    expect(problems).toContain('action buy: spends unknown stat "gold"')
    expect(problems).toContain('action rest: unknown stat "sleep"')
    expect(problems).toContain('stat puff: no game value named "game/neverRegistered"')
  })
})

describe('how a stat is drawn', () => {
  it('passes the range and its ui hints through the view, which is how a UI decides how to draw it', () => {
    const game = {
      ...fixture(),
      stats: [
        { id: 'energy', label: 'Energy', start: 60, ui: { display: 'bar' } },
        { id: 'coins', label: 'Coins', start: 3, min: -50, max: 999 },
      ],
    }
    const shown = view(begin(game), game).statsById
    expect(shown.energy).toMatchObject({ value: 60, min: 0, max: 100, ui: { display: 'bar' } })
    expect(shown.coins).toMatchObject({ min: -50, max: 999 })
    expect('ui' in shown.coins).toBe(false)
  })
})
