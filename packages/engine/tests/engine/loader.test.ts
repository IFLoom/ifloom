import { describe, expect, it } from 'vitest'
import { SCHEMA, loadGame, type Content, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { fixture } from '../fixtures/town.ts'

/** Content whose activities name things that are not there. (Places and characters are checked by their plugins.) */
const broken: Content = {
  name: 'broken',
  activities: [
    {
      id: 'dig',
      label: 'Dig',
      cost: { steps: 1 },
      blocked: [{ when: { not: { stat: 'stamina', gte: 5 } }, reason: 'Too tired.' }],
      effects: [{ custom: 'findTreasure' }],
    } as never,
  ],
}

/** The town's rules and settings, with none of its content. */
function baseOf() {
  const { scenes: _s, introScene: _in, items: _i, storylines: _t, activities: _a, stats: _st, ...base } = fixture()
  return base
}

describe('the loader', () => {
  it('finds nothing wrong with a game whose references all exist', () => {
    expect(withCafe().problems).toEqual([])
  })

  it('checks what activities and actions name, as it does for scenes', () => {
    const base = {
      ...baseOf(),
      actions: [{ id: 'nap', label: 'Nap', command: { type: 'activity' as const, id: 'rest' }, when: { storyline: 'dreams' } }],
    }
    const problems = loadGame([broken], base).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        'broken · activity dig · unknown stat "stamina"',
        'broken · activity dig · no custom effect named "findTreasure"',
        'base · action nap · unknown storyline "dreams"',
      ]),
    )
  })

  it('checks triggers, inputs, calls and the collections and prose their effects name', () => {
    const pack: Content = {
      name: 'post',
      collections: [{ id: 'letters', name: 'Letters' }],
      triggers: [
        {
          id: 'parcel',
          when: { collection: 'parcels' },
          effects: [
            { kind: 'collect', collection: 'drawer', entry: { id: 'a' } },
            { kind: 'notify', title: 'Post', text: 'post.unwritten' },
            { kind: 'scene', scene: 'nowhere' },
            { custom: 'shred' },
          ],
        },
      ],
      inputs: [
        { id: 'colour', label: 'Colour', kind: 'choice' },
        { id: 'age', label: 'Age', kind: 'number', min: 10, max: 5, when: { storyline: 'ghost' } },
      ],
    }
    const problems = loadGame([pack], baseOf()).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        'post · trigger parcel · unknown collection "parcels"',
        'post · trigger parcel · unknown collection "drawer"',
        'post · trigger parcel · no prose for "post.unwritten"',
        'post · trigger parcel · goes to unknown scene "nowhere"',
        'post · trigger parcel · no custom effect named "shred"',
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
    loadGame(content, { ...baseOf(), plugins: [{ id: 'notes', version: 1 }] }, { packs })
      .problems.map(describeProblem)
      .filter((line) => line.includes('declared twice'))
  const named = (name: string, rest: Content): Content => ({ name, ...rest })
  const scene = (id: string) => ({ id, body: [{ text: 'cafe.counter' }], choices: [] })
  const stat = (id: string) => ({ id, label: id, min: 0, max: 10, start: 0 })

  // Each kind of key content declares, written twice.
  const cases: [string, Content, string][] = [
    ['scenes', { scenes: [scene('cafe.counter')] }, 'scene "cafe.counter"'],
    ['prose keys', { prose: { 'cafe.counter': 'The counter.' } }, 'prose "cafe.counter"'],
    ['strings', { strings: { 'turn.next': 'Next' } }, 'string "turn.next"'],
    ['stats', { stats: [stat('coins')] }, 'stat "coins"'],
    ['items', { items: [{ id: 'key', name: 'Key', desc: 'A key.' }] }, 'item "key"'],
    ['kinds', { kinds: [{ id: 'staff', label: 'Staff' }] }, 'kind "staff"'],
    ['entities', { kinds: [], entities: [{ of: 'staff', id: 'ana', name: 'Ana' }] }, 'entity "staff:ana"'],
    ['storylines', { storylines: [{ id: 'ava', name: 'Ava' }] }, 'storyline "ava"'],
    ['custom functions', { custom: { conditions: { open: () => true } } }, 'custom condition "open"'],
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
    const { problems } = loadGame([{ prose: { 'cafe.counter': 'One.' } }, { prose: { 'cafe.counter': 'Two.' } }], baseOf())
    expect(problems.map(describeProblem)).toContain('content · prose "cafe.counter" · declared twice')
  })
})

describe('packs over the content', () => {
  const scene = (id: string, text: string) => ({ id, body: [{ text }], choices: [] })
  const content: Content[] = [{ scenes: [scene('cafe.counter', 'cafe.counter')], prose: { 'cafe.counter': 'The counter.' } }]

  it('replace what the content declares, and each other, last one winning, without a word', () => {
    const evening: Pack = { id: 'mod:evening', schema: SCHEMA, prose: { 'cafe.counter': 'Lanterns.' } }
    const late: Pack = { id: 'mod:late', schema: SCHEMA, prose: { 'cafe.counter': 'Late.' }, scenes: [scene('cafe.counter', 'cafe.late')] }
    const { game, prose, problems } = loadGame(content, baseOf(), { packs: [evening, late] })
    expect(prose['cafe.counter']).toBe('Late.')
    expect(game.scenes.find((one) => one.id === 'cafe.counter')).toMatchObject({ body: [{ text: 'cafe.late' }] })
    expect(problems.filter((problem) => problem.what.includes('twice'))).toEqual([])
  })

  it('patch the content’s scenes', () => {
    const patch: Pack = { id: 'mod:patch', schema: SCHEMA, patches: [{ scene: 'cafe.counter', addChoice: { id: 'wave', label: 'Wave', effects: [] } }] }
    const { game } = loadGame(content, baseOf(), { packs: [patch] })
    expect(game.scenes.find((one) => one.id === 'cafe.counter')).toMatchObject({ choices: [{ id: 'wave' }] })
  })

  it('are what `game.packs` lists, by id; the content has none', () => {
    const { game } = loadGame(content, baseOf(), { packs: [{ id: 'supporter', schema: SCHEMA }] })
    expect(game.packs).toEqual(['supporter'])
    expect(loadGame(content, baseOf()).game.packs).toEqual([])
  })

  it('still load when they say `overrides`, which packs no longer need', () => {
    const old = { id: 'mod:old', schema: SCHEMA, overrides: true, prose: { 'cafe.counter': 'Old.' } } as Pack
    const { prose, problems } = loadGame(content, baseOf(), { packs: [old] })
    expect(prose['cafe.counter']).toBe('Old.')
    expect(problems.filter((problem) => problem.pack === 'mod:old')).toEqual([])
  })
})

describe('content given what only a pack has', () => {
  it('reports the id, schema and patches, and leaves them out', () => {
    const asPack = { id: 'story.cafe', schema: SCHEMA, patches: [{ scene: 'cafe.counter', dropChoice: 'x' }], prose: { a: 'A.' } } as Content
    const { prose, problems } = loadGame([asPack], baseOf())
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
