import { describe, expect, it } from 'vitest'
import { checkGame, describeProblem } from '../../src/check.ts'
import { holds } from '../../src/condition.ts'
import { explain } from '../../src/explain.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { applyEffects } from '../../src/reduce.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { entityKv, entityTags, protagonist, traitOf, withTrait } from '../../src/entities.ts'
import { entityName } from '../../src/prose.ts'
import { statValue } from '../../src/stats.ts'
import { definePlugin, type Plugin } from '../../src/plugin.ts'
import { ownedCount } from '../../src/receivers.ts'
import type { Effect, GameState } from '../../src/types.ts'
import type { Game } from '../../src/game.ts'

/** Counts by who has them, then thing: what each keeper below keeps in its own state. */
type Counts = Record<string, Record<string, number>>

/** A keeper of things for these tests: it claims what `claims` says, and keeps counts by who, the protagonist by default. */
function keeper(id: string, claims?: (ref: string) => boolean): Plugin<Counts> {
  const who = (state: GameState, named: string | undefined) => (named === undefined || named === 'you' ? protagonist(state) : named)
  return definePlugin<Counts>({
    id,
    version: 1,
    start: () => ({}),
    receiver: {
      ...(claims ? { claims: (_state, ref) => claims(ref) } : {}),
      receive: (state, ref, count, to, { slice, set }) => {
        const at = who(state, to)
        return set({ ...slice, [at]: { ...slice[at], [ref]: (slice[at]?.[ref] ?? 0) + count } })
      },
      owned: (state, ref, of, { slice }) => slice[who(state, of)]?.[ref] ?? 0,
      release: (state, ref, count, from, { slice, set }) => {
        const at = who(state, from)
        return set({ ...slice, [at]: { ...slice[at], [ref]: (slice[at]?.[ref] ?? 0) - count } })
      },
    },
  })
}

/** A house: two people who can be played, apples that stack, a scarf that is worn, and a gift box. */
const house: Content = {
  name: 'house',
  kinds: [
    { id: 'person', label: 'Person', unique: true },
    { id: 'food', label: 'Food', tags: ['food'] },
    { id: 'clothing', label: 'Clothing' },
    { id: 'gift', label: 'Gift', unique: true },
  ],
  stats: [
    { id: 'coins', label: 'Coins', start: 10, max: 999 },
    { id: 'energy', label: 'Energy', of: 'person', start: 50 },
    { id: 'fresh', label: 'Freshness', of: 'food', start: 5, max: 10 },
  ],
  entities: [
    { id: 'ava', of: 'person', name: 'Ava', stats: { energy: 70 } },
    { id: 'sam', of: 'person', name: 'Sam' },
    { id: 'apple', of: 'food', name: 'Apple', description: 'A red apple.', tags: ['fruit'], stats: { fresh: 8 } },
    { id: 'bread', of: 'food', name: 'Bread', kv: { sliced: true }, traits: { 'washable-no': true } },
    { id: 'scarf', of: 'clothing', name: 'A scarf' },
    { id: 'box', of: 'gift', name: 'A gift box' },
  ],
}

const pocket = keeper('pocket')
const wardrobe = keeper('wardrobe', (ref) => ref.startsWith('clothing:'))

function game(plugins: Plugin[] = [pocket, wardrobe], receivers?: string[], extra: Content[] = []): Game {
  const loaded = loadGame([house, ...extra], { id: 'house', title: 'The House', plugins, ...(receivers ? { receivers } : {}) })
  expect(loaded.problems.map(describeProblem)).toEqual([])
  return loaded.game
}

const run = (state: GameState, g: Game, effects: Effect[]) => applyEffects(state, g, effects)
const slice = (state: GameState, id: string) => state.plugins[id]?.state as Counts

