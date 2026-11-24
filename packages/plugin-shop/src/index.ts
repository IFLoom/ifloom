/**
 * @ifloom/plugin-shop: vendors the player buys from and sells back to.
 *
 * What a vendor sells are entities, things the player then holds. A vendor
 * is an entity too, one that carries the `shop/vendor` trait, written with
 * `shop.vendor({ ... })` in content's `entities` (of the plugin's `vendor` kind
 * unless it says), so it holds its stock as any holder holds things, and a
 * mod changes one as it changes any entity. A good with no `stock` never
 * runs out: buying one gives the player a new one. A good with a `stock` is
 * held by the vendor, which starts with that many and, with `restock`, is
 * topped back up each turn or each day; buying moves one from the vendor to
 * the player. A vendor can take things back for part of their price and
 * mark a few goods down each day, drawn from the save's seed.
 *
 * A thing's price is the good's, else its `shop/sellable` trait's.
 *
 * A vendor is refused while one of its `blocked` entries holds: closed by
 * one such as the opening hours `shop.hours(['morning'])` writes, which ask
 * the calendar, and not here by one with `hide`, such as
 * `places.onlyAt(['cafe'], undefined, { hide: true })`, which asks the places
 * plugin and never holds without it.
 */
import {
  arg,
  artSrc,
  declaredTrait,
  declaredWithTrait,
  defineCalls,
  definePlugin,
  entityDescription,
  entityImage,
  entityName,
  entityOf,
  hash,
  heldCount,
  holderOf,
  holds,
  isUnique,
  lackingLine,
  panelOf,
  parseRef,
  pluginQuery,
  priceView,
  reasonOf,
  renderAction,
  statOf,
  statValue,
  stringOf,
  traitOf,
  withTrait,
  YOU,
  type Blocked,
  type CommandRef,
  type CommandsOf,
  type Condition,
  type ConditionsOf,
  type DefinedPlugin,
  type Effect,
  type EntityDef,
  type EntityRef,
  type Game,
  type GameState,
  type PluginContext,
  type PluginProblem,
  type Price,
  type Reason,
  type Reference,
  type RenderedChoice,
  type TraitDef,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** What the `shop/sellable` trait holds: what one is worth, by stat. */
export type Sellable = {
  /** What one costs, by stat: `{ coins: 4 }`. A good's own `price` is used over it. */
  price: Record<string, number>
}

/** When a good's stock comes back: every turn, or every day of the calendar (every turn without one). */
export type Restock = 'turn' | 'day'

/** One thing a vendor sells. */
export type GoodDef = {
  /** The thing, by reference: `'food:apple'`. */
  entity: EntityRef
  /** What one costs, by stat: `{ coins: 4 }`. Each stat should be spendable. The thing's `shop/sellable` price if left out. */
  price?: Record<string, number>
  /**
   * How many the vendor holds: it starts with that many, and `restock` tops
   * it back up to it. Never runs out if left out: each one bought is new. A
   * unique thing is always sold from the vendor's stock, so give it `stock: 1`
   * or start it with the vendor.
   */
  stock?: number
  /** When the stock comes back up to `stock`. Never, if left out. */
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

/**
 * What the `shop/vendor` trait holds: what makes an entity a vendor the
 * player buys from. Its name is the entity's: "The counter".
 */
export type Vendor = {
  /**
   * Refused while one of these holds, with its reason: what buying and
   * selling are refused with, the first that holds winning. An entry with
   * `hide` says where the vendor is: while it holds, the vendor isn't `here`
   * (`places.onlyAt(['cafe'], undefined, { hide: true })`). Any other closes
   * it, its reason what the player reads (`shop.hours(['morning', 'afternoon'])`
   * writes opening hours as one, with the calendar). Open everywhere if left out.
   */
  blocked?: Blocked[]
  goods: GoodDef[]
  /** The fraction of a thing's price it pays to take one back. It takes nothing back if left out. */
  buysBack?: number
  /** Goods marked down each day. None if left out. */
  discounts?: DiscountDef
}

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'shop/sellable': Sellable
    'shop/vendor': Vendor
  }
}

/**
 * What `shop.vendor()` takes: an entity's fields (its `of` is `'vendor'` if left
 * out) and the `shop/vendor` trait's, side by side.
 */
export type VendorDef = Omit<EntityDef, 'of'> & Vendor & { of?: string }

