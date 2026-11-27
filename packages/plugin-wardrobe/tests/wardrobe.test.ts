import { describe, expect, it } from 'vitest'
import { apply, give, heldCount, holds, loadGame, move, take, view, whyNot, type Content, type Game, type GameState } from '@ifloom/engine'
import { freshState, loadChecked } from '@ifloom/engine/testing'
import { places } from '@ifloom/plugin-places'
import { wardrobe, type WardrobeView } from '../src/index.ts'

const plugin = wardrobe()
/** The slots, as the base game's content: boots on from the start. */
const slots = {
  wardrobe: {
    slots: [
      { id: 'coat', label: 'Coat' },
      { id: 'feet', label: 'Feet', start: 'clothing:boots' },
    ],
  },
}

/** Clothes are unique things, each worn in its slot; the umbrella is held but never worn. */
const town: Content = {
  name: 'town',
  kinds: [
    { id: 'clothing', label: 'Clothing', unique: true, listed: false },
    { id: 'friend', label: 'Friend', unique: true, listed: false },
  ],
  entities: [
    { id: 'raincoat', of: 'clothing', name: 'raincoat', at: 'player', traits: { ...wardrobe.wearable('coat') } },
    { id: 'boots', of: 'clothing', name: 'boots', at: 'player', traits: { ...wardrobe.wearable('feet') } },
    { id: 'sandals', of: 'clothing', name: 'sandals', at: 'player', traits: { ...wardrobe.wearable('feet') } },
    { id: 'umbrella', of: 'clothing', name: 'umbrella', at: 'player' },
    { id: 'kim', of: 'friend', name: 'Kim' },
  ],
  actions: [
    { id: 'lendBoots', effects: [move('clothing:boots', 'friend:kim')] },
    { id: 'loseBoots', effects: [take('clothing:boots')] },
  ],
}

function game(extra: Content[] = []): Game {
  return loadChecked([{ name: 'base', data: slots }, town, ...extra], { id: 'wet', title: 'Wet', plugins: [plugin] })
}

const shown = (state: GameState, g: Game) => view(state, g).plugins.wardrobe as WardrobeView

