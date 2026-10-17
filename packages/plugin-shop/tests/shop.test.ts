import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  apply,
  createRunner,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  view,
  whyNot,
  type Command,
  type Game,
  type GameState,
  type Pack,
  type Plugin,
} from '@ifloom/engine'
import { calendar, pass } from '@ifloom/plugin-calendar'
import { go, places, type LocationDef } from '@ifloom/plugin-places'
import { buy, inStock, sell, shop, vendorOpen, type ShopView, type VendorDef } from '../src/index.ts'

/** The café counter: coffee for coins, three biscuits a day, and half back on a sandwich. */
const counter: VendorDef = {
  id: 'counter',
  name: 'The counter',
  at: ['cafe'],
  hours: ['morning', 'afternoon'],
  closed: 'The shutter is down.',
  buysBack: 0.5,
  goods: [
    { item: 'coffee', price: { coins: 3 } },
    { item: 'biscuit', price: { coins: 2 }, stock: 3, restock: 'day' },
    { item: 'sandwich', price: { coins: 5, energy: 1 } },
    { item: 'cake', price: { coins: 6 }, when: { kv: 'birthday' } },
  ],
}
/** A market stall marking one thing a day down by half. */
const stall: VendorDef = {
  id: 'stall',
  name: 'Fruit stall',
  discounts: { off: 0.5 },
  goods: ['apple', 'pear', 'plum', 'fig'].map((item) => ({ item, price: { coins: 4 } })),
}

const place = (id: string, exits: string[]): LocationDef => ({ id, name: id, tag: '', kind: 'venue', art: '', exits, body: [] })

