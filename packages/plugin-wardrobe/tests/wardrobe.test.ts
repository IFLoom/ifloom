import { describe, expect, it } from 'vitest'
import { SCHEMA, apply, holds, loadGame, startingState, view, whyNot, type Game, type GameState, type Pack } from '@ifloom/engine'
import { slotFilled, takeOff, wardrobe, wear, wearing, type WardrobeView } from '../src/index.ts'

const plugin = wardrobe()
/** The slots, as the base game's content: boots on from the start. */
const slots = {
  wardrobe: {
    slots: [
      { id: 'coat', label: 'Coat' },
      { id: 'feet', label: 'Feet', start: 'boots' },
    ],
  },
}

function game(extra: Partial<Pack> = {}): Game {
  const town: Pack = {
    id: 'town',
    schema: SCHEMA,
    items: [
      { id: 'raincoat', name: 'raincoat', desc: '', start: 1 },
      { id: 'boots', name: 'boots', desc: '', start: 1 },
      { id: 'sandals', name: 'sandals', desc: '', start: 1 },
      { id: 'umbrella', name: 'umbrella', desc: '', start: 1 },
    ],
    activities: [{ id: 'sellBoots', effects: [{ kind: 'item', item: 'boots', by: -1 }] }],
    data: {
      wardrobe: {
        clothes: [
          { id: 'raincoat', slot: 'coat' },
          { id: 'boots', slot: 'feet' },
          { id: 'sandals', slot: 'feet' },
        ],
      },
    },
    ...extra,
  }
  const loaded = loadGame([town], { id: 'wet', title: 'Wet', plugins: [plugin], data: slots })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const begin = (g: Game): GameState => ({ ...startingState(g), sceneId: null })
const shown = (state: GameState, g: Game) => view(state, g).plugins.wardrobe as WardrobeView

describe('the wardrobe', () => {
  it('starts with what the game says the player has on', () => {
    const g = game()
    expect(shown(begin(g), g)).toEqual({
      slots: [
        { id: 'coat', label: 'Coat', item: null, name: null },
        { id: 'feet', label: 'Feet', item: 'boots', name: 'boots' },
      ],
      spare: [
        { id: 'raincoat', name: 'raincoat', slot: 'coat' },
        { id: 'sandals', name: 'sandals', slot: 'feet' },
      ],
    })
    expect(holds(begin(g), wearing('boots'), g)).toBe(true)
    expect(holds(begin(g), slotFilled('coat'), g)).toBe(false)
  })

  it('puts clothes on in place of whatever was in the slot, without changing what the player owns', () => {
    const g = game()
    const out = apply(begin(g), g, wear('sandals'))
    expect(out.ok).toBe(true)
    expect(out.state.items).toMatchObject({ sandals: 1, boots: 1 })
    expect(holds(out.state, wearing('sandals', 'feet'), g)).toBe(true)
    expect(holds(out.state, wearing('boots'), g)).toBe(false)
    expect(holds(out.state, { item: 'boots' }, g)).toBe(true)
  })

  it('takes clothes off', () => {
    const g = game()
    const out = apply(begin(g), g, takeOff('feet'))
    expect(out.state.items.boots).toBe(1)
    expect(holds(out.state, slotFilled('feet'), g)).toBe(false)
  })

  it('ignores a slot the game no longer has', () => {
    const g = game()
    const old = { ...begin(g), plugins: { wardrobe: { version: 1, state: { worn: { coat: null, feet: 'boots', hat: 'raincoat' } } } } }
    expect(holds(old, wearing('raincoat'), g)).toBe(false)
  })

  it('takes off what the player no longer has', () => {
    const g = game()
    const out = apply(begin(g), g, { type: 'activity', id: 'sellBoots' })
    expect(holds(out.state, slotFilled('feet'), g)).toBe(false)
  })

  it('says why it cannot', () => {
    const g = game()
    const state = begin(g)
    expect(whyNot(state, g, wear('umbrella'))).toBe('The umbrella is not something you wear.')
    expect(whyNot(state, g, wear('hat'))).toBe('There is no such thing.')
    expect(whyNot(state, g, wear('boots'))).toBe('You are already wearing the boots.')
    expect(whyNot(state, g, takeOff('coat'))).toBe('There is nothing to take off.')
    const barefoot = apply(state, g, takeOff('feet')).state
    const sandals = apply(barefoot, g, wear('sandals')).state
    expect(whyNot(apply(sandals, g, takeOff('feet')).state, g, wear('raincoat'))).toBeUndefined()
    expect(apply(state, g, wear('umbrella'))).toMatchObject({ ok: false, reason: 'The umbrella is not something you wear.' })
  })

  it('reports clothes that are not items or name a slot the game does not have', () => {
    const loaded = loadGame([{ id: 'mod', schema: SCHEMA, data: { wardrobe: { clothes: [{ id: 'cape', slot: 'back' }] } } }], {
      id: 'g',
      title: 'g',
      plugins: [plugin],
      data: slots,
    })
    expect(loaded.problems).toEqual([
      { pack: 'mod', where: 'clothes cape', what: 'unknown item "cape"' },
      { pack: 'mod', where: 'clothes cape', what: 'unknown slot "back"' },
      { pack: 'base', where: 'slots feet', what: 'starts with "boots", which is not clothing for this slot' },
    ])
    const unowned = loadGame(
      [
        {
          id: 'town',
          schema: SCHEMA,
          items: [{ id: 'boots', name: 'boots', desc: '' }],
          data: { wardrobe: { clothes: [{ id: 'boots', slot: 'feet' }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [plugin], data: slots },
    )
    expect(unowned.problems).toContainEqual({ pack: 'base', where: 'slots feet', what: 'starts with "boots", which the player does not start with' })
  })
})