/**
 * When a vendor's stock of a good was last topped up: the turn or day it
 * restocks on, or 0 for a good that never does. `left` is a count an older
 * save carried in, not yet written to what the vendor holds.
 */
export type StockRecord = { at: number; left?: number }

/** What the plugin keeps in a save. The stock itself is what each vendor holds. */
export type ShopState = {
  /** By vendor, then thing: when its stock was last topped up. */
  stocked: Record<string, Record<EntityRef, StockRecord>>
}

/** A good as the UI shows it. */
export type GoodView = {
  /** The thing: `'food:apple'`. */
  entity: EntityRef
  /** Its name. */
  name: string
  /** Its description; null with none. */
  description: string | null
  /** Its picture's path, through `artSrc`; null with none. */
  image: string | null
  /** How many the vendor has left, or null when it never runs out. */
  stock: number | null
  /** How many you hold. */
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
  /** Its id, as `buy` names it: the bare id for one of the `vendor` kind, else its whole reference. */
  id: string
  /** Its entity: `'vendor:counter'`. */
  ref: EntityRef
  name: string
  /** Where the player is: refused by none of its `blocked` entries with `hide`. */
  here: boolean
  /** Why it's closed, its first `blocked` entry without `hide` that holds, in the words `shop/buy` is refused with; null while it's open. */
  closed: string | null
  /** Takes things back. */
  buysBack: boolean
  /** The goods on offer now, in the order the vendor lists them. */
  goods: GoodView[]
}

export type ShopView = {
  /** Every vendor, in the order the game declares them. */
  vendors: VendorView[]
  /**
   * The vendor whose counter the open `shop` panel shows, by its
   * `with.vendor`, or null while no `shop` panel is open: what a UI draws in
   * the panel, with no looking up.
   */
  panel: VendorView | null
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    shop: ShopView
  }
}

const ID = 'shop'
/** The kind of entity vendors are, unless one says otherwise. */
const KIND = 'vendor'
const VENDOR = 'shop/vendor'
const SELLABLE = 'shop/sellable'
/** The panel a UI draws a vendor's counter in. */
const PANEL = 'shop'

/** A reference to one of the game's vendors, which must carry the trait. */
const vendorEntry = (id: string): Reference => ({ entity: vendorRef(id), carrying: VENDOR })

/** A vendor by id or reference, named to the checker. */
const vendorArg = () => arg.string().naming((id): Reference[] => (id ? [vendorEntry(id)] : []))
/** How many: a whole number, 1 or more; 1 if left out. */
const countArg = () =>
  arg
    .number()
    .optional(1)
    .rule((count) => (Number.isInteger(count) && count > 0 ? undefined : 'count must be a whole number, 1 or more'))

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** Open now. Where the player is doesn't matter. */
    open: { vendor: vendorArg() },
    /** The calendar's period of the day is none of these. Never, without the calendar. */
    outside: { period: arg.strings() },
    /** Offered now, and not sold out. */
    inStock: { vendor: vendorArg(), entity: arg.entity() },
  },
  commands: {
    /** Buy `count` of the thing `entity` from `vendor`. */
    buy: { vendor: vendorArg(), entity: arg.entity(), count: countArg() },
    /** Sell `count` of the thing `entity` back to `vendor`. */
    sell: { vendor: vendorArg(), entity: arg.entity(), count: countArg() },
  },
})

/** What buying or selling is handed: the vendor, the thing and how many. */
type Trade = { vendor: string; entity: EntityRef; count: number }

function emptyState(): ShopState {
  return { stocked: {} }
}

/**
 * The entity a vendor is, which holds its stock: `shop.vendorRef('counter')` is
 * `'vendor:counter'`. A reference is as written, for a vendor of another kind.
 */
function vendorRef(vendor: string): EntityRef {
  return (vendor.includes(':') ? vendor : `${KIND}:${vendor}`) as EntityRef
}

/** How the plugin names a vendor back: its id for one of its kind, else the whole reference. */
const short = (ref: EntityRef): string => (parseRef(ref)?.kind === KIND ? parseRef(ref)!.id : ref)

const goodsCache = new WeakMap<object, Vendor>()

/** The trait with the goods that name no thing left out, such as one written for items (`{ item }`); the content checker reports them. */
function usable(vendor: Vendor): Vendor {
  let found = goodsCache.get(vendor)
  if (!found) {
    found = { ...vendor, goods: (Array.isArray(vendor.goods) ? vendor.goods : []).filter((good) => typeof good?.entity === 'string') }
    goodsCache.set(vendor, found)
  }
  return found
}

