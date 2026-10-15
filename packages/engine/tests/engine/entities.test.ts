import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { explain } from '../../src/explain.ts'
import { SCHEMA, loadGame, type Pack } from '../../src/loader.ts'
import { applyEffects, hydrate, startingState } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'

/** The café's staff and its menu: two kinds, each with stats of its own, and one stat of the player's. */
const cafe: Pack = {
  id: 'cafe',
  schema: SCHEMA,
  kinds: [{ id: 'staff', label: 'Member of staff', plural: 'Staff' }, { id: 'dish', label: 'Dish' }],
  stats: [
    { id: 'coins', label: 'Coins', start: 50, max: 9999 },
    { id: 'morale', label: 'Morale', of: 'staff', start: 50 },
    { id: 'skill', label: 'Skill', of: 'staff', start: 1, max: 10 },
    { id: 'quality', label: 'Quality', of: 'dish', start: 3, max: 5, visible: { flag: 'tasted', of: '$' } },
  ],
  entities: [
    { id: 'ana', of: 'staff', name: 'Ana', stats: { skill: 4 }, flags: { role: 'cook' } },
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
  it('start as declared, each with its kind’s stats at their start, and the player keeps only their own', () => {
    const g = game()
    const state = startingState(g)
    expect(state.stats).toEqual({ coins: 50 })
    expect(state.entities).toEqual({
      staff: {
        ana: { name: 'Ana', stats: { morale: 50, skill: 4 }, flags: { role: 'cook' } },
        ben: { name: 'Ben', stats: { morale: 50, skill: 1 }, flags: {} },
      },
      dish: { soup: { name: 'Soup of the day', stats: { quality: 3 }, flags: {} } },
    })
  })

  it('take the player’s effects and conditions with `of`, held to the stat’s range', () => {
    const g = game()
    const state = applyEffects(startingState(g), g, [
      { kind: 'stat', key: 'skill', by: 20, of: 'staff:ben' },
      { kind: 'setStat', key: 'morale', to: 80, of: 'staff:ana' },
      { kind: 'flag', key: 'shifts', add: 2, of: 'staff:ben' },
      // Nobody called Cleo works here: nothing happens.
      { kind: 'stat', key: 'skill', by: 1, of: 'staff:cleo' },
    ])
    expect(state.entities.staff.ben.stats.skill).toBe(10)
    expect(state.entities.staff.ana.stats.morale).toBe(80)
    expect(holds(state, { stat: 'morale', of: 'staff:ana', gte: 75 }, g)).toBe(true)
    expect(holds(state, { flag: 'shifts', of: 'staff:ben', gte: 2 }, g)).toBe(true)
    expect(holds(state, { flag: 'role', of: 'staff:ana', is: 'cook' }, g)).toBe(true)
    expect(holds(state, { stat: 'skill', of: 'staff:cleo', lt: 100 }, g)).toBe(false)
    expect(explain(state, { stat: 'morale', of: 'staff:ana', gte: 90 }, g).why).toBe('staff:ana stat morale is 80; wants 90 or more')
  })

  it('are created with the next free number, or a given id, and removed', () => {
    const g = game()
    let state = applyEffects(startingState(g), g, [
      { kind: 'create', of: 'staff', entity: { name: 'Cleo', stats: { skill: 6 } } },
      { kind: 'create', of: 'staff', entity: { name: 'Dev' } },
      { kind: 'create', of: 'staff', entity: { id: 'ana', name: 'Another Ana' } },
    ])
    expect(Object.keys(state.entities.staff)).toEqual(['ana', 'ben', '#1', '#2'])
    expect(state.entities.staff['#1']).toEqual({ name: 'Cleo', stats: { morale: 50, skill: 6 }, flags: {} })
    expect(state.entities.staff.ana.name).toBe('Ana')
    state = applyEffects(state, g, [{ kind: 'remove', of: 'staff:#1' }, { kind: 'create', of: 'staff', entity: { name: 'Eve' } }])
    // Numbers are never reused, so a removed one's id never comes back as someone else.
    expect(Object.keys(state.entities.staff)).toEqual(['ana', 'ben', '#2', '#3'])
    expect(holds(state, { entity: 'staff:#1' }, g)).toBe(false)
    expect(holds(state, { entity: 'staff:#3' }, g)).toBe(true)
  })

  it('run `each` for every one, with `$` as the one each time, only where `where` holds', () => {
    const g = game()
    const start = applyEffects(startingState(g), g, [{ kind: 'setStat', key: 'morale', to: 10, of: 'staff:ben' }])
    const state = applyEffects(start, g, [
      {
        kind: 'each',
        of: 'staff',
        where: { stat: 'morale', of: '$', gte: 20 },
        effects: [
          { kind: 'stat', key: 'morale', by: -5, of: '$' },
          { kind: 'stat', key: 'coins', by: -10 },
        ],
      },
      // Anyone left unhappy walks out.
      { kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', of: '$' }] },
    ])
    expect(state.entities.staff.ana.stats.morale).toBe(45)
    expect(state.stats.coins).toBe(40)
    expect(Object.keys(state.entities.staff)).toEqual(['ana'])
  })

  it('are counted, with a `where` of their own inside an `each`', () => {
    const g = game()
    const state = startingState(g)
    expect(holds(state, { count: 'staff' }, g)).toBe(true)
    expect(holds(state, { count: 'staff', gte: 3 }, g)).toBe(false)
    expect(holds(state, { count: 'staff', where: { stat: 'skill', of: '$', gte: 3 }, lte: 1 }, g)).toBe(true)
    expect(explain(state, { count: 'staff', where: { stat: 'skill', of: '$', gte: 3 } }, g).why).toBe('1 staff where it holds; wants more than 0')
    // For each member of staff, a bonus if someone *else* is more skilled: the inner `$` is the inner one's.
    const after = applyEffects(state, g, [
      {
        kind: 'each',
        of: 'staff',
        where: { count: 'staff', where: { stat: 'skill', of: '$', gte: 4 } },
        effects: [{ kind: 'flag', key: 'learning', value: true, of: '$' }],
      },
    ])
    expect(after.entities.staff.ana.flags.learning).toBe(true)
    expect(after.entities.staff.ben.flags.learning).toBe(true)
  })

  it('show in the view by kind, with each one’s visible stats', () => {
    const g = game()
    const state = applyEffects(startingState(g), g, [{ kind: 'flag', key: 'tasted', value: true, of: 'dish:soup' }])
    const shown = view(state, g)
    expect(shown.stats.map((stat) => stat.key)).toEqual(['coins'])
    expect(shown.entities.staff.plural).toBe('Staff')
    expect(shown.entities.staff.entries.map((entry) => [entry.ref, entry.name, entry.stats.map((stat) => `${stat.key} ${stat.value}`)])).toEqual([
      ['staff:ana', 'Ana', ['morale 50', 'skill 4']],
      ['staff:ben', 'Ben', ['morale 50', 'skill 1']],
    ])
    expect(shown.entities.dish.entries[0].stats.map((stat) => stat.key)).toEqual(['quality'])
    expect(view(startingState(g), g).entities.dish.entries[0].stats).toEqual([])
  })

  it('read a missing one’s variable as no answer at all, and do not create one numbered like the rest', () => {
    const g = game()
    const state = startingState(g)
    expect(holds(state, { flag: 'role', of: 'staff:ghost', lt: 1 }, g)).toBe(false)
    expect(holds(state, { not: { flag: 'role', of: 'staff:ghost' } }, g)).toBe(true)
    expect(applyEffects(state, g, [{ kind: 'create', of: 'staff', entity: { id: '7', name: 'Seven' } }]).entities.staff['7']).toBeUndefined()
    // `'$'` stands for the one in hand wherever an entity is named.
    const kept = applyEffects(state, g, [{ kind: 'each', of: 'staff', where: { entity: '$' }, effects: [{ kind: 'flag', key: 'seen', value: true, of: '$' }] }])
    expect(kept.entities.staff.ben.flags.seen).toBe(true)
  })

  it('are checked by the loader in scenes and activities too, inside `each`, with stats on their owners', () => {
    const { problems } = loadGame(
      [
        {
          ...cafe,
          activities: [
            { id: 'adopt', effects: [{ kind: 'create', of: 'cat', entity: { name: 'Biscuit' } }] },
            { id: 'payAna', effects: [{ kind: 'stat', key: 'coins', by: 5, of: 'staff:ana' }, { kind: 'stat', key: 'morale', by: 5 }] },
            {
              id: 'week',
              effects: [{ kind: 'each', of: 'staff', where: { stat: 'quality', of: '$', gte: 1 }, effects: [{ kind: 'stat', key: 'quality', by: 1, of: '$' }, { custom: 'nope' }] }],
            },
          ],
          scenes: [{ id: 'yard', body: [], choices: [{ id: 'feed', effects: [{ kind: 'flag', key: 'fed', value: true, of: 'pig:x' }] }] }],
          prose: { 'yard#feed': 'Feed the pig' },
        },
      ],
      { id: 'cafe', title: 'The Café' },
    )
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'scene yard: unknown kind "pig"',
      'activity adopt: unknown kind "cat"',
      'activity payAna: stat "coins" is the player\'s, not staff:ana\'s',
      'activity payAna: stat "morale" belongs to staff: say whose with "of"',
      'activity week: in each staff: stat "quality" belongs to dish, not staff',
      'activity week: in each staff: stat "quality" belongs to dish, not staff',
      'activity week: in each staff: no custom effect named "nope"',
    ])
  })

  it('are checked by the loader: kinds, and stats that belong to them', () => {
    const { problems } = loadGame(
      [
        {
          ...cafe,
          stats: [...(cafe.stats ?? []), { id: 'shine', label: 'Shine', of: 'car' }],
          entities: [...(cafe.entities ?? []), { id: 'cat', of: 'pet', name: 'Biscuit' }, { id: '7', of: 'dish', name: 'Number seven' }, { id: 'cleo', of: 'staff', name: 'Cleo', stats: { coins: 5 } }],
          triggers: [
            { id: 'empty', when: { count: 'staf' }, effects: [{ kind: 'each', of: 'dishes', effects: [{ kind: 'remove', of: 'meal:x' }] }] },
          ],
        },
      ],
      { id: 'cafe', title: 'The Café' },
    )
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'stat shine: belongs to unknown kind "car"',
      'entity pet:cat: unknown kind "pet"',
      'entity dish:7: an entity id must not be a whole number',
      'entity staff:cleo: no staff stat named "coins"',
      'trigger empty: unknown kind "staf"',
      'trigger empty: unknown kind "dishes"',
      'trigger empty: in each dishes: unknown kind "meal"',
    ])
  })
})

