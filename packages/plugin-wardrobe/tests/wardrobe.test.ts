import { describe, expect, it } from 'vitest'
import { apply, holds, loadGame, ownedCount, protagonist, view, whyNot, type Content, type Game, type GameState } from '@ifloom/engine'
import { definePlugin, type Plugin } from '@ifloom/engine/plugin'
import { freshState, loadChecked } from '@ifloom/engine/testing'
import { places } from '@ifloom/plugin-places'
import { wardrobe, type WardrobeView } from '../src/index.ts'

/** The slots, as the base game's content: boots on from the start. */
const slots = {
  wardrobe: {
    slots: [
      { id: 'coat', label: 'Coat' },
      { id: 'feet', label: 'Feet', start: 'clothing:boots' },
    ],
  },
}

/**
 * Clothes are unique things, each worn in its slot, the boots and sandals the player's from the start. The raincoat
 * sets a kv key while it's worn; the umbrella can't be worn.
 */
const town: Content = {
  name: 'town',
  kinds: [
    { id: 'clothing', label: 'Clothing', unique: true, listed: false },
    { id: 'friend', label: 'Friend', unique: true, listed: false },
  ],
  entities: [
    {
      id: 'raincoat',
      of: 'clothing',
      name: 'raincoat',
      traits: { ...wardrobe.wearable('coat', { onWear: [{ kv: 'dry', to: true }], onTakeOff: [{ kv: 'dry', to: false }] }) },
    },
    { id: 'boots', of: 'clothing', name: 'boots', traits: { ...wardrobe.wearable('feet'), ...wardrobe.owned('player') } },
    { id: 'sandals', of: 'clothing', name: 'sandals', traits: { ...wardrobe.wearable('feet'), ...wardrobe.owned('player') } },
    { id: 'umbrella', of: 'clothing', name: 'umbrella' },
    { id: 'kim', of: 'friend', name: 'Kim' },
  ],
  actions: [
    { id: 'buyRaincoat', effects: [{ receive: 'clothing:raincoat' }] },
    { id: 'loseBoots', effects: [{ release: 'clothing:boots' }] },
  ],
}

/** A bag that keeps anything, standing in for an inventory: counts by who, the protagonist by default. */
const bag: Plugin<Record<string, Record<string, number>>> = definePlugin<Record<string, Record<string, number>>>({
  id: 'bag',
  version: 1,
  start: () => ({}),
  receiver: {
    receive: (state, ref, count, to, { slice, set }) => {
      const who = to ?? protagonist(state)
      return set({ ...slice, [who]: { ...slice[who], [ref]: (slice[who]?.[ref] ?? 0) + count } })
    },
    owned: (state, ref, of, { slice }) => slice[of ?? protagonist(state)]?.[ref] ?? 0,
    release: (state, ref, count, from, { slice, set }) => {
      const who = from ?? protagonist(state)
      return set({ ...slice, [who]: { ...slice[who], [ref]: (slice[who]?.[ref] ?? 0) - count } })
    },
  },
})

function game(extra: Content[] = [], options: Parameters<typeof wardrobe>[0] = {}, others: Plugin[] = []): Game {
  return loadChecked([{ name: 'base', data: slots }, town, ...extra], { id: 'wet', title: 'Wet', plugins: [wardrobe(options), ...others] })
}

const shown = (state: GameState, g: Game) => view(state, g).plugins.wardrobe as WardrobeView
const act = (state: GameState, g: Game, id: string) => apply(state, g, { type: 'action', id }).state

