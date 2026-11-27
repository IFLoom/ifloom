import { describe, expect, it } from 'vitest'
import type { Game } from '../../src/game.ts'
import { describeProblem } from '../../src/check.ts'
import { startingState } from '../../src/intake.ts'
import { heldBy, heldCount } from '../../src/holdings.ts'
import { fixture, loadWhole } from '../fixtures/town.ts'

function game(carryOver: Game['carryOver']): Game {
  return {
    ...fixture(),
    kinds: [
      { id: 'thing', label: 'Thing' },
      { id: 'photo', label: 'Photo' },
    ],
    entities: [
      { id: 'umbrella', of: 'thing', name: 'Umbrella', description: 'Black, with a bent spoke.', at: 'player' },
      { id: 'bun', of: 'thing', name: 'Bun', description: 'From the bakery.' },
    ],
    carryOver,
  }
}

/** A game played for a while: stats up, kv keys set, things bought, the umbrella lost and a photo taken. */
function played(g: Game) {
  const state = startingState(g)
  return {
    ...state,
    stats: { ...state.stats, intelligence: 40, coins: 2000, luck: 7 },
    kv: { ...state.kv, readTheLetter: true, metRosa: 'twice', at: 'shop' },
    entities: { photo: { '#1': { name: 'The pier' } } },
    created: { photo: 1 },
    held: { player: { 'thing:umbrella': 0, 'thing:bun': 3, 'photo:#1': 1 } },
    turn: 12,
  }
}

describe('New Game+', () => {
  it('copies only the stats, kv keys and things held carryOver lists', () => {
    const g = game({ stats: ['intelligence'], kv: ['readTheLetter'], held: ['thing:bun'] })
    const plus = startingState(g, { carry: played(g) })
    expect(plus.stats).toEqual({ intelligence: 40, coins: 3, luck: 0 })
    expect(plus.kv).toEqual({ phase: 'open', readTheLetter: true })
    expect(heldBy(plus, g, 'player')).toEqual([
      { ref: 'thing:umbrella', count: 1 },
      { ref: 'thing:bun', count: 3 },
    ])
    expect(plus.entities).toEqual({})
    expect(plus.turn).toBe(0)
  })

  it('holds a copied stat to its range, and copies everything held with all, things made in play too', () => {
    const g = game({ stats: ['coins'], held: 'all' })
    const plus = startingState(g, { carry: played(g) })
    expect(plus.stats.coins).toBe(999)
    expect(heldCount(plus, g, 'thing:umbrella', 'player')).toBe(0)
    expect(heldBy(plus, g, 'player')).toEqual([
      { ref: 'thing:bun', count: 3 },
      { ref: 'photo:#1', count: 1 },
    ])
    expect(plus.entities).toEqual({ photo: { '#1': { name: 'The pier' } } })
    expect(plus.created).toEqual({ photo: 1 })
  })

  it('copies nothing from a game with no carryOver, and lets given kv keys win', () => {
    expect(startingState(game(undefined), { carry: played(game(undefined)) }).kv).toEqual({ phase: 'open' })
    const g = game({ kv: ['metRosa'] })
    expect(startingState(g, { carry: played(g), kv: { metRosa: 'never' } }).kv).toEqual({ phase: 'open', metRosa: 'never' })
  })

  it('is checked by the loader: unknown stats and kinds, and stats that are not the player’s', () => {
    const { scenes: _s, introScene: _in, storylines: _t, actions: _a, actions: _ac, stats, ...base } = fixture()
    const problems = loadWhole(
      [
        {
          name: 'base',
          kinds: [{ id: 'staff', label: 'Staff', plural: 'Staff' }],
          carryOver: { stats: ['intelligence', 'charm'], held: ['umbrella', 'staff:ana', 'thing:umbrella'] },
        },
        { name: 'core', stats },
      ],
      {
        ...base,
      },
    ).problems.map(describeProblem)
    expect(problems).toEqual([
      'base · carryOver · unknown stat "charm"',
      'base · carryOver · unknown entity "umbrella": name one as "kind:id"',
      'base · carryOver · unknown kind "thing"',
    ])
  })
})
