import { describe, expect, it } from 'vitest'
import { apply, holds, loadGame, startingState, view, whyNot, type Game, type GameState, type Content } from '@ifloom/engine'
import { questActive, questDone, questReached, quests, seeQuests, startQuest, trackQuest, type QuestDef, type QuestsView } from '../src/index.ts'

const plugin = quests()

/** Bread for breakfast: get hungry, go out, buy a loaf. A letter that only a scene can start. */
const bread: QuestDef = {
  id: 'bread',
  title: 'Bread for breakfast',
  summary: 'There is nothing in the house.',
  starts: { kv: 'hungry' },
  stages: [
    { id: 'out', hint: 'Go out to the street.', done: { kv: 'out' } },
    { id: 'buy', hint: 'Buy a loaf.', done: { kv: 'loaf' } },
  ],
}
const letter: QuestDef = {
  id: 'letter',
  title: 'The letter',
  stages: [{ id: 'post', hint: 'Post it.', done: { kv: 'posted' } }],
}
const secret: QuestDef = { id: 'secret', title: 'A secret', secret: true, starts: { kv: 'never' }, stages: [{ id: 'x', hint: '', done: { kv: 'never' } }] }

function game(extra: QuestDef[] = []): Game {
  const town: Content = {
    name: 'town',
    activities: [
      { id: 'getHungry', effects: [{ kind: 'kv', key: 'hungry', to: true }] },
      // Out and in again: all the quest asks of where the player is.
      { id: 'goOut', effects: [{ kind: 'kv', key: 'out', to: true }] },
      { id: 'goIn', effects: [{ kind: 'kv', key: 'out', to: false }] },
      { id: 'buyLoaf', effects: [{ kind: 'kv', key: 'loaf', to: true }] },
      { id: 'findLetter', effects: [startQuest('letter')] },
      { id: 'post', effects: [{ kind: 'kv', key: 'posted', to: true }] },
      { id: 'eat', effects: [{ kind: 'kv', key: 'loaf', to: false }] },
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

const act = (id: string) => ({ type: 'activity' as const, id })
const shown = (state: GameState, g: Game) => view(state, g).plugins.quests as QuestsView

describe('quests', () => {
  it('start when their condition first holds, and show the first stage’s hint', () => {
    const g = game()
    const fresh = { ...startingState(g), sceneId: null }
    expect(shown(fresh, g)).toMatchObject({ active: [], done: [], toFind: 2, updates: 0 })
    const hungry = run(fresh, g, act('getHungry'))
    expect(shown(hungry, g).active).toEqual([expect.objectContaining({ id: 'bread', hint: 'Go out to the street.', stage: 0, stages: 2, updated: true })])
    expect(holds(hungry, questActive('bread'), g)).toBe(true)
  })

  it('move on through each stage in order, and finish', () => {
    const g = game()
    let state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'), act('buyLoaf'))
    // The loaf is bought, but the street stage comes first.
    expect(shown(state, g).active[0]).toMatchObject({ stage: 0, hint: 'Go out to the street.' })
    state = run(state, g, { type: 'activity', id: 'goOut' })
    expect(shown(state, g).done).toEqual([expect.objectContaining({ id: 'bread', hint: '', doneOn: state.turn })])
    expect(holds(state, questDone('bread'), g)).toBe(true)
    expect(holds(state, questReached('bread', 'out'), g)).toBe(true)
  })

  it('keep progress once it is made', () => {
    const g = game()
    let state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'), { type: 'activity', id: 'goOut' })
    state = run(state, g, { type: 'activity', id: 'goIn' })
    // Back in the house, the street stage stays done.
    expect(shown(state, g).active[0]).toMatchObject({ stage: 1, hint: 'Buy a loaf.' })
    state = run(state, g, act('buyLoaf'), act('eat'))
    expect(holds(state, questDone('bread'), g)).toBe(true)
  })

  it('start by effect when they have no condition', () => {
    const g = game()
    const state = run({ ...startingState(g), sceneId: null }, g, act('findLetter'))
    expect(shown(state, g).active.map((quest) => quest.id)).toEqual(['letter'])
  })

  it('track one quest at a time, and only one the player is doing', () => {
    const g = game()
    const state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'), act('findLetter'))
    expect(whyNot(state, g, trackQuest('secret'))).toBe('You are not doing that.')
    const tracked = run(state, g, trackQuest('bread'))
    expect(shown(tracked, g).active.map((quest) => [quest.id, quest.tracked])).toEqual([
      ['bread', true],
      ['letter', false],
    ])
    expect(shown(run(tracked, g, trackQuest()), g).active.every((quest) => !quest.tracked)).toBe(true)
  })

  it('count news until the player looks', () => {
    const g = game()
    let state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'), act('findLetter'))
    expect(shown(state, g).updates).toBe(2)
    state = run(state, g, seeQuests('bread'))
    expect(shown(state, g).updates).toBe(1)
    state = run(state, g, seeQuests(), { type: 'activity', id: 'goOut' })
    expect(shown(state, g).active.find((quest) => quest.id === 'bread')?.updated).toBe(true)
    expect(view(state, g).plugins.quests).toMatchObject({ updates: 1 })
  })

  it('report quests that name things the game does not have, against the pack they came from', () => {
    const broken: QuestDef = {
      id: 'broken',
      title: 'Broken',
      storyline: 'nobody',
      starts: { custom: 'quests/nope' },
      stages: [
        { id: 'a', hint: '', done: { entity: 'thing:moonstone', at: 'you' } },
        { id: 'a', hint: '', done: { kv: 'x' } },
      ],
    }
    const loaded = loadGame([{ name: 'mod', data: { quests: { quests: [broken] } } }], { id: 'g', title: 'g', plugins: [plugin] })
    expect(loaded.problems).toEqual([
      { pack: 'mod', where: 'quests broken', what: 'unknown storyline "nobody"' },
      { pack: 'mod', where: 'quests broken', what: 'stage a: unknown kind "thing"' },
      { pack: 'mod', where: 'quests broken', what: 'starts: no custom condition named "quests/nope"' },
      { pack: 'mod', where: 'quests broken', what: 'two stages are called "a"' },
    ])
  })

  it('can start off another quest, in the same command', () => {
    const errand: QuestDef = { id: 'errand', title: 'An errand', starts: questActive('bread'), stages: [{ id: 'go', hint: 'Go.', done: { kv: 'never' } }] }
    const g = game([errand])
    const state = run({ ...startingState(g), sceneId: null }, g, act('getHungry'))
    expect(shown(state, g).active.map((quest) => quest.id)).toEqual(['bread', 'errand'])
  })
})
