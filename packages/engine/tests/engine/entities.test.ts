import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { explain } from '../../src/explain.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { applyEffects } from '../../src/reduce.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { view } from '../../src/view.ts'
import { bindCurrent, entitiesOf, entityKv, entityOf, entityTags } from '../../src/entities.ts'
import { entityDescription, entityName } from '../../src/prose.ts'
import { statValue } from '../../src/stats.ts'
import { unwrap } from '../fixtures/result.ts'

/** The café's staff and its menu: two kinds, each with stats of its own, and one stat of the player's. */
const cafe: Content = {
  name: 'cafe',
  kinds: [
    { id: 'staff', label: 'Member of staff', plural: 'Staff' },
    { id: 'dish', label: 'Dish' },
  ],
  stats: [
    { id: 'coins', label: 'Coins', start: 50, max: 9999 },
    { id: 'morale', label: 'Morale', of: 'staff', start: 50 },
    { id: 'skill', label: 'Skill', of: 'staff', start: 1, max: 10 },
    { id: 'quality', label: 'Quality', of: 'dish', start: 3, max: 5, visible: { kv: 'tasted', of: '$' } },
  ],
  entities: [
    { id: 'ana', of: 'staff', name: 'Ana', stats: { skill: 4 }, kv: { role: 'cook' } },
    { id: 'ben', of: 'staff', name: 'Ben' },
    { id: 'soup', of: 'dish', name: 'Soup of the day' },
  ],
}