/**
 * Every vendor in the game now, as references: every entity with the
 * `shop/vendor` trait, the ones content declares in its order, then those
 * made in play.
 */
export function vendorsOf(state: GameState, game: Game): EntityRef[] {
  return withTrait(state, game, VENDOR)
}

/**
 * The `shop/vendor` trait of a vendor, named by its id (`'counter'`) or its
 * reference, with any good that names no thing left out: one content
 * declares, or one made in play. Undefined for anything else.
 */
export function vendorOf(state: GameState, game: Game, ref: string | null | undefined): Vendor | undefined {
  return vendorIn(state, game, ref)
}

/** `vendorsOf`, or with no state (for a check), the vendors content declares. */
function vendorsIn(state: GameState | undefined, game: Game): EntityRef[] {
  return state ? withTrait(state, game, VENDOR) : declaredWithTrait(game, VENDOR)
}

/** `vendorOf`, or with no state (for a check), only the vendors content declares. */
function vendorIn(state: GameState | undefined, game: Game, id: string | null | undefined): Vendor | undefined {
  if (id === null || id === undefined || id === '') return undefined
  const ref = vendorRef(id)
  let data: Vendor | undefined
  if (state) data = entityOf(state, game, ref) ? traitOf(state, game, ref, VENDOR) : undefined
  else data = declaredWithTrait(game, VENDOR).includes(ref) ? declaredTrait(game, ref, VENDOR) : undefined
  return data ? usable(data) : undefined
}

/** One vendor as the plugin reads it: its id (the bare id for one of the `vendor` kind, else its reference), its entity and its trait. */
type One = { id: string; ref: EntityRef; vendor: Vendor }

type Ctx = Pick<PluginContext<ShopState>, 'game' | 'query'>

/** The vendor a call names by its `vendor`, or a reference: undefined for anything that isn't one. */
function oneOf(state: GameState | undefined, game: Game, id: unknown): One | undefined {
  if (typeof id !== 'string' || id === '') return undefined
  const ref = vendorRef(id)
  const vendor = vendorIn(state, game, ref)
  return vendor ? { id: short(ref), ref, vendor } : undefined
}

/** Every vendor in the game now, or, with no state, every one content declares. */
function everyVendor(state: GameState | undefined, game: Game): One[] {
  return vendorsIn(state, game).flatMap((ref) => oneOf(state, game, ref) ?? [])
}

/** The good, if the vendor offers it right now. */
function goodOf(state: GameState, game: Game, one: One, entity: string): GoodDef | undefined {
  const good = one.vendor.goods.find((entry) => entry.entity === entity)
  return good && (!good.when || holds(state, game, good.when)) ? good : undefined
}

/** The day: the calendar's, asked by name, or the turn without one. */
function dayOf(state: GameState, game: Game): number {
  return pluginQuery(game, 'calendar/now')?.(state).day ?? state.turn
}

/** What the stock is topped up against: the turn or the day it restocks on, or 0 for once only. */
function restockKey(state: GameState, good: GoodDef, cx: Pick<Ctx, 'game'>): number {
  if (good.restock === 'turn') return state.turn
  if (good.restock === 'day') return dayOf(state, cx.game)
  return 0
}

/** Whether the vendor holds this good's stock: it has a `stock`, or it is a unique thing. */
function limited(game: Game, good: GoodDef): boolean {
  return good.stock !== undefined || isUnique(game, good.entity)
}

/**
 * How many the vendor has now, or null for a good that never runs out: what
 * it holds, topped up to the good's `stock` when a restock is due. A unique
 * thing someone else holds isn't taken back to restock it.
 */
function stockLeft(state: GameState, slice: ShopState, one: One, good: GoodDef, cx: Ctx): number | null {
  const { game } = cx
  if (!limited(game, good)) return null
  const held = heldCount(state, game, good.entity, one.ref)
  const record = slice.stocked[one.id]?.[good.entity]
  if (record && record.at === restockKey(state, good, cx)) return record.left ?? held
  if (isUnique(game, good.entity)) {
    const owner = holderOf(state, game, good.entity)
    return owner === undefined || owner === one.ref ? Math.max(held, Math.min(1, good.stock ?? 0)) : held
  }
  return Math.max(held, good.stock ?? 0)
}

