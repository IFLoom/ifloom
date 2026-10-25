import { describe, expect, it } from 'vitest'
import {
  apply,
  give,
  heldCount,
  holds,
  loadGame,
  startingState,
  statValue,
  view,
  whyNot,
  type CommandRef,
  type Content,
  type Game,
  type GameState,
  type Plugin,
} from '@ifloom/engine'
import { cast, character, person } from '@ifloom/plugin-cast'
import { go, location, locationRef, pickUp, places, type PlacesView } from '@ifloom/plugin-places'
import { buy, sellable, shop, vendor, type ShopView } from '@ifloom/plugin-shop'
import { wear, wearable, wardrobe, wearing } from '@ifloom/plugin-wardrobe'
import { dropThing, giveThing, inventory, usable, useThing } from '../src/index.ts'

/** A picnic: food that stacks, a torch that is kept, a stone that does nothing, and a friend who holds things. */
const picnic: Content = {
  name: 'picnic',
  stats: [{ id: 'energy', label: 'Energy', start: 10 }],
  kinds: [
    { id: 'food', label: 'Food', listed: false },
    { id: 'gear', label: 'Gear', listed: false },
    { id: 'friend', label: 'Friend', unique: true, listed: false },
  ],
  entities: [
    {
      id: 'apple',
      of: 'food',
      name: 'apple',
      desc: 'Crisp.',
      at: { player: 2 },
      traits: { ...usable('Eat the apple', [{ stat: 'energy', by: 5 }]) },
    },
    { id: 'torch', of: 'gear', name: 'torch', at: 'player', traits: { ...usable('Switch it on', [{ kv: 'lit', to: true }], { keep: true }) } },
    { id: 'stone', of: 'gear', name: 'stone', at: 'player' },
    { id: 'kim', of: 'friend', name: 'Kim' },
  ],
}

