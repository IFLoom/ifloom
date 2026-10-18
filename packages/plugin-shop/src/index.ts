/**
 * @ifloom/plugin-shop: vendors the player buys from and sells back to.
 *
 * A vendor sells items for prices in any of the game's spendable stats. A
 * good can have limited stock that comes back each turn or each day, and a
 * vendor can take items back for part of their price and mark a few goods
 * down each day, drawn from the save's seed.
 *
 * It works with the calendar and places when the game has them: a vendor's
 * `hours` are the calendar's periods, and its `at` is where on the places
 * map it stands. Without them, every vendor is open and everywhere.
 */
import {
  definePlugin,
  formatStat,
  hash,
  holds,
  itemById,
  lackingLine,
  renderAction,
  say,
  statDef,
  statValue,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type Effect,
  type Game,
  type GameState,
  type PluginArgs,
  type PluginContext,
  type PluginProblem,
  type Price,
  type Reference,
  type RenderedChoice,
} from '@ifloom/engine'

/** When a good's stock comes back: every turn, or every day of the calendar (every turn without one). */
export type Restock = 'turn' | 'day'

/** One thing a vendor sells. */
export type GoodDef = {
  /** The item, by id. */
  item: string
  /** What one costs, by stat: `{ coins: 4 }`. Each stat should be spendable. */
  price: Record<string, number>
  /** How many there are. No limit if left out. */
  stock?: number
  /** When the stock comes back in full. Never, if left out. */
  restock?: Restock
  /** Offered only while this holds. */
  when?: Condition
}

/** Goods marked down each day: how many, and the fraction off. */
export type DiscountDef = {
  /** The fraction off, such as `0.25` for a quarter. */
  off: number
  /** How many goods are marked down each day. 1 if left out. */
  count?: number
}

/** A vendor, as content declares it. */
export type VendorDef = {
  id: string
  /** What the player reads: "The counter". */
  name: string
  /** Where it is, with the places plugin: the location ids it stands at. Everywhere if left out. */
  at?: string[]
  /** When it is open, with the calendar plugin: the periods of the day. Always, if left out. */
  hours?: string[]
  /** Open only while this holds too, such as weekdays. */
  open?: Condition
  /** What the player reads while it's closed. The plugin's `Closed.` if left out. */
  closed?: string
  goods: GoodDef[]
  /** The fraction of an item's price it pays to take one back. It takes nothing back if left out. */
  buysBack?: number
  /** Goods marked down each day. None if left out. */
  discounts?: DiscountDef
}

/** How many of a good have gone, and the turn or day that count belongs to. */
export type SoldRecord = { n: number; at: number }

/** What the plugin keeps in a save. */
export type ShopState = {
  /** By vendor, then item: how many have gone since the stock last came back. */
  sold: Record<string, Record<string, SoldRecord>>
}

/** A good as the UI shows it. */
export type GoodView = {
  item: string
  /** The item's name. */
  name: string
  /** How many are left, or null for no limit. */
  stock: number | null
  /** How many the player has. */
  owned: number
  /** The fraction off today, or 0. */
  off: number
  /** The price before today's discount, or null when there is none. */
  fullPrice: Price | null
  /**
   * The button that buys one: its price, and why it's greyed out, as any
   * button has them. Send its `command`.
   */
  buy: RenderedChoice
  /** The button that sells one back, or null if the vendor takes nothing back. */
  sell: RenderedChoice | null
  /** What selling one back pays, or null. */
  sellFor: Price | null
}

/** A vendor as the UI shows it. */
export type VendorView = {
  id: string
  name: string
  /** At the player's location, or everywhere. */
  here: boolean
  /** Why it's closed, in the words `shop/buy` is refused with, or null while it's open. */
  closed: string | null
  /** Takes things back. */
  buysBack: boolean
  /** The goods on offer now, in the order the vendor lists them. */
  goods: GoodView[]
}

export type ShopView = {
  /** Every vendor, in the order the game declares them. */
  vendors: VendorView[]
}

