import { describe, expect, it } from 'vitest'
import type { Game } from '../../src/game.ts'
import { describeProblem } from '../../src/check.ts'
import { writeEntity } from '../../src/entities.ts'
import { startingState } from '../../src/intake.ts'
import { definePlugin } from '../../src/plugin.ts'
import { fixture, loadWhole } from '../fixtures/town.ts'

/** A pocket that keeps a list of photos, and carries them, and the photos made in play, into a New Game+. */
const pocket = definePlugin<{ photos: string[] }>({
  id: 'pocket',
  version: 1,
  start: () => ({ photos: [] }),
  carry: (fresh, from, { get, set }) => {
    let next = fresh
    for (const ref of get(from).photos) {
      const [kind, id] = ref.split(':')
      const record = from.entities?.[kind]?.[id]
      if (record) next = writeEntity(next, ref, record)
    }
    return set({ photos: get(from).photos }, next)
  },
})

function game(carryOver: Game['carryOver']): Game {
  return {
    ...fixture(),
    kinds: [{ id: 'photo', label: 'Photo' }],
    plugins: [...(fixture().plugins ?? []), pocket],
    carryOver,
  }
}

/** A game played for a while: stats up, kv keys set and a photo taken and pocketed. */
function played(g: Game) {
  const state = startingState(g)
  return {
    ...state,
    stats: { ...state.stats, intelligence: 40, coins: 2000, luck: 7 },
    kv: { ...state.kv, readTheLetter: true, metRosa: 'twice', at: 'shop' },
    entities: { photo: { '#1': { name: 'The pier' } } },
    created: { photo: 1 },
    plugins: { ...state.plugins, pocket: { version: 1, state: { photos: ['photo:#1'] } } },
    turn: 12,
  }
}

describe('New Game+', () => {
  it('copies only the stats and kv keys carryOver lists', () => {
    const g = game({ stats: ['intelligence'], kv: ['readTheLetter'] })
    const plus = startingState(g, { carry: played(g) })
    expect(plus.stats).toEqual({ intelligence: 40, coins: 3, luck: 0 })
    expect(plus.kv).toEqual({ phase: 'open', readTheLetter: true })
    expect(plus.turn).toBe(0)
  })

  it('holds a copied stat to its range', () => {
    const g = game({ stats: ['coins'] })
    expect(startingState(g, { carry: played(g) }).stats.coins).toBe(999)
  })

  it('lets each plugin carry its own state, and the entities made in play it keeps', () => {
    const g = game(undefined)
    const plus = startingState(g, { carry: played(g) })
    expect(plus.plugins.pocket.state).toEqual({ photos: ['photo:#1'] })
    expect(plus.entities).toEqual({ photo: { '#1': { name: 'The pier' } } })
  })

  it('copies no stats or kv keys from a game with no carryOver, and lets given kv keys win', () => {
    expect(startingState(game(undefined), { carry: played(game(undefined)) }).kv).toEqual({ phase: 'open' })
    const g = game({ kv: ['metRosa'] })
    expect(startingState(g, { carry: played(g), kv: { metRosa: 'never' } }).kv).toEqual({ phase: 'open', metRosa: 'never' })
  })

  it('is checked by the loader: unknown stats, and stats that are not the player’s', () => {
    const { scenes: _s, introScene: _in, storylines: _t, actions: _a, actions: _ac, stats, ...base } = fixture()
    const problems = loadWhole(
      [
        { name: 'base', kinds: [{ id: 'staff', label: 'Staff', plural: 'Staff' }], carryOver: { stats: ['intelligence', 'charm'] } },
        { name: 'core', stats },
      ],
      { ...base },
    ).problems.map(describeProblem)
    expect(problems).toEqual(['base · carryOver · unknown stat "charm"'])
  })
})
