import { describe, expect, expectTypeOf, it } from 'vitest'
import { describeProblem } from '../../src/check.ts'
import { setTraitState, traitOf, traitState, withTrait, type TraitDef } from '../../src/entities.ts'
import { startingState, loadState } from '../../src/intake.ts'
import { loadGame, type Content, type Pack } from '../../src/loader.ts'
import { definePlugin } from '../../src/plugin.ts'
import { SCHEMA } from '../../src/upgrade.ts'
import { applyEffects } from '../../src/reduce.ts'
import { unwrap } from '../fixtures/result.ts'

declare module '@ifloom/engine' {
  interface Traits {
    'closet/hangs': { slot: string; layer?: number }
  }
}

/** A trait a plugin gives meaning to: clothes that hang in a slot of the closet's. */
const hangs: TraitDef<'closet/hangs', { worn: number }> = {
  id: 'closet/hangs',
  check: (data) => (data.slot === '' ? ['a slot needs a name'] : []),
  references: (data) => [{ entry: data.slot, plugin: 'closet', list: 'slots', noun: 'slot' }],
  state: { start: () => ({ worn: 0 }) },
}

const closet = definePlugin({ id: 'closet', version: 1, traits: [hangs] })

const clothes: Content = {
  name: 'clothes',
  kinds: [{ id: 'clothing', label: 'Clothing', traits: { 'closet/hangs': { layer: 1 }, cosy: true } }],
  entities: [
    { id: 'scarf', of: 'clothing', name: 'Scarf', traits: { 'closet/hangs': { slot: 'neck' } } },
    { id: 'coat', of: 'clothing', name: 'Coat', traits: { 'closet/hangs': { slot: 'body', layer: 2 }, cosy: false } },
    { id: 'hat', of: 'clothing', name: 'Hat', traits: { 'closet/hangs': { slot: 'head' } } },
  ],
  data: { closet: { slots: [{ id: 'neck' }, { id: 'body' }, { id: 'head' }] } },
}

const base = { id: 'town', title: 'Town', plugins: [closet] }