function game() {
  const { id, title } = { id: 'cafe', title: 'The Café' }
  const loaded = loadGame([cafe], { id, title })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

describe('entities', () => {
  it('start as declared, with nothing in the save until play changes them', () => {
    const g = game()
    const state = startingState(g)
    expect(state.stats).toEqual({ coins: 50 })
    expect(state.entities).toEqual({})
    expect(entitiesOf(state, g, 'staff')).toEqual(['staff:ana', 'staff:ben'])
    expect(entityOf(state, g, 'staff:ana')).toEqual({})
    expect(entityOf(state, g, 'staff:cleo')).toBeUndefined()
    // Each read falls back: what play changed, the declaration, the stat's start.
    expect(statValue(state, g, 'skill', 'staff:ana')).toBe(4)
    expect(statValue(state, g, 'morale', 'staff:ana')).toBe(50)
    expect(entityKv(state, g, 'staff:ana')).toEqual({ role: 'cook' })
    expect(entityName(state, g, 'dish:soup')).toBe('Soup of the day')
  })

  it('take the player’s effects and conditions with `of`, held to the stat’s range', () => {
    const g = game()
    const state = applyEffects(startingState(g), g, [
      { stat: 'skill', by: 20, of: 'staff:ben' },
      { stat: 'morale', to: 80, of: 'staff:ana' },
      { kv: 'shifts', by: 2, of: 'staff:ben' },
      // Nobody called Cleo works here: nothing happens.
      { stat: 'skill', by: 1, of: 'staff:cleo' },
    ])
    expect(state.entities.staff.ben).toEqual({ stats: { skill: 10 }, kv: { shifts: 2 } })
    expect(state.entities.staff.ana).toEqual({ stats: { morale: 80 } })
    expect(entityKv(state, g, 'staff:ana')).toEqual({ role: 'cook' })
    expect(holds(state, g, { stat: 'morale', of: 'staff:ana', gte: 75 })).toBe(true)
    expect(holds(state, g, { kv: 'shifts', of: 'staff:ben', gte: 2 })).toBe(true)
    expect(holds(state, g, { kv: 'role', of: 'staff:ana', is: 'cook' })).toBe(true)
    expect(holds(state, g, { stat: 'skill', of: 'staff:cleo', lt: 100 })).toBe(false)
    expect(explain(state, g, { stat: 'morale', of: 'staff:ana', gte: 90 }).why).toBe('staff:ana stat morale is 80; wants 90 or more')
  })

  it('are created with the next free number, or a given id, and removed', () => {
    const g = game()
    let state = applyEffects(startingState(g), g, [
      { create: 'staff', with: { name: 'Cleo', stats: { skill: 6 } } },
      { create: 'staff', with: { name: 'Dev' } },
      { create: 'staff', with: { id: 'ana', name: 'Another Ana' } },
    ])
    expect(entitiesOf(state, g, 'staff')).toEqual(['staff:ana', 'staff:ben', 'staff:#1', 'staff:#2'])
    expect(state.entities.staff).toEqual({ '#1': { name: 'Cleo', stats: { skill: 6 } }, '#2': { name: 'Dev' } })
    expect(statValue(state, g, 'morale', 'staff:#1')).toBe(50)
    expect(entityName(state, g, 'staff:ana')).toBe('Ana')
    state = applyEffects(state, g, [{ remove: 'staff:#1' }, { create: 'staff', with: { name: 'Eve' } }])
    // Numbers are never reused, so a removed one's id never comes back as someone else.
    expect(entitiesOf(state, g, 'staff')).toEqual(['staff:ana', 'staff:ben', 'staff:#2', 'staff:#3'])
    expect(holds(state, g, { entity: 'staff:#1' })).toBe(false)
    expect(holds(state, g, { entity: 'staff:#3' })).toBe(true)
  })

  it('run `each` for every one, with `$` as the one each time, only where `where` holds', () => {
    const g = game()
    const start = applyEffects(startingState(g), g, [{ stat: 'morale', to: 10, of: 'staff:ben' }])
    const state = applyEffects(start, g, [
      {
        each: 'staff',
        where: { stat: 'morale', of: '$', gte: 20 },
        effects: [
          { stat: 'morale', by: -5, of: '$' },
          { stat: 'coins', by: -10 },
        ],
      },
      // Anyone left unhappy walks out.
      { each: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ remove: '$' }] },
    ])
    expect(statValue(state, g, 'morale', 'staff:ana')).toBe(45)
    expect(state.stats.coins).toBe(40)
    expect(entitiesOf(state, g, 'staff')).toEqual(['staff:ana'])
    expect(state.removed).toEqual(['staff:ben'])
  })

  it('are counted, with a `where` of their own inside an `each`', () => {
    const g = game()
    const state = startingState(g)
    expect(holds(state, g, { count: 'staff' })).toBe(true)
    expect(holds(state, g, { count: 'staff', gte: 3 })).toBe(false)
    expect(holds(state, g, { count: 'staff', where: { stat: 'skill', of: '$', gte: 3 }, lte: 1 })).toBe(true)
    expect(explain(state, g, { count: 'staff', where: { stat: 'skill', of: '$', gte: 3 } }).why).toBe('1 staff where it holds; wants more than 0')
    // For each member of staff, a bonus if someone *else* is more skilled: the inner `$` is the inner one's.
    const after = applyEffects(state, g, [
      { each: 'staff', where: { count: 'staff', where: { stat: 'skill', of: '$', gte: 4 } }, effects: [{ kv: 'learning', to: true, of: '$' }] },
    ])
    expect(entityKv(after, g, 'staff:ana').learning).toBe(true)
    expect(entityKv(after, g, 'staff:ben').learning).toBe(true)
  })

  it('show in the view by kind, with each one’s visible stats', () => {
    const g = game()
    const state = applyEffects(startingState(g), g, [{ kv: 'tasted', to: true, of: 'dish:soup' }])
    const shown = view(state, g)
    expect(shown.stats.map((stat) => stat.key)).toEqual(['coins'])
    expect(shown.entities.find((kind) => kind.id === 'staff')!.plural).toBe('Staff')
    expect(
      shown.entities
        .find((kind) => kind.id === 'staff')!
        .entries.map((entry) => [entry.ref, entry.name, entry.stats.map((stat) => `${stat.key} ${stat.value}`)]),
    ).toEqual([
      ['staff:ana', 'Ana', ['morale 50', 'skill 4']],
      ['staff:ben', 'Ben', ['morale 50', 'skill 1']],
    ])
    expect(shown.entities.find((kind) => kind.id === 'dish')!.entries[0].stats.map((stat) => stat.key)).toEqual(['quality'])
    expect(view(startingState(g), g).entities.find((kind) => kind.id === 'dish')!.entries[0].stats).toEqual([])
  })

  it('read a missing one’s kv key as no answer at all, and do not create one numbered like the rest', () => {
    const g = game()
    const state = startingState(g)
    expect(holds(state, g, { kv: 'role', of: 'staff:ghost', lt: 1 })).toBe(false)
    expect(holds(state, g, { not: { kv: 'role', of: 'staff:ghost' } })).toBe(true)
    expect(applyEffects(state, g, [{ create: 'staff', with: { id: '7', name: 'Seven' } }]).entities).toEqual({})
    // `'$'` stands for the one in hand wherever an entity is named.
    const kept = applyEffects(state, g, [{ each: 'staff', where: { entity: '$' }, effects: [{ kv: 'seen', to: true, of: '$' }] }])
    expect(entityKv(kept, g, 'staff:ben').seen).toBe(true)
  })

  it('are checked by the loader in scenes and activities too, inside `each`, with stats on their owners', () => {
    const { problems } = loadGame(
      [
        {
          ...cafe,
          actions: [
            { id: 'adopt', effects: [{ create: 'cat', with: { name: 'Biscuit' } }] },
            {
              id: 'payAna',
              effects: [
                { stat: 'coins', by: 5, of: 'staff:ana' },
                { stat: 'morale', by: 5 },
              ],
            },
            {
              id: 'week',
              effects: [{ each: 'staff', where: { stat: 'quality', of: '$', gte: 1 }, effects: [{ stat: 'quality', by: 1, of: '$' }, { 'game/nope': true }] }],
            },
          ],
          scenes: [{ id: 'yard', body: [], choices: [{ id: 'feed', label: 'Feed the pig', effects: [{ kv: 'fed', to: true, of: 'pig:x' }] }] }],
          prose: {},
        },
      ],
      { id: 'cafe', title: 'The Café' },
    )
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'scene yard: unknown kind "pig"',
      'action adopt: unknown kind "cat"',
      'action payAna: stat "coins" is the player\'s, not staff:ana\'s',
      'action payAna: stat "morale" belongs to staff: say whose with "of"',
      'action week: in each staff: stat "quality" belongs to dish, not staff',
      'action week: in each staff: stat "quality" belongs to dish, not staff',
      'action week: in each staff: no custom effect named "game/nope"',
    ])
  })

  it('are checked by the loader: kinds, and stats that belong to them', () => {
    const { problems } = loadGame(
      [
        {
          ...cafe,
          stats: [...(cafe.stats ?? []), { id: 'shine', label: 'Shine', of: 'car' }],
          entities: [
            ...(cafe.entities ?? []),
            { id: 'cat', of: 'pet', name: 'Biscuit' },
            { id: '7', of: 'dish', name: 'Number seven' },
            { id: 'cleo', of: 'staff', name: 'Cleo', stats: { coins: 5 } },
          ],
          triggers: [{ id: 'empty', when: { count: 'staf' }, effects: [{ each: 'dishes', effects: [{ remove: 'meal:x' }] }] }],
        },
      ],
      { id: 'cafe', title: 'The Café' },
    )
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'trigger empty: unknown kind "staf"',
      'trigger empty: unknown kind "dishes"',
      'trigger empty: in each dishes: unknown kind "meal"',
      'stat shine: belongs to unknown kind "car"',
      'entity pet:cat: unknown kind "pet"',
      'entity dish:7: an entity id must not be a whole number',
      'entity staff:cleo: no staff stat named "coins"',
    ])
  })
})

