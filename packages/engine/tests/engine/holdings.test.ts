import { describe, expect, it } from 'vitest'
import { checkGame, describeProblem } from '../../src/check.ts'
import { holds } from '../../src/condition.ts'
import { explain } from '../../src/explain.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { applyEffects } from '../../src/reduce.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { view } from '../../src/view.ts'
import { entityKv, entityTags, traitOf, withTrait } from '../../src/entities.ts'
import { entityName } from '../../src/prose.ts'
import { statValue } from '../../src/stats.ts'
import { give, heldBy, heldCount, holderOf, holding, move, take } from '../../src/holdings.ts'
import type { Effect, GameState } from '../../src/types.ts'
import type { Game } from '../../src/game.ts'

/**
 * A small house: the player, two people who can each be played or hold
 * things, a larder (a unique place things are kept), apples that stack,
 * a scarf that is one particular thing, and a gift box.
 */
const house: Content = {
  name: 'house',
  kinds: [
    { id: 'person', label: 'Person', unique: true },
    { id: 'place', label: 'Place', unique: true },
    { id: 'food', label: 'Food', tags: ['food'] },
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
    { id: 'larder', of: 'place', name: 'The larder' },
    { id: 'apple', of: 'food', name: 'Apple', description: 'A red apple.', tags: ['fruit'], at: { player: 2, 'place:larder': 6 }, stats: { fresh: 8 } },
    { id: 'bread', of: 'food', name: 'Bread', at: 'place:larder', kv: { sliced: true }, traits: { 'washable-no': true } },
    { id: 'scarf', of: 'gift', name: 'A scarf', at: 'player' },
    { id: 'box', of: 'gift', name: 'A gift box' },
  ],
}

function game(extra: Content[] = []): Game {
  const loaded = loadGame([house, ...extra], { id: 'house', title: 'The House' })
  expect(loaded.problems.map(describeProblem)).toEqual([])
  return loaded.game
}

const run = (state: GameState, g: Game, effects: Effect[]) => applyEffects(state, g, effects)

