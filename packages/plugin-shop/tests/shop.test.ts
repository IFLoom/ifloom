import { describe, expect, it } from 'vitest'
import {
  commandOf,
  apply,
  createRunner,
  heldCount,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  view,
  whyNot,
  type Game,
  type GameState,
  type Content,
  type Plugin,
  type CommandRef,
} from '@ifloom/engine'
import { calendar, pass } from '@ifloom/plugin-calendar'
import { go, places, type LocationDef } from '@ifloom/plugin-places'
import { buy, inStock, openShop, sell, sellable, shop, vendorOpen, vendorRef, type ShopView, type VendorDef } from '../src/index.ts'

/** The café counter: coffee for coins, three biscuits a day, and half back on a sandwich. */
const counter: VendorDef = {
  id: 'counter',
  name: 'The counter',
  at: ['cafe'],
  hours: ['morning', 'afternoon'],
  closed: 'The shutter is down.',
  buysBack: 0.5,
  goods: [
    { entity: 'food:coffee', price: { coins: 3 } },
    { entity: 'food:biscuit', price: { coins: 2 }, stock: 3, restock: 'day' },
    { entity: 'food:sandwich', price: { coins: 5, energy: 1 } },
    { entity: 'food:cake', price: { coins: 6 }, when: { kv: 'birthday' } },
  ],
}
/** A market stall marking one thing a day down by half. */
const stall: VendorDef = {
  id: 'stall',
  name: 'Fruit stall',
  discounts: { off: 0.5 },
  goods: ['apple', 'pear', 'plum', 'fig'].map((id) => ({ entity: `fruit:${id}` })),
}

/** Food the counter prices itself; fruit priced by its \`shop/sellable\` trait, on the kind. */
const things: Content = {
  kinds: [
    { id: 'food', label: 'Food', listed: false },
    { id: 'fruit', label: 'Fruit', listed: false, traits: { ...sellable({ coins: 4 }) } },
  ],
  entities: [
    ...['coffee', 'biscuit', 'sandwich', 'cake'].map((id) => ({ id, of: 'food', name: id })),
    ...['apple', 'pear', 'plum', 'fig'].map((id) => ({ id, of: 'fruit', name: id })),
  ],
}

const place = (id: string, exits: string[]): LocationDef => ({ id, name: id, tag: '', art: '', exits, body: [] })