function game(...partners: Plugin[]): Game {
  const town: Pack = {
    id: 'town',
    schema: SCHEMA,
    stats: [
      { id: 'coins', label: 'Coins', start: 20, max: 999, spendable: true, format: '{n} coins', lacking: 'You need {n} coins.' },
      { id: 'energy', label: 'Energy', start: 50, spendable: true },
    ],
    items: ['coffee', 'biscuit', 'sandwich', 'cake', 'apple', 'pear', 'plum', 'fig'].map((id) => ({ id, name: id, desc: '', kind: 'stuff' as const })),
    activities: [{ id: 'wait', effects: [pass(1)] }, { id: 'sleep', effects: [{ kind: 'turn' }] }],
    data: {
      shop: { vendors: [counter, stall] },
      ...(partners.some((plugin) => plugin.id === 'places') ? { places: { locations: [place('street', ['cafe']), place('cafe', ['street'])] } } : {}),
    },
  }
  const loaded = loadGame([town], { id: 'g', title: 'g', plugins: [...partners, shop()] })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

function run(state: GameState, g: Game, ...commands: Command[]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.refused, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

const fresh = (g: Game, seed = 1) => ({ ...startingState(g, { seed }), sceneId: null })
const shown = (state: GameState, g: Game) => view(state, g).plugins.shop as ShopView
const goods = (state: GameState, g: Game, vendor = 'counter') => shown(state, g).vendors.find((entry) => entry.id === vendor)!.goods

describe('the shop, on its own', () => {
  it('sells for prices in any spendable stat', () => {
    const g = game()
    const state = run(fresh(g), g, buy('counter', 'sandwich'), buy('counter', 'coffee', 2))
    expect(state.stats).toMatchObject({ coins: 20 - 5 - 6, energy: 49 })
    expect(state.items).toMatchObject({ sandwich: 1, coffee: 2 })
  })

  it('refuses what the player can’t afford, in the stat’s own words, and greys the button with it', () => {
    const g = game()
    const poor = { ...fresh(g), stats: { coins: 2, energy: 50 } }
    expect(whyNot(poor, g, buy('counter', 'coffee'))).toBe('You need 3 coins.')
    const coffee = goods(poor, g).find((good) => good.item === 'coffee')!
    expect(coffee.buy).toMatchObject({ label: 'coffee', disabled: 'You need 3 coins.', price: { stats: [{ id: 'coins', amount: 3, text: '3 coins' }] }, command: buy('counter', 'coffee') })
  })

  it('runs out of limited stock, and gets it back each day', () => {
    const g = game()
    let state = run(fresh(g), g, buy('counter', 'biscuit', 2), buy('counter', 'biscuit'))
    expect(whyNot(state, g, buy('counter', 'biscuit'))).toBe('Sold out.')
    expect(holds(state, inStock('counter', 'biscuit'), g)).toBe(false)
    expect(goods(state, g).find((good) => good.item === 'biscuit')).toMatchObject({ stock: 0, buy: { disabled: 'Sold out.' } })
    // Without the calendar, a day is a turn.
    state = run(state, g, { type: 'activity', id: 'sleep' })
    expect(goods(state, g).find((good) => good.item === 'biscuit')!.stock).toBe(3)
    expect(goods(state, g).find((good) => good.item === 'coffee')!.stock).toBeNull()
  })

  it('buys back at the vendor’s fraction, rounded down, and only what the player has', () => {
    const g = game()
    let state = run(fresh(g), g, buy('counter', 'sandwich'))
    expect(goods(state, g).find((good) => good.item === 'sandwich')!.sellFor).toEqual({ stats: [{ id: 'coins', amount: 2, text: '2 coins' }] })
    state = run(state, g, sell('counter', 'sandwich'))
    expect(state.stats.coins).toBe(20 - 5 + 2)
    expect(state.items.sandwich).toBe(0)
    expect(whyNot(state, g, sell('counter', 'sandwich'))).toBe('You don’t have that.')
    expect(whyNot(run(state, g, buy('stall', 'apple')), g, sell('stall', 'apple'))).toBe('They don’t buy things back.')
  })

  it('selling back a limited good puts it back in stock', () => {
    const g = game()
    const state = run(fresh(g), g, buy('counter', 'biscuit', 3), sell('counter', 'biscuit'))
    expect(goods(state, g).find((good) => good.item === 'biscuit')!.stock).toBe(1)
  })

  it('offers a good only while its condition holds', () => {
    const g = game()
    expect(goods(fresh(g), g).map((good) => good.item)).toEqual(['coffee', 'biscuit', 'sandwich'])
    expect(whyNot(fresh(g), g, buy('counter', 'cake'))).toBe('That isn’t for sale here.')
    const birthday = { ...fresh(g), kv: { birthday: true } }
    expect(goods(birthday, g).map((good) => good.item)).toContain('cake')
  })

  it('marks goods down each day, drawn from the seed, the same on every replay', () => {
    const g = game()
    const marked = (state: GameState) => goods(state, g, 'stall').filter((good) => good.off > 0)
    const today = marked(fresh(g))
    expect(today).toHaveLength(1)
    expect(today[0]).toMatchObject({
      off: 0.5,
      fullPrice: { stats: [{ id: 'coins', amount: 4, text: '4 coins' }] },
      buy: { price: { stats: [{ id: 'coins', amount: 2, text: '2 coins' }] } },
    })
    expect(marked(fresh(g)).map((good) => good.item)).toEqual(today.map((good) => good.item))
    const bought = run(fresh(g), g, buy('stall', today[0].item))
    expect(bought.stats.coins).toBe(18)
    // Different days, and different seeds, mark different goods down.
    const days = new Set(Array.from({ length: 12 }, (_, turn) => marked({ ...fresh(g), turn })[0].item))
    expect(days.size).toBeGreaterThan(1)
    const seeds = new Set(Array.from({ length: 12 }, (_, seed) => marked(fresh(g, seed))[0].item))
    expect(seeds.size).toBeGreaterThan(1)
  })

  it('is open everywhere and always without the calendar and places', () => {
    const g = game()
    expect(holds(fresh(g), vendorOpen('counter'), g)).toBe(true)
    expect(shown(fresh(g), g).vendors[0]).toMatchObject({ here: true, open: true, closed: null })
  })

  it('replays exactly, and an old save with no state for the plugin loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const command of [buy('counter', 'biscuit', 2), buy('stall', 'fig'), sell('counter', 'biscuit'), { type: 'activity' as const, id: 'sleep' }, buy('counter', 'biscuit', 3)]) runner.apply(command)
    expect(replay(g, runner.log())).toEqual(runner.state)
    const { plugins: _none, ...old } = fresh(g)
    const loaded = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (typeof loaded === 'string') throw new Error(loaded)
    expect(goods(loaded, g).find((good) => good.item === 'biscuit')!.stock).toBe(3)
  })

  it('reports vendors that name what the game does not have, and its own mistakes', () => {
    const loaded = loadGame(
      [
        {
          id: 'mod',
          schema: SCHEMA,
          stats: [{ id: 'charm', label: 'Charm' }],
          data: {
            shop: {
              vendors: [
                {
                  id: 'bad',
                  name: 'Bad',
                  at: ['moon'],
                  buysBack: 2,
                  goods: [
                    { item: 'moonstone', price: { charm: 1 } },
                    { item: 'moonstone', price: { gold: 1 }, restock: 'day' },
                  ],
                },
              ],
            },
          },
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()], actions: [{ id: 'y', label: 'Y', command: buy('kiosk', 'apple') }] },
    )
    // A location on the places map is only checked when the game has places.
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action y: unknown vendor "kiosk"',
      'action y: unknown item "apple"',
      'vendors bad: good moonstone: unknown item "moonstone"',
      'vendors bad: good moonstone: unknown item "moonstone"',
      'vendors bad: good moonstone: unknown stat "gold"',
      'vendors bad: buysBack must be between 0 and 1',
      'vendors bad: good moonstone: price in stat "charm", which is not spendable',
      'vendors bad: sells "moonstone" twice',
      'vendors bad: good moonstone: restock needs a stock',
    ])
  })
})