describe('the view of entities', () => {
  const listing: Content = {
    name: 'listing',
    kinds: [
      { id: 'staff', label: 'Member of staff', plural: 'Staff', tags: ['crew'], flags: { senior: { stat: 'skill', of: '$', gte: 4 } } },
      { id: 'dish', label: 'Dish', listed: { kv: 'onMenu', of: '$' } },
      { id: 'secret', label: 'Secret', listed: false },
    ],
    stats: [{ id: 'skill', label: 'Skill', of: 'staff', start: 1 }],
    entities: [
      {
        id: 'ana',
        of: 'staff',
        name: 'Ana, {{title}}',
        description: 'Runs the kitchen for {{owner}}.',
        image: 'staff/ana',
        tags: ['cook', 'crew'],
        stats: { skill: 5 },
      },
      { id: 'ben', of: 'staff', name: 'Ben', visible: { kv: 'benHired' } },
      { id: 'soup', of: 'dish', name: 'Soup', kv: { onMenu: true } },
      { id: 'pie', of: 'dish', name: 'Pie' },
      { id: 'map', of: 'secret', name: 'The map' },
    ],
  }
  const g = () => {
    const loaded = loadGame([listing], { id: 'cafe', title: 'The Café' })
    expect(loaded.problems).toEqual([])
    return loaded.game
  }

  it('lists only listed kinds and the entities whose `listed` and `visible` hold', () => {
    const game = g()
    const state = startingState(game, { kv: { title: 'head cook', owner: 'Rosa' } })
    const shown = view(state, game).entities
    // In the order the kinds are declared, each with its id.
    expect(shown.map((kind) => kind.id)).toEqual(['staff', 'dish'])
    expect(shown[0].entries.map((entry) => entry.ref)).toEqual(['staff:ana'])
    expect(shown[1].entries.map((entry) => entry.ref)).toEqual(['dish:soup'])
    const later = applyEffects(state, game, [
      { kv: 'benHired', to: true },
      { kv: 'onMenu', to: true, of: 'dish:pie' },
    ])
    expect(
      view(later, game)
        .entities.find((kind) => kind.id === 'staff')!
        .entries.map((entry) => entry.ref),
    ).toEqual(['staff:ana', 'staff:ben'])
    expect(
      view(later, game)
        .entities.find((kind) => kind.id === 'dish')!
        .entries.map((entry) => entry.ref),
    ).toEqual(['dish:soup', 'dish:pie'])
  })

  it('fill each entry’s name and description, with its picture, tags and flags', () => {
    const game = g()
    const state = applyEffects(startingState(game, { kv: { title: 'head cook', owner: 'Rosa' } }), game, [{ kv: 'benHired', to: true }])
    const [ana, ben] = view(state, game).entities.find((kind) => kind.id === 'staff')!.entries
    expect(ana).toMatchObject({
      name: 'Ana, head cook',
      description: 'Runs the kitchen for Rosa.',
      image: 'art/staff/ana.jpg',
      tags: ['crew', 'cook'],
      flags: { senior: true },
    })
    expect(ben).toMatchObject({ name: 'Ben', description: null, image: null, tags: ['crew'], flags: { senior: false } })
    expect(view(state, game).entities.find((kind) => kind.id === 'staff')!.unique).toBe(false)
    expect(entityDescription(state, game, 'staff:ana')).toBe('Runs the kitchen for Rosa.')
    expect(entityDescription(state, game, 'staff:ben')).toBeUndefined()
    expect(entityTags(state, game, 'staff:ana')).toEqual(['crew', 'cook'])
  })

  it('leave a plugin’s kinds out unless the plugin lists them, and a game that redeclares one keeps that', () => {
    const plugin = {
      id: 'choir',
      version: 1,
      content: {
        kinds: [
          { id: 'singer', label: 'Singer' },
          { id: 'song', label: 'Song', listed: true },
        ],
      },
    }
    const { game } = loadGame(
      [
        {
          entities: [
            { id: 'jo', of: 'singer', name: 'Jo' },
            { id: 'hymn', of: 'song', name: 'Hymn' },
          ],
        },
      ],
      { id: 'c', title: 'C', plugins: [plugin] },
    )
    expect(view(startingState(game), game).entities.map((kind) => kind.id)).toEqual(['song'])
    const relabelled = loadGame([{ kinds: [{ id: 'singer', label: 'Voice', plural: 'Choir' }] }], { id: 'c', title: 'C', plugins: [plugin] }).game
    expect(relabelled.kinds?.find((kind) => kind.id === 'singer')).toEqual({ id: 'singer', label: 'Voice', plural: 'Choir', listed: false })
  })

  it('bind `$` in a plugin call’s arguments, and check what `listed` and `flags` ask', () => {
    const { problems } = loadGame(
      [{ kinds: [{ id: 'staff', label: 'Staff', listed: { stat: 'nerve', of: '$', gte: 1 }, flags: { odd: { kv: 'x', of: 'pig:$' } } }] }],
      { id: 'c', title: 'C' },
    )
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual(['kind staff: unknown stat "nerve"', 'kind staff: unknown kind "pig"'])
    expect(bindCurrent({ all: [{ 'cast/met': { character: '$' } }, { 'game/fond': { who: ['$'] } }, { kv: 'x', is: '$' }] }, 'character:ava')).toEqual({
      all: [{ 'cast/met': { character: 'character:ava' } }, { 'game/fond': { who: ['character:ava'] } }, { kv: 'x', is: '$' }],
    })
  })
})