function game(...partners: Plugin[]): Game {
  const town: Content = {
    name: 'town',
    stats: [
      { id: 'coins', label: 'Coins', start: 20, max: 999, spendable: true, format: '{n} coins', lacking: 'You need {n} coins.' },
      { id: 'energy', label: 'Energy', start: 50, spendable: true },
    ],
    ...things,
    activities: [
      { id: 'wait', effects: [pass(1)] },
      { id: 'sleep', effects: [{ kind: 'turn' }] },
    ],
    data: {
      shop: { vendors: [counter, stall] },
      ...(partners.some((plugin) => plugin.id === 'places') ? { places: { locations: [place('street', ['cafe']), place('cafe', ['street'])] } } : {}),
    },
  }
  const loaded = loadGame([town], { id: 'g', title: 'g', plugins: [...partners, shop()] })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

function run(state: GameState, g: Game, ...commands: CommandRef[]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
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
    const state = run(fresh(g), g, buy('counter', 'food:sandwich'), buy('counter', 'food:coffee', 2))
    expect(state.stats).toMatchObject({ coins: 20 - 5 - 6, energy: 49 })
    expect([heldCount(state, g, 'food:sandwich'), heldCount(state, g, 'food:coffee')]).toEqual([1, 2])
  })

  it('refuses what the player can’t afford, in the stat’s own words, and greys the button with it', () => {
    const g = game()
    const poor = { ...fresh(g), stats: { coins: 2, energy: 50 } }
    expect(whyNot(poor, g, buy('counter', 'food:coffee'))).toBe('You need 3 coins.')
    const coffee = goods(poor, g).find((good) => good.entity === 'food:coffee')!
    expect(coffee.buy).toMatchObject({
      label: 'coffee',
      disabled: 'You need 3 coins.',
      price: { stats: [{ id: 'coins', amount: 3, text: '3 coins' }] },
      command: commandOf(buy('counter', 'food:coffee')),
    })
  })

  it('runs out of limited stock, and gets it back each day', () => {
    const g = game()
    let state = run(fresh(g), g, buy('counter', 'food:biscuit', 2), buy('counter', 'food:biscuit'))
    expect(whyNot(state, g, buy('counter', 'food:biscuit'))).toBe('Sold out.')
    expect(holds(state, inStock('counter', 'food:biscuit'), g)).toBe(false)
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')).toMatchObject({ stock: 0, buy: { disabled: 'Sold out.' } })
    // Without the calendar, a day is a turn.
    state = run(state, g, { type: 'activity', id: 'sleep' })
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(3)
    expect(goods(state, g).find((good) => good.entity === 'food:coffee')!.stock).toBeNull()
  })

  it('buys back at the vendor’s fraction, rounded down, and only what the player has', () => {
    const g = game()
    let state = run(fresh(g), g, buy('counter', 'food:sandwich'))
    expect(goods(state, g).find((good) => good.entity === 'food:sandwich')!.sellFor).toEqual({ stats: [{ id: 'coins', amount: 2, text: '2 coins' }] })
    state = run(state, g, sell('counter', 'food:sandwich'))
    expect(state.stats.coins).toBe(20 - 5 + 2)
    expect(heldCount(state, g, 'food:sandwich')).toBe(0)
    expect(whyNot(state, g, sell('counter', 'food:sandwich'))).toBe('You don’t have that.')
    expect(whyNot(run(state, g, buy('stall', 'fruit:apple')), g, sell('stall', 'fruit:apple'))).toBe('They don’t buy things back.')
  })

  it('selling back a limited good puts it back in stock', () => {
    const g = game()
    const state = run(fresh(g), g, buy('counter', 'food:biscuit', 3), sell('counter', 'food:biscuit'))
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(1)
  })

  it('offers a good only while its condition holds', () => {
    const g = game()
    expect(goods(fresh(g), g).map((good) => good.entity)).toEqual(['food:coffee', 'food:biscuit', 'food:sandwich'])
    expect(whyNot(fresh(g), g, buy('counter', 'food:cake'))).toBe('That isn’t for sale here.')
    const birthday = { ...fresh(g), kv: { birthday: true } }
    expect(goods(birthday, g).map((good) => good.entity)).toContain('food:cake')
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
    expect(marked(fresh(g)).map((good) => good.entity)).toEqual(today.map((good) => good.entity))
    const bought = run(fresh(g), g, buy('stall', today[0].entity))
    expect(bought.stats.coins).toBe(18)
    // Different days, and different seeds, mark different goods down.
    const days = new Set(Array.from({ length: 12 }, (_, turn) => marked({ ...fresh(g), turn })[0].entity))
    expect(days.size).toBeGreaterThan(1)
    const seeds = new Set(Array.from({ length: 12 }, (_, seed) => marked(fresh(g, seed))[0].entity))
    expect(seeds.size).toBeGreaterThan(1)
  })

  it('is open everywhere and always without the calendar and places', () => {
    const g = game()
    expect(holds(fresh(g), vendorOpen('counter'), g)).toBe(true)
    expect(shown(fresh(g), g).vendors[0]).toMatchObject({ here: true, closed: null })
  })

  it('replays exactly, and an old save with no state for the plugin loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const command of [
      buy('counter', 'food:biscuit', 2),
      buy('stall', 'fruit:fig'),
      sell('counter', 'food:biscuit'),
      { type: 'activity' as const, id: 'sleep' },
      buy('counter', 'food:biscuit', 3),
    ])
      runner.apply(command)
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
    const { plugins: _none, ...old } = fresh(g)
    const loadedRead = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (!loadedRead.ok) throw new Error(loadedRead.reason)
    const loaded = loadedRead.value
    expect(goods(loaded, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(3)
  })

  it('reports vendors that name what the game does not have, and its own mistakes', () => {
    const loaded = loadGame(
      [
        {
          name: 'mod',
          stats: [{ id: 'charm', label: 'Charm' }],
          kinds: [{ id: 'gem', label: 'Gem', unique: true }],
          data: {
            shop: {
              vendors: [
                {
                  id: 'bad',
                  name: 'Bad',
                  at: ['moon'],
                  buysBack: 2,
                  goods: [
                    { entity: 'stone:moon', price: { charm: 1 } },
                    { entity: 'stone:moon', price: { gold: 1 }, restock: 'day' },
                    { entity: 'gem:ruby', stock: 2 },
                  ],
                },
              ],
            },
          },
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()], actions: [{ id: 'y', label: 'Y', command: buy('kiosk', 'fruit:apple') }] },
    )
    // A location on the places map is only checked when the game has places.
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action y: unknown vendor "kiosk"',
      'action y: unknown kind "fruit"',
      'vendors bad: good stone:moon: unknown kind "stone"',
      'vendors bad: good stone:moon: unknown kind "stone"',
      'vendors bad: good stone:moon: unknown stat "gold"',
      'vendors bad: good gem:ruby: unknown entity "gem:ruby"',
      'vendors bad: buysBack must be between 0 and 1',
      'vendors bad: good stone:moon: price in stat "charm", which is not spendable',
      'vendors bad: sells "stone:moon" twice',
      'vendors bad: good stone:moon: restock needs a stock',
      'vendors bad: good gem:ruby: a unique thing has a stock of 1 at most',
      'vendors bad: good gem:ruby: no price: give the good a price, or the thing a shop/sellable trait',
    ])
  })
})

