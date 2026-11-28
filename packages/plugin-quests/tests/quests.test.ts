import { describe, expect, it } from 'vitest'
import { holds, loadGame, view, whyNot, type Game, type GameState, type Content } from '@ifloom/engine'
import { freshState, loadChecked, play } from '@ifloom/engine/testing'
import { quests, type QuestDef, type QuestsView } from '../src/index.ts'

const plugin = quests()

/** Bread for breakfast: get hungry, go out, buy a loaf. A letter that only a scene can start. */
const bread: QuestDef = {
  id: 'bread',
  name: 'Bread for breakfast',
  description: 'There is nothing in the house.',
  starts: { kv: 'hungry' },
  stages: [
    { id: 'out', hint: 'Go out to the street.', done: { kv: 'out' } },
    { id: 'buy', hint: 'Buy a loaf.', done: { kv: 'loaf' } },
  ],
}
const letter: QuestDef = {
  id: 'letter',
  name: 'The letter',
  stages: [{ id: 'post', hint: 'Post it.', done: { kv: 'posted' } }],
}
const secret: QuestDef = { id: 'secret', name: 'A secret', secret: true, starts: { kv: 'never' }, stages: [{ id: 'x', hint: '', done: { kv: 'never' } }] }

function game(extra: QuestDef[] = []): Game {
  const town: Content = {
    name: 'town',
    actions: [
      { id: 'getHungry', effects: [{ kv: 'hungry', to: true }] },
      // Out and in again: all the quest asks of where the player is.
      { id: 'goOut', effects: [{ kv: 'out', to: true }] },
      { id: 'goIn', effects: [{ kv: 'out', to: false }] },
      { id: 'buyLoaf', effects: [{ kv: 'loaf', to: true }] },
      { id: 'findLetter', effects: [quests.start('letter')] },
      { id: 'post', effects: [{ kv: 'posted', to: true }] },
      { id: 'eat', effects: [{ kv: 'loaf', to: false }] },
    ],
    data: { quests: { quests: [bread, letter, secret, ...extra] } },
  }
  return loadChecked([town], {
    id: 'bread-town',
    title: 'Bread town',

    plugins: [plugin],
  })
}

const act = (id: string) => ({ type: 'action' as const, id })
const shown = (state: GameState, g: Game) => view(state, g).plugins.quests as QuestsView