const ID = 'shop'
/** The panel a UI draws a vendor's counter in. */
const PANEL = 'shop'

function emptyState(): ShopState {
  return { sold: {} }
}

/** The game's vendors: `data.shop.vendors`, from its packs. */
export function vendorDefs(game: Game): VendorDef[] {
  return (game.data?.[ID]?.vendors ?? []) as VendorDef[]
}

type Ctx = Pick<PluginContext<ShopState>, 'game' | 'query'>

function vendorOf(game: Game, id: unknown): VendorDef | undefined {
  return vendorDefs(game).find((vendor) => vendor.id === String(id ?? ''))
}

/** The good, if the vendor offers it right now. */
function goodOf(state: GameState, game: Game, vendor: VendorDef, item: unknown): GoodDef | undefined {
  const good = vendor.goods.find((entry) => entry.item === String(item ?? ''))
  return good && (!good.when || holds(state, good.when, game)) ? good : undefined
}

/** The day: the calendar's, or the turn without one. */
function dayOf(state: GameState, { query }: Ctx): number {
  return query<{ day: number }>('calendar/now')?.day ?? state.turn
}

/** What a sold count is counted against: the turn or the day it restocks on, or forever. */
function restockKey(state: GameState, good: GoodDef, cx: Ctx): number {
  if (good.restock === 'turn') return state.turn
  if (good.restock === 'day') return dayOf(state, cx)
  return 0
}

function soldNow(state: GameState, slice: ShopState, vendor: VendorDef, good: GoodDef, cx: Ctx): number {
  const record = slice.sold[vendor.id]?.[good.item]
  return record && record.at === restockKey(state, good, cx) ? record.n : 0
}

/** How many are left, or null for no limit. */
function stockLeft(state: GameState, slice: ShopState, vendor: VendorDef, good: GoodDef, cx: Ctx): number | null {
  return good.stock === undefined ? null : Math.max(0, good.stock - soldNow(state, slice, vendor, good, cx))
}

/** The fraction off this good today: one of the day's marked-down goods, drawn from the save's seed. */
function offToday(state: GameState, vendor: VendorDef, good: GoodDef, cx: Ctx): number {
  const discounts = vendor.discounts
  if (!discounts || !(discounts.off > 0)) return 0
  const day = dayOf(state, cx)
  const draw = (item: string) => hash(`shop:discount:${state.seed}:${vendor.id}:${day}:${item}`)
  const order = [...vendor.goods].sort((a, b) => draw(a.item) - draw(b.item) || (a.item < b.item ? -1 : 1))
  const marked = order.slice(0, Math.max(0, discounts.count ?? 1))
  return marked.some((entry) => entry.item === good.item) ? Math.min(1, discounts.off) : 0
}

/** What one costs today, by stat. */
function priceToday(state: GameState, vendor: VendorDef, good: GoodDef, cx: Ctx): Record<string, number> {
  const off = offToday(state, vendor, good, cx)
  return Object.fromEntries(Object.entries(good.price).map(([stat, amount]) => [stat, Math.max(0, Math.round(amount * (1 - off)))]))
}

/** What selling one back pays, by stat: its full price times the vendor's fraction, rounded down. */
function sellPrice(vendor: VendorDef, good: GoodDef): Record<string, number> {
  const fraction = vendor.buysBack ?? 0
  return Object.fromEntries(Object.entries(good.price).map(([stat, amount]) => [stat, Math.floor(amount * fraction)]))
}

function times(price: Record<string, number>, count: number): Record<string, number> {
  return Object.fromEntries(Object.entries(price).map(([stat, amount]) => [stat, amount * count]))
}

function priceView(game: Game, price: Record<string, number>): Price | null {
  const stats = Object.entries(price)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount, text: formatStat(statDef(game, id), amount) }))
  return stats.length ? { stats } : null
}

/** Is the player where the vendor is? Always, without the places plugin or a vendor with no `at`. */
function isHere(vendor: VendorDef, cx: Ctx): boolean {
  if (!vendor.at) return true
  const here = cx.query<string | null>('places/here')
  return here === undefined || (here !== null && vendor.at.includes(here))
}

