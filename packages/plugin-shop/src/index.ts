/**
 * @ifloom/plugin-shop: vendors the player buys from and sells back to.
 *
 * What a vendor sells are entities, things the player then holds. A vendor
 * is an entity too, one that carries the `shop/vendor` trait, written with
 * `vendor({ ... })` in content's `entities` (of the plugin's `vendor` kind
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
 * It works with the calendar and places when the game has them: a vendor's
 * `hours` are the calendar's periods, and its `at` is where on the places
 * map it stands. Without them, every vendor is open and everywhere.
 */
import {
  definePlugin,
  entityDesc,
  entityImage,
  entityName,
  entityOf,
  entityTrait,
  formatStat,
  hash,
  heldCount,
  holderOf,
  holds,
  isUnique,
  lackingLine,
  parseRef,
  renderAction,
  stringOf,
  statDef,
  statValue,
  traitOf,
  withTrait,
  artSrc,
  YOU,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type Effect,
  type EntityDef,
  type EntityRef,
  type Game,
  type GameState,
  type PluginArgs,
  type PluginContext,
  type PluginProblem,
  type Price,
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
  /** Where it is, with the places plugin: the location ids it stands at. Everywhere if left out. */
  at?: string[]
  /** When it is open, with the calendar plugin: the periods of the day. Always, if left out. */
  hours?: string[]
  /** Open only while this holds too, such as weekdays. */
  open?: Condition
  /** What the player reads while it's closed. The plugin's `Closed.` if left out. */
  closed?: string
  goods: GoodDef[]
  /** The fraction of a thing's price it pays to take one back. It takes nothing back if left out. */
  buysBack?: number
  /** Goods marked down each day. None if left out. */
  discounts?: DiscountDef
}

declare module '@ifloom/engine' {
  interface Traits {
    'shop/sellable': Sellable
    'shop/vendor': Vendor
  }
}

/**
 * What `vendor()` takes: an entity's fields (its `of` is `'vendor'` if left
 * out) and the `shop/vendor` trait's, side by side. `at` is the trait's:
 * where on the places map it stands.
 */
export type VendorDef = Omit<EntityDef, 'of' | 'at'> & Vendor & { of?: string }

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
  desc: string | null
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

/**
 * What content writes for each of the plugin's calls, its queries' answers
 * and its view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionCalls {
    'shop/open': { vendor: string }
    'shop/inStock': { vendor: string; entity: EntityRef }
  }
  interface CommandCalls {
    'shop/buy': { vendor: string; entity: EntityRef; count?: number }
    'shop/sell': { vendor: string; entity: EntityRef; count?: number }
  }
  interface PluginViews {
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

function emptyState(): ShopState {
  return { stocked: {} }
}

/**
 * The entity a vendor is, which holds its stock: `vendorRef('counter')` is
 * `'vendor:counter'`. A reference is as written, for a vendor of another kind.
 */