/** The fraction off this good today: one of the day's marked-down goods, drawn from the save's seed. */
function offToday(state: GameState, one: One, good: GoodDef, cx: Ctx): number {
  const discounts = one.vendor.discounts
  if (!discounts || !(discounts.off > 0)) return 0
  const day = dayOf(state, cx.game)
  const draw = (entity: string) => hash(`shop:discount:${state.seed}:${one.id}:${day}:${entity}`)
  const order = [...one.vendor.goods].sort((a, b) => draw(a.entity) - draw(b.entity) || (a.entity < b.entity ? -1 : 1))
  const marked = order.slice(0, Math.max(0, discounts.count ?? 1))
  return marked.some((entry) => entry.entity === good.entity) ? Math.min(1, discounts.off) : 0
}

/** What a thing is worth, by stat, when nobody says otherwise: its `shop/sellable` trait's price. */
export function sellableOf(state: GameState, game: Game, ref: EntityRef): Sellable | undefined {
  return traitOf(state, game, ref, SELLABLE)
}

/** A good's full price, by stat: its own, else the thing's `shop/sellable` price. */
function fullPrice(state: GameState, game: Game, good: GoodDef): Record<string, number> {
  return good.price ?? sellableOf(state, game, good.entity)?.price ?? {}
}

/** What one costs today, by stat. */
function priceToday(state: GameState, one: One, good: GoodDef, cx: Ctx): Record<string, number> {
  const off = offToday(state, one, good, cx)
  return Object.fromEntries(Object.entries(fullPrice(state, cx.game, good)).map(([stat, amount]) => [stat, Math.max(0, Math.round(amount * (1 - off)))]))
}

/** What selling one back pays, by stat: its full price times the vendor's fraction, rounded down. */
function sellPrice(state: GameState, game: Game, one: One, good: GoodDef): Record<string, number> {
  const fraction = one.vendor.buysBack ?? 0
  return Object.fromEntries(Object.entries(fullPrice(state, game, good)).map(([stat, amount]) => [stat, Math.floor(amount * fraction)]))
}

function times(price: Record<string, number>, count: number): Record<string, number> {
  return Object.fromEntries(Object.entries(price).map(([stat, amount]) => [stat, amount * count]))
}

/** Is the player where the vendor is? While none of its `blocked` entries with `hide` holds. */
function isHere(state: GameState, one: One, cx: Ctx): boolean {
  return !one.vendor.blocked?.some((blocked) => blocked.hide && holds(state, cx.game, blocked.when))
}

/** Why the vendor is closed, its first `blocked` entry without `hide` that holds, or undefined if it's open. */
function closedReason(state: GameState, one: One, cx: Ctx): string | undefined {
  const entry = one.vendor.blocked?.find((blocked) => !blocked.hide && holds(state, cx.game, blocked.when))
  return entry ? reasonOf(cx.game, entry.reason) : undefined
}

/** Why buying or selling is refused by the vendor: its first `blocked` entry that holds, or undefined. */
function refusedReason(state: GameState, one: One, cx: Ctx): string | undefined {
  const entry = one.vendor.blocked?.find((blocked) => holds(state, cx.game, blocked.when))
  return entry ? reasonOf(cx.game, entry.reason) : undefined
}

/** How many a trade is for: its count, or 1 for one that isn't a whole number above 0. */
function countOf({ count }: Trade): number {
  return Number.isInteger(count) && count > 0 ? count : 1
}

/** Why the player can't buy these now, or undefined. */
function cantBuy(state: GameState, args: Trade, slice: ShopState, cx: Ctx): string | undefined {
  const { game } = cx
  const one = oneOf(state, game, args.vendor)
  const good = one && goodOf(state, game, one, args.entity)
  if (!one || !good || !entityOf(state, game, good.entity)) return stringOf(game, 'shop/unknown')
  const refused = refusedReason(state, one, cx)
  if (refused) return refused
  const count = countOf(args)
  const left = stockLeft(state, slice, one, good, cx)
  if (left !== null && left < count) return stringOf(game, 'shop/soldOut')
  for (const [stat, amount] of Object.entries(times(priceToday(state, one, good, cx), count))) {
    if (amount > 0 && statValue(state, game, stat) < amount) return lackingLine(game, stat, amount)
  }
  return undefined
}

