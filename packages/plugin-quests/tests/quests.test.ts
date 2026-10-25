import { describe, expect, it } from 'vitest'
import { apply, holds, loadGame, startingState, view, whyNot, type Game, type GameState, type Content } from '@ifloom/engine'
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
  const loaded = loadGame([town], {
    id: 'bread-town',
    title: 'Bread town',

    plugins: [plugin],
  })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

function run(state: GameState, g: Game, ...commands: Parameters<typeof apply>[2][]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.reason).toBeUndefined()
    state = out.state
  }
  return state
}

const act = (id: string) => ({ type: 'action' as const, id })
const shown = (state: GameState, g: Game) => view(state, g).plugins.quests as QuestsView

describe('quests', () => {
  it('start when their condition first holds, and show the first stage’s hint', () => {
    const g = game()
    const fresh = { ...startingState(g), sceneId: null }
    expect(shown(fresh, g)).toMatchObject({ active: [], done: [], toFind: 2, updates: 0 })
    const hungry = run(fresh, g, act('getHungry'))
    expect(shown(hungry, g).active).toEqual([expect.objectContaining({ id: 'bread', hint: 'Go out to the street.', stage: 0, stages: 2, updated: true })])
    expect(holds(hungry, g, quests.active('bread'))).toBe(true)
  })

  it('move on through each stage in order, and finish', () => {
    const g = game()
    let state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'), act('buyLoaf'))
    // The loaf is bought, but the street stage comes first.
    expect(shown(state, g).active[0]).toMatchObject({ stage: 0, hint: 'Go out to the street.' })
    state = run(state, g, { type: 'action', id: 'goOut' })
    expect(shown(state, g).done).toEqual([expect.objectContaining({ id: 'bread', hint: '', doneOn: state.turn })])
    expect(holds(state, g, quests.done('bread'))).toBe(true)
    expect(holds(state, g, quests.reached('bread', 'out'))).toBe(true)
  })

  it('keep progress once it is made', () => {
    const g = game()
    let state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'), { type: 'action', id: 'goOut' })
    state = run(state, g, { type: 'action', id: 'goIn' })
    // Back in the house, the street stage stays done.
    expect(shown(state, g).active[0]).toMatchObject({ stage: 1, hint: 'Buy a loaf.' })
    state = run(state, g, act('buyLoaf'), act('eat'))
    expect(holds(state, g, quests.done('bread'))).toBe(true)
  })

  it('start by effect when they have no condition', () => {
    const g = game()
    const state = run({ ...startingState(g), sceneId: null }, g, act('findLetter'))
    expect(shown(state, g).active.map((quest) => quest.id)).toEqual(['letter'])
  })

  it('track one quest at a time, and only one the player is doing', () => {
    const g = game()
    const state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'), act('findLetter'))
    expect(whyNot(state, g, quests.track('secret'))).toBe('You are not doing that.')
    const tracked = run(state, g, quests.track('bread'))
    expect(shown(tracked, g).active.map((quest) => [quest.id, quest.tracked])).toEqual([
      ['bread', true],
      ['letter', false],
    ])
    expect(shown(run(tracked, g, quests.track()), g).active.every((quest) => !quest.tracked)).toBe(true)
  })

  it('count news until the player looks', () => {
    const g = game()
    let state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'), act('findLetter'))
    expect(shown(state, g).updates).toBe(2)
    state = run(state, g, quests.seen('bread'))
    expect(shown(state, g).updates).toBe(1)
    state = run(state, g, quests.seen(), { type: 'action', id: 'goOut' })
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
        { id: 'a', hint: '', done: { entity: 'thing:moonstone', at: 'you' } },
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
    const state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'))
    expect(shown(state, g).active.map((quest) => quest.id)).toEqual(['bread', 'errand'])
  })
})