describe('traits', () => {
  it('read through the table, then the entity, then the kind', () => {
    const extra: Content = { name: 'extra', traits: { 'closet/hangs': { 'clothing:hat': { slot: 'neck' } } } }
    const { game, problems } = loadGame([clothes, extra], base)
    expect(problems.map(describeProblem)).toEqual([])
    // The kind's default is laid under the entity's own, field by field.
    expect(traitOf(game, 'clothing:scarf', 'closet/hangs')).toEqual({ slot: 'neck', layer: 1 })
    expect(traitOf(game, 'clothing:coat', 'closet/hangs')).toEqual({ slot: 'body', layer: 2 })
    expect(traitOf(game, 'clothing:hat', 'closet/hangs')).toEqual({ slot: 'neck', layer: 1 })
    // A value that isn't an object is replaced whole; a game's own trait has no `/`.
    expect(traitOf(game, 'clothing:coat', 'cosy')).toBe(false)
    expect(traitOf(game, 'clothing:scarf', 'cosy')).toBe(true)
    // One created in play has its kind's.
    expect(traitOf(game, 'clothing:#1', 'closet/hangs')).toEqual({ layer: 1 })
    expect(traitOf(game, 'clothing:scarf', 'nothing')).toBeUndefined()
    expect(withTrait(game, 'closet/hangs')).toEqual(['clothing:scarf', 'clothing:coat', 'clothing:hat'])
    // The loaded game holds the worked-out table, as plain data.
    expect(game.traits?.['closet/hangs']?.['clothing:hat']).toEqual({ slot: 'neck', layer: 1 })
    expect(JSON.parse(JSON.stringify(game.traits))).toEqual(game.traits)
    expectTypeOf(traitOf(game, 'clothing:scarf', 'closet/hangs')).toEqualTypeOf<{ slot: string; layer?: number } | undefined>()
    expectTypeOf(traitOf(game, 'clothing:scarf', 'cosy')).toBeUnknown()
  })

  it('replace an entity’s own with a table row, whole, over the kind’s', () => {
    const row: Content = { traits: { 'closet/hangs': { 'clothing:coat': { slot: 'neck' } } } }
    const { game } = loadGame([clothes, row], base)
    expect(traitOf(game, 'clothing:coat', 'closet/hangs')).toEqual({ slot: 'neck', layer: 1 })
  })

  it('read the same from a hand-built game', () => {
    const game = { id: 'town', title: 'Town', scenes: [], plugins: [closet], kinds: clothes.kinds, entities: clothes.entities }
    expect(traitOf(game, 'clothing:scarf', 'closet/hangs')).toEqual({ slot: 'neck', layer: 1 })
    expect(withTrait(game, 'cosy')).toEqual(['clothing:scarf', 'clothing:coat', 'clothing:hat'])
  })

  it('let a pack give a trait over the content’s, and report a row the content gives twice', () => {
    const mod: Pack = { id: 'mod:warm', schema: SCHEMA, traits: { 'closet/hangs': { 'clothing:scarf': { slot: 'body' } } } }
    expect(traitOf(loadGame([clothes], base, { packs: [mod] }).game, 'clothing:scarf', 'closet/hangs')).toEqual({ slot: 'body', layer: 1 })
    const once: Content = { name: 'once', traits: { 'closet/hangs': { 'clothing:hat': { slot: 'head' } } } }
    const twice: Content = { name: 'twice', traits: { 'closet/hangs': { 'clothing:hat': { slot: 'neck' } } } }
    expect(loadGame([clothes, once, twice], base).problems.map(describeProblem)).toEqual([
      'twice · trait "closet/hangs" on "clothing:hat" · declared twice, in once and twice',
    ])
  })

  it('are checked by the plugin that declares them, and pinned on where they came from', () => {
    const wrong: Pack = {
      id: 'mod:odd',
      schema: SCHEMA,
      traits: {
        'closet/hangs': { 'clothing:sock': { slot: 'foot' }, 'clothing:hat': { slot: '' } },
        'closet/folds': { 'clothing:hat': true },
        // A plugin the game doesn't have, and the game's own: let through.
        'laundry/washable': { 'clothing:hat': { at: 40 } },
        warm: { 'clothing:nobody': 1 },
      },
    }
    const { problems } = loadGame([clothes], base, { packs: [wrong] })
    expect(problems.map(describeProblem).sort()).toEqual(
      [
        'mod:odd · trait closet/folds · plugin "closet" has no trait "closet/folds"',
        'mod:odd · trait closet/hangs on clothing:sock · unknown entity "clothing:sock"',
        'mod:odd · trait closet/hangs on clothing:hat · a slot needs a name',
        'mod:odd · trait closet/hangs on clothing:hat · unknown slot ""',
        'mod:odd · trait warm on clothing:nobody · unknown entity "clothing:nobody"',
      ].sort(),
    )
    // A plugin's trait is named for it.
    const stray = definePlugin({ id: 'closet', version: 1, traits: [hangs, { id: 'hangs' }, { id: 'closet/hangs' }] })
    expect(loadGame([clothes], { ...base, plugins: [stray] }).problems.map(describeProblem)).toEqual([
      'base · plugin closet · trait "hangs" must be named "closet/" and a name',
      'base · plugin closet · two traits share the id "closet/hangs"',
    ])
  })

  it('keep state of their own on an entity only once play writes it', () => {
    const { game } = loadGame([clothes], base)
    const state = startingState(game)
    expect(traitState(state, game, 'clothing:scarf', 'closet/hangs')).toEqual({ worn: 0 })
    expect(traitState(state, game, 'clothing:scarf', 'cosy')).toBeUndefined()
    expect(state.entities).toEqual({})
    const worn = setTraitState(state, game, 'clothing:scarf', 'closet/hangs', { worn: 1 })
    expect(worn.entities).toEqual({ clothing: { scarf: { traits: { 'closet/hangs': { worn: 1 } } } } })
    expect(traitState(worn, game, 'clothing:scarf', 'closet/hangs')).toEqual({ worn: 1 })
    // It survives a load, and goes with the entity.
    const loaded = unwrap(loadState(JSON.parse(JSON.stringify(worn)), game))
    expect(traitState(loaded, game, 'clothing:scarf', 'closet/hangs')).toEqual({ worn: 1 })
    const gone = applyEffects(worn, game, [{ kind: 'remove', entity: 'clothing:scarf' }])
    expect(traitState(gone, game, 'clothing:scarf', 'closet/hangs')).toBeUndefined()
    expect(setTraitState(gone, game, 'clothing:scarf', 'closet/hangs', { worn: 2 })).toBe(gone)
  })
})