/** Why the player can't sell these back now, or undefined. */
function cantSell(state: GameState, args: Trade, cx: Ctx): string | undefined {
  const { game } = cx
  const one = oneOf(state, game, args.vendor)
  const good = one && goodOf(state, game, one, args.entity)
  if (!one || !good) return stringOf(game, 'shop/unknown')
  if (one.vendor.buysBack === undefined) return stringOf(game, 'shop/noBuyBack')
  const refused = refusedReason(state, one, cx)
  if (refused) return refused
  if (heldCount(state, game, good.entity, YOU) < countOf(args)) return stringOf(game, 'shop/notOwned')
  return undefined
}

/** The vendor's stock of a good written as it reads now, so a restock that was due is held. */
function topUp(state: GameState, slice: ShopState, one: One, good: GoodDef, cx: Ctx): Effect[] {
  const left = stockLeft(state, slice, one, good, cx)
  return left === null ? [] : [{ entity: good.entity, at: one.ref, to: left }]
}

function buyEffects(state: GameState, args: Trade, slice: ShopState, cx: Ctx): Effect[] {
  const one = oneOf(state, cx.game, args.vendor)
  const good = one && goodOf(state, cx.game, one, args.entity)
  if (!one || !good) return []
  const count = countOf(args)
  const paid: Effect[] = Object.entries(times(priceToday(state, one, good, cx), count))
    .filter(([, amount]) => amount > 0)
    .map(([stat, amount]) => ({ stat, by: -amount }))
  const handed: Effect[] = limited(cx.game, good)
    ? [...topUp(state, slice, one, good, cx), { move: good.entity, from: one.ref, to: YOU, by: count }]
    : [{ entity: good.entity, at: YOU, by: count }]
  return [...paid, ...handed]
}

function sellEffects(state: GameState, args: Trade, slice: ShopState, cx: Ctx): Effect[] {
  const one = oneOf(state, cx.game, args.vendor)
  const good = one && goodOf(state, cx.game, one, args.entity)
  if (!one || !good) return []
  const count = countOf(args)
  const paid: Effect[] = Object.entries(times(sellPrice(state, cx.game, one, good), count))
    .filter(([, amount]) => amount > 0)
    .map(([stat, amount]) => ({ stat, by: amount }))
  const handed: Effect[] = limited(cx.game, good)
    ? [...topUp(state, slice, one, good, cx), { move: good.entity, from: YOU, to: one.ref, by: count }]
    : [{ entity: good.entity, at: YOU, by: -count }]
  return [...handed, ...paid]
}

/** The state with the good's stock marked as topped up for now, once what the vendor holds is written. */
function recordStocked(state: GameState, one: One, good: GoodDef, context: PluginContext<ShopState>): GameState {
  if (!limited(context.game, good)) return state
  const slice = context.get(state)
  const record: StockRecord = { at: restockKey(state, good, context) }
  return context.set({ stocked: { ...slice.stocked, [one.id]: { ...slice.stocked[one.id], [good.entity]: record } } }, state)
}

/** Every vendor's stock written as it reads now: a restock that came due, or a count an older save carried in. */
function settleStock(state: GameState, context: PluginContext<ShopState>): GameState {
  let next = state
  for (const one of everyVendor(state, context.game)) {
    for (const good of one.vendor.goods) {
      if (!limited(context.game, good) || !entityOf(next, context.game, good.entity)) continue
      const slice = context.get(next)
      const record = slice.stocked[one.id]?.[good.entity]
      if (record && record.at === restockKey(next, good, context) && record.left === undefined) continue
      next = recordStocked(context.apply(topUp(next, slice, one, good, context), next), one, good, context)
    }
  }
  return next
}

/** Everything the UI needs to draw the vendors and their goods. */
function shopView(state: GameState, slice: ShopState, cx: Ctx): ShopView {
  const { game } = cx
  const vendors = everyVendor(state, game).map((one): VendorView => {
    const closed = closedReason(state, one, cx) ?? null
    const sellable = one.vendor.buysBack !== undefined
    const goods = one.vendor.goods
      .filter((good) => (!good.when || holds(state, game, good.when)) && entityOf(state, game, good.entity))
      .map((good): GoodView => {
        const off = offToday(state, one, good, cx)
        const name = entityName(state, game, good.entity)
        const image = entityImage(state, game, good.entity)
        return {
          entity: good.entity,
          name,
          description: entityDescription(state, game, good.entity) ?? null,
          image: image === undefined ? null : artSrc(image),
          stock: stockLeft(state, slice, one, good, cx),
          owned: heldCount(state, game, good.entity, YOU),
          off,
          fullPrice: off > 0 ? priceView(game, fullPrice(state, game, good)) : null,
          buy: renderAction(state, game, { id: `buy.${one.id}.${good.entity}`, label: name, command: buy(one.id, good.entity) }),
          sell: sellable ? renderAction(state, game, { id: `sell.${one.id}.${good.entity}`, label: name, command: sell(one.id, good.entity) }) : null,
          sellFor: sellable ? priceView(game, sellPrice(state, game, one, good)) : null,
        }
      })
    return { id: one.id, ref: one.ref, name: entityName(state, game, one.ref), here: isHere(state, one, cx), closed, buysBack: sellable, goods }
  })
  // The open counter, as `shop.open(vendor)` names it: by its id, or its whole reference.
  const open = panelOf(state, game)
  const named = open?.panel === PANEL ? String(open.with.vendor ?? '') : undefined
  return { vendors, panel: vendors.find((vendor) => vendor.id === named || vendor.ref === named) ?? null }
}