describe('the shop’s stock, held by the vendor', () => {
  it('makes each vendor an entity of the vendor kind, unlisted, that holds its stock', () => {
    const g = game()
    expect(g.entities?.filter((entity) => entity.of === 'vendor').map((entity) => [entity.id, entity.name])).toEqual([
      ['counter', 'The counter'],
      ['stall', 'Fruit stall'],
    ])
    expect(view(fresh(g), g).entities.vendor).toBeUndefined()
    expect(shown(fresh(g), g).vendors[0]).toMatchObject({ id: 'counter', ref: 'vendor:counter', name: 'The counter' })
    // The vendor holds what it has left once anything has been done, and buying moves it to you.
    const state = run(fresh(g), g, buy('counter', 'food:biscuit'))
    expect(heldCount(state, g, 'food:biscuit', vendorRef('counter'))).toBe(2)
    expect(heldCount(state, g, 'food:biscuit')).toBe(1)
    // A good that never runs out is not held by anyone until it is bought.
    expect(heldCount(state, g, 'food:coffee', vendorRef('counter'))).toBe(0)
    expect(goods(state, g).find((good) => good.entity === 'food:coffee')).toMatchObject({ stock: null, owned: 0 })
  })

  it('starts the vendor with what content places with it, and sells that', () => {
    const extra = loadGame(
      [
        {
          name: 'town',
          stats: [{ id: 'coins', label: 'Coins', start: 20, spendable: true }],
          kinds: [{ id: 'jar', label: 'Jar', listed: false }],
          entities: [{ id: 'honey', of: 'jar', name: 'honey', at: { 'vendor:market': 2 } }],
          data: { shop: { vendors: [{ id: 'market', name: 'Market', goods: [{ entity: 'jar:honey', price: { coins: 1 }, stock: 0 }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(extra.problems).toEqual([])
    const market = extra.game
    const jars = () => (view(state, market).plugins.shop as ShopView).vendors[0].goods[0]
    let state: GameState = fresh(market)
    expect(jars().stock).toBe(2)
    state = run(state, market, buy('market', 'jar:honey', 2))
    expect(whyNot(state, market, buy('market', 'jar:honey'))).toBe('Sold out.')
  })

  it('takes a thing that never runs out back by taking it from you', () => {
    const g = game()
    const state = run(fresh(g), g, buy('counter', 'food:sandwich'), sell('counter', 'food:sandwich'))
    expect(heldCount(state, g, 'food:sandwich', vendorRef('counter'))).toBe(0)
    expect(heldCount(state, g, 'food:sandwich')).toBe(0)
  })

  it('sells a unique thing once, from the vendor, and has it back to sell when you sell it back', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          stats: [{ id: 'coins', label: 'Coins', start: 20, spendable: true }],
          kinds: [{ id: 'hat', label: 'Hat', unique: true, listed: false }],
          entities: [{ id: 'bowler', of: 'hat', name: 'bowler', traits: { ...sellable({ coins: 6 }) } }],
          activities: [{ id: 'sleep', effects: [{ kind: 'turn' }] }],
          data: { shop: { vendors: [{ id: 'milliner', name: 'Milliner', buysBack: 0.5, goods: [{ entity: 'hat:bowler', stock: 1, restock: 'day' }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(loaded.problems).toEqual([])
    const g = loaded.game
    let state = run(fresh(g), g, buy('milliner', 'hat:bowler'))
    expect(state.stats.coins).toBe(14)
    expect(heldCount(state, g, 'hat:bowler')).toBe(1)
    expect(whyNot(state, g, buy('milliner', 'hat:bowler'))).toBe('Sold out.')
    // A new day restocks, but never takes the one you hold.
    state = run(state, g, { type: 'activity', id: 'sleep' })
    expect(whyNot(state, g, buy('milliner', 'hat:bowler'))).toBe('Sold out.')
    expect(heldCount(state, g, 'hat:bowler')).toBe(1)
    state = run(state, g, sell('milliner', 'hat:bowler'))
    expect(state.stats.coins).toBe(17)
    expect(heldCount(state, g, 'hat:bowler', vendorRef('milliner'))).toBe(1)
  })

  it('carries an older save’s sold counts into what the vendor holds', () => {
    const g = game()
    const old = { ...fresh(g), plugins: { shop: { version: 1, state: { sold: { counter: { biscuit: { n: 2, at: 0 }, gone: { n: 1, at: 0 } } } } } } }
    const loaded = loadState(JSON.parse(JSON.stringify(old)), g)
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(loaded.value.plugins.shop).toEqual({ version: 2, state: { stocked: { counter: { 'food:biscuit': { at: 0, left: 1 } } } } })
    expect(goods(loaded.value, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(1)
    // The next command writes it to what the vendor holds.
    const next = run(loaded.value, g, buy('counter', 'food:coffee'))
    expect(heldCount(next, g, 'food:biscuit', vendorRef('counter'))).toBe(1)
    expect(next.plugins.shop.state).toEqual({ stocked: { counter: { 'food:biscuit': { at: 0 } } } })
  })
})

describe('the shop with content written for items', () => {
  it('reports a good that names an item, and leaves it out rather than failing', () => {
    const loaded = loadGame(
      [
        {
          name: 'old',
          stats: [{ id: 'coins', label: 'Coins', spendable: true }],
          data: { shop: { vendors: [{ id: 'kiosk', name: 'Kiosk', goods: [{ item: 'paper', price: { coins: 1 } }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'vendors kiosk: a good names no thing: write { entity: "kind:id" }, where an item was',
    ])
    expect((view(fresh(loaded.game), loaded.game).plugins.shop as ShopView).vendors[0].goods).toEqual([])
  })
})

describe('the shop with the calendar', () => {
  it('keeps the vendor’s hours, and restocks on the calendar’s day', () => {
    const clock = calendar({ turn: 'period' })
    const g = game(clock)
    let state = run(fresh(g), g, buy('counter', 'food:biscuit', 3))
    expect(holds(state, vendorOpen('counter'), g)).toBe(true)
    // An afternoon is a new turn but the same day: no new biscuits.
    state = run(state, g, { type: 'activity', id: 'wait' })
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(0)
    // The evening: closed, in the vendor's words.
    state = run(state, g, { type: 'activity', id: 'wait' })
    expect(whyNot(state, g, buy('counter', 'food:coffee'))).toBe('The shutter is down.')
    expect(shown(state, g).vendors[0]).toMatchObject({ closed: 'The shutter is down.' })
    // The next morning: open, and stocked again.
    state = clock.write(state, { day: 1, period: 'morning' })
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')).toMatchObject({ stock: 3, buy: { disabled: undefined } })
  })
})

describe('the shop with places', () => {
  it('sells only where the vendor stands', () => {
    const g = game(places({ start: 'street' }))
    const street = fresh(g)
    expect(whyNot(street, g, buy('counter', 'food:coffee'))).toBe('You aren’t at that shop.')
    expect(shown(street, g).vendors.map((vendor) => [vendor.id, vendor.here])).toEqual([
      ['counter', false],
      ['stall', true],
    ])
    const cafe = run(street, g, go('cafe'), buy('counter', 'food:coffee'))
    expect(heldCount(cafe, g, 'food:coffee')).toBe(1)
  })

  it('works with both: a counter in the café, open in the day', () => {
    const clock = calendar()
    const g = game(clock, places({ start: 'cafe' }))
    expect(whyNot(fresh(g), g, buy('counter', 'food:coffee'))).toBeUndefined()
    expect(whyNot(clock.write(fresh(g), { day: 0, period: 'night' }), g, buy('counter', 'food:coffee'))).toBe('The shutter is down.')
  })
})

describe('the shop panel', () => {
  it("opens a vendor's counter from anything that runs effects, and stays open while the player buys", () => {
    const base = game()
    const g = { ...base, activities: [...(base.activities ?? []), { id: 'counter', effects: [openShop('counter')] }] }
    expect(openShop('counter')).toEqual({ kind: 'panel', panel: 'shop', with: { vendor: 'counter' } })
    const open = run(fresh(g), g, { type: 'activity', id: 'counter' })
    expect(view(open, g).panel).toEqual({ panel: 'shop', with: { vendor: 'counter' } })
    const bought = run(open, g, buy('counter', 'food:coffee'), buy('counter', 'food:biscuit'))
    expect(bought.panel).toEqual(open.panel)
  })

  it('checks the vendor a panel is opened with', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          data: { shop: { vendors: [stall] } },
          ...things,
          stats: [{ id: 'coins', label: 'Coins', spendable: true }],
          activities: [
            { id: 'a', effects: [openShop('stall')] },
            { id: 'b', effects: [openShop('kiosk')] },
            { id: 'c', effects: [{ kind: 'panel', panel: 'shop' }] },
            { id: 'd', effects: [{ kind: 'panel', panel: 'map', with: { vendor: 'kiosk' } }] },
          ],
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity b: unknown vendor "kiosk"',
      'activity c: the shop panel needs a vendor: { vendor: "<id>" }',
    ])
  })
})