describe('declared entities and old saves', () => {
  it('join a save that lacks them when it loads, but one removed in play stays gone', () => {
    const g = game()
    const start = startingState(g)
    // A save from before Ben was written in: he joins it.
    const { ben: _ben, ...staff } = start.entities.staff
    const older = { ...start, entities: { ...start.entities, staff } }
    expect(Object.keys(hydrate(older, g).entities.staff)).toEqual(['ana', 'ben'])
    // Ben left in play: he does not come back.
    const left = applyEffects(start, g, [{ kind: 'remove', of: 'staff:ben' }])
    expect(left.removed).toEqual(['staff:ben'])
    expect(Object.keys(hydrate(left, g).entities.staff)).toEqual(['ana'])
    // Taken on again by name: no longer gone for good, and removed only once however often.
    const back = applyEffects(left, g, [{ kind: 'create', of: 'staff', entity: { id: 'ben', name: 'Ben' } }])
    expect(back.removed).toEqual([])
    expect(applyEffects(back, g, [{ kind: 'remove', of: 'staff:ben' }, { kind: 'create', of: 'staff', entity: { id: 'ben', name: 'Ben' } }, { kind: 'remove', of: 'staff:ben' }]).removed).toEqual(['staff:ben'])
    // Someone hired in play and let go is simply gone: nobody declared them.
    const hired = applyEffects(start, g, [{ kind: 'create', of: 'staff', entity: { name: 'Cleo' } }, { kind: 'remove', of: 'staff:#1' }])
    expect(hired.removed).toEqual([])
  })
})