/** Version 1 kept how many of each item had gone; version 2 keeps when each thing's stock was topped up, the stock being what the vendor holds. */
function fromSold(old: unknown, game: Game): ShopState {
  const sold = ((old as { sold?: Record<string, Record<string, { n: number; at: number }>> } | undefined)?.sold ?? {}) as Record<
    string,
    Record<string, { n: number; at: number }>
  >
  const stocked: ShopState['stocked'] = {}
  for (const one of everyVendor(undefined, game)) {
    for (const [item, record] of Object.entries(sold[one.id] ?? {})) {
      // An item's id is the id of the entity that took its place.
      const good = one.vendor.goods.find((entry) => entry.entity === item || parseRef(entry.entity)?.id === item)
      if (good?.stock === undefined || typeof record?.n !== 'number') continue
      stocked[one.id] = { ...stocked[one.id], [good.entity]: { at: record.at, left: Math.max(0, good.stock - record.n) } }
    }
  }
  return { stocked }
}

const sellableTrait: TraitDef<'shop/sellable'> = {
  id: SELLABLE,
  check: (data) => {
    const price = data?.price
    if (!price || typeof price !== 'object') return ['a sellable thing needs a price: { price: { coins: 4 } }']
    return Object.entries(price).flatMap(([stat, amount]) => (typeof amount === 'number' && amount >= 0 ? [] : [`price in "${stat}" must be 0 or more`]))
  },
  references: (data) => Object.keys(data?.price ?? {}).map((stat) => ({ stat })),
}

/** What is wrong with one vendor's trait, by the shop's own rules. */
function vendorProblems(vendor: Vendor | undefined, game: Game): string[] {
  const problems: string[] = []
  if (!Array.isArray(vendor?.goods)) return ['a vendor needs its goods: goods: [] for none']
  for (const good of vendor.goods) {
    if (typeof good?.entity !== 'string')
      problems.push(`a good names no thing: write { entity: "kind:id" }${good && 'item' in good ? ', where an item was' : ''}`)
  }
  if (vendor.buysBack !== undefined && !(vendor.buysBack >= 0 && vendor.buysBack <= 1)) problems.push('buysBack must be between 0 and 1')
  if (vendor.discounts && !(vendor.discounts.off > 0 && vendor.discounts.off <= 1)) problems.push('discounts.off must be more than 0 and at most 1')
  const sold = new Set<string>()
  for (const good of vendor.goods.filter((entry) => typeof entry?.entity === 'string')) {
    const where = `good ${good.entity}`
    if (sold.has(good.entity)) problems.push(`sells "${good.entity}" twice`)
    sold.add(good.entity)
    if (good.stock !== undefined && !(good.stock >= 0)) problems.push(`${where}: stock must be 0 or more`)
    if (good.stock !== undefined && good.stock > 1 && isUnique(game, good.entity)) problems.push(`${where}: a unique thing has a stock of 1 at most`)
    if (good.restock !== undefined && good.stock === undefined) problems.push(`${where}: restock needs a stock`)
    if (good.price === undefined && !declaredTrait(game, good.entity, SELLABLE))
      problems.push(`${where}: no price: give the good a price, or the thing a ${SELLABLE} trait`)
    for (const [stat, amount] of Object.entries(good.price ?? {})) {
      const def = statOf(game, stat)
      if (def && !def.spendable) problems.push(`${where}: price in stat "${stat}", which is not spendable`)
      if (def?.derive !== undefined) problems.push(`${where}: price in stat "${stat}", which is derived and never written`)
      if (!(amount >= 0)) problems.push(`${where}: price must be 0 or more`)
    }
  }
  return problems
}

