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
