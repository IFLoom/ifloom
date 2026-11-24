import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  commandOf,
  apply,
  createRunner,
  heldCount,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  translatableFields,
  upgradePack,
  view,
  whyNot,
  type Game,
  type GameState,
  type Content,
  type Plugin,
  type CommandRef,
} from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { shop, vendorOf, vendorsOf, type ShopView } from '../src/index.ts'

/** The café counter, in the café only: coffee for coins, three biscuits a day, and half back on a sandwich. */
const counter = shop.vendor({
  id: 'counter',
  name: 'The counter',
  blocked: [places.onlyAt(['cafe'], { string: 'shop/notHere' }, { hide: true }), shop.hours(['morning', 'afternoon'], 'The shutter is down.')],
  buysBack: 0.5,
  goods: [
    { entity: 'food:coffee', price: { coins: 3 } },
    { entity: 'food:biscuit', price: { coins: 2 }, stock: 3, restock: 'day' },
    { entity: 'food:sandwich', price: { coins: 5, energy: 1 } },
    { entity: 'food:cake', price: { coins: 6 }, when: { kv: 'birthday' } },
  ],
})
/** A market stall marking one thing a day down by half. */
const stall = shop.vendor({
  id: 'stall',
  name: 'Fruit stall',
  discounts: { off: 0.5 },
  goods: ['apple', 'pear', 'plum', 'fig'].map((id) => ({ entity: `fruit:${id}` })),
})

/** Food the counter prices itself; fruit priced by its \`shop/sellable\` trait, on the kind. */
const things: Content = {
  kinds: [
    { id: 'food', label: 'Food', listed: false },
    { id: 'fruit', label: 'Fruit', listed: false, traits: { ...shop.sellable({ coins: 4 }) } },
  ],
  entities: [
    ...['coffee', 'biscuit', 'sandwich', 'cake'].map((id) => ({ id, of: 'food', name: id })),
    ...['apple', 'pear', 'plum', 'fig'].map((id) => ({ id, of: 'fruit', name: id })),
  ],
}

const place = (id: string, exits: string[]) => places.location({ id, name: id, exits, body: [] })