const vendorTrait: TraitDef<'shop/vendor'> = {
  id: VENDOR,
  words: { blocked: [{ reason: true }] },
  check: (data, { game }) => vendorProblems(data, game),
  references: (vendor) => {
    return [
      { within: 'blocked', refs: (vendor?.blocked ?? []).flatMap((entry): Reference[] => [{ when: entry?.when }, { reason: entry?.reason }]) },
      ...(Array.isArray(vendor?.goods) ? vendor.goods : [])
        .filter((good) => typeof good?.entity === 'string')
        .map((good): Reference => ({
          within: `good ${good.entity}`,
          refs: [{ entity: good.entity }, ...Object.keys(good.price ?? {}).map((stat) => ({ stat })), { when: good.when }],
        })),
    ]
  },
}

/**
 * The plugin. Add it to the game's `plugins`, and write vendors in the
 * content's `entities` with `shop.vendor({ ... })`.
 */
function shopPlugin(): DefinedPlugin<ShopState, ShopView> {
  return definePlugin<ShopState, ShopView, typeof CALLS>({
    id: ID,
    version: 2,
    calls: CALLS,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    start: emptyState,
    migrations: { 1: (old, { game }) => fromSold(old, game) },
    cooperates: ['calendar', 'places'],
    content: { kinds: [{ id: KIND, label: 'Vendor', plural: 'Vendors', unique: true, listed: false }] },
    traits: [sellableTrait, vendorTrait],
    strings: {
      unknown: 'That isn’t for sale here.',
      // A reason for a vendor's `places.onlyAt()` entry: `{ string: 'shop/notHere' }`.
      notHere: 'You aren’t at that shop.',
      closed: 'Closed.',
      soldOut: 'Sold out.',
      noBuyBack: 'They don’t buy things back.',
      notOwned: 'You don’t have that.',
    },
    conditions: {
      /**
       * `{ 'shop/outside': { period: ['morning', 'afternoon'] } }`: the
       * calendar's period of the day is none of these. Never, without the
       * calendar. What `shop.hours()` closes a vendor by.
       */
      outside: (_state, { period: periods }, { query }) => {
        const period = query('calendar/now')?.period
        return period !== undefined && !periods.includes(period)
      },
      /** `{ 'shop/open': { vendor } }`: open now. Where the player is doesn't matter. */
      open: (state, args, context) => {
        const one = oneOf(state, context.game, args.vendor)
        return Boolean(one) && closedReason(state, one!, context) === undefined
      },
      /** `{ 'shop/inStock': { vendor, entity } }`: offered now, and not sold out. */
      inStock: (state, args, context) => {
        const one = oneOf(state, context.game, args.vendor)
        const good = one && goodOf(state, context.game, one, args.entity)
        if (!one || !good) return false
        const left = stockLeft(state, context.slice, one, good, context)
        return left === null || left > 0
      },
    },
    commands: {
      /** `{ 'shop/buy': { vendor, entity, count? } }`. */
      buy: {
        whyNot: (state, args, context) => cantBuy(state, args, context.slice, context),
        effectsOf: (state, args, context) => buyEffects(state, args, context.slice, context),
        spends: (state, args, context) => {
          const one = oneOf(state, context.game, args.vendor)
          const good = one && goodOf(state, context.game, one, args.entity)
          return one && good ? times(priceToday(state, one, good, context), countOf(args)) : undefined
        },
        run: (state, args, context) => {
          const one = oneOf(state, context.game, args.vendor)!
          const good = goodOf(state, context.game, one, args.entity)!
          return recordStocked(context.apply(buyEffects(state, args, context.slice, context)), one, good, context)
        },
      },
      /** `{ 'shop/sell': { vendor, entity, count? } }`. */
      sell: {
        whyNot: (state, args, context) => cantSell(state, args, context),
        effectsOf: (state, args, context) => sellEffects(state, args, context.slice, context),
        run: (state, args, context) => {
          const one = oneOf(state, context.game, args.vendor)!
          const good = goodOf(state, context.game, one, args.entity)!
          return recordStocked(context.apply(sellEffects(state, args, context.slice, context)), one, good, context)
        },
      },
    },
    // After each command, a restock that came due is written to what each vendor holds.
    onCommand: (_before, after, context) => settleStock(after, context),
    view: (state, context) => shopView(state, context.slice, context),
    references: {
      // The `shop` panel draws one vendor's counter, so it needs a vendor the game has.
      panels: (panel, args): Reference[] => {
        if (panel !== PANEL) return []
        return typeof args.vendor === 'string' ? [vendorEntry(args.vendor)] : [{ problem: 'the shop panel needs a vendor: { vendor: "<id>" }' }]
      },
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      // Vendors were a list in the plugin's content; now each is an entity with the vendor trait.
      for (const entry of (game.data?.[ID] as { vendors?: { id?: string }[] } | undefined)?.vendors ?? []) {
        problems.push({
          list: 'vendors',
          id: String(entry?.id ?? ''),
          what: 'vendors are entities now: write them in entities with shop.vendor({ id, name, goods, ... })',
        })
      }
      return problems
    },
  })
}