describe('receive, release and owned', () => {
  it('hand a thing to the first receiver that claims it, in the game’s receivers order', () => {
    // In plugins order, the pocket claims everything first.
    let g = game()
    let state = run(startingState(g), g, [{ receive: 'clothing:scarf' }, { receive: 'food:apple', by: 2 }])
    expect(slice(state, 'pocket')).toEqual({ player: { 'clothing:scarf': 1, 'food:apple': 2 } })
    // With the wardrobe listed first, clothes go there and the rest falls through.
    g = game([pocket, wardrobe], ['wardrobe', 'pocket'])
    state = run(startingState(g), g, [{ receive: 'clothing:scarf' }, { receive: 'food:apple', by: 2 }])
    expect(slice(state, 'wardrobe')).toEqual({ player: { 'clothing:scarf': 1 } })
    expect(slice(state, 'pocket')).toEqual({ player: { 'food:apple': 2 } })
  })

  it('send it to the one via names, whatever it claims, and to whom to names', () => {
    const g = game([pocket, wardrobe], ['wardrobe', 'pocket'])
    const state = run(startingState(g), g, [
      { receive: 'food:apple', via: 'wardrobe' },
      { receive: 'food:bread', to: 'person:ava' },
    ])
    expect(slice(state, 'wardrobe')).toEqual({ player: { 'food:apple': 1 } })
    expect(slice(state, 'pocket')).toEqual({ 'person:ava': { 'food:bread': 1 } })
  })

  it('count what someone owns across every receiver, and release from each in turn', () => {
    const g = game([pocket, wardrobe], ['wardrobe', 'pocket'])
    let state = run(startingState(g), g, [{ receive: 'clothing:scarf' }, { receive: 'clothing:scarf', via: 'pocket', by: 2 }])
    expect(ownedCount(state, g, 'clothing:scarf')).toBe(3)
    expect(holds(state, g, { owned: 'clothing:scarf', gte: 3 })).toBe(true)
    expect(holds(state, g, { owned: 'clothing:scarf', via: 'wardrobe', gte: 2 })).toBe(false)
    expect(holds(state, g, { owned: 'clothing:scarf', of: 'person:ava' })).toBe(false)
    expect(explain(state, g, { owned: 'food:apple' }).why).toBe('owned food:apple is 0; wants more than 0')
    // Released from the wardrobe first, then the pocket, never more than there is.
    state = run(state, g, [{ release: 'clothing:scarf', by: 2 }])
    expect(slice(state, 'wardrobe')).toEqual({ player: { 'clothing:scarf': 0 } })
    expect(slice(state, 'pocket')).toEqual({ player: { 'clothing:scarf': 1 } })
    state = run(state, g, [{ release: 'clothing:scarf', by: 5 }])
    expect(ownedCount(state, g, 'clothing:scarf')).toBe(0)
  })

  it('do nothing without a receiver, so a game keeps things in kv keys instead', () => {
    const g = loadGame([house], { id: 'house', title: 'The House' }).game
    const state = startingState(g)
    expect(run(state, g, [{ receive: 'food:apple' }, { release: 'food:apple' }])).toEqual(state)
    expect(holds(state, g, { owned: 'food:apple' })).toBe(false)
    const flags = run(state, g, [{ kv: 'hasApple', to: true }])
    expect(holds(flags, g, { kv: 'hasApple' })).toBe(true)
  })

  it('give a created thing over with its own effects, `$` as it', () => {
    const g = game()
    const state = run(startingState(g), g, [
      { create: 'food', like: 'food:apple', with: { stats: { fresh: 3 }, tags: ['bruised'] }, effects: [{ receive: '$' }, { stat: 'fresh', of: '$', by: 1 }] },
    ])
    expect(slice(state, 'pocket')).toEqual({ player: { 'food:#1': 1 } })
    expect(statValue(state, g, 'fresh', 'food:#1')).toBe(4)
  })

  it('pick what someone owns by where: { owned: "$" }, for count and each', () => {
    const g = game()
    const state = run(startingState(g), g, [{ receive: 'food:apple' }, { receive: 'clothing:scarf' }])
    expect(holds(state, g, { count: { of: 'food', where: { owned: '$' } }, gte: 1, lte: 1 })).toBe(true)
    expect(holds(state, g, { count: { tag: 'fruit', where: { owned: '$' } }, gte: 1 })).toBe(true)
    const aged = run(state, g, [{ each: { of: 'food', where: { owned: '$' } }, effects: [{ stat: 'fresh', by: -1, of: '$' }] }])
    expect(statValue(aged, g, 'fresh', 'food:apple')).toBe(7)
    expect(statValue(aged, g, 'fresh', 'food:bread')).toBe(5)
  })
})

describe('the protagonist', () => {
  it('switches who you are, and what `you` and `of: you` read, receivers included', () => {
    const g = game()
    let state = run(startingState(g), g, [{ stat: 'coins', by: 1, of: 'you' }])
    expect(state.stats.coins).toBe(11)
    state = run(state, g, [{ you: 'person:ava' }, { stat: 'energy', by: -20, of: 'you' }, { receive: 'food:apple' }])
    expect(state.you).toBe('person:ava')
    expect(statValue(state, g, 'energy', 'person:ava')).toBe(50)
    expect(holds(state, g, { stat: 'energy', of: 'you', lt: 60 })).toBe(true)
    expect(slice(state, 'pocket')).toEqual({ 'person:ava': { 'food:apple': 1 } })
    // Only a unique entity in the game can be played.
    expect(run(state, g, [{ you: 'food:apple' }]).you).toBe('person:ava')
    // Removing the one played goes back to the player.
    expect(run(state, g, [{ remove: 'person:ava' }]).you).toBeNull()
    expect(run(state, g, [{ you: null }]).you).toBeNull()
  })
})