function game(...partners: Plugin[]): Game {
  const town: Content = {
    name: 'town',
    stats: [
      { id: 'coins', label: 'Coins', start: 20, max: 999, spendable: true, format: '{n} coins', lacking: 'You need {n} coins.' },
      { id: 'energy', label: 'Energy', start: 50, spendable: true },
    ],
    ...things,
    entities: [
      ...things.entities!,
      counter,
      stall,
      ...(partners.some((plugin) => plugin.id === 'places') ? [place('street', ['cafe']), place('cafe', ['street'])] : []),
    ],
    actions: [
      { id: 'wait', effects: [calendar.pass(1)] },
      { id: 'sleep', effects: [{ turn: true }] },
    ],
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
  it('shows the counter the open shop panel names as its view’s panel, and none while it is shut', () => {
    const g = game()
    expect(shown(fresh(g), g).panel).toBeNull()
    const open = { ...fresh(g), panel: { panel: 'shop', with: { vendor: 'counter' } } }
    expect(shown(open, g).panel?.id).toBe('counter')
    expect(shown({ ...open, panel: { panel: 'shop', with: { vendor: 'vendor:counter' } } }, g).panel?.id).toBe('counter')
  })

  it('sells for prices in any spendable stat', () => {
    const g = game()
    const state = run(fresh(g), g, shop.buy('counter', 'food:sandwich'), shop.buy('counter', 'food:coffee', 2))
    expect(state.stats).toMatchObject({ coins: 20 - 5 - 6, energy: 49 })
    expect([heldCount(state, g, 'food:sandwich'), heldCount(state, g, 'food:coffee')]).toEqual([1, 2])
  })

  it('refuses what the player can’t afford, in the stat’s own words, and greys the button with it', () => {
    const g = game()
    const poor = { ...fresh(g), stats: { coins: 2, energy: 50 } }
    expect(whyNot(poor, g, shop.buy('counter', 'food:coffee'))).toBe('You need 3 coins.')
    const coffee = goods(poor, g).find((good) => good.entity === 'food:coffee')!
    expect(coffee.buy).toMatchObject({
      label: 'coffee',
      disabled: 'You need 3 coins.',
      price: { stats: [{ id: 'coins', amount: 3, text: '3 coins' }] },
      command: commandOf(shop.buy('counter', 'food:coffee')),
    })
  })

  it('runs out of limited stock, and gets it back each day', () => {
    const g = game()
    let state = run(fresh(g), g, shop.buy('counter', 'food:biscuit', 2), shop.buy('counter', 'food:biscuit'))
    expect(whyNot(state, g, shop.buy('counter', 'food:biscuit'))).toBe('Sold out.')
    expect(holds(state, g, shop.inStock('counter', 'food:biscuit'))).toBe(false)
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')).toMatchObject({ stock: 0, buy: { disabled: 'Sold out.' } })
    // Without the calendar, a day is a turn.
    state = run(state, g, { type: 'action', id: 'sleep' })
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(3)
    expect(goods(state, g).find((good) => good.entity === 'food:coffee')!.stock).toBeNull()
  })

  it('buys back at the vendor’s fraction, rounded down, and only what the player has', () => {
    const g = game()
    let state = run(fresh(g), g, shop.buy('counter', 'food:sandwich'))
    expect(goods(state, g).find((good) => good.entity === 'food:sandwich')!.sellFor).toEqual({
      stats: [{ id: 'coins', amount: 2, text: '2 coins' }],
      text: '2 coins',
    })
    state = run(state, g, shop.sell('counter', 'food:sandwich'))
    expect(state.stats.coins).toBe(20 - 5 + 2)
    expect(heldCount(state, g, 'food:sandwich')).toBe(0)
    expect(whyNot(state, g, shop.sell('counter', 'food:sandwich'))).toBe('You don’t have that.')
    expect(whyNot(run(state, g, shop.buy('stall', 'fruit:apple')), g, shop.sell('stall', 'fruit:apple'))).toBe('They don’t buy things back.')
  })

  it('selling back a limited good puts it back in stock', () => {
    const g = game()
    const state = run(fresh(g), g, shop.buy('counter', 'food:biscuit', 3), shop.sell('counter', 'food:biscuit'))
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(1)
  })

  it('offers a good only while its condition holds', () => {
    const g = game()
    expect(goods(fresh(g), g).map((good) => good.entity)).toEqual(['food:coffee', 'food:biscuit', 'food:sandwich'])
    expect(whyNot(fresh(g), g, shop.buy('counter', 'food:cake'))).toBe('That isn’t for sale here.')
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
    const bought = run(fresh(g), g, shop.buy('stall', today[0].entity))
    expect(bought.stats.coins).toBe(18)
    // Different days, and different seeds, mark different goods down.
    const days = new Set(Array.from({ length: 12 }, (_, turn) => marked({ ...fresh(g), turn })[0].entity))
    expect(days.size).toBeGreaterThan(1)
    const seeds = new Set(Array.from({ length: 12 }, (_, seed) => marked(fresh(g, seed))[0].entity))
    expect(seeds.size).toBeGreaterThan(1)
  })

  it('is open everywhere and always without the calendar and places', () => {
    const g = game()
    expect(holds(fresh(g), g, shop.vendorOpen('counter'))).toBe(true)
    expect(shown(fresh(g), g).vendors[0]).toMatchObject({ here: true, closed: null })
  })

  it('replays exactly, and an old save with no state for the plugin loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const command of [
      shop.buy('counter', 'food:biscuit', 2),
      shop.buy('stall', 'fruit:fig'),
      shop.sell('counter', 'food:biscuit'),
      { type: 'action' as const, id: 'sleep' },
      shop.buy('counter', 'food:biscuit', 3),
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
        { name: 'base', actions: [{ id: 'y', label: 'Y', command: shop.buy('kiosk', 'fruit:apple') }] },
        {
          name: 'mod',
          stats: [{ id: 'charm', label: 'Charm' }],
          kinds: [{ id: 'gem', label: 'Gem', unique: true }],
          entities: [
            shop.vendor({
              id: 'bad',
              name: 'Bad',
              buysBack: 2,
              goods: [
                { entity: 'stone:moon', price: { charm: 1 } },
                { entity: 'stone:moon', price: { gold: 1 }, restock: 'day' },
                { entity: 'gem:ruby', stock: 2 },
              ],
            }),
          ],
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action y: unknown entity "vendor:kiosk"',
      'action y: unknown kind "fruit"',
      'trait shop/vendor on vendor:bad: buysBack must be between 0 and 1',
      'trait shop/vendor on vendor:bad: good stone:moon: price in stat "charm", which is not spendable',
      'trait shop/vendor on vendor:bad: sells "stone:moon" twice',
      'trait shop/vendor on vendor:bad: good stone:moon: restock needs a stock',
      'trait shop/vendor on vendor:bad: good gem:ruby: a unique thing has a stock of 1 at most',
      'trait shop/vendor on vendor:bad: good gem:ruby: no price: give the good a price, or the thing a shop/sellable trait',
      'trait shop/vendor on vendor:bad: good stone:moon: unknown kind "stone"',
      'trait shop/vendor on vendor:bad: good stone:moon: unknown kind "stone"',
      'trait shop/vendor on vendor:bad: good stone:moon: unknown stat "gold"',
      'trait shop/vendor on vendor:bad: good gem:ruby: unknown entity "gem:ruby"',
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
    expect(view(fresh(g), g).entities.find((kind) => kind.id === 'vendor')).toBeUndefined()
    expect(shown(fresh(g), g).vendors[0]).toMatchObject({ id: 'counter', ref: 'vendor:counter', name: 'The counter' })
    // The vendor holds what it has left once anything has been done, and buying moves it to you.
    const state = run(fresh(g), g, shop.buy('counter', 'food:biscuit'))
    expect(heldCount(state, g, 'food:biscuit', shop.vendorRef('counter'))).toBe(2)
    expect(heldCount(state, g, 'food:biscuit')).toBe(1)
    // A good that never runs out is not held by anyone until it is bought.
    expect(heldCount(state, g, 'food:coffee', shop.vendorRef('counter'))).toBe(0)
    expect(goods(state, g).find((good) => good.entity === 'food:coffee')).toMatchObject({ stock: null, owned: 0 })
  })

  it('starts the vendor with what content places with it, and sells that', () => {
    const extra = loadGame(
      [
        {
          name: 'town',
          stats: [{ id: 'coins', label: 'Coins', start: 20, spendable: true }],
          kinds: [{ id: 'jar', label: 'Jar', listed: false }],
          entities: [
            { id: 'honey', of: 'jar', name: 'honey', at: { 'vendor:market': 2 } },
            shop.vendor({ id: 'market', name: 'Market', goods: [{ entity: 'jar:honey', price: { coins: 1 }, stock: 0 }] }),
          ],
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(extra.problems).toEqual([])
    const market = extra.game
    const jars = () => (view(state, market).plugins.shop as ShopView).vendors[0].goods[0]
    let state: GameState = fresh(market)
    expect(jars().stock).toBe(2)
    state = run(state, market, shop.buy('market', 'jar:honey', 2))
    expect(whyNot(state, market, shop.buy('market', 'jar:honey'))).toBe('Sold out.')
  })

  it('takes a thing that never runs out back by taking it from you', () => {
    const g = game()
    const state = run(fresh(g), g, shop.buy('counter', 'food:sandwich'), shop.sell('counter', 'food:sandwich'))
    expect(heldCount(state, g, 'food:sandwich', shop.vendorRef('counter'))).toBe(0)
    expect(heldCount(state, g, 'food:sandwich')).toBe(0)
  })

  it('sells a unique thing once, from the vendor, and has it back to sell when you sell it back', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          stats: [{ id: 'coins', label: 'Coins', start: 20, spendable: true }],
          kinds: [{ id: 'hat', label: 'Hat', unique: true, listed: false }],
          entities: [
            { id: 'bowler', of: 'hat', name: 'bowler', traits: { ...shop.sellable({ coins: 6 }) } },
            shop.vendor({ id: 'milliner', name: 'Milliner', buysBack: 0.5, goods: [{ entity: 'hat:bowler', stock: 1, restock: 'day' }] }),
          ],
          actions: [{ id: 'sleep', effects: [{ turn: true }] }],
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(loaded.problems).toEqual([])
    const g = loaded.game
    let state = run(fresh(g), g, shop.buy('milliner', 'hat:bowler'))
    expect(state.stats.coins).toBe(14)
    expect(heldCount(state, g, 'hat:bowler')).toBe(1)
    expect(whyNot(state, g, shop.buy('milliner', 'hat:bowler'))).toBe('Sold out.')
    // A new day restocks, but never takes the one you hold.
    state = run(state, g, { type: 'action', id: 'sleep' })
    expect(whyNot(state, g, shop.buy('milliner', 'hat:bowler'))).toBe('Sold out.')
    expect(heldCount(state, g, 'hat:bowler')).toBe(1)
    state = run(state, g, shop.sell('milliner', 'hat:bowler'))
    expect(state.stats.coins).toBe(17)
    expect(heldCount(state, g, 'hat:bowler', shop.vendorRef('milliner'))).toBe(1)
  })

  it('carries an older save’s sold counts into what the vendor holds', () => {
    const g = game()
    const old = { ...fresh(g), plugins: { shop: { version: 1, state: { sold: { counter: { biscuit: { n: 2, at: 0 }, gone: { n: 1, at: 0 } } } } } } }
    const loaded = loadState(JSON.parse(JSON.stringify(old)), g)
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(loaded.value.plugins.shop).toEqual({ version: 2, state: { stocked: { counter: { 'food:biscuit': { at: 0, left: 1 } } } } })
    expect(goods(loaded.value, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(1)
    // The next command writes it to what the vendor holds.
    const next = run(loaded.value, g, shop.buy('counter', 'food:coffee'))
    expect(heldCount(next, g, 'food:biscuit', shop.vendorRef('counter'))).toBe(1)
    expect(next.plugins.shop.state).toEqual({ stocked: { counter: { 'food:biscuit': { at: 0 } } } })
  })
})

describe('a vendor is an entity with the vendor trait', () => {
  it('is written with shop.vendor(): the entity has the name, and the trait the rest', () => {
    expect(stall).toEqual({
      id: 'stall',
      of: 'vendor',
      name: 'Fruit stall',
      traits: { 'shop/vendor': { discounts: { off: 0.5 }, goods: ['apple', 'pear', 'plum', 'fig'].map((id) => ({ entity: `fruit:${id}` })) } },
    })
    const g = game()
    const state = startingState(g)
    expect(vendorsOf(state, g)).toEqual(['vendor:counter', 'vendor:stall'])
    expect(vendorOf(state, g, 'counter')?.goods.map((good) => good.entity)).toContain('food:biscuit')
    expect(vendorOf(state, g, 'kiosk')).toBeUndefined()
  })

  it('can be of any kind that carries the trait: a person who sells', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          ...things,
          stats: [{ id: 'coins', label: 'Coins', start: 20, spendable: true }],
          kinds: [...things.kinds!, { id: 'character', label: 'Person', unique: true }],
          entities: [...things.entities!, shop.vendor({ id: 'ava', of: 'character', name: 'Ava', goods: [{ entity: 'food:coffee', price: { coins: 2 } }] })],
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(loaded.problems).toEqual([])
    const g = loaded.game
    expect(shown(fresh(g), g).vendors).toMatchObject([{ id: 'character:ava', ref: 'character:ava', name: 'Ava' }])
    expect(run(fresh(g), g, shop.buy('character:ava', 'food:coffee')).stats.coins).toBe(18)
  })

  it('has its goods changed by a mod with a traits row', () => {
    const mod = {
      id: 'mod:cheap',
      schema: SCHEMA,
      traits: { 'shop/vendor': { 'vendor:counter': { goods: [{ entity: 'food:coffee' as const, price: { coins: 1 } }] } } },
    }
    const loaded = loadGame(
      [{ name: 'town', stats: [{ id: 'coins', label: 'Coins', start: 20, spendable: true }], ...things, entities: [...things.entities!, counter] }],
      { id: 'g', title: 'g', plugins: [shop()] },
      { packs: [mod] },
    )
    expect(loaded.problems).toEqual([])
    const g = loaded.game
    expect(goods(fresh(g), g).map((good) => good.entity)).toEqual(['food:coffee'])
    expect(run(fresh(g), g, shop.buy('counter', 'food:coffee')).stats.coins).toBe(19)
    // The rest of the vendor is the entity's, still: its name.
    expect(shown(fresh(g), g).vendors[0].name).toBe('The counter')
  })

  it('has where it stands checked by places, when the game has places', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          ...things,
          stats: [{ id: 'coins', label: 'Coins', spendable: true }],
          entities: [
            ...things.entities!,
            shop.vendor({ id: 'van', name: 'Van', blocked: [places.onlyAt(['moon'], undefined, { hide: true })], goods: [] }),
            place('street', []),
          ],
        },
      ],
      { id: 'g', title: 'g', plugins: [places({ start: 'street' }), shop()] },
    )
    // places checks the place its `places/away` names; without places, nothing is asked.
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'trait shop/vendor on vendor:van: blocked: unknown entity "location:moon"',
    ])
  })

  it('carries an older pack’s vendors forward into entities', () => {
    const old = {
      id: 'mod:old',
      schema: 23,
      data: { shop: { vendors: [{ id: 'kiosk', name: 'Kiosk', hours: ['morning'], goods: [{ entity: 'food:coffee', price: { coins: 2 } }] }] } },
    }
    const loaded = loadGame(
      [{ name: 'town', ...things, stats: [{ id: 'coins', label: 'Coins', spendable: true }] }],
      { id: 'g', title: 'g', plugins: [shop()] },
      { packs: [old] },
    )
    expect(loaded.problems).toEqual([])
    expect(loaded.game.entities?.find((entity) => entity.id === 'kiosk')).toEqual({
      of: 'vendor',
      id: 'kiosk',
      name: 'Kiosk',
      // Its hours are a blocked entry since schema 27, closed outside them in the plugin's words.
      traits: {
        'shop/vendor': {
          goods: [{ entity: 'food:coffee', price: { coins: 2 } }],
          blocked: [{ when: { 'shop/outside': { period: ['morning'] } }, reason: { string: 'shop/closed' } }],
        },
      },
    })
    expect(loaded.game.data?.shop).toBeUndefined()
  })

  it('reports vendors still written in data', () => {
    const old = { name: 'old', data: { shop: { vendors: [{ id: 'kiosk' }] } } } as unknown as Content
    const { problems } = loadGame([old], { id: 'g', title: 'g', plugins: [shop()] })
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'vendors kiosk: vendors are entities now: write them in entities with shop.vendor({ id, name, goods, ... })',
    ])
  })
})