function game(extra: Content[] = [], plugins: Plugin[] = [inventory()]): Game {
  const loaded = loadGame([picnic, ...extra], { id: 'picnic', title: 'Picnic', plugins })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const begin = (g: Game): GameState => ({ ...startingState(g), sceneId: null })
const shown = (g: Game, state: GameState) => inventory().viewIn(view(state, g))!
function run(state: GameState, g: Game, ...commands: CommandRef[]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

describe('the inventory alone', () => {
  it('shows what you hold, with a button for each thing that does something', () => {
    const g = game()
    const things = shown(g, begin(g)).things
    expect(things.map((thing) => [thing.ref, thing.count, thing.use?.label ?? null])).toEqual([
      ['food:apple', 2, 'Eat the apple'],
      ['gear:torch', 1, 'Switch it on'],
      ['gear:stone', 1, null],
    ])
    expect(things[0]).toMatchObject({ name: 'apple', desc: 'Crisp.', image: null, at: 'player' })
    expect(things[0].use?.command).toEqual({ type: 'custom', name: 'inventory/use', with: { id: 'food:apple' } })
  })

  it('uses one: its effects run and one is spent, unless it is kept', () => {
    const g = game()
    const ate = run(begin(g), g, useThing('food:apple'))
    expect(statValue(ate, g, 'energy')).toBe(15)
    expect(heldCount(ate, g, 'food:apple')).toBe(1)
    const lit = run(ate, g, useThing('gear:torch'))
    expect(lit.kv.lit).toBe(true)
    expect(heldCount(lit, g, 'gear:torch')).toBe(1)
    const gone = run(ate, g, useThing('food:apple'))
    expect(shown(g, gone).things.map((thing) => thing.ref)).toEqual(['gear:torch', 'gear:stone'])
  })

  it('says why it can’t', () => {
    const g = game()
    const state = begin(g)
    expect(whyNot(state, g, useThing('gear:stone'))).toBe('The stone does not do anything.')
    expect(whyNot(state, g, useThing('food:pear'))).toBe('There is no such thing.')
    const none = run(state, g, dropThing('gear:stone'))
    expect(whyNot(none, g, dropThing('gear:stone'))).toBe('You have no stone.')
    expect(whyNot(state, g, giveThing('food:apple', 'food:apple'))).toBe('You can’t give things to apple.')
    expect(whyNot(state, g, giveThing('food:apple', 'you'))).toBe('You already have it.')
  })

  it('drops one, which is gone with nowhere to put it', () => {
    const g = game()
    const dropped = run(begin(g), g, dropThing('food:apple'))
    expect(heldCount(dropped, g, 'food:apple')).toBe(1)
  })

  it('gives one to someone who can hold things', () => {
    const g = game()
    const given = run(begin(g), g, giveThing('food:apple', 'friend:kim'))
    expect(heldCount(given, g, 'food:apple')).toBe(1)
    expect(heldCount(given, g, 'food:apple', 'friend:kim')).toBe(1)
    expect(shown(g, given).things[0].count).toBe(1)
  })

  it('shows only the kinds the content asks for', () => {
    const g = game([{ name: 'gear only', data: { inventory: { kinds: [{ id: 'gear' }] } } }])
    expect(shown(g, begin(g)).things.map((thing) => thing.ref)).toEqual(['gear:torch', 'gear:stone'])
  })

  it('works on a thing made in play like another, through its trait', () => {
    const g = game([{ name: 'bag', actions: [{ id: 'pick', effects: [{ create: 'food', like: 'food:apple', with: { id: 'windfall' }, at: 'player' }] }] }])
    const picked = run(begin(g), g, { type: 'action', id: 'pick' })
    const windfall = shown(g, picked).things.find((thing) => thing.ref === 'food:windfall')
    expect(windfall?.use?.label).toBe('Eat the apple')
    expect(statValue(run(picked, g, useThing('food:windfall')), g, 'energy')).toBe(15)
  })

  it('reports what content gets wrong', () => {
    const loaded = loadGame(
      [
        { name: 'base', actions: [{ id: 'x', label: 'x', command: useThing('food:plum') }] },
        picnic,
        {
          name: 'broken',
          entities: [{ id: 'pear', of: 'food', name: 'pear', traits: { 'inventory/usable': { label: '', effects: [{ stat: 'joy', by: 1 }] } } }],
          actions: [{ id: 'eat', effects: [] }],
          data: { inventory: { kinds: [{ id: 'drink' }] } },
        },
      ],
      { id: 'picnic', title: 'Picnic', plugins: [inventory()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual(
      expect.arrayContaining([
        'trait inventory/usable on food:pear: a usable thing needs a label for its button',
        expect.stringContaining('unknown stat "joy"'),
        'kinds drink: unknown kind "drink"',
        expect.stringContaining('unknown entity "food:plum"'),
      ]),
    )
  })
})

describe('the inventory with places', () => {
  const park: Content = {
    name: 'park',
    entities: [
      location({ id: 'lawn', name: 'Lawn', desc: 'Park', exits: ['pond'], body: [] }),
      location({ id: 'pond', name: 'Pond', desc: 'Park', exits: ['lawn'], body: [] }),
    ],
  }

  it('drops a thing where you are, where it lies until it is picked up again', () => {
    const g = game([park], [inventory(), places({ start: 'lawn' })])
    const dropped = run(begin(g), g, dropThing('gear:stone'))
    expect(heldCount(dropped, g, 'gear:stone')).toBe(0)
    expect(heldCount(dropped, g, 'gear:stone', locationRef('lawn'))).toBe(1)
    const lying = (state: GameState) => (view(state, g).plugins.places as PlacesView).things.map((thing) => thing.ref)
    expect(lying(dropped)).toEqual(['gear:stone'])
    // Somewhere else it isn't there; back on the lawn, it is.
    expect(lying(run(dropped, g, go('pond')))).toEqual([])
    const back = run(dropped, g, go('pond'), go('lawn'), pickUp('gear:stone'))
    expect(heldCount(back, g, 'gear:stone')).toBe(1)
    expect(lying(back)).toEqual([])
  })
})

describe('the inventory with the cast', () => {
  const town: Content = {
    name: 'town',
    stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
    scenes: [{ id: 'ava.hi', body: [{ text: 'ava.hi' }], choices: [{ id: 'bye', effects: [{ scene: null }] }] }],
    prose: { 'ava.hi': 'Hi.', 'ava.hi#bye': 'Bye' },
    entities: [person({ id: 'ava', name: 'Ava', talk: 'ava.hi' })],
  }

  it('gives a thing to a character, who holds it', () => {
    const g = game([town], [inventory(), cast()])
    const given = run(begin(g), g, giveThing('food:apple', character('ava')))
    expect(heldCount(given, g, 'food:apple', character('ava'))).toBe(1)
  })

  it('hands what a protagonist holds over to them as you', () => {
    const g = game([{ ...town, actions: [{ id: 'be', effects: [{ you: character('ava') }, give('food:apple')] }] }], [inventory(), cast()])
    const played = run(begin(g), g, { type: 'action', id: 'be' })
    expect(shown(g, played).things.map((thing) => [thing.ref, thing.at])).toEqual([
      ['food:apple', 'character:ava'],
      ['food:apple', 'player'],
      ['gear:torch', 'player'],
      ['gear:stone', 'player'],
    ])
    // Using it spends the protagonist's.
    const ate = run(played, g, useThing('food:apple'))
    expect(heldCount(ate, g, 'food:apple', character('ava'))).toBe(0)
    expect(heldCount(ate, g, 'food:apple', 'player')).toBe(2)
  })
})

describe('the inventory with the shop and the wardrobe', () => {
  const market: Content = {
    name: 'market',
    stats: [{ id: 'coins', label: 'Coins', start: 20, spendable: true }],
    kinds: [{ id: 'clothing', label: 'Clothing', unique: true, listed: false }],
    entities: [
      { id: 'scarf', of: 'clothing', name: 'scarf', traits: { ...wearable('neck'), ...sellable({ coins: 8 }) } },
      { id: 'pie', of: 'food', name: 'pie', traits: { ...usable('Eat the pie', [{ stat: 'energy', by: 20 }]), ...sellable({ coins: 3 }) } },
      vendor({ id: 'stall', name: 'Stall', buysBack: 0.5, goods: [{ entity: 'clothing:scarf', stock: 1 }, { entity: 'food:pie' }] }),
    ],
    data: {
      wardrobe: { slots: [{ id: 'neck', label: 'Neck' }] },
    },
  }

  it('buys a thing, wears it, uses another, and gives the first away, each plugin knowing nothing of the others', () => {
    const g = game([market], [inventory(), shop(), wardrobe()])
    let state = run(begin(g), g, buy('stall', 'clothing:scarf'), buy('stall', 'food:pie'), wear('clothing:scarf'))
    expect(state.stats.coins).toBe(9)
    expect(holds(state, wearing('clothing:scarf'), g)).toBe(true)
    expect(shown(g, state).things.find((thing) => thing.ref === 'food:pie')?.use?.label).toBe('Eat the pie')
    state = run(state, g, useThing('food:pie'))
    expect(statValue(state, g, 'energy')).toBe(30)
    // Given away, it comes off; the stall sells what it holds, and the scarf isn't there.
    state = run(state, g, giveThing('clothing:scarf', 'vendor:stall'))
    expect(holds(state, wearing('clothing:scarf'), g)).toBe(false)
    expect((view(state, g).plugins.shop as ShopView).vendors[0].goods[0].stock).toBe(1)
  })

  it('leaves each one working without the others', () => {
    for (const plugins of [[shop()], [wardrobe()], [inventory()], [shop(), wardrobe()]] as Plugin[][]) {
      // Each one's data only where the game has it; the traits of the ones it lacks ride along unread.
      const data = Object.fromEntries(Object.entries(market.data ?? {}).filter(([id]) => plugins.some((plugin) => plugin.id === id)))
      // The stall is the shop's: its kind comes with the shop.
      const has = (id: string) => plugins.some((plugin) => plugin.id === id)
      const entities = (market.entities ?? []).filter((entity) => entity.of !== 'vendor' || has('shop'))
      const loaded = loadGame([picnic, { ...market, data, entities }], { id: 'picnic', title: 'Picnic', plugins })
      expect(loaded.problems, plugins.map((plugin) => plugin.id).join()).toEqual([])
    }
  })
})
