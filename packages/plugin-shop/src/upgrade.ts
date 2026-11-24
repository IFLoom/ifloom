/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from.
 */
import { hash, type RawPack } from '@ifloom/engine'
import type { CommandStep, ContentStep } from '@ifloom/engine/plugin'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** An item's id as the entity it became at schema 13: `item:<id>`. An id that is already a reference is left as it is. */
const itemRef = (id: unknown): unknown => (typeof id === 'string' && !id.includes(':') ? `item:${id}` : id)

/** The calls that named an item at schema 12, by `item`; they name the `entity` now. */
const ITEM_CALLS = new Set(['shop/buy', 'shop/sell', 'shop/inStock'])

/** A call's arguments as schema 13 has them, naming the entity the item became. */
function itemArgs(args: unknown): unknown {
  if (!isRecord(args) || !('item' in args)) return args
  const { item, ...rest } = args
  return { ...rest, entity: itemRef(item) }
}

/** A vendor's goods as schema 13 has them: each names the entity the item became. */
function goodsToThings(pack: RawPack): RawPack {
  const data = pack.data
  if (!isRecord(data) || !isRecord(data.shop) || !Array.isArray(data.shop.vendors)) return pack
  const vendors = data.shop.vendors.map((vendor) =>
    isRecord(vendor) && Array.isArray(vendor.goods)
      ? {
          ...vendor,
          goods: vendor.goods.map((good) => {
            if (!isRecord(good) || !('item' in good) || 'entity' in good) return good
            const { item, ...other } = good
            return { entity: itemRef(item), ...other }
          }),
        }
      : vendor,
  )
  return { ...pack, data: { ...data, shop: { ...data.shop, vendors } } }
}

/**
 * A vendor in `data.shop.vendors` as an entity of the kind `vendor`
 * carrying the `shop/vendor` trait: its `id` and `name` are the entity's,
 * the rest (where, hours, goods and so on) is the trait. The vendors follow
 * the pack's own entities, and `data.shop` goes when nothing else is left in it.
 */
function vendorsToEntities(pack: RawPack): RawPack {
  const data = isRecord(pack.data) ? pack.data : undefined
  const shopData = data && isRecord(data.shop) ? data.shop : undefined
  if (!data || !shopData || !Array.isArray(shopData.vendors)) return pack
  const entities = shopData.vendors.filter(isRecord).map((vendor) => {
    const { id, name, ...trait } = vendor
    return { of: 'vendor', id, ...(name !== undefined ? { name } : {}), traits: { 'shop/vendor': trait } }
  })
  const { vendors: _moved, ...restShop } = shopData
  const { shop: _shop, ...restData } = data
  const nextData = Object.keys(restShop).length ? { ...restData, shop: restShop } : restData
  const { data: _data, ...rest } = pack
  return {
    ...rest,
    entities: [...(Array.isArray(pack.entities) ? pack.entities : []), ...entities],
    ...(Object.keys(nextData).length ? { data: nextData } : {}),
  } as RawPack
}

/**
 * A vendor's trait as schema 27 has it: its `hours`, `open` and `closed` are
 * `blocked` entries, closed outside its hours (`shop/outside`, as
 * `shop.hours()` writes it) and while `open` doesn't hold,
 * with `closed` (else the plugin's `shop/closed` string) as their reason.
 */
function gatingToBlocked(vendor: Record<string, unknown>): Record<string, unknown> {
  if (!('hours' in vendor) && !('open' in vendor) && !('closed' in vendor)) return vendor
  const { hours, open, closed, ...rest } = vendor
  const reason = typeof closed === 'string' ? closed : { string: 'shop/closed' }
  const blocked = [
    ...(Array.isArray(hours) ? [{ when: { 'shop/outside': { period: hours } }, reason }] : []),
    ...(open !== undefined ? [{ when: { not: open }, reason }] : []),
    ...(Array.isArray(rest.blocked) ? rest.blocked : []),
  ]
  return { ...rest, ...(blocked.length ? { blocked } : {}) }
}

/** How the words table names a blocked entry, which has no id: a short hash of its reason as written, as the engine names it. */
const entryKey = (text: string) => hash(text).toString(16).padStart(8, '0').slice(0, 6)

/** The schema of the content this plugin reads, numbered by the engine's schema. */
export const CONTENT_VERSION = 27

/** The steps that carry this plugin's content forward, each keyed by the schema it upgrades from. */
export const contentMigrations: Record<number, ContentStep> = {
  // 12 → 13: items leave the engine; what a vendor sells is an entity, and the shop's calls name it.
  12: (pack, tools) => tools.calls(goodsToThings(pack), (call) => (ITEM_CALLS.has(call.name) ? { name: call.name, with: itemArgs(call.with) } : call)),
  // 23 → 24: a vendor is an entity with the `shop/vendor` trait, its name the entity's.
  23: (pack) => vendorsToEntities(pack),
  // 26 → 27: a vendor's `hours`, `open` and `closed` are its `blocked` entries, wherever the trait is written,
  // and a translation's words for `closed` are its entries' reason.
  26: (pack, tools) =>
    tools.wordKeys(
      tools.objects(pack, (value) => {
        const vendor = value['shop/vendor']
        if (!isRecord(vendor)) return value
        // On an entity or a kind, the trait's data; in a `traits` table, its rows by reference.
        const rows = Object.keys(vendor).length > 0 && Object.keys(vendor).every((key) => key.includes(':'))
        const next = rows
          ? Object.fromEntries(Object.entries(vendor).map(([ref, row]) => [ref, isRecord(row) ? gatingToBlocked(row) : row]))
          : gatingToBlocked(vendor)
        return { ...value, 'shop/vendor': next }
      }),
      (key) => {
        // Named by its words as written, so only a pack that has the vendor can say what they were.
        const name = key.endsWith('.traits.shop/vendor.closed') ? closedKey(pack, key) : undefined
        return name ? `${key.slice(0, -'closed'.length)}blocked.${name}.reason` : key
      },
    ),
}

/** The written `closed` of the vendor a words key names, which its blocked entries are named by. */
function closedKey(pack: RawPack, key: string): string | undefined {
  const ref = key.slice('entity.'.length, -'.traits.shop/vendor.closed'.length)
  const entity = (Array.isArray(pack.entities) ? pack.entities : []).find((one) => isRecord(one) && `${String(one.of)}:${String(one.id)}` === ref) as
    | Record<string, unknown>
    | undefined
  const closed = isRecord(entity?.traits) && isRecord(entity.traits['shop/vendor']) ? entity.traits['shop/vendor'].closed : undefined
  return typeof closed === 'string' ? entryKey(closed) : undefined
}

/** The version of this plugin's commands, which command logs record. */
export const COMMAND_VERSION = 13

/** The steps that carry this plugin's logged commands forward, each keyed by the version it upgrades from. */
export const commandMigrations: Record<number, CommandStep> = {
  // 12 → 13: what was an item's id names the entity it became.
  12: (command) =>
    command.type === 'custom' && typeof command.name === 'string' && ITEM_CALLS.has(command.name) ? { ...command, with: itemArgs(command.with) } : command,
}