describe('the shop with the calendar', () => {
  it('keeps the vendor’s hours, and restocks on the calendar’s day', () => {
    const clock = calendar({ turn: 'period' })
    const g = game(clock)
    let state = run(fresh(g), g, buy('counter', 'biscuit', 3))
    expect(holds(state, vendorOpen('counter'), g)).toBe(true)
    // An afternoon is a new turn but the same day: no new biscuits.
    state = run(state, g, { type: 'activity', id: 'wait' })
    expect(goods(state, g).find((good) => good.item === 'biscuit')!.stock).toBe(0)
    // The evening: closed, in the vendor's words.
    state = run(state, g, { type: 'activity', id: 'wait' })
    expect(whyNot(state, g, buy('counter', 'coffee'))).toBe('The shutter is down.')
    expect(shown(state, g).vendors[0]).toMatchObject({ open: false, closed: 'The shutter is down.' })
    // The next morning: open, and stocked again.
    state = clock.write(state, { day: 1, period: 'morning' })
    expect(goods(state, g).find((good) => good.item === 'biscuit')).toMatchObject({ stock: 3, buy: { disabled: undefined } })
  })
})

describe('the shop with places', () => {
  it('sells only where the vendor stands', () => {
    const g = game(places({ start: 'street' }))
    const street = fresh(g)
    expect(whyNot(street, g, buy('counter', 'coffee'))).toBe('You aren’t at that shop.')
    expect(shown(street, g).vendors.map((vendor) => [vendor.id, vendor.here])).toEqual([
      ['counter', false],
      ['stall', true],
    ])
    const cafe = run(street, g, go('cafe'), buy('counter', 'coffee'))
    expect(cafe.items.coffee).toBe(1)
  })

  it('works with both: a counter in the café, open in the day', () => {
    const clock = calendar()
    const g = game(clock, places({ start: 'cafe' }))
    expect(whyNot(fresh(g), g, buy('counter', 'coffee'))).toBeUndefined()
    expect(whyNot(clock.write(fresh(g), { day: 0, period: 'night' }), g, buy('counter', 'coffee'))).toBe('The shutter is down.')
  })
})