/** Why the vendor is closed, or undefined if it's open. */
function closedReason(state: GameState, vendor: VendorDef, cx: Ctx): string | undefined {
  const reason = () => vendor.closed ?? say(cx.game, 'shop/closed')
  if (vendor.hours) {
    const period = cx.query<{ period: string }>('calendar/now')?.period
    if (period !== undefined && !vendor.hours.includes(period)) return reason()
  }
  if (vendor.open && !holds(state, vendor.open, cx.game)) return reason()
  return undefined
}

function countOf(args: PluginArgs): number {
  const count = Number(args.count ?? 1)
  return Number.isInteger(count) && count > 0 ? count : 1
}

/** Why the player can't buy these now, or undefined. */
function cantBuy(state: GameState, args: PluginArgs, slice: ShopState, cx: Ctx): string | undefined {
  const { game } = cx
  const vendor = vendorOf(game, args.vendor)
  const good = vendor && goodOf(state, game, vendor, args.item)
  if (!vendor || !good) return say(game, 'shop/unknown')
  if (!isHere(vendor, cx)) return say(game, 'shop/notHere')
  const closed = closedReason(state, vendor, cx)
  if (closed) return closed
  const count = countOf(args)
  const left = stockLeft(state, slice, vendor, good, cx)
  if (left !== null && left < count) return say(game, 'shop/soldOut')
  for (const [stat, amount] of Object.entries(times(priceToday(state, vendor, good, cx), count))) {
    if (amount > 0 && statValue(state, game, stat) < amount) return lackingLine(statDef(game, stat), stat, amount, game)
  }
  return undefined
}

/** Why the player can't sell these back now, or undefined. */
function cantSell(state: GameState, args: PluginArgs, cx: Ctx): string | undefined {
  const { game } = cx
  const vendor = vendorOf(game, args.vendor)
  const good = vendor && goodOf(state, game, vendor, args.item)
  if (!vendor || !good) return say(game, 'shop/unknown')
  if (vendor.buysBack === undefined) return say(game, 'shop/noBuyBack')
  if (!isHere(vendor, cx)) return say(game, 'shop/notHere')
  const closed = closedReason(state, vendor, cx)
  if (closed) return closed
  if ((state.items[good.item] ?? 0) < countOf(args)) return say(game, 'shop/notOwned')
  return undefined
}

function buyEffects(state: GameState, args: PluginArgs, cx: Ctx): Effect[] {
  const vendor = vendorOf(cx.game, args.vendor)
  const good = vendor && goodOf(state, cx.game, vendor, args.item)
  if (!vendor || !good) return []
  const count = countOf(args)
  const paid: Effect[] = Object.entries(times(priceToday(state, vendor, good, cx), count))
    .filter(([, amount]) => amount > 0)
    .map(([stat, amount]) => ({ kind: 'stat', stat, by: -amount }))
  return [...paid, { kind: 'item', item: good.item, by: count }]
}

function sellEffects(state: GameState, args: PluginArgs, cx: Ctx): Effect[] {
  const vendor = vendorOf(cx.game, args.vendor)
  const good = vendor && goodOf(state, cx.game, vendor, args.item)
  if (!vendor || !good) return []
  const count = countOf(args)
  const paid: Effect[] = Object.entries(times(sellPrice(vendor, good), count))
    .filter(([, amount]) => amount > 0)
    .map(([stat, amount]) => ({ kind: 'stat', stat, by: amount }))
  return [{ kind: 'item', item: good.item, by: -count }, ...paid]
}

/** The state with `by` more of a good gone (or fewer, selling back), counted against its restock. */
function recordSold(state: GameState, vendor: VendorDef, good: GoodDef, by: number, context: PluginContext<ShopState>): GameState {
  if (good.stock === undefined) return state
  const slice = (state.plugins?.[ID]?.state as ShopState | undefined) ?? emptyState()
  const at = restockKey(state, good, context)
  const n = Math.max(0, soldNow(state, slice, vendor, good, context) + by)
  return context.set({ sold: { ...slice.sold, [vendor.id]: { ...slice.sold[vendor.id], [good.item]: { n, at } } } }, state)
}