describe('the wardrobe, on its own', () => {
  it('starts with what the game says you own and have on', () => {
    const g = game()
    expect(shown(freshState(g), g)).toMatchObject({
      slots: [
        { id: 'coat', label: 'Coat', entity: null, name: null, takeOff: null },
        { id: 'feet', label: 'Feet', entity: 'clothing:boots', name: 'boots' },
      ],
      spare: [{ entity: 'clothing:sandals', name: 'sandals', slot: 'feet' }],
    })
    expect(holds(freshState(g), g, wardrobe.wearing('clothing:boots'))).toBe(true)
    expect(holds(freshState(g), g, wardrobe.slotFilled('coat'))).toBe(false)
    expect(holds(freshState(g), g, { value: 'wardrobe/owns', with: { entity: 'clothing:sandals' }, is: 1 })).toBe(true)
  })

  it('takes a bought thing straight into the wardrobe, to wear at once, its onWear running', () => {
    const g = game()
    let state = act(freshState(g), g, 'buyRaincoat')
    expect(holds(state, g, { owned: 'clothing:raincoat' })).toBe(true)
    expect(shown(state, g).spare.map((entry) => entry.entity)).toContain('clothing:raincoat')
    state = apply(state, g, wardrobe.wear('clothing:raincoat')).state
    expect(holds(state, g, wardrobe.wearing('clothing:raincoat', 'coat'))).toBe(true)
    expect(state.kv.dry).toBe(true)
    state = apply(state, g, wardrobe.takeOff('coat')).state
    expect(state.kv.dry).toBe(false)
  })

  it('offers ready buttons: take off what is in a slot, and wear each spare thing', () => {
    const g = game()
    const { slots: shownSlots, spare } = shown(freshState(g), g)
    expect(shownSlots[1].takeOff).toMatchObject({
      id: 'takeOff.feet',
      label: 'Take off',
      command: { type: 'custom', name: 'wardrobe/takeOff', with: { id: 'feet' } },
    })
    expect(spare[0].wear).toMatchObject({ label: 'Wear sandals', command: { type: 'custom', name: 'wardrobe/wear', with: { id: 'clothing:sandals' } } })
    const worded = { ...g, strings: { ...g.strings, 'wardrobe/wear': 'Put on the {thing}' } }
    expect(shown(freshState(worded), worded).spare[0].wear.label).toBe('Put on the sandals')
  })

  it('puts clothes on in place of whatever was in the slot, without changing what you own', () => {
    const g = game()
    const out = apply(freshState(g), g, wardrobe.wear('clothing:sandals'))
    expect(out.ok).toBe(true)
    expect([ownedCount(out.state, g, 'clothing:sandals'), ownedCount(out.state, g, 'clothing:boots')]).toEqual([1, 1])
    expect(holds(out.state, g, wardrobe.wearing('clothing:sandals', 'feet'))).toBe(true)
    expect(holds(out.state, g, wardrobe.wearing('clothing:boots'))).toBe(false)
  })

  it('adds and removes by its own effects, and takes off what you no longer own', () => {
    const g = game([
      {
        name: 'more',
        actions: [
          { id: 'give', effects: [{ 'wardrobe/add': { entity: 'clothing:raincoat' } }] },
          { id: 'bin', effects: [{ 'wardrobe/remove': { entity: 'clothing:boots' } }] },
        ],
      },
    ])
    expect(holds(act(freshState(g), g, 'give'), g, { owned: 'clothing:raincoat' })).toBe(true)
    expect(holds(act(freshState(g), g, 'bin'), g, wardrobe.slotFilled('feet'))).toBe(false)
    expect(holds(act(freshState(g), g, 'loseBoots'), g, wardrobe.slotFilled('feet'))).toBe(false)
  })

  it('says why it cannot', () => {
    const g = game()
    const state = freshState(g)
    expect(whyNot(state, g, wardrobe.wear('clothing:umbrella'))).toBe('The umbrella is not something you wear.')
    expect(whyNot(state, g, wardrobe.wear('clothing:hat'))).toBe('There is no such thing.')
    expect(whyNot(state, g, wardrobe.wear('clothing:boots'))).toBe('You are already wearing the boots.')
    expect(whyNot(state, g, wardrobe.wear('clothing:raincoat'))).toBe('You have no raincoat.')
    expect(whyNot(state, g, wardrobe.takeOff('coat'))).toBe('There is nothing to take off.')
  })

  it('dresses a thing made in play like a wearable one', () => {
    const g = game([
      {
        name: 'tailor',
        actions: [{ id: 'sew', effects: [{ create: 'clothing', like: 'clothing:raincoat', with: { id: 'cape', name: 'cape' }, effects: [{ receive: '$' }] }] }],
      },
    ])
    const sewn = act(freshState(g), g, 'sew')
    expect(shown(sewn, g).spare).toContainEqual(expect.objectContaining({ entity: 'clothing:cape', name: 'cape', slot: 'coat' }))
    expect(holds(apply(sewn, g, wardrobe.wear('clothing:cape')).state, g, wardrobe.wearing('clothing:cape', 'coat'))).toBe(true)
  })

  it('runs the thing’s own hooks, then the game-wide ones', () => {
    const g = game([], { onWear: [{ kv: 'log', to: 'game' }], onTakeOff: [{ kv: 'off', by: 1 }] })
    let state = act(freshState(g), g, 'buyRaincoat')
    state = apply(state, g, wardrobe.wear('clothing:raincoat')).state
    expect([state.kv.dry, state.kv.log]).toEqual([true, 'game'])
    // Sandals over boots: the boots come off, with the game-wide hook.
    state = apply(state, g, wardrobe.wear('clothing:sandals')).state
    expect(state.kv.off).toBe(1)
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
        { name: 'mod', entities: [{ id: 'cape', of: 'clothing', name: 'cape', traits: { ...wardrobe.wearable('back'), ...wardrobe.owned({ player: 2 }) } }] },
      ],
      { id: 'g', title: 'g', plugins: [wardrobe()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual(
      expect.arrayContaining([
        'action y: unknown entity "clothing:cloak"',
        'trait wardrobe/wearable on clothing:cape: unknown slot "back"',
        'slots neck: unknown entity "clothing:scarf"',
        'slots coat: starts with "clothing:boots", which is not worn in this slot',
      ]),
    )
    expect(loaded.problems.map((problem) => problem.what)).toContain('a unique thing starts in one place, one of it')
    const unowned = loadGame(
      [
        { name: 'base', data: slots },
        { ...town, entities: [{ id: 'boots', of: 'clothing', name: 'boots', traits: { ...wardrobe.wearable('feet') } }] },
      ],
      { id: 'g', title: 'g', plugins: [wardrobe()] },
    )
    expect(unowned.problems.map((problem) => problem.what)).toContain(
      'starts with "clothing:boots", which the player does not own at the start: give it wardrobe.owned(\'player\')',
    )
  })
})

describe('the wardrobe beside a bag, with claims: false', () => {
  const carrying = () =>
    game(
      [
        {
          name: 'put',
          actions: [
            { id: 'store', effects: [wardrobe.store('clothing:raincoat')] },
            { id: 'takeOut', effects: [wardrobe.takeOut('clothing:raincoat')] },
            { id: 'drop', effects: [{ release: 'clothing:raincoat' }] },
          ],
        },
      ],
      { claims: false },
      [bag],
    )

  it('lets a bought thing go to the bag, and wears what the body carries', () => {
    const g = carrying()
    let state = act(freshState(g), g, 'buyRaincoat')
    expect(state.plugins.bag.state).toEqual({ player: { 'clothing:raincoat': 1 } })
    expect(holds(state, g, { owned: 'clothing:raincoat', via: 'wardrobe' })).toBe(false)
    state = apply(state, g, wardrobe.wear('clothing:raincoat')).state
    expect(holds(state, g, wardrobe.wearing('clothing:raincoat'))).toBe(true)
    // Dropped from the bag, it comes off after the command, its hook running.
    state = act(state, g, 'drop')
    expect(holds(state, g, wardrobe.wearing('clothing:raincoat'))).toBe(false)
    expect(state.kv.dry).toBe(false)
  })

  it('stores a carried thing in the wardrobe and takes it out again, by name', () => {
    const g = carrying()
    let state = act(act(freshState(g), g, 'buyRaincoat'), g, 'store')
    expect(state.plugins.bag.state).toEqual({ player: { 'clothing:raincoat': 0 } })
    expect(holds(state, g, { owned: 'clothing:raincoat', via: 'wardrobe' })).toBe(true)
    state = act(state, g, 'takeOut')
    expect(state.plugins.bag.state).toEqual({ player: { 'clothing:raincoat': 1 } })
    expect(holds(state, g, { owned: 'clothing:raincoat', via: 'wardrobe' })).toBe(false)
  })
})

describe('the wardrobe with a protagonist', () => {
  it('keeps each body’s own clothes and what it has on', () => {
    const g = game([
      {
        name: 'play',
        actions: [
          { id: 'beKim', effects: [{ you: 'friend:kim' }, { receive: 'clothing:raincoat' }] },
          { id: 'beMe', effects: [{ you: 'player' }] },
        ],
      },
    ])
    const kim = act(freshState(g), g, 'beKim')
    // Kim has nothing on yet; the raincoat is Kim's, to wear.
    expect(holds(kim, g, wardrobe.slotFilled('feet'))).toBe(false)
    expect(shown(kim, g).spare).toMatchObject([{ entity: 'clothing:raincoat', name: 'raincoat', slot: 'coat' }])
    const dressed = apply(kim, g, wardrobe.wear('clothing:raincoat')).state
    expect(shown(dressed, g).slots.map((slot) => slot.entity)).toEqual(['clothing:raincoat', null])
    expect((dressed.plugins.wardrobe.state as { worn: unknown }).worn).toEqual({
      player: { coat: null, feet: 'clothing:boots' },
      'friend:kim': { coat: 'clothing:raincoat' },
    })
    const me = act(dressed, g, 'beMe')
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
      { id: 'flat', title: 'Flat', plugins: [places({ start: 'bedroom' }), wardrobe()] },
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
