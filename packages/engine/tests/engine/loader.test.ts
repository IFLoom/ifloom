import { describe, expect, it } from 'vitest'
import { SCHEMA, loadGame, type Content, type Pack } from '../../src/loader.ts'
import type { Plugin } from '../../src/plugin.ts'
import { describeProblem } from '../../src/check.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { fixture, loadWhole } from '../fixtures/town.ts'

/** Content whose activities name things that are not there. (Places and characters are checked by their plugins.) */
const broken: Content = {
  name: 'broken',
  actions: [
    {
      id: 'dig',
      label: 'Dig',
      cost: { steps: 1 },
      blocked: [{ when: { not: { stat: 'stamina', gte: 5 } }, reason: 'Too tired.' }],
      effects: [{ 'game/findTreasure': true }],
    } as never,
  ],
}

/** The town's rules and settings, with none of its content. */
function baseOf() {
  const { scenes: _s, introScene: _in, storylines: _t, actions: _a, stats: _st, ...base } = fixture()
  return base
}

describe('the loader', () => {
  it('finds nothing wrong with a game whose references all exist', () => {
    expect(withCafe().problems).toEqual([])
  })

  it('checks what activities and actions name, as it does for scenes', () => {
    const base = {
      ...baseOf(),
      actions: [{ id: 'nap', label: 'Nap', command: { type: 'action' as const, id: 'rest' }, when: { storyline: 'dreams' } }],
    }
    const problems = loadWhole([broken], base).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        'broken · action dig · unknown stat "stamina"',
        'broken · action dig · no game effect named "game/findTreasure"',
        'base · action nap · unknown storyline "dreams"',
      ]),
    )
  })

  it('checks triggers, inputs, calls and the kinds and scenes their effects name', () => {
    const pack: Content = {
      name: 'post',
      kinds: [{ id: 'letter', label: 'Letter' }],
      triggers: [
        {
          id: 'parcel',
          when: { count: { of: 'parcel' } },
          effects: [{ create: 'drawer', with: { id: 'a' } }, { notify: 'Post', text: 'post.unwritten' }, { scene: 'nowhere' }, { 'game/shred': true }],
        },
      ],
      inputs: [
        { id: 'colour', label: 'Colour', type: 'choice' },
        { id: 'age', label: 'Age', type: 'number', min: 10, max: 5, when: { storyline: 'ghost' } },
      ],
    }
    const problems = loadWhole([pack], baseOf()).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        'post · trigger parcel · unknown kind "parcel"',
        'post · trigger parcel · unknown kind "drawer"',
        'post · trigger parcel · goes to unknown scene "nowhere"',
        'post · trigger parcel · no game effect named "game/shred"',
        'post · input colour · a choice with no options',
        'post · input age · min is above max',
        'post · input age · unknown storyline "ghost"',
      ]),
    )
  })
})

describe('one thing declared twice across the content', () => {
  /** The problems about things declared twice, as lines, from loading this content over the town's base with a plugin `notes`. */
  const twice = (content: Content[], packs: Pack[] = []) =>
    loadWhole(content, { ...baseOf(), plugins: [{ id: 'notes', version: 1 }] }, { packs })
      .problems.map(describeProblem)
      .filter((line) => line.includes('declared twice'))
  const named = (name: string, rest: Content): Content => ({ name, ...rest })
  const scene = (id: string) => ({ id, body: [{ prose: 'cafe.counter' }], choices: [] })
  const stat = (id: string) => ({ id, label: id, min: 0, max: 10, start: 0 })

  // Each kind of key content declares, written twice.
  const cases: [string, Content, string][] = [
    ['scenes', { scenes: [scene('cafe.counter')] }, 'scene "cafe.counter"'],
    ['prose keys', { prose: { 'cafe.counter': 'The counter.' } }, 'prose "cafe.counter"'],
    ['strings', { strings: { 'turn.next': 'Next' } }, 'string "turn.next"'],
    ['stats', { stats: [stat('coins')] }, 'stat "coins"'],
    ['kinds', { kinds: [{ id: 'staff', label: 'Staff' }] }, 'kind "staff"'],
    ['entities', { kinds: [], entities: [{ of: 'staff', id: 'ana', name: 'Ana' }] }, 'entity "staff:ana"'],
    ['storylines', { storylines: [{ id: 'ava', name: 'Ava' }] }, 'storyline "ava"'],
    ['the same line in a variants name', { variants: { 'street.weather': ['cafe.counter'] } }, 'variants "street.weather" line "cafe.counter"'],
    ['plugin content', { data: { notes: { notes: [{ id: 'first' }] } } }, 'notes/notes "first"'],
  ]
  for (const [kind, content, what] of cases) {
    it(`reports ${kind}, naming both files when they have names`, () => {
      expect(twice([named('story.cafe', content), named('story.town', content)])).toEqual([
        `story.town · ${what} · declared twice, in story.cafe and story.town`,
      ])
      expect(twice([content, content])).toEqual([`content · ${what} · declared twice`])
    })
  }

  it('lets content add different lines to one variants name', () => {
    expect(twice([{ variants: { murmur: ['a'] } }, { variants: { murmur: ['b'] } }])).toEqual([])
  })

  it('makes it a problem, so a check fails on it', () => {
    const { problems } = loadWhole([{ prose: { 'cafe.counter': 'One.' } }, { prose: { 'cafe.counter': 'Two.' } }], baseOf())
    expect(problems.map(describeProblem)).toContain('content · prose "cafe.counter" · declared twice')
  })
})

