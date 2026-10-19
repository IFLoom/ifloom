import { describe, expect, it } from 'vitest'
import {
  apply,
  give,
  heldCount,
  holds,
  loadGame,
  loadState,
  move,
  startingState,
  take,
  view,
  whyNot,
  type Content,
  type Game,
  type GameState,
} from '@ifloom/engine'
import { slotFilled, takeOff, wardrobe, wear, wearable, wearing, type WardrobeView } from '../src/index.ts'

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
    { id: 'raincoat', of: 'clothing', name: 'raincoat', at: 'player', traits: { ...wearable('coat') } },
    { id: 'boots', of: 'clothing', name: 'boots', at: 'player', traits: { ...wearable('feet') } },
    { id: 'sandals', of: 'clothing', name: 'sandals', at: 'player', traits: { ...wearable('feet') } },
    { id: 'umbrella', of: 'clothing', name: 'umbrella', at: 'player' },
    { id: 'kim', of: 'friend', name: 'Kim' },
  ],
  activities: [
    { id: 'lendBoots', effects: [move('clothing:boots', 'friend:kim')] },
    { id: 'loseBoots', effects: [take('clothing:boots')] },
  ],
}

function game(extra: Content[] = []): Game {
  const loaded = loadGame([town, ...extra], { id: 'wet', title: 'Wet', plugins: [plugin], data: slots })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const begin = (g: Game): GameState => ({ ...startingState(g), sceneId: null })
const shown = (state: GameState, g: Game) => view(state, g).plugins.wardrobe as WardrobeView

describe('the wardrobe, on its own', () => {
  it('starts with what the game says you have on', () => {
    const g = game()
    expect(shown(begin(g), g)).toEqual({
      slots: [
        { id: 'coat', label: 'Coat', entity: null, name: null },
        { id: 'feet', label: 'Feet', entity: 'clothing:boots', name: 'boots' },
      ],
      spare: [
        { entity: 'clothing:raincoat', name: 'raincoat', slot: 'coat' },
        { entity: 'clothing:sandals', name: 'sandals', slot: 'feet' },
      ],
    })
    expect(holds(begin(g), wearing('clothing:boots'), g)).toBe(true)
    expect(holds(begin(g), slotFilled('coat'), g)).toBe(false)
  })

  it('puts clothes on in place of whatever was in the slot, without changing what you hold', () => {
    const g = game()
    const out = apply(begin(g), g, wear('clothing:sandals'))
    expect(out.ok).toBe(true)
    expect([heldCount(out.state, g, 'clothing:sandals'), heldCount(out.state, g, 'clothing:boots')]).toEqual([1, 1])
    expect(holds(out.state, wearing('clothing:sandals', 'feet'), g)).toBe(true)
    expect(holds(out.state, wearing('clothing:boots'), g)).toBe(false)
  })

  it('takes clothes off', () => {
    const g = game()
    const out = apply(begin(g), g, takeOff('feet'))
    expect(heldCount(out.state, g, 'clothing:boots')).toBe(1)
    expect(holds(out.state, slotFilled('feet'), g)).toBe(false)
  })

  it('ignores a slot the game no longer has', () => {
    const g = game()
    const old = {
      ...begin(g),
      plugins: { wardrobe: { version: 3, state: { worn: { player: { coat: null, feet: 'clothing:boots', hat: 'clothing:raincoat' } } } } },
    }
    expect(holds(old, wearing('clothing:raincoat'), g)).toBe(false)
  })

  it('takes off what you no longer hold: lost, or given to someone', () => {
    const g = game()
    expect(holds(apply(begin(g), g, { type: 'activity', id: 'loseBoots' }).state, slotFilled('feet'), g)).toBe(false)
    const lent = apply(begin(g), g, { type: 'activity', id: 'lendBoots' }).state
    expect(holds(lent, slotFilled('feet'), g)).toBe(false)
    expect(heldCount(lent, g, 'clothing:boots', 'friend:kim')).toBe(1)
  })

  it('wears only what you hold', () => {
    const g = game()
    const lent = apply(begin(g), g, { type: 'activity', id: 'lendBoots' }).state
    expect(whyNot(lent, g, wear('clothing:boots'))).toBe('You have no boots.')
  })

  it('says why it cannot', () => {
    const g = game()
    const state = begin(g)
    expect(whyNot(state, g, wear('clothing:umbrella'))).toBe('The umbrella is not something you wear.')
    expect(whyNot(state, g, wear('clothing:hat'))).toBe('There is no such thing.')
    expect(whyNot(state, g, wear('clothing:boots'))).toBe('You are already wearing the boots.')
    expect(whyNot(state, g, takeOff('coat'))).toBe('There is nothing to take off.')
    const barefoot = apply(state, g, takeOff('feet')).state
    const sandals = apply(barefoot, g, wear('clothing:sandals')).state
    expect(whyNot(apply(sandals, g, takeOff('feet')).state, g, wear('clothing:raincoat'))).toBeUndefined()
    expect(apply(state, g, wear('clothing:umbrella'))).toMatchObject({ ok: false, reason: 'The umbrella is not something you wear.' })
  })

  it('dresses a thing made in play like a wearable one', () => {
    const g = game([
      {
        name: 'tailor',
        activities: [{ id: 'sew', effects: [{ kind: 'create', like: 'clothing:raincoat', entity: { id: 'cape', name: 'cape' }, at: 'player' }] }],
      },
    ])
    const sewn = apply(begin(g), g, { type: 'activity', id: 'sew' }).state
    expect(shown(sewn, g).spare).toContainEqual({ entity: 'clothing:cape', name: 'cape', slot: 'coat' })
    expect(holds(apply(sewn, g, wear('clothing:cape')).state, wearing('clothing:cape', 'coat'), g)).toBe(true)
  })

  it('carries an older save’s item ids into references', () => {
    const g = game()
    const old = { ...begin(g), plugins: { wardrobe: { version: 1, state: { worn: { coat: 'raincoat', feet: null, hat: 'beret' } } } } }
    const loaded = loadState(JSON.parse(JSON.stringify(old)), g)
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(loaded.value.plugins.wardrobe).toEqual({ version: 3, state: { worn: { player: { coat: 'clothing:raincoat', feet: null, hat: null } } } })
  })

  it('reports wearables in a slot the game does not have, and slots that start with the wrong thing', () => {
    const loaded = loadGame(
      [
        town,
        {
          name: 'mod',
          entities: [{ id: 'cape', of: 'clothing', name: 'cape', traits: { ...wearable('back') } }],
          activities: [{ id: 'x', effects: [] }],
        },
      ],
      {
        id: 'g',
        title: 'g',
        plugins: [plugin],
        data: {
          wardrobe: {
            slots: [
              { id: 'coat', label: 'Coat', start: 'clothing:boots' },
              { id: 'neck', label: 'Neck', start: 'clothing:scarf' },
            ],
          },
        },
        actions: [{ id: 'y', label: 'Y', command: wear('clothing:cloak') }],
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
    const unheld = loadGame([{ ...town, entities: [{ id: 'boots', of: 'clothing', name: 'boots', traits: { ...wearable('feet') } }] }], {
      id: 'g',
      title: 'g',
      plugins: [plugin],
      data: slots,
    })
    expect(unheld.problems.map((problem) => problem.what)).toContain('starts with "clothing:boots", which the player does not start holding')
  })
})

describe('the wardrobe with a protagonist', () => {
  it('wears what whoever you play holds', () => {
    const g = game([
      {
        name: 'play',
        activities: [{ id: 'beKim', effects: [{ kind: 'you', to: 'friend:kim' }, give('clothing:raincoat')] }],
      },
    ])
    const kim = apply(begin(g), g, { type: 'activity', id: 'beKim' }).state
    // Kim has nothing on yet; the raincoat is Kim's now, to wear.
    expect(holds(kim, slotFilled('feet'), g)).toBe(false)
    expect(shown(kim, g).spare).toEqual([{ entity: 'clothing:raincoat', name: 'raincoat', slot: 'coat' }])
    const dressed = apply(kim, g, wear('clothing:raincoat')).state
    expect(shown(dressed, g).slots.map((slot) => slot.entity)).toEqual(['clothing:raincoat', null])
    expect(dressed.plugins.wardrobe.state).toEqual({ worn: { player: { coat: null, feet: 'clothing:boots' }, 'friend:kim': { coat: 'clothing:raincoat' } } })
  })

  it('keeps what each body has on, so switching back shows the player’s clothes again', () => {
    const g = game([
      {
        name: 'play',
        activities: [
          { id: 'beKim', effects: [{ kind: 'you', to: 'friend:kim' }, give('clothing:raincoat')] },
          { id: 'beMe', effects: [{ kind: 'you', to: 'player' }] },
        ],
      },
    ])
    const kim = apply(apply(begin(g), g, { type: 'activity', id: 'beKim' }).state, g, wear('clothing:raincoat')).state
    const me = apply(kim, g, { type: 'activity', id: 'beMe' }).state
    expect(shown(me, g).slots.map((slot) => slot.entity)).toEqual([null, 'clothing:boots'])
    expect(holds(me, wearing('clothing:raincoat'), g)).toBe(false)
    expect(holds(me, { 'wardrobe/wearing': { entity: 'clothing:raincoat', at: 'friend:kim' } }, g)).toBe(true)
  })

  it('carries a version 2 save’s slots over to whoever was played', () => {
    const g = game()
    const old = { ...begin(g), you: 'friend:kim', plugins: { wardrobe: { version: 2, state: { worn: { coat: null, feet: 'clothing:boots' } } } } }
    const loaded = loadState(JSON.parse(JSON.stringify(old)), g)
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(loaded.value.plugins.wardrobe).toEqual({ version: 3, state: { worn: { 'friend:kim': { coat: null, feet: 'clothing:boots' } } } })
  })
})