export function vendorRef(vendor: string): EntityRef {
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
 * Every vendor in the game, as references: every entity with the
 * `shop/vendor` trait. Given only the game, the vendors content declares,
 * in its order; given a state too, every vendor in the game now, those made
 * in play included.
 */
export function vendorsOf(game: Game, state?: GameState): EntityRef[] {
  return withTrait(game, VENDOR, state)
}

/**
 * The `shop/vendor` trait of a vendor, named by its id (`'counter'`) or its
 * reference, with any good that names no thing left out. Without a state,
 * only the vendors content declares; with one, a vendor made in play too.
 * Undefined for anything else.
 */
export function vendorOf(game: Game, id: string | null | undefined, state?: GameState): Vendor | undefined {
  if (id === null || id === undefined || id === '') return undefined
  const ref = vendorRef(id)
  let data: Vendor | undefined
  if (state) data = entityOf(state, game, ref) ? entityTrait(state, game, ref, VENDOR) : undefined
  else data = withTrait(game, VENDOR).includes(ref) ? traitOf(game, ref, VENDOR) : undefined
  return data ? usable(data) : undefined
}

/** One vendor as the plugin reads it: its id (the bare id for one of the `vendor` kind, else its reference), its entity and its trait. */
type One = { id: string; ref: EntityRef; vendor: Vendor }

type Ctx = Pick<PluginContext<ShopState>, 'game' | 'query'>

/** The vendor a call names by its `vendor`, or a reference: undefined for anything that isn't one. */
function oneOf(state: GameState | undefined, game: Game, id: unknown): One | undefined {
  if (typeof id !== 'string' || id === '') return undefined
  const ref = vendorRef(id)
  const vendor = vendorOf(game, ref, state)
  return vendor ? { id: short(ref), ref, vendor } : undefined
}

/** Every vendor in the game now, or, with no state, every one content declares. */
function everyVendor(state: GameState | undefined, game: Game): One[] {
  return vendorsOf(game, state).flatMap((ref) => oneOf(state, game, ref) ?? [])
}

/** The good, if the vendor offers it right now. */
function goodOf(state: GameState, game: Game, one: One, entity: unknown): GoodDef | undefined {
  const good = one.vendor.goods.find((entry) => entry.entity === String(entity ?? ''))
  return good && (!good.when || holds(state, good.when, game)) ? good : undefined
}

/** The day: the calendar's, or the turn without one. */
function dayOf(state: GameState, { query }: Pick<Ctx, 'query'>): number {
  return query<{ day: number }>('calendar/now')?.day ?? state.turn
}

/** What the stock is topped up against: the turn or the day it restocks on, or 0 for once only. */
function restockKey(state: GameState, good: GoodDef, cx: Pick<Ctx, 'query'>): number {
  if (good.restock === 'turn') return state.turn
  if (good.restock === 'day') return dayOf(state, cx)
  return 0
}

/** Whether the vendor holds this good's stock: it has a `stock`, or it is a unique thing. */
function limited(game: Game, good: GoodDef): boolean {
  return good.stock !== undefined || isUnique(game, good.entity)
}

function sliceOf(state: GameState): ShopState {
  return (state.plugins?.[ID]?.state as ShopState | undefined) ?? emptyState()
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
  const day = dayOf(state, cx)
  const draw = (entity: string) => hash(`shop:discount:${state.seed}:${one.id}:${day}:${entity}`)
  const order = [...one.vendor.goods].sort((a, b) => draw(a.entity) - draw(b.entity) || (a.entity < b.entity ? -1 : 1))
  const marked = order.slice(0, Math.max(0, discounts.count ?? 1))
  return marked.some((entry) => entry.entity === good.entity) ? Math.min(1, discounts.off) : 0
}

/** What a thing is worth, by stat, when nobody says otherwise: its `shop/sellable` trait's price. */
export function sellableOf(state: GameState, game: Game, ref: EntityRef): Sellable | undefined {
  return entityTrait(state, game, ref, SELLABLE)
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

function priceView(game: Game, price: Record<string, number>): Price | null {
  const stats = Object.entries(price)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount, text: formatStat(statDef(game, id), amount) }))
  return stats.length ? { stats } : null
}

/** Is the player where the vendor is? Always, without the places plugin or a vendor with no `at`. */
function isHere(one: One, cx: Ctx): boolean {
  if (!one.vendor.at) return true
  const here = cx.query<string | null>('places/here')
  return here === undefined || (here !== null && one.vendor.at.includes(here))
}

/** Why the vendor is closed, or undefined if it's open. */
function closedReason(state: GameState, one: One, cx: Ctx): string | undefined {
  const { vendor } = one
  const reason = () => vendor.closed ?? stringOf(cx.game, 'shop/closed')
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
  const one = oneOf(state, game, args.vendor)
  const good = one && goodOf(state, game, one, args.entity)
  if (!one || !good || !entityOf(state, game, good.entity)) return stringOf(game, 'shop/unknown')
  if (!isHere(one, cx)) return stringOf(game, 'shop/notHere')
  const closed = closedReason(state, one, cx)
  if (closed) return closed
  const count = countOf(args)
  const left = stockLeft(state, slice, one, good, cx)
  if (left !== null && left < count) return stringOf(game, 'shop/soldOut')
  for (const [stat, amount] of Object.entries(times(priceToday(state, one, good, cx), count))) {
    if (amount > 0 && statValue(state, game, stat) < amount) return lackingLine(statDef(game, stat), stat, amount, game)
  }
  return undefined
}

