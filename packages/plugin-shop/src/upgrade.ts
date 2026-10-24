/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from.
 */
import type { CommandStep, ContentStep, RawPack } from '@ifloom/engine'

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

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 13

export const contentMigrations: Record<number, ContentStep> = {
  // 12 → 13: items leave the engine; what a vendor sells is an entity, and the shop's calls name it.
  12: (pack, tools) => tools.calls(goodsToThings(pack), (call) => (ITEM_CALLS.has(call.name) ? { name: call.name, with: itemArgs(call.with) } : call)),
}

/** The version of this plugin's commands. */
export const COMMAND_VERSION = 13

export const commandMigrations: Record<number, CommandStep> = {
  // 12 → 13: what was an item's id names the entity it became.
  12: (command) =>
    command.type === 'custom' && typeof command.name === 'string' && ITEM_CALLS.has(command.name) ? { ...command, with: itemArgs(command.with) } : command,
}
