import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { whyNot, effectsOf } from '../../src/availability.ts'
import { definePlugin } from '../../src/plugin.ts'
import { view } from '../../src/view.ts'
import { checkGame } from '../../src/check.ts'
import { upgradePack, commandUpgrade } from '../../src/upgrade.ts'
import { actionBlocked } from '../../src/action.ts'
import type { ActionDef, Game } from '../../src/game.ts'
import { activities, begin, fixture } from '../fixtures/town.ts'

/** The town, with a few more things to do. */
function town(more: ActionDef[] = []): Game {
  return { ...fixture(), actions: [...activities, ...more] }
}

describe('one kind of button', () => {
  it('has a label, a cost, a reason it is refused and effects, and its button does it by its id', () => {
    const game = town([{ id: 'cake', label: 'Buy a cake', cost: { stats: { coins: 2 } }, effects: [{ kv: 'cake', to: true }] }])
    const button = view(begin(game), game).actions.find((action) => action.id === 'cake')!
    expect(button.command).toEqual({ type: 'action', id: 'cake' })
    expect(button.price?.stats?.map((spent) => spent.amount)).toEqual([2])
    const ate = apply(begin(game), game, button.command).state
    expect(ate.stats.coins).toBe(1)
    expect(ate.kv.cake).toBe(true)
  })

  it('offers only the actions with a label as buttons', () => {
    const game = town()
    expect(view(begin(game), game).actions.map((action) => action.id)).toEqual(['wait'])
    // One with no label is still done by its command.
    expect(apply(begin(game), game, { type: 'action', id: 'read' }).ok).toBe(true)
  })

  it('sends a button with only a command as that command', () => {
    const game = town([{ id: 'out', label: 'Leave', command: { type: 'leave' } }])
    expect(view(begin(game), game).actions.find((action) => action.id === 'out')?.command).toEqual({ type: 'leave' })
  })

  it('runs its command first, then its cost and effects, and is refused as its command is', () => {
    const game = town([
      {
        id: 'study',
        label: 'Study',
        command: { type: 'action', id: 'read' },
        cost: { stats: { coins: 1 } },
        effects: [{ kv: 'studied', to: true }],
      },
    ])
    const state = apply(begin(game), game, { type: 'action', id: 'study' }).state
    expect(state.stats.intelligence).toBe(7)
    expect(state.stats.coins).toBe(2)
    expect(state.kv.studied).toBe(true)
    expect(effectsOf(begin(game), game, { type: 'action', id: 'study' })).toEqual([
      { stat: 'intelligence', by: 2 },
      { stat: 'coins', by: -1 },
      { kv: 'studied', to: true },
    ])
    const tidying = town([{ id: 'sweep', label: 'Sweep', command: { type: 'action', id: 'tidy' } }])
    expect(whyNot(begin(tidying, { kv: { at: 'street' } }), tidying, { type: 'action', id: 'sweep' })).toBe('Not here.')
  })

  it('is once a turn with once, counted in chosen under its id', () => {
    const game = town([{ id: 'pray', label: 'Pray', once: { per: 'turn', reason: 'Once is enough today.' }, effects: [{ kv: 'prayed', by: 1 }] }])
    const once = apply(begin(game), game, { type: 'action', id: 'pray' }).state
    expect(once.chosen.pray).toMatchObject({ n: 1, last: once.turn })
    expect(whyNot(once, game, { type: 'action', id: 'pray' })).toBe('Once is enough today.')
    expect(view(once, game).actions.find((action) => action.id === 'pray')?.disabled).toBe('Once is enough today.')
    const tomorrow = apply(once, game, { type: 'action', id: 'rest' }).state
    expect(whyNot(tomorrow, game, { type: 'action', id: 'pray' })).toBeUndefined()
  })

  it('is once in the game with once per game, refused in the engine’s words when it gives none', () => {
    const game = town([{ id: 'vow', label: 'Make a vow', once: { per: 'game' }, effects: [{ kv: 'vowed', to: true }] }])
    const once = apply(begin(game), game, { type: 'action', id: 'vow' }).state
    const later = apply(once, game, { type: 'action', id: 'rest' }).state
    expect(later.turn).toBeGreaterThan(once.turn)
    expect(whyNot(later, game, { type: 'action', id: 'vow' })).toBe('Already done.')
  })

  it('reads a reason by key from the strings, and the checker reports a key nobody has', () => {
    const game = {
      ...town([
        { id: 'swim', label: 'Swim', blocked: [{ when: { all: [] }, reason: { string: 'tooCold' } }] },
        { id: 'dive', label: 'Dive', blocked: [{ when: { all: [] }, reason: { string: 'noSuchLine' } }] },
      ]),
      strings: { tooCold: 'The water is too cold.' },
    } as Game
    expect(whyNot(begin(game), game, { type: 'action', id: 'swim' })).toBe('The water is too cold.')
    expect(view(begin(game), game).actions.find((action) => action.id === 'swim')?.disabled).toBe('The water is too cold.')
    expect(checkGame(game).problems.map((problem) => `${problem.where}: ${problem.what}`)).toContain('action dive: no string named "noSuchLine"')
  })

  it('is refused while its when fails, and leaves out a command that is itself', () => {
    const game = town([
      { id: 'night', label: 'Look at the stars', when: { kv: 'dark' }, effects: [] },
      { id: 'loop', label: 'Loop', command: { type: 'action', id: 'loop' } },
    ])
    expect(whyNot(begin(game), game, { type: 'action', id: 'night' })).toBe('That is not on offer.')
    expect(apply(begin(game), game, { type: 'action', id: 'loop' }).ok).toBe(true)
    expect(checkGame(game).problems.map((problem) => problem.what)).toContain("an action's command can't be the action itself; give it the effects")
  })

  it('finds a plugin’s action by its id in front: among its buttons, or by its action', () => {
    const stall = definePlugin<null>({
      id: 'stall',
      version: 1,
      actions: () => [{ id: 'bun', label: 'Buy a bun', cost: { stats: { coins: 1 } }, effects: [{ kv: 'bun', to: true }] }],
      action: (_state, id) => (id === 'pie' ? { id: 'pie', effects: [{ kv: 'pie', to: true }] } : undefined),
    })
    const game = { ...town(), plugins: [stall] }
    const bun = view(begin(game), game).actions.find((action) => action.id === 'bun')!
    expect(bun.command).toEqual({ type: 'action', id: 'stall/bun' })
    expect(apply(begin(game), game, bun.command).state.kv.bun).toBe(true)
    expect(apply(begin(game), game, { type: 'action', id: 'stall/pie' }).state.kv.pie).toBe(true)
    expect(whyNot(begin(game), game, { type: 'action', id: 'stall/cake' })).toBe('There is no such thing to do.')
  })

  it('is blocked, asked from code, with its command’s reason', () => {
    const stall = definePlugin<null>({
      id: 'stall',
      version: 1,
      commands: { serve: { whyNot: () => 'The stall is empty.', run: (state) => state } },
    })
    const game: Game = { ...town(), plugins: [stall] }
    expect(actionBlocked(begin(game), game, { id: 'bun', label: 'Buy a bun', effects: [{ kv: 'bun', to: true }], command: { 'stall/serve': true } })).toBe(
      'The stall is empty.',
    )
  })

  it('is stopped by a lock that names its plugin, as the plugin’s commands are', () => {
    const stall = definePlugin<null>({
      id: 'stall',
      version: 1,
      actions: () => [{ id: 'bun', label: 'Buy a bun', effects: [{ kv: 'bun', to: true }] }],
    })
    const game: Game = { ...town(), plugins: [stall], locks: [{ when: { kv: 'closed' }, deny: ['stall/*'], reason: 'The stall is shut.' }] }
    const closed = { ...begin(game), kv: { ...begin(game).kv, closed: true } }
    expect(whyNot(closed, game, { type: 'action', id: 'stall/bun' })).toBe('The stall is shut.')
    expect(whyNot(begin(game), game, { type: 'action', id: 'stall/bun' })).toBeUndefined()
  })
})