describe('holdings', () => {
  it('start where content places them, with nothing in the save', () => {
    const g = game()
    const state = startingState(g)
    expect(state.held).toEqual({})
    expect(state.you).toBeNull()
    expect(heldCount(state, g, 'food:apple')).toBe(2)
    expect(heldCount(state, g, 'food:apple', 'place:larder')).toBe(6)
    expect(holderOf(state, g, 'gift:scarf')).toBe('player')
    expect(heldBy(state, g)).toEqual([
      { ref: 'food:apple', count: 2 },
      { ref: 'gift:scarf', count: 1 },
    ])
    expect(holds(state, g, { entity: 'food:apple', at: 'you' })).toBe(true)
    expect(holds(state, g, { entity: 'food:bread', at: 'player' })).toBe(false)
    expect(holds(state, g, { entity: 'food:apple', gte: 8 })).toBe(true)
    expect(holds(state, g, holding('food:apple', 3))).toBe(false)
    // Bare and with no `at`, it still asks only whether the entity is there.
    expect(holds(state, g, { entity: 'gift:box' })).toBe(true)
    expect(explain(state, g, { entity: 'food:apple', at: 'you', gte: 3 }).why).toBe('food:apple: 2 held by you; wants 3 or more')
  })

  it('change by and to, never below 0, keeping a count once written', () => {
    const g = game()
    const state = run(startingState(g), g, [give('food:apple', 3), take('food:bread'), { entity: 'food:apple', at: 'place:larder', to: 0 }])
    expect(heldCount(state, g, 'food:apple')).toBe(5)
    expect(heldCount(state, g, 'food:apple', 'place:larder')).toBe(0)
    // The player had no bread, so taking one changes nothing; the larder's 0 stays, so the 6 never come back.
    expect(state.held).toEqual({ player: { 'food:apple': 5 }, 'place:larder': { 'food:apple': 0 } })
    const eaten = run(state, g, [take('food:apple', 9)])
    expect(heldCount(eaten, g, 'food:apple')).toBe(0)
    expect(eaten.held.player['food:apple']).toBe(0)
  })

  it('reads what a later game places, unless the save has a count of its own', () => {
    const g = game()
    const state = run(startingState(g), g, [take('food:apple', 2)])
    const later = game([{ name: 'later', entities: [{ id: 'pear', of: 'food', name: 'Pear', at: 'player' }] }])
    const loaded = loadState(JSON.parse(JSON.stringify(state)), later)
    expect(loaded.ok && heldCount(loaded.value, later, 'food:pear')).toBe(1)
    expect(loaded.ok && heldCount(loaded.value, later, 'food:apple')).toBe(0)
  })

  it('keep a unique thing in one place, taking it from whoever had it', () => {
    const g = game()
    let state = run(startingState(g), g, [{ entity: 'gift:scarf', at: 'person:ava', by: 5 }])
    expect(holderOf(state, g, 'gift:scarf')).toBe('person:ava')
    expect(heldCount(state, g, 'gift:scarf', 'person:ava')).toBe(1)
    expect(heldCount(state, g, 'gift:scarf', 'player')).toBe(0)
    // Only unique things hold: food can't.
    state = run(state, g, [{ entity: 'gift:box', at: 'food:apple', by: 1 }])
    expect(holderOf(state, g, 'gift:box')).toBeUndefined()
  })

  it('move at most what is there, and never into itself', () => {
    const g = game()
    let state = run(startingState(g), g, [
      move('food:apple', 'person:ava', { by: 1 }),
      move('food:bread', 'player', { from: 'place:larder' }),
      // The scarf goes into the box, the box to Ava: unique things move from wherever they are.
      { entity: 'gift:box', to: 1 },
      move('gift:scarf', 'gift:box'),
      move('gift:box', 'person:ava'),
    ])
    expect(heldCount(state, g, 'food:apple', 'person:ava')).toBe(1)
    expect(heldCount(state, g, 'food:apple')).toBe(1)
    expect(heldCount(state, g, 'food:bread')).toBe(1)
    expect(holderOf(state, g, 'gift:scarf')).toBe('gift:box')
    expect(holderOf(state, g, 'gift:box')).toBe('person:ava')
    // The box can't go into the scarf it holds, or into itself.
    const looped = run(state, g, [move('gift:box', 'gift:scarf'), move('gift:box', 'gift:box')])
    expect(looped).toBe(state)
    // More than there is moves what there is; from someone with none, nothing.
    state = run(state, g, [move('food:apple', 'place:larder', { by: 10 }), move('food:bread', 'player', { from: 'person:sam' })])
    expect(heldCount(state, g, 'food:apple')).toBe(0)
    expect(heldCount(state, g, 'food:apple', 'place:larder')).toBe(7)
  })

  it('hand what a removed holder held to its own holder', () => {
    const g = game()
    let state = run(startingState(g), g, [{ entity: 'gift:box', to: 1 }, move('gift:scarf', 'gift:box'), give('food:apple')])
    state = run(state, g, [move('food:apple', 'gift:box', { by: 2 }), { remove: 'gift:box' }])
    expect(holderOf(state, g, 'gift:scarf')).toBe('player')
    expect(heldCount(state, g, 'food:apple')).toBe(3)
    expect(heldCount(state, g, 'gift:box')).toBe(0)
    // Removing the larder, which nobody holds, takes what it held with it.
    state = run(state, g, [{ remove: 'place:larder' }])
    expect(holds(state, g, { entity: 'food:apple', gte: 4 })).toBe(false)
  })

  it('switch who you are, and what `you` and `of: you` read', () => {
    const g = game()
    let state = run(startingState(g), g, [{ stat: 'coins', by: 1, of: 'you' }])
    // With nobody played, `you` is the player.
    expect(state.stats.coins).toBe(11)
    state = run(state, g, [{ you: 'person:ava' }, { stat: 'energy', by: -20, of: 'you' }, give('food:apple')])
    expect(state.you).toBe('person:ava')
    expect(statValue(state, g, 'energy', 'person:ava')).toBe(50)
    expect(holds(state, g, { stat: 'energy', of: 'you', lt: 60 })).toBe(true)
    expect(heldCount(state, g, 'food:apple', 'person:ava')).toBe(1)
    expect(heldCount(state, g, 'food:apple', 'player')).toBe(2)
    // What you hold: Ava's apple, then the player's own things.
    expect(view(state, g).held.map((entry) => [entry.ref, entry.count, entry.at])).toEqual([
      ['food:apple', 1, 'person:ava'],
      ['food:apple', 2, 'player'],
      ['gift:scarf', 1, 'player'],
    ])
    // Only a unique entity in the game can be played.
    expect(run(state, g, [{ you: 'food:apple' }]).you).toBe('person:ava')
    // Removing the one played goes back to the player.
    expect(run(state, g, [{ remove: 'person:ava' }]).you).toBeNull()
    state = run(state, g, [{ you: null }])
    expect(state.you).toBeNull()
    expect(view(state, g).held[0]).toEqual({
      ref: 'food:apple',
      name: 'Apple',
      description: 'A red apple.',
      image: null,
      tags: ['food', 'fruit'],
      count: 2,
      at: 'player',
    })
  })

  it('count distinct things, or units, by kind, holder, tag, trait and where', () => {
    const g = game()
    const state = run(startingState(g), g, [give('food:bread', 3)])
    expect(holds(state, g, { count: { at: 'you' }, gte: 3, lte: 3 })).toBe(true)
    expect(holds(state, g, { count: { at: 'you', of: 'food' }, units: true, gte: 5, lte: 5 })).toBe(true)
    expect(holds(state, g, { count: { at: 'you', tag: 'fruit' }, lte: 1, gte: 1 })).toBe(true)
    expect(holds(state, g, { count: { of: 'food' }, units: true, gte: 12, lte: 12 })).toBe(true)
    expect(holds(state, g, { count: { trait: 'washable-no' }, gte: 1, lte: 1 })).toBe(true)
    expect(holds(state, g, { count: { at: 'you', where: { stat: 'fresh', of: '$', gte: 6 } }, gte: 1, lte: 1 })).toBe(true)
    expect(explain(state, g, { count: { at: 'you', tag: 'fruit' }, gte: 2 }).why).toBe('1 entities held by you tagged fruit; wants 2 or more')
    // The kind's string form still reads as it did.
    expect(holds(state, g, { count: 'person' })).toBe(true)
  })

  it('run each over what a holder holds', () => {
    const g = game()
    const state = run(startingState(g), g, [{ each: { of: 'food', at: 'you' }, effects: [{ stat: 'fresh', by: -1, of: '$' }] }])
    expect(statValue(state, g, 'fresh', 'food:apple')).toBe(7)
    expect(statValue(state, g, 'fresh', 'food:bread')).toBe(5)
    // `at: '$'` inside an each is each one in turn.
    const moved = run(state, g, [{ each: 'place', effects: [{ move: 'food:bread', from: '$', to: 'player' }] }])
    expect(heldCount(moved, g, 'food:bread')).toBe(1)
  })

  it('create things like another, which read through it, and give them to a holder', () => {
    const g = game()
    let state = run(startingState(g), g, [
      { create: 'food', like: 'food:apple', with: { stats: { fresh: 3 }, tags: ['bruised'] }, at: 'you' },
      { create: 'food', like: 'food:bread', with: { id: 'loaf', name: 'Loaf', traits: { 'washable-no': false } }, at: { 'place:larder': 2 } },
    ])
    expect(state.entities.food['#1']).toEqual({ like: 'food:apple', tags: ['bruised'], stats: { fresh: 3 } })
    expect(entityName(state, g, 'food:#1')).toBe('Apple')
    expect(entityTags(state, g, 'food:#1')).toEqual(['food', 'fruit', 'bruised'])
    expect(statValue(state, g, 'fresh', 'food:#1')).toBe(3)
    expect(entityKv(state, g, 'food:loaf')).toEqual({ sliced: true })
    expect(traitOf(state, g, 'food:loaf', 'washable-no')).toBe(false)
    expect(traitOf(state, g, 'food:#1', 'washable-no')).toBeUndefined()
    expect(withTrait(state, g, 'washable-no')).toEqual(['food:bread', 'food:loaf'])
    expect(heldCount(state, g, 'food:#1')).toBe(1)
    expect(heldCount(state, g, 'food:loaf', 'place:larder')).toBe(2)
    // It keeps what it was made like through a load.
    const loaded = loadState(JSON.parse(JSON.stringify(state)), g)
    expect(loaded.ok && loaded.value.entities.food['#1']).toEqual({ like: 'food:apple', tags: ['bruised'], stats: { fresh: 3 } })
    // Removed, a created thing leaves nothing in `held`.
    state = run(state, g, [{ remove: 'food:#1' }])
    expect(state.held.player).toEqual({})
  })

  it('are checked: holders, starts, likes, traits and cycles', () => {
    const wrong: Content = {
      name: 'wrong',
      kinds: [{ id: 'box', label: 'Box', unique: true }],
      entities: [
        { id: 'a', of: 'box', name: 'A', at: 'box:b' },
        { id: 'b', of: 'box', name: 'B', at: 'box:a' },
        { id: 'pear', of: 'food', name: 'Pear', at: { you: 1, 'food:apple': 1, 'person:nobody': 2.5 } },
        { id: 'ring', of: 'gift', name: 'Ring', at: { player: 1, 'person:ava': 1 } },
      ],
      scenes: [
        {
          id: 'start',
          body: [{ prose: 'Hello.' }],
          choices: [
            {
              id: 'go',
              effects: [
                { entity: 'food:apple', at: 'food:bread', by: 1 },
                { move: 'gift:box', to: 'gift:box' },
                { move: 'food:apple', to: 'pal' },
                { you: 'you' },
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
    const loaded = loadGame([house, wrong], { id: 'house', title: 'The House', plugins: [laundry] })
    const problems = checkGame(loaded.game).problems.map(describeProblem)
    for (const expected of [
      'holders go round in a cycle',
      'at can\'t be "you" where a thing starts',
      'at names "food:apple", whose kind isn\'t unique',
      'at names unknown holder "person:nobody"',
      'a count is a whole number above 0',
      'a unique thing starts in one place, one of it',
      '"food:bread" can\'t hold things: its kind "food" isn\'t unique',
      '"gift:box" can\'t hold itself',
      'unknown holder "pal"',
      '"you" is already whoever is played',
      'unknown entity "food:plum" to be like',
      'like names a food, not a gift',
      'plugin "laundry" has no trait "laundry/washable"',
    ])
      expect(
        problems.some((line) => line.includes(expected)),
        `${expected}\n${problems.join('\n')}`,
      ).toBe(true)
  })
})