describe('the shop with content written for items', () => {
  it('reports a good that names an item, and leaves it out rather than failing', () => {
    const loaded = loadGame(
      [
        {
          name: 'old',
          stats: [{ id: 'coins', label: 'Coins', spendable: true }],
          entities: [shop.vendor({ id: 'kiosk', name: 'Kiosk', goods: [{ item: 'paper', price: { coins: 1 } } as never] })],
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'trait shop/vendor on vendor:kiosk: a good names no thing: write { entity: "kind:id" }, where an item was',
    ])
    expect((view(fresh(loaded.game), loaded.game).plugins.shop as ShopView).vendors[0].goods).toEqual([])
  })
})

describe('the shop with the calendar', () => {
  it('keeps the vendor’s hours, and restocks on the calendar’s day', () => {
    const clock = calendar({ turn: 'period' })
    const g = game(clock)
    let state = run(fresh(g), g, shop.buy('counter', 'food:biscuit', 3))
    expect(holds(state, g, shop.vendorOpen('counter'))).toBe(true)
    // An afternoon is a new turn but the same day: no new biscuits.
    state = run(state, g, { type: 'action', id: 'wait' })
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')!.stock).toBe(0)
    // The evening: closed, in the vendor's words.
    state = run(state, g, { type: 'action', id: 'wait' })
    expect(whyNot(state, g, shop.buy('counter', 'food:coffee'))).toBe('The shutter is down.')
    expect(shown(state, g).vendors[0]).toMatchObject({ closed: 'The shutter is down.' })
    // The next morning: open, and stocked again.
    state = clock.write(state, { day: 1, period: 'morning' })
    expect(goods(state, g).find((good) => good.entity === 'food:biscuit')).toMatchObject({ stock: 3, buy: { disabled: undefined } })
  })
})

describe('the shop’s opening hours', () => {
  it('close a vendor in the plugin’s words when it gives none, which the game can reword', () => {
    const clock = calendar({ turn: 'period' })
    const kiosk = shop.vendor({ id: 'kiosk', name: 'Kiosk', blocked: [shop.hours(['morning'])], goods: [{ entity: 'food:coffee', price: { coins: 2 } }] })
    const { game: g, problems } = loadGame(
      [
        {
          name: 'town',
          ...things,
          stats: [{ id: 'coins', label: 'Coins', start: 9, spendable: true }],
          entities: [...things.entities!, kiosk],
          strings: { 'shop/closed': 'Shut.' },
        },
      ],
      {
        id: 'g',
        title: 'g',
        plugins: [clock, shop()],
      },
    )
    expect(problems).toEqual([])
    const evening = clock.write(fresh(g), { day: 0, period: 'evening' })
    expect(whyNot(evening, g, shop.buy('kiosk', 'food:coffee'))).toBe('Shut.')
    expect(holds(evening, g, shop.vendorOpen('kiosk'))).toBe(false)
  })

  it('carry a translation of an older vendor’s closed line to its blocked entries', () => {
    const v26 = {
      id: 'mod:old',
      schema: 26,
      entities: [{ of: 'vendor', id: 'kiosk', name: 'Kiosk', traits: { 'shop/vendor': { hours: ['morning'], closed: 'Back at nine.', goods: [] } } }],
      words: { 'entity.vendor:kiosk.traits.shop/vendor.closed': 'Retour à neuf heures.' },
    }
    const out = upgradePack(v26, [shop()])
    if (!out.ok) throw new Error(out.reason)
    const { game: g } = loadGame(
      [{ name: 'town', ...things, stats: [{ id: 'coins', label: 'Coins', spendable: true }] }],
      { id: 'g', title: 'g', plugins: [calendar(), shop()] },
      { packs: [{ ...out.value, words: {} }] },
    )
    const keys = translatableFields(g).map((field) => field.key)
    expect(keys).toContain(Object.keys(out.value.words!)[0])
  })
})

describe('the shop with places', () => {
  it('sells only where the vendor stands, and shows it here only there', () => {
    const g = game(places({ start: 'street' }))
    const street = fresh(g)
    expect(whyNot(street, g, shop.buy('counter', 'food:coffee'))).toBe('You aren’t at that shop.')
    expect(shown(street, g).vendors.map((vendor) => [vendor.id, vendor.here])).toEqual([
      ['counter', false],
      ['stall', true],
    ])
    const cafe = run(street, g, places.go('cafe'), shop.buy('counter', 'food:coffee'))
    expect(heldCount(cafe, g, 'food:coffee')).toBe(1)
  })

  it('works with both: a counter in the café, open in the day', () => {
    const clock = calendar()
    const g = game(clock, places({ start: 'cafe' }))
    expect(whyNot(fresh(g), g, shop.buy('counter', 'food:coffee'))).toBeUndefined()
    expect(whyNot(clock.write(fresh(g), { day: 0, period: 'night' }), g, shop.buy('counter', 'food:coffee'))).toBe('The shutter is down.')
  })
})

describe('the shop panel', () => {
  it("opens a vendor's counter from anything that runs effects, and stays open while the player buys", () => {
    const base = game()
    const g = { ...base, actions: [...(base.actions ?? []), { id: 'counter', effects: [shop.open('counter')] }] }
    expect(shop.open('counter')).toEqual({ panel: 'shop', with: { vendor: 'counter' } })
    const open = run(fresh(g), g, { type: 'action', id: 'counter' })
    expect(view(open, g).panel).toEqual({ panel: 'shop', with: { vendor: 'counter' } })
    const bought = run(open, g, shop.buy('counter', 'food:coffee'), shop.buy('counter', 'food:biscuit'))
    expect(bought.panel).toEqual(open.panel)
  })

  it('checks the vendor a panel is opened with', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          ...things,
          entities: [...things.entities!, stall],
          stats: [{ id: 'coins', label: 'Coins', spendable: true }],
          actions: [
            { id: 'a', effects: [shop.open('stall')] },
            { id: 'b', effects: [shop.open('kiosk')] },
            { id: 'c', effects: [{ panel: 'shop' }] },
            { id: 'd', effects: [{ panel: 'map', with: { vendor: 'kiosk' } }] },
          ],
        },
      ],
      { id: 'g', title: 'g', plugins: [shop()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action b: unknown entity "vendor:kiosk"',
      'action c: the shop panel needs a vendor: { vendor: "<id>" }',
    ])
  })
})