describe('activities, from before schema 20', () => {
  it('are actions with no label, and an action that ran one takes it in', () => {
    const v19 = {
      id: 'mod:cafe',
      schema: 19,
      activities: [
        {
          id: 'coffee',
          cost: { stats: { coins: 3 } },
          blocked: [{ when: { kv: 'hadCoffee' }, reason: 'Enough.' }],
          effects: [{ kv: 'hadCoffee', to: true }],
        },
        { id: 'nap', effects: [{ turn: true }] },
      ],
      actions: [{ id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } }],
      locks: [{ when: { kv: 'tired' }, deny: ['activity'], reason: 'Too tired.' }],
      scenes: [{ id: 'bed', body: [], choices: [{ id: 'sleep', command: { type: 'activity', id: 'nap' }, effects: [] }] }],
    }
    const upgraded = upgradePack(v19, [])
    expect(upgraded.ok && upgraded.value).toMatchObject({
      actions: [
        { id: 'coffee', label: 'Buy a coffee', cost: { stats: { coins: 3 } }, blocked: [{ when: { kv: 'hadCoffee' }, reason: 'Enough.' }] },
        { id: 'nap', effects: [{ turn: true }] },
      ],
      locks: [{ when: { kv: 'tired' }, deny: ['action'], reason: 'Too tired.' }],
      scenes: [{ id: 'bed', body: [], choices: [{ id: 'sleep', command: { type: 'action', id: 'nap' }, effects: [] }] }],
    })
    expect(upgraded.ok && 'activities' in upgraded.value).toBe(false)
  })

  it('are done by the action command when an old log replays', () => {
    const upgrade = commandUpgrade([], { schema: 19, plugins: {} })
    expect(upgrade.ok && upgrade.value({ type: 'activity', id: 'wait' })).toEqual({ type: 'action', id: 'wait' })
  })
})