describe('quests', () => {
  it('start when their condition first holds, and show the first stage’s hint', () => {
    const g = game()
    const fresh = freshState(g)
    expect(shown(fresh, g)).toMatchObject({ active: [], done: [], toFind: 2, updates: 0 })
    const hungry = play(fresh, g, act('getHungry'))
    expect(shown(hungry, g).active).toEqual([expect.objectContaining({ id: 'bread', hint: 'Go out to the street.', stage: 0, stages: 2, updated: true })])
    expect(holds(hungry, g, quests.active('bread'))).toBe(true)
  })

  it('move on through each stage in order, and finish', () => {
    const g = game()
    let state = play(freshState(g), g, act('getHungry'), act('buyLoaf'))
    // The loaf is bought, but the street stage comes first.
    expect(shown(state, g).active[0]).toMatchObject({ stage: 0, hint: 'Go out to the street.' })
    state = play(state, g, { type: 'action', id: 'goOut' })
    expect(shown(state, g).done).toEqual([expect.objectContaining({ id: 'bread', hint: '', doneOn: state.turn })])
    expect(holds(state, g, quests.done('bread'))).toBe(true)
    expect(holds(state, g, quests.reached('bread', 'out'))).toBe(true)
  })

  it('keep progress once it is made', () => {
    const g = game()
    let state = play(freshState(g), g, act('getHungry'), { type: 'action', id: 'goOut' })
    state = play(state, g, { type: 'action', id: 'goIn' })
    // Back in the house, the street stage stays done.
    expect(shown(state, g).active[0]).toMatchObject({ stage: 1, hint: 'Buy a loaf.' })
    state = play(state, g, act('buyLoaf'), act('eat'))
    expect(holds(state, g, quests.done('bread'))).toBe(true)
  })

  it('start by effect when they have no condition', () => {
    const g = game()
    const state = play(freshState(g), g, act('findLetter'))
    expect(shown(state, g).active.map((quest) => quest.id)).toEqual(['letter'])
  })

  it('track one quest at a time, and only one the player is doing', () => {
    const g = game()
    const state = play(freshState(g), g, act('getHungry'), act('findLetter'))
    expect(whyNot(state, g, quests.track('secret'))).toBe('You are not doing that.')
    const tracked = play(state, g, quests.track('bread'))
    expect(shown(tracked, g).active.map((quest) => [quest.id, quest.tracked])).toEqual([
      ['bread', true],
      ['letter', false],
    ])
    expect(shown(play(tracked, g, quests.track()), g).active.every((quest) => !quest.tracked)).toBe(true)
  })

  it('offer ready buttons: track or untrack each active quest, and mark all seen while there is news', () => {
    const g = game()
    const state = play(freshState(g), g, act('getHungry'))
    const bread = shown(state, g).active[0]
    expect(bread.track).toMatchObject({ label: 'Track', command: { type: 'custom', name: 'quests/track', with: { id: 'bread' } } })
    const tracked = play(state, g, bread.track!.command)
    expect(shown(tracked, g).active[0]).toMatchObject({ tracked: true, track: { label: 'Untrack' } })
    expect(shown(play(tracked, g, shown(tracked, g).active[0].track!.command), g).active[0].tracked).toBe(false)
    expect(shown(state, g).seen).toMatchObject({ label: 'Mark all seen' })
    const looked = play(state, g, shown(state, g).seen!.command)
    expect(shown(looked, g)).toMatchObject({ updates: 0, seen: null })
  })

  it('count news until the player looks', () => {
    const g = game()
    let state = play(freshState(g), g, act('getHungry'), act('findLetter'))
    expect(shown(state, g).updates).toBe(2)
    state = play(state, g, quests.seen('bread'))
    expect(shown(state, g).updates).toBe(1)
    state = play(state, g, quests.seen(), { type: 'action', id: 'goOut' })
    expect(shown(state, g).active.find((quest) => quest.id === 'bread')?.updated).toBe(true)
    expect(view(state, g).plugins.quests).toMatchObject({ updates: 1 })
  })

  it('report quests that name things the game does not have, against the pack they came from', () => {
    const broken: QuestDef = {
      id: 'broken',
      name: 'Broken',
      storyline: 'nobody',
      starts: { 'quests/nope': true },
      stages: [
        { id: 'a', hint: '', done: { entity: 'thing:moonstone' } },
        { id: 'a', hint: '', done: { kv: 'x' } },
      ],
    }
    const loaded = loadGame([{ name: 'mod', data: { quests: { quests: [broken] } } }], { id: 'g', title: 'g', plugins: [plugin] })
    expect(loaded.problems).toEqual([
      { pack: 'mod', where: 'quests broken', what: 'unknown storyline "nobody"' },
      { pack: 'mod', where: 'quests broken', what: 'stage a: unknown kind "thing"' },
      { pack: 'mod', where: 'quests broken', what: 'starts: no plugin condition named "quests/nope"' },
      { pack: 'mod', where: 'quests broken', what: 'two stages are called "a"' },
    ])
  })

  it('can start off another quest, in the same command', () => {
    const errand: QuestDef = { id: 'errand', name: 'An errand', starts: quests.active('bread'), stages: [{ id: 'go', hint: 'Go.', done: { kv: 'never' } }] }
    const g = game([errand])
    const state = play(freshState(g), g, act('getHungry'))
    expect(shown(state, g).active.map((quest) => quest.id)).toEqual(['bread', 'errand'])
  })
})