/** Why the player can't sell these back now, or undefined. */
function cantSell(state: GameState, args: PluginArgs, cx: Ctx): string | undefined {
  const { game } = cx
  const one = oneOf(state, game, args.vendor)
  const good = one && goodOf(state, game, one, args.entity)
  if (!one || !good) return stringOf(game, 'shop/unknown')
  if (one.vendor.buysBack === undefined) return stringOf(game, 'shop/noBuyBack')
  if (!isHere(one, cx)) return stringOf(game, 'shop/notHere')
  const closed = closedReason(state, one, cx)
  if (closed) return closed
  if (heldCount(state, game, good.entity, YOU) < countOf(args)) return stringOf(game, 'shop/notOwned')
  return undefined
}

/** The vendor's stock of a good written as it reads now, so a restock that was due is held. */
function topUp(state: GameState, slice: ShopState, one: One, good: GoodDef, cx: Ctx): Effect[] {
  const left = stockLeft(state, slice, one, good, cx)
  return left === null ? [] : [{ entity: good.entity, at: one.ref, to: left }]
}

function buyEffects(state: GameState, args: PluginArgs, slice: ShopState, cx: Ctx): Effect[] {
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

function sellEffects(state: GameState, args: PluginArgs, slice: ShopState, cx: Ctx): Effect[] {
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
  const slice = sliceOf(state)
  const record: StockRecord = { at: restockKey(state, good, context) }
  return context.set({ stocked: { ...slice.stocked, [one.id]: { ...slice.stocked[one.id], [good.entity]: record } } }, state)
}

/** Every vendor's stock written as it reads now: a restock that came due, or a count an older save carried in. */
function settleStock(state: GameState, context: PluginContext<ShopState>): GameState {
  let next = state
  for (const one of everyVendor(state, context.game)) {
    for (const good of one.vendor.goods) {
      if (!limited(context.game, good) || !entityOf(next, context.game, good.entity)) continue
      const slice = sliceOf(next)
      const record = slice.stocked[one.id]?.[good.entity]
      if (record && record.at === restockKey(next, good, context) && record.left === undefined) continue
      next = recordStocked(context.apply(topUp(next, slice, one, good, context), next), one, good, context)
    }
  }
  return next
}

/** Everything the UI needs to draw the vendors and their goods. */
export function shopView(state: GameState, slice: ShopState, cx: Ctx): ShopView {
  const { game } = cx
  const vendors = everyVendor(state, game).map((one): VendorView => {
    const closed = closedReason(state, one, cx) ?? null
    const sellable = one.vendor.buysBack !== undefined
    const goods = one.vendor.goods
      .filter((good) => (!good.when || holds(state, good.when, game)) && entityOf(state, game, good.entity))
      .map((good): GoodView => {
        const off = offToday(state, one, good, cx)
        const name = entityName(state, game, good.entity)
        const image = entityImage(state, game, good.entity)
        return {
          entity: good.entity,
          name,
          desc: entityDesc(state, game, good.entity) ?? null,
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
    return { id: one.id, ref: one.ref, name: entityName(state, game, one.ref), here: isHere(one, cx), closed, buysBack: sellable, goods }
  })
  return { vendors }
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
    if (good.price === undefined && !traitOf(game, good.entity, SELLABLE))
      problems.push(`${where}: no price: give the good a price, or the thing a ${SELLABLE} trait`)
    for (const [stat, amount] of Object.entries(good.price ?? {})) {
      const def = statDef(game, stat)
      if (def && !def.spendable) problems.push(`${where}: price in stat "${stat}", which is not spendable`)
      if (def?.derive !== undefined) problems.push(`${where}: price in stat "${stat}", which is derived and never written`)
      if (!(amount >= 0)) problems.push(`${where}: price must be 0 or more`)
    }
  }
  return problems
}

const vendorTrait: TraitDef<'shop/vendor'> = {
  id: VENDOR,
  check: (data, { game }) => vendorProblems(data, game),
  references: (vendor, { game }) => {
    // Where a vendor stands is the places plugin's to know, by name; without it there is no map to check against.
    const places = game.plugins?.some((plugin) => plugin.id === 'places')
    return [
      ...(places
        ? (vendor?.at ?? []).map((location): Reference => ({ entity: location.includes(':') ? location : `location:${location}`, carrying: 'places/location' }))
        : []),
      { within: 'open', refs: [{ when: vendor?.open }] },
      ...(Array.isArray(vendor?.goods) ? vendor.goods : [])
        .filter((good) => typeof good?.entity === 'string')
        .map((good): Reference => ({
          within: `good ${good.entity}`,
          refs: [{ entity: good.entity }, ...Object.keys(good.price ?? {}).map((stat) => ({ stat })), { when: good.when }],
        })),
    ]
  },
}

/** A reference to one of the game's vendors, which must carry the trait. */
const vendorEntry = (id: string): Reference => ({ entity: vendorRef(id), carrying: VENDOR })

/**
 * The plugin. Add it to the game's `plugins`, and write vendors in the
 * content's `entities` with `vendor({ ... })`.
 */
export function shop(): DefinedPlugin<ShopState, ShopView> {
  return definePlugin<ShopState, ShopView>({
    id: ID,
    version: 2,
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
      notHere: 'You aren’t at that shop.',
      closed: 'Closed.',
      soldOut: 'Sold out.',
      noBuyBack: 'They don’t buy things back.',
      notOwned: 'You don’t have that.',
    },
    conditions: {
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
      calls: (_kind, _name, args) => [
        ...(args.vendor === undefined ? [] : [vendorEntry(String(args.vendor))]),
        ...(args.entity === undefined ? [] : [{ entity: String(args.entity) }]),
      ],
    },
    // The `shop` panel draws one vendor's counter, so it needs a vendor the game has.
    panelProblems: (panel, args, _game, tools) => {
      if (panel !== PANEL) return []
      if (typeof args.vendor !== 'string') return ['the shop panel needs a vendor: { vendor: "<id>" }']
      return tools.problems([vendorEntry(args.vendor)])
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      // Vendors were a list in the plugin's content; now each is an entity with the vendor trait.
      for (const entry of (game.data?.[ID] as { vendors?: { id?: string }[] } | undefined)?.vendors ?? []) {
        problems.push({
          list: 'vendors',
          id: String(entry?.id ?? ''),
          what: 'vendors are entities now: write them in entities with vendor({ id, name, goods, ... })',
        })
      }
      return problems
    },
  })
}

const VENDOR_FIELDS = ['at', 'hours', 'open', 'closed', 'goods', 'buysBack', 'discounts'] as const

/**
 * A vendor, for content's `entities`: an entity of the kind `vendor` (or
 * `of`) carrying the `shop/vendor` trait, with the entity's fields and the
 * trait's written side by side.
 *
 * ```ts
 * entities: [vendor({ id: 'counter', name: 'The counter', at: ['cafe'], goods: [{ entity: 'food:bun', price: { coins: 2 } }] })]
 * ```
 */
export function vendor(def: VendorDef): EntityDef {
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
export const sellable = (price: Record<string, number>): { 'shop/sellable': Sellable } => ({ [SELLABLE]: { price } })

/** A command: buy `count` (1 if left out) of a thing from a vendor. */
export const buy = (vendor: string, entity: EntityRef, count?: number): CommandRef => ({
  'shop/buy': count === undefined ? { vendor, entity } : { vendor, entity, count },
})
/** A command: sell `count` (1 if left out) of a thing back to a vendor. */
export const sell = (vendor: string, entity: EntityRef, count?: number): CommandRef => ({
  'shop/sell': count === undefined ? { vendor, entity } : { vendor, entity, count },
})
/**
 * An effect: open the vendor's counter in the `shop` panel, from a place's
 * action, a person's, a thing's use, an app or a choice. The UI draws it;
 * `shopUi` from `@ifloom/plugin-shop/react` draws it as a `ShopCounter`.
 */
export const openShop = (vendor: string): Effect => ({ panel: PANEL, with: { vendor } })
/** A condition: the vendor is open now. */
export const vendorOpen = (vendor: string): Condition => ({ 'shop/open': { vendor } })
/** A condition: the vendor offers the thing now and has one left. */
export const inStock = (vendor: string, entity: EntityRef): Condition => ({ 'shop/inStock': { vendor, entity } })