describe('packs over the content', () => {
  const scene = (id: string, prose: string) => ({ id, body: [{ prose }], choices: [] })
  const content: Content[] = [{ scenes: [scene('cafe.counter', 'cafe.counter')], prose: { 'cafe.counter': 'The counter.' } }]

  it('replace what the content declares, and each other, last one winning, without a word', () => {
    const evening: Pack = { id: 'mod:evening', schema: SCHEMA, prose: { 'cafe.counter': 'Lanterns.' } }
    const late: Pack = { id: 'mod:late', schema: SCHEMA, prose: { 'cafe.counter': 'Late.' }, scenes: [scene('cafe.counter', 'cafe.late')] }
    const { game, prose, problems } = loadWhole(content, baseOf(), { packs: [evening, late] })
    expect(prose['cafe.counter']).toBe('Late.')
    expect(game.scenes.find((one) => one.id === 'cafe.counter')).toMatchObject({ body: [{ prose: 'cafe.late' }] })
    expect(problems.filter((problem) => problem.what.includes('twice'))).toEqual([])
  })

  it('patch the content’s scenes', () => {
    const patch: Pack = { id: 'mod:patch', schema: SCHEMA, patches: [{ scene: 'cafe.counter', addChoice: { id: 'wave', label: 'Wave', effects: [] } }] }
    const { game } = loadWhole(content, baseOf(), { packs: [patch] })
    expect(game.scenes.find((one) => one.id === 'cafe.counter')).toMatchObject({ choices: [{ id: 'wave' }] })
  })

  it('are what `game.packs` lists, by id; the content has none', () => {
    const { game } = loadWhole(content, baseOf(), { packs: [{ id: 'supporter', schema: SCHEMA }] })
    expect(game.packs).toEqual(['supporter'])
    expect(loadWhole(content, baseOf()).game.packs).toEqual([])
  })

  it('still load when they say `overrides`, which packs no longer need', () => {
    const old = { id: 'mod:old', schema: SCHEMA, overrides: true, prose: { 'cafe.counter': 'Old.' } } as Pack
    const { prose, problems } = loadWhole(content, baseOf(), { packs: [old] })
    expect(prose['cafe.counter']).toBe('Old.')
    expect(problems.filter((problem) => problem.pack === 'mod:old')).toEqual([])
  })
})

describe('content given what only a pack has', () => {
  it('reports the id, schema and patches, and leaves them out', () => {
    const asPack = { id: 'story.cafe', schema: SCHEMA, patches: [{ scene: 'cafe.counter', dropChoice: 'x' }], prose: { a: 'A.' } } as Content
    const { prose, problems } = loadWhole([asPack], baseOf())
    expect(prose.a).toBe('A.')
    expect(problems.map(describeProblem)).toEqual(
      expect.arrayContaining([
        'content · content · content has no "id", so it was left out; a pack has one, and goes in `packs`',
        'content · content · content has no "schema", so it was left out; a pack has one, and goes in `packs`',
        'content · content · content has no "patches", so it was left out; a pack has one, and goes in `packs`',
      ]),
    )
  })
})