describe('entities made in play', () => {
  it('read through what they were made like, and keep it through a load', () => {
    const g = game()
    const state = run(startingState(g), g, [
      { create: 'food', like: 'food:apple', with: { stats: { fresh: 3 }, tags: ['bruised'] } },
      { create: 'food', like: 'food:bread', with: { id: 'loaf', name: 'Loaf', traits: { 'washable-no': false } } },
    ])
    expect(state.entities.food['#1']).toEqual({ like: 'food:apple', tags: ['bruised'], stats: { fresh: 3 } })
    expect(entityName(state, g, 'food:#1')).toBe('Apple')
    expect(entityTags(state, g, 'food:#1')).toEqual(['food', 'fruit', 'bruised'])
    expect(statValue(state, g, 'fresh', 'food:#1')).toBe(3)
    expect(entityKv(state, g, 'food:loaf')).toEqual({ sliced: true })
    expect(traitOf(state, g, 'food:loaf', 'washable-no')).toBe(false)
    expect(traitOf(state, g, 'food:#1', 'washable-no')).toBeUndefined()
    expect(withTrait(state, g, 'washable-no')).toEqual(['food:bread', 'food:loaf'])
    const loaded = loadState(JSON.parse(JSON.stringify(state)), g)
    expect(loaded.ok && loaded.value.entities.food['#1']).toEqual({ like: 'food:apple', tags: ['bruised'], stats: { fresh: 3 } })
  })
})

describe('the checker', () => {
  it('reports receivers it can’t find, someone who isn’t, protagonists, likes and traits', () => {
    const wrong: Content = {
      name: 'wrong',
      scenes: [
        {
          id: 'start',
          body: [{ prose: 'Hello.' }],
          choices: [
            {
              id: 'go',
              effects: [
                { receive: 'food:apple', to: 'food:bread' },
                { receive: 'food:apple', to: 'pal' },
                { receive: 'food:plum' },
                { release: 'food:apple', via: 'laundry' },
                { release: 'food:apple', via: 'nobody' },
                { you: 'you' },
                { you: 'food:apple' },
                { you: 'pal' },
                { create: 'food', like: 'food:plum' },
                { create: 'gift', like: 'food:apple' },
                { each: { trait: 'laundry/washable' }, effects: [] },
              ],
            },
          ],
        },
      ],
    }
    const laundry = { id: 'laundry', version: 1, traits: [{ id: 'laundry/dry' }] }
    const loaded = loadGame([house, wrong], { id: 'house', title: 'The House', plugins: [laundry, pocket], receivers: ['pocket', 'laundry'] })
    const problems = checkGame(loaded.game).problems.map(describeProblem)
    for (const expected of [
      '"food:bread" isn\'t someone: its kind "food" isn\'t unique',
      'unknown someone "pal"',
      'unknown entity "food:plum"',
      'via names "laundry", which keeps no things',
      'via names "nobody", which isn\'t one of the game\'s plugins',
      '"laundry" is no plugin of the game\'s that keeps things',
      '"you" is already whoever is played',
      '"food:apple" can\'t be played: its kind "food" isn\'t unique',
      'unknown protagonist "pal"',
      'unknown entity "food:plum" to be like',
      'like names a food, not a gift',
      'plugin "laundry" has no trait "laundry/washable"',
    ])
      expect(
        problems.some((line) => line.includes(expected)),
        `${expected}\n${problems.join('\n')}`,
      ).toBe(true)
  })

  it('reports a receive, release or owned in a game with no receiver', () => {
    const scene: Content = {
      name: 'shop',
      scenes: [{ id: 'till', body: [{ prose: 'Hi.' }], choices: [{ id: 'buy', when: { owned: 'food:apple' }, effects: [{ receive: 'food:apple' }] }] }],
    }
    const problems = loadGame([house, scene], { id: 'house', title: 'The House' }).problems.map(describeProblem)
    expect(problems.filter((line) => line.includes('no plugin of the game keeps things'))).toHaveLength(2)
  })
})