/** Everything the UI needs to draw the vendors and their goods. */
export function shopView(state: GameState, slice: ShopState, cx: Ctx): ShopView {
  const { game } = cx
  const vendors = vendorDefs(game).map((vendor): VendorView => {
    const closed = closedReason(state, vendor, cx) ?? null
    const goods = vendor.goods
      .filter((good) => !good.when || holds(state, good.when, game))
      .map((good): GoodView => {
        const off = offToday(state, vendor, good, cx)
        const item = itemById(game, good.item)
        const name = item?.name ?? good.item
        const sellable = vendor.buysBack !== undefined
        return {
          item: good.item,
          name,
          stock: stockLeft(state, slice, vendor, good, cx),
          owned: state.items[good.item] ?? 0,
          off,
          fullPrice: off > 0 ? priceView(game, good.price) : null,
          buy: renderAction(state, game, { id: `buy.${vendor.id}.${good.item}`, label: name, command: buy(vendor.id, good.item) }),
          sell: sellable ? renderAction(state, game, { id: `sell.${vendor.id}.${good.item}`, label: name, command: sell(vendor.id, good.item) }) : null,
          sellFor: sellable ? priceView(game, sellPrice(vendor, good)) : null,
        }
      })
    return { id: vendor.id, name: vendor.name, here: isHere(vendor, cx), closed, buysBack: vendor.buysBack !== undefined, goods }
  })
  return { vendors }
}

/**
 * The plugin. Add it to the game's `plugins`, and put vendors in a pack's
 * `data.shop.vendors`.
 */