describe('what a mod can reach', () => {
  const scenes: Content['scenes'] = [
    { id: 'door', body: [], choices: [{ id: 'in', label: 'In', effects: [{ scene: null }] }] },
    { id: 'gate', body: [], choices: [{ id: 'in', label: 'In', effects: [{ scene: null }] }] },
  ]
  const base = { id: 'yard', title: 'The Yard' }
  const own: Content = {
    name: 'story.yard',
    scenes,
    introScene: 'door',
    actions: [{ id: 'sweep', label: 'Sweep', command: { type: 'leave' } }],
    locks: [
      { id: 'night', when: { kv: 'night' }, deny: ['leave'], reason: 'Too dark.' },
      { when: { kv: 'rain' }, deny: ['leave'], reason: 'Too wet.' },
    ],
    resets: { swept: false },
    saveable: [{ when: { kv: 'busy' }, reason: 'Busy.' }],
    finished: { seen: 'gate' },
    carryOver: { kv: ['swept'] },
    ui: { mood: 'calm' },
    prose: {},
  }

  it('is content: actions, locks, resets, saveable, finished, carryOver, startPhase, introScene and ui', () => {
    const { game, problems } = loadGame([own], base)
    expect(problems).toEqual([])
    expect(game).toMatchObject({ introScene: 'door', resets: { swept: false }, finished: { seen: 'gate' }, carryOver: { kv: ['swept'] }, ui: { mood: 'calm' } })
    expect(game.actions?.map((action) => action.id)).toEqual(['sweep'])
    expect(game.locks?.map((lock) => lock.reason)).toEqual(['Too dark.', 'Too wet.'])
  })

  it('is laid over by a pack: a lock by its id, the rest by id, by key or whole', () => {
    const mod: Pack = {
      id: 'mod:dawn',
      schema: SCHEMA,
      introScene: 'gate',
      actions: [{ id: 'sweep', label: 'Sweep up', command: { type: 'leave' } }],
      locks: [
        { id: 'night', when: { kv: 'night' }, deny: ['leave'], reason: 'Wait for dawn.' },
        { when: { kv: 'fog' }, deny: ['leave'], reason: 'Foggy.' },
      ],
      resets: { raked: false },
      saveable: [{ when: { kv: 'asleep' }, reason: 'Asleep.' }],
      ui: { colour: 'grey' },
    }
    const { game, problems } = loadGame([own], base, { packs: [mod] })
    expect(problems).toEqual([])
    expect(game.introScene).toBe('gate')
    expect(game.actions?.map((action) => action.label)).toEqual(['Sweep up'])
    expect(game.locks?.map((lock) => lock.reason)).toEqual(['Wait for dawn.', 'Too wet.', 'Foggy.'])
    expect(game.resets).toEqual({ swept: false, raked: false })
    expect(game.saveable?.map((entry) => entry.reason)).toEqual(['Busy.', 'Asleep.'])
    expect(game.ui).toEqual({ mood: 'calm', colour: 'grey' })
  })

  it('is declared once across the content', () => {
    const again: Content = {
      name: 'story.gate',
      introScene: 'gate',
      locks: [{ id: 'night', when: { kv: 'night' }, deny: ['leave'], reason: 'Dark.' }],
      resets: { swept: true },
    }
    const { problems } = loadGame([own, again], base)
    expect(problems.map(describeProblem).sort()).toEqual([
      'story.gate · introScene · declared twice, in story.yard and story.gate',
      'story.gate · lock "night" · declared twice, in story.yard and story.gate',
      'story.gate · reset "swept" · declared twice, in story.yard and story.gate',
    ])
  })

  it('pins a problem on the content or pack that brought it', () => {
    const mod: Pack = { id: 'mod:lost', schema: SCHEMA, introScene: 'cellar', locks: [{ when: { gone: 1 } as never, deny: ['leave'], reason: 'No.' }] }
    const { problems } = loadGame([own], base, { packs: [mod] })
    expect(problems.map(describeProblem)).toEqual(
      expect.arrayContaining(['mod:lost · introScene · unknown scene "cellar"', expect.stringMatching(/^mod:lost · lock 2 · /)]),
    )
  })

  it('reports what the base can no longer hold', () => {
    const { problems } = loadGame([own], { ...base, introScene: 'door' } as never)
    expect(problems.map(describeProblem)).toEqual([
      'base · base · the base has no "introScene", so it was left out; it is content now, so it goes in the game\'s content',
    ])
  })
})

describe('a plugin’s content', () => {
  const lamps = {
    id: 'lamps',
    version: 1,
    content: {
      kinds: [{ id: 'lamp', label: 'Lamp' }],
      entities: [{ id: 'hall', of: 'lamp', name: 'Hall lamp' }],
      actions: [{ id: 'light', label: 'Light the lamps', command: { type: 'leave' } }],
      prose: { 'lamps.lit': 'The lamps are lit.' },
    },
  } satisfies Plugin

  it('is merged first, under the game’s content and packs', () => {
    const own: Content = { name: 'story', prose: { 'lamps.lit': 'Every lamp is lit.' } }
    const mod: Pack = { id: 'mod:dim', schema: SCHEMA, actions: [{ id: 'light', label: 'Light one lamp', command: { type: 'leave' } }] }
    const { game, prose, problems } = loadGame([own], { id: 'house', title: 'House', plugins: [lamps] }, { packs: [mod] })
    expect(problems).toEqual([])
    expect(prose['lamps.lit']).toBe('Every lamp is lit.')
    expect(game.actions?.map((action) => action.label)).toEqual(['Light one lamp'])
    expect(game.entities?.map((entity) => entity.name)).toEqual(['Hall lamp'])
    // A plugin's kinds are unlisted unless it says, as a plugin's always were.
    expect(game.kinds?.find((kind) => kind.id === 'lamp')?.listed).toBe(false)
  })

  it('is not counted as the game declaring a key twice', () => {
    const own: Content = { name: 'story', actions: [{ id: 'light', label: 'Light it', command: { type: 'leave' } }] }
    expect(loadGame([own], { id: 'house', title: 'House', plugins: [lamps] }).problems).toEqual([])
  })
})