describe('the wardrobe, on its own', () => {
  it('starts with what the game says you have on', () => {
    const g = game()
    expect(shown(freshState(g), g)).toMatchObject({
      slots: [
        { id: 'coat', label: 'Coat', entity: null, name: null, takeOff: null },
        { id: 'feet', label: 'Feet', entity: 'clothing:boots', name: 'boots' },
      ],
      spare: [
        { entity: 'clothing:raincoat', name: 'raincoat', slot: 'coat' },
        { entity: 'clothing:sandals', name: 'sandals', slot: 'feet' },
      ],
    })
    expect(holds(freshState(g), g, wardrobe.wearing('clothing:boots'))).toBe(true)
    expect(holds(freshState(g), g, wardrobe.slotFilled('coat'))).toBe(false)
  })

  it('offers ready buttons: take off what is in a slot, and wear each spare thing, refused in advance', () => {
    const g = game()
    const { slots, spare } = shown(freshState(g), g)
    expect(slots[1].takeOff).toMatchObject({
      id: 'takeOff.feet',
      label: 'Take off',
      command: { type: 'custom', name: 'wardrobe/takeOff', with: { id: 'feet' } },
    })
    expect(spare[0].wear).toMatchObject({ label: 'Wear raincoat', command: { type: 'custom', name: 'wardrobe/wear', with: { id: 'clothing:raincoat' } } })
    expect(spare[0].wear.disabled).toBeUndefined()
    const worded = { ...g, strings: { ...g.strings, 'wardrobe/wear': 'Put on the {thing}' } }
    expect(shown(freshState(worded), worded).spare[0].wear.label).toBe('Put on the raincoat')
    const off = apply(freshState(g), g, slots[1].takeOff!.command)
    expect(shown(off.state, g).slots[1]).toMatchObject({ entity: null, takeOff: null })
  })

  it('puts clothes on in place of whatever was in the slot, without changing what you hold', () => {
    const g = game()
    const out = apply(freshState(g), g, wardrobe.wear('clothing:sandals'))
    expect(out.ok).toBe(true)
    expect([heldCount(out.state, g, 'clothing:sandals'), heldCount(out.state, g, 'clothing:boots')]).toEqual([1, 1])
    expect(holds(out.state, g, wardrobe.wearing('clothing:sandals', 'feet'))).toBe(true)
    expect(holds(out.state, g, wardrobe.wearing('clothing:boots'))).toBe(false)
  })

  it('takes clothes off', () => {
    const g = game()
    const out = apply(freshState(g), g, wardrobe.takeOff('feet'))
    expect(heldCount(out.state, g, 'clothing:boots')).toBe(1)
    expect(holds(out.state, g, wardrobe.slotFilled('feet'))).toBe(false)
  })

  it('ignores a slot the game no longer has', () => {
    const g = game()
    const old = {
      ...freshState(g),
      plugins: { wardrobe: { version: 3, state: { worn: { player: { coat: null, feet: 'clothing:boots', hat: 'clothing:raincoat' } } } } },
    }
    expect(holds(old, g, wardrobe.wearing('clothing:raincoat'))).toBe(false)
  })

  it('takes off what you no longer hold: lost, or given to someone', () => {
    const g = game()
    expect(holds(apply(freshState(g), g, { type: 'action', id: 'loseBoots' }).state, g, wardrobe.slotFilled('feet'))).toBe(false)
    const lent = apply(freshState(g), g, { type: 'action', id: 'lendBoots' }).state
    expect(holds(lent, g, wardrobe.slotFilled('feet'))).toBe(false)
    expect(heldCount(lent, g, 'clothing:boots', 'friend:kim')).toBe(1)
  })

  it('wears only what you hold', () => {
    const g = game()
    const lent = apply(freshState(g), g, { type: 'action', id: 'lendBoots' }).state
    expect(whyNot(lent, g, wardrobe.wear('clothing:boots'))).toBe('You have no boots.')
  })

  it('says why it cannot', () => {
    const g = game()
    const state = freshState(g)
    expect(whyNot(state, g, wardrobe.wear('clothing:umbrella'))).toBe('The umbrella is not something you wear.')
    expect(whyNot(state, g, wardrobe.wear('clothing:hat'))).toBe('There is no such thing.')
    expect(whyNot(state, g, wardrobe.wear('clothing:boots'))).toBe('You are already wearing the boots.')
    expect(whyNot(state, g, wardrobe.takeOff('coat'))).toBe('There is nothing to take off.')
    const barefoot = apply(state, g, wardrobe.takeOff('feet')).state
    const sandals = apply(barefoot, g, wardrobe.wear('clothing:sandals')).state
    expect(whyNot(apply(sandals, g, wardrobe.takeOff('feet')).state, g, wardrobe.wear('clothing:raincoat'))).toBeUndefined()
    expect(apply(state, g, wardrobe.wear('clothing:umbrella'))).toMatchObject({ ok: false, reason: 'The umbrella is not something you wear.' })
  })

  it('dresses a thing made in play like a wearable one', () => {
    const g = game([
      {
        name: 'tailor',
        actions: [{ id: 'sew', effects: [{ create: 'clothing', like: 'clothing:raincoat', with: { id: 'cape', name: 'cape' }, at: 'player' }] }],
      },
    ])
    const sewn = apply(freshState(g), g, { type: 'action', id: 'sew' }).state
    expect(shown(sewn, g).spare).toContainEqual(expect.objectContaining({ entity: 'clothing:cape', name: 'cape', slot: 'coat' }))
    expect(holds(apply(sewn, g, wardrobe.wear('clothing:cape')).state, g, wardrobe.wearing('clothing:cape', 'coat'))).toBe(true)
  })

  it('reports wearables in a slot the game does not have, and slots that start with the wrong thing', () => {
    const loaded = loadGame(
      [
        {
          name: 'base',
          data: {
            wardrobe: {
              slots: [
                { id: 'coat', label: 'Coat', start: 'clothing:boots' },
                { id: 'neck', label: 'Neck', start: 'clothing:scarf' },
              ],
            },
          },
          actions: [{ id: 'y', label: 'Y', command: wardrobe.wear('clothing:cloak') }],
        },
        town,
        {
          name: 'mod',
          entities: [{ id: 'cape', of: 'clothing', name: 'cape', traits: { ...wardrobe.wearable('back') } }],
          actions: [{ id: 'x', effects: [] }],
        },
      ],
      {
        id: 'g',
        title: 'g',
        plugins: [plugin],
      },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual(
      expect.arrayContaining([
        'action y: unknown entity "clothing:cloak"',
        'trait wardrobe/wearable on clothing:cape: unknown slot "back"',
        'slots neck: unknown entity "clothing:scarf"',
        'slots coat: starts with "clothing:boots", which is not worn in this slot',
      ]),
    )
    const unheld = loadGame(
      [
        { name: 'base', data: slots },
        { ...town, entities: [{ id: 'boots', of: 'clothing', name: 'boots', traits: { ...wardrobe.wearable('feet') } }] },
      ],
      {
        id: 'g',
        title: 'g',
        plugins: [plugin],
      },
    )
    expect(unheld.problems.map((problem) => problem.what)).toContain('starts with "clothing:boots", which the player does not start holding')
  })
})

describe('the wardrobe with a protagonist', () => {
  it('wears what whoever you play holds', () => {
    const g = game([
      {
        name: 'play',
        actions: [{ id: 'beKim', effects: [{ you: 'friend:kim' }, give('clothing:raincoat')] }],
      },
    ])
    const kim = apply(freshState(g), g, { type: 'action', id: 'beKim' }).state
    // Kim has nothing on yet; the raincoat is Kim's now, to wear.
    expect(holds(kim, g, wardrobe.slotFilled('feet'))).toBe(false)
    expect(shown(kim, g).spare).toMatchObject([{ entity: 'clothing:raincoat', name: 'raincoat', slot: 'coat' }])
    const dressed = apply(kim, g, wardrobe.wear('clothing:raincoat')).state
    expect(shown(dressed, g).slots.map((slot) => slot.entity)).toEqual(['clothing:raincoat', null])
    expect(dressed.plugins.wardrobe.state).toEqual({ worn: { player: { coat: null, feet: 'clothing:boots' }, 'friend:kim': { coat: 'clothing:raincoat' } } })
  })

  it('keeps what each body has on, so switching back shows the player’s clothes again', () => {
    const g = game([
      {
        name: 'play',
        actions: [
          { id: 'beKim', effects: [{ you: 'friend:kim' }, give('clothing:raincoat')] },
          { id: 'beMe', effects: [{ you: 'player' }] },
        ],
      },
    ])
    const kim = apply(apply(freshState(g), g, { type: 'action', id: 'beKim' }).state, g, wardrobe.wear('clothing:raincoat')).state
    const me = apply(kim, g, { type: 'action', id: 'beMe' }).state
    expect(shown(me, g).slots.map((slot) => slot.entity)).toEqual([null, 'clothing:boots'])
    expect(holds(me, g, wardrobe.wearing('clothing:raincoat'))).toBe(false)
    expect(holds(me, g, { 'wardrobe/wearing': { entity: 'clothing:raincoat', at: 'friend:kim' } })).toBe(true)
  })
})

describe('a closet', () => {
  function flat(): Game {
    return loadChecked(
      [
        { name: 'base', data: slots },
        town,
        {
          name: 'flat',
          entities: [
            places.location({
              id: 'bedroom',
              name: 'Bedroom',
              description: 'Home',
              exits: ['hall'],
              body: [{ text: 'A bed.' }],
              traits: { ...wardrobe.closet() },
            }),
            places.location({
              id: 'hall',
              name: 'Hall',
              description: 'Home',
              exits: ['bedroom', 'garden'],
              body: [{ text: 'Hooks.' }],
              traits: { ...wardrobe.closet({ label: 'Coat hooks' }) },
            }),
            places.location({ id: 'garden', name: 'Garden', description: 'Out', exits: ['hall'], body: [{ text: 'Grass.' }] }),
          ],
        },
      ],
      { id: 'flat', title: 'Flat', plugins: [places({ start: 'bedroom' }), plugin] },
    )
  }
  const button = (state: GameState, g: Game) => view(state, g).actions.find((action) => action.id === 'open')

  it('gives a place a button that opens the wardrobe panel, worded by the trait or the plugin', () => {
    const g = flat()
    let state = freshState(g)
    expect(button(state, g)?.label).toBe('Wardrobe')
    state = apply(state, g, button(state, g)!.command).state
    expect(view(state, g).panel?.panel).toBe('wardrobe')
    state = apply({ ...state, panel: null }, g, places.go('hall')).state
    expect(button(state, g)?.label).toBe('Coat hooks')
    state = apply(state, g, places.go('garden')).state
    expect(button(state, g)).toBeUndefined()
  })
})