describe('declared entities and old saves', () => {
  it('are there in any save unless removed in play, which stays gone', () => {
    const g = game()
    const start = startingState(g)
    // A save from before Ben was written in has no record of him, and needs none.
    expect(entitiesOf(unwrap(loadState(start, g)), g, 'staff')).toEqual(['staff:ana', 'staff:ben'])
    // Ben left in play: he does not come back.
    const left = applyEffects(start, g, [{ remove: 'staff:ben' }])
    expect(left.removed).toEqual(['staff:ben'])
    expect(entitiesOf(unwrap(loadState(left, g)), g, 'staff')).toEqual(['staff:ana'])
    // Taken on again by name: no longer gone for good, and removed only once however often.
    const back = applyEffects(left, g, [{ create: 'staff', with: { id: 'ben', name: 'Ben' } }])
    expect(back.removed).toEqual([])
    expect(applyEffects(back, g, [{ remove: 'staff:ben' }, { create: 'staff', with: { id: 'ben', name: 'Ben' } }, { remove: 'staff:ben' }]).removed).toEqual([
      'staff:ben',
    ])
    // Someone hired in play and let go is simply gone: nobody declared them.
    const hired = applyEffects(start, g, [{ create: 'staff', with: { name: 'Cleo' } }, { remove: 'staff:#1' }])
    expect(hired.removed).toEqual([])
    expect(hired.entities).toEqual({})
  })

  it('lose what a save copied from content when it loads, so a fixed name or start reads through', () => {
    const g = game()
    const copied = {
      ...startingState(g),
      entities: {
        staff: {
          ana: { name: 'Ana', stats: { morale: 50, skill: 6 }, kv: { role: 'cook', shifts: 3 } },
          ben: { name: 'Ben', stats: { morale: 50, skill: 1 }, kv: {} },
          '#1': { name: 'Cleo', stats: { morale: 50, skill: 2 }, kv: {} },
        },
        dish: { soup: { name: 'Soup', stats: { quality: 3 }, kv: {} } },
      },
    }
    expect(unwrap(loadState(copied, g)).entities).toEqual({
      staff: { ana: { stats: { skill: 6 }, kv: { shifts: 3 } }, '#1': { name: 'Cleo', stats: { skill: 2 } } },
      // A name that differs from the declaration's was given in play, and is kept.
      dish: { soup: { name: 'Soup' } },
    })
  })
})