export function shop(): DefinedPlugin<ShopState, ShopView> {
  return definePlugin<ShopState, ShopView>({
    id: ID,
    version: 1,
    start: emptyState,
    cooperates: ['calendar', 'places'],
    strings: {
      unknown: 'That isn’t for sale here.',
      notHere: 'You aren’t at that shop.',
      closed: 'Closed.',
      soldOut: 'Sold out.',
      noBuyBack: 'They don’t buy things back.',
      notOwned: 'You don’t have that.',
    },
    conditions: {
      /** `{ 'shop/open': { vendor } }`: open now. Where the player is doesn't matter. */
      open: (state, args, context) => {
        const vendor = vendorOf(context.game, args.vendor)
        return Boolean(vendor) && closedReason(state, vendor!, context) === undefined
      },
      /** `{ 'shop/inStock': { vendor, item } }`: offered now, and not sold out. */
      inStock: (state, args, context) => {
        const vendor = vendorOf(context.game, args.vendor)
        const good = vendor && goodOf(state, context.game, vendor, args.item)
        if (!vendor || !good) return false
        const left = stockLeft(state, context.slice, vendor, good, context)
        return left === null || left > 0
      },
    },
    commands: {
      /** `{ 'shop/buy': { vendor, item, count? } }`. */
      buy: {
        whyNot: (state, args, context) => cantBuy(state, args, context.slice, context),
        effectsOf: (state, args, context) => buyEffects(state, args, context),
        spends: (state, args, context) => {
          const vendor = vendorOf(context.game, args.vendor)
          const good = vendor && goodOf(state, context.game, vendor, args.item)
          return vendor && good ? times(priceToday(state, vendor, good, context), countOf(args)) : undefined
        },
        run: (state, args, context) => {
          const vendor = vendorOf(context.game, args.vendor)!
          const good = goodOf(state, context.game, vendor, args.item)!
          const next = context.apply(buyEffects(state, args, context))
          return recordSold(next, vendor, good, countOf(args), context)
        },
      },
      /** `{ 'shop/sell': { vendor, item, count? } }`. */
      sell: {
        whyNot: (state, args, context) => cantSell(state, args, context),
        effectsOf: (state, args, context) => sellEffects(state, args, context),
        run: (state, args, context) => {
          const vendor = vendorOf(context.game, args.vendor)!
          const good = goodOf(state, context.game, vendor, args.item)!
          const next = context.apply(sellEffects(state, args, context))
          return recordSold(next, vendor, good, -countOf(args), context)
        },
      },
    },
    view: (state, context) => shopView(state, context.slice, context),
    references: {
      calls: (_kind, _name, args) => [
        ...(args.vendor === undefined ? [] : [{ entry: String(args.vendor), plugin: ID, list: 'vendors', noun: 'vendor' }]),
        ...(args.item === undefined ? [] : [{ item: String(args.item) }]),
      ],
      content: (game) =>
        vendorDefs(game).map((vendor) => ({
          list: 'vendors',
          id: vendor.id,
          refs: [
            ...(vendor.at ?? []).map((location): Reference => ({ entry: location, plugin: 'places', list: 'locations', noun: 'location' })),
            { within: 'open', refs: [{ when: vendor.open }] },
            ...(vendor.goods ?? []).map((good): Reference => ({
              within: `good ${good.item}`,
              refs: [{ item: good.item }, ...Object.keys(good.price ?? {}).map((stat) => ({ stat })), { when: good.when }],
            })),
          ],
        })),
    },
    // The `shop` panel draws one vendor's counter, so it needs a vendor the game has.
    panelProblems: (panel, args, _game, tools) => {
      if (panel !== PANEL) return []
      if (typeof args.vendor !== 'string') return ['the shop panel needs a vendor: { vendor: "<id>" }']
      return tools.problems([{ entry: args.vendor, plugin: ID, list: 'vendors', noun: 'vendor' }])
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const vendor of vendorDefs(game)) {
        const problem = (what: string) => problems.push({ list: 'vendors', id: vendor.id, what })
        if (vendor.buysBack !== undefined && !(vendor.buysBack >= 0 && vendor.buysBack <= 1)) problem('buysBack must be between 0 and 1')
        if (vendor.discounts && !(vendor.discounts.off > 0 && vendor.discounts.off <= 1)) problem('discounts.off must be more than 0 and at most 1')
        const items = new Set<string>()
        for (const good of vendor.goods ?? []) {
          if (items.has(good.item)) problem(`sells "${good.item}" twice`)
          items.add(good.item)
          if (good.stock !== undefined && !(good.stock >= 0)) problem(`good ${good.item}: stock must be 0 or more`)
          if (good.restock !== undefined && good.stock === undefined) problem(`good ${good.item}: restock needs a stock`)
          for (const [stat, amount] of Object.entries(good.price ?? {})) {
            const def = statDef(game, stat)
            if (def && !def.spendable) problem(`good ${good.item}: price in stat "${stat}", which is not spendable`)
            if (def?.derive !== undefined) problem(`good ${good.item}: price in stat "${stat}", which is derived and never written`)
            if (!(amount >= 0)) problem(`good ${good.item}: price must be 0 or more`)
          }
        }
      }
      return problems
    },
  })
}

/** A command: buy `count` (1 if left out) of an item from a vendor. */
export const buy = (vendor: string, item: string, count?: number): CommandRef => ({
  'shop/buy': count === undefined ? { vendor, item } : { vendor, item, count },
})
/** A command: sell `count` (1 if left out) of an item back to a vendor. */
export const sell = (vendor: string, item: string, count?: number): CommandRef => ({
  'shop/sell': count === undefined ? { vendor, item } : { vendor, item, count },
})
/**
 * An effect: open the vendor's counter in the `shop` panel, from a place's
 * action, a person's, an item's `use`, an app or a choice. The UI draws it;
 * `@ifloom/react` draws a `ShopCounter`.
 */
export const openShop = (vendor: string): Effect => ({ kind: 'panel', panel: PANEL, with: { vendor } })
/** A condition: the vendor is open now. */
export const vendorOpen = (vendor: string): Condition => ({ 'shop/open': { vendor } })
/** A condition: the vendor offers the item now and has one left. */
export const inStock = (vendor: string, item: string): Condition => ({ 'shop/inStock': { vendor, item } })