const VENDOR_FIELDS = ['blocked', 'goods', 'buysBack', 'discounts'] as const

/**
 * A vendor, for content's `entities`: an entity of the kind `vendor` (or
 * `of`) carrying the `shop/vendor` trait, with the entity's fields and the
 * trait's written side by side.
 *
 * ```ts
 * entities: [shop.vendor({ id: 'counter', name: 'The counter', blocked: [places.onlyAt(['cafe'], undefined, { hide: true })], goods: [{ entity: 'food:bun', price: { coins: 2 } }] })]
 * ```
 */
function vendor(def: VendorDef): EntityDef {
  const { of, traits, ...rest } = def
  const entity: Record<string, unknown> = {}
  const trait: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(rest)) {
    if (value === undefined) continue
    if ((VENDOR_FIELDS as readonly string[]).includes(field)) trait[field] = value
    else entity[field] = value
  }
  return { ...(entity as Omit<EntityDef, 'of'>), of: of ?? KIND, traits: { ...traits, [VENDOR]: trait as Vendor } }
}

/**
 * The `shop/sellable` trait, to spread into an entity's or a kind's
 * `traits`: `traits: { ...sellable({ coins: 4 }) }`. A vendor that lists the
 * thing without a price of its own sells it for this.
 */
const sellable = (price: Record<string, number>): { 'shop/sellable': Sellable } => ({ [SELLABLE]: { price } })

/** A command: buy `count` (1 if left out) of a thing from a vendor. */
const buy = (vendor: string, entity: EntityRef, count?: number): CommandRef =>
  CALLS.commands.buy(count === undefined ? { vendor, entity } : { vendor, entity, count })
/** A command: sell `count` (1 if left out) of a thing back to a vendor. */
const sell = (vendor: string, entity: EntityRef, count?: number): CommandRef =>
  CALLS.commands.sell(count === undefined ? { vendor, entity } : { vendor, entity, count })
/**
 * An effect: open the vendor's counter in the `shop` panel, from a place's
 * action, a person's, a thing's use, an app or a choice. The UI draws it;
 * `shopUi` from `@ifloom/plugin-shop/react` draws it as a `ShopCounter`.
 */
const openShop = (vendor: string): Effect => ({ panel: PANEL, with: { vendor } })
/** A condition, with the calendar: its period of the day is none of these. Never without the calendar. */
const outside = (...periods: string[]): Condition => CALLS.conditions.outside({ period: periods })
/**
 * A `blocked` entry for a vendor's opening hours, with the calendar: closed
 * outside these periods of the day, with `reason` (the plugin's `shop/closed`
 * string, "Closed.", if left out).
 *
 * ```ts
 * shop.vendor({ id: 'counter', name: 'The counter', blocked: [shop.hours(['morning', 'afternoon'])], goods: [...] })
 * ```
 */
const hours = (periods: readonly string[], reason?: Reason): Blocked => ({
  when: outside(...periods),
  reason: reason ?? { string: `${ID}/closed` },
})
/** A condition: the vendor is open now. */
const vendorOpen = (vendor: string): Condition => CALLS.conditions.open({ vendor })
/** A condition: the vendor offers the thing now and has one left. */
const inStock = (vendor: string, entity: EntityRef): Condition => CALLS.conditions.inStock({ vendor, entity })

/**
 * The plugin, with its helpers on it: `shop()` makes the plugin for the
 * game's `plugins`, and content is written with `shop.vendor({ ... })` and `shop.buy('counter', 'food:bun')`.
 */
export const shop = Object.assign(shopPlugin, { vendor, vendorRef, sellable, buy, sell, open: openShop, vendorOpen, inStock, outside, hours })
