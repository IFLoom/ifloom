import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { startingState } from '../../src/intake.ts'
import { replay } from '../../src/runner.ts'
import { checkGame } from '../../src/check.ts'
import { SCHEMA } from '../../src/upgrade.ts'
import type { Command, GameState } from '../../src/types.ts'

const cafe: Content = {
  name: 'cafe',
  changes: { stats: ['coins', 'energy', 'luck', 'skill'] },
  kinds: [{ id: 'staff', label: 'Staff', unique: true }],
  entities: [{ id: 'ana', of: 'staff', name: 'Ana', stats: { skill: 2 } }],
  stats: [
    { id: 'coins', label: 'Coins', start: 10, max: 999, format: { one: '{n} coin', other: '{n} coins' } },
    { id: 'energy', label: 'Energy', start: 5 },
    { id: 'luck', label: 'Luck', visible: { kv: 'lucky' } },
    { id: 'skill', of: 'staff', label: 'Skill' },
  ],
  timers: [{ id: 'kettle', ms: 1000, effects: [{ stat: 'energy', by: 1 }] }],
  actions: [
    {
      id: 'sell',
      label: 'Sell',
      effects: [
        { stat: 'coins', by: 30 },
        { stat: 'energy', by: -1 },
      ],
    },
    { id: 'pay', label: 'Pay', effects: [{ stat: 'coins', by: -1 }] },
    { id: 'train', label: 'Train', effects: [{ stat: 'skill', of: 'staff:ana', by: 3 }] },
    { id: 'gamble', label: 'Gamble', effects: [{ stat: 'luck', by: 4 }] },
    { id: 'look', label: 'Look' },
    { id: 'boil', label: 'Boil', effects: [{ timer: 'kettle' }] },
  ],
}

const { game } = loadGame([cafe], { id: 'cafe', title: 'Café' })

const act = (id: string): Command => ({ type: 'action', id })

function play(state: GameState, ...commands: Command[]): GameState {
  return commands.reduce((at, command) => {
    const result = apply(at, game, command)
    if (!result.ok) throw new Error(`${command.type}: ${result.reason}`)
    return result.state
  }, state)
}

describe('view.changes', () => {
  it('lists the player’s stats the last command moved, in their own words, named when the words don’t say', () => {
    const state = play(startingState(game), act('sell'))
    expect(view(state, game).changes).toEqual([
      { stat: 'coins', from: 10, to: 40, by: 30, label: 'Coins', text: '+30 coins' },
      { stat: 'energy', from: 5, to: 4, by: -1, label: 'Energy', text: '-1', name: 'Energy' },
    ])
    expect(view(play(state, act('pay')), game).changes).toEqual([{ stat: 'coins', from: 40, to: 39, by: -1, label: 'Coins', text: '-1 coin' }])
  })

  it('lists an entity’s stat, with whose it is, named by them', () => {
    expect(view(play(startingState(game), act('train')), game).changes).toEqual([
      { stat: 'skill', of: 'staff:ana', from: 2, to: 5, by: 3, label: 'Skill', text: '+3', name: 'Ana' },
    ])
  })

  it('leaves out a stat the player can’t see', () => {
    expect(view(play(startingState(game), act('gamble')), game).changes).toEqual([])
    expect(view(play(startingState(game, { kv: { lucky: true } }), act('gamble')), game).changes).toMatchObject([{ stat: 'luck', by: 4 }])
  })

  it('is emptied by a command that moves nothing, and kept by a tick that moves nothing', () => {
    const sold = play(startingState(game), act('sell'), act('boil'))
    expect(view(sold, game).changes).toEqual([])
    const again = play(sold, act('sell'))
    const ticked = play(again, { type: 'tick', ms: 100 })
    expect(view(ticked, game).changes).toEqual(view(again, game).changes)
    // A tick that moves a stat replaces the list.
    const rang = play(ticked, { type: 'tick', ms: 1000 })
    expect(view(rang, game).changes).toEqual([{ stat: 'energy', from: 3, to: 4, by: 1, label: 'Energy', text: '+1', name: 'Energy' }])
    expect(view(play(rang, act('look')), game).changes).toEqual([])
  })

  it('tracks nothing when no content names a stat', () => {
    const { game: untracked } = loadGame([{ ...cafe, changes: undefined }], { id: 'cafe', title: 'Café' })
    const state = apply(startingState(untracked), untracked, act('sell'))
    expect(state.ok && view(state.state, untracked).changes).toEqual([])
  })

  it('tracks only the stats named, an entity stat on every entity', () => {
    const { game: some } = loadGame(
      [
        { ...cafe, changes: { stats: ['energy'] } },
        { name: 'more', changes: { stats: ['skill'] } },
      ],
      { id: 'cafe', title: 'Café' },
    )
    expect(some.changes).toEqual({ stats: ['energy', 'skill'] })
    const run = (state: GameState, id: string) => {
      const result = apply(state, some, act(id))
      if (!result.ok) throw new Error(result.reason)
      return result.state
    }
    expect(view(run(startingState(some), 'sell'), some).changes).toMatchObject([{ stat: 'energy', by: -1 }])
    expect(view(run(startingState(some), 'train'), some).changes).toMatchObject([{ stat: 'skill', of: 'staff:ana', by: 3 }])
  })

  it('adds a pack’s tracked stats to the content’s', () => {
    const { game: packed } = loadGame(
      [{ ...cafe, changes: { stats: ['coins'] } }],
      { id: 'cafe', title: 'Café' },
      {
        packs: [{ id: 'mod:energy', schema: SCHEMA, changes: { stats: ['energy', 'coins'] } }],
      },
    )
    expect(packed.changes).toEqual({ stats: ['coins', 'energy'] })
  })

  it('reports a tracked id that is no stat', () => {
    const { game: wrong } = loadGame([{ ...cafe, changes: { stats: ['coins', 'cions'] } }], { id: 'cafe', title: 'Café' })
    expect(checkGame(wrong).problems.map((problem) => problem.what)).toContain('stats names "cions", which is no stat')
  })

  it('replays the same', () => {
    const commands = [act('sell'), act('train'), act('boil'), { type: 'tick', ms: 1000 } as Command]
    const start = startingState(game, { seed: 3 })
    const played = play(start, ...commands)
    const replayed = replay(game, { game: game.id, start, commands })
    expect(replayed.ok && replayed.value.changes).toEqual(played.changes)
  })
})
