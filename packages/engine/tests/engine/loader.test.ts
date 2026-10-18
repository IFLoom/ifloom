import { describe, expect, it } from 'vitest'
import { SCHEMA, loadGame, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { fixture } from '../fixtures/town.ts'

/** A pack whose activities name things that are not there. (Places and characters are checked by their plugins.) */
const broken: Pack = {
  id: 'broken',
  schema: SCHEMA,
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
    const pack: Pack = {
      id: 'post',
      schema: SCHEMA,
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

describe('two of the game’s own packs declaring one thing', () => {
  /** The problems about clashes, as lines, from loading these packs over the town's base with a plugin `notes`. */
  const clashes = (...packs: Pack[]) =>
    loadGame(packs, { ...baseOf(), plugins: [{ id: 'notes', version: 1 }] })
      .problems.map(describeProblem)
      .filter((line) => line.includes(' is in both '))
  const pack = (id: string, rest: Partial<Pack>): Pack => ({ id, schema: SCHEMA, ...rest })
  const scene = (id: string) => ({ id, body: [{ text: 'cafe.counter' }], choices: [] })
  const stat = (id: string) => ({ id, label: id, min: 0, max: 10, start: 0 })

  // Each kind of key a pack declares, written by two packs.
  const cases: [string, Partial<Pack>, string][] = [
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
  for (const [name, content, what] of cases) {
    it(`names both packs for ${name}`, () => {
      expect(clashes(pack('story.cafe', content), pack('story.town', content))).toEqual([`story.town · pack · ${what} is in both story.cafe and story.town`])
    })
  }

  it('lets packs add different lines to one variants name', () => {
    expect(clashes(pack('story.cafe', { variants: { murmur: ['a'] } }), pack('story.park', { variants: { murmur: ['b'] } }))).toEqual([])
  })

  it('keeps quiet about a mod, a patch and a pack that overrides on purpose', () => {
    const own = pack('story.cafe', { scenes: [scene('cafe.counter')], prose: { 'cafe.counter': 'The counter.' } })
    const mod = pack('mod:evening', { scenes: [scene('cafe.counter')], prose: { 'cafe.counter': 'Lanterns.' } })
    const patch = pack('story.patch', { patches: [{ scene: 'cafe.counter', dropChoice: 'nothing' }] })
    const meant = pack('story.late', { overrides: true, prose: { 'cafe.counter': 'Late.' } })
    expect(clashes(own, mod, patch, meant)).toEqual([])
    // A later pack that doesn't say so is still reported against the first.
    expect(clashes(own, meant, pack('story.again', { prose: { 'cafe.counter': 'Again.' } }))).toEqual([
      'story.again · pack · prose "cafe.counter" is in both story.cafe and story.again',
    ])
  })
})
