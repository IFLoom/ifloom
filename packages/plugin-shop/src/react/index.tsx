/**
 * The shop plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `shopUi` in the game's `plugins` to render the `shop` panel as a vendor's counter. To render it yourself, read
 * `useShop`.
 */
import type { EntityRef, GameState, Result } from '@ifloom/engine'
import { ChoiceButton, usePart } from '@ifloom/react'
import { overridable, type Override, PartDialog, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'
import { shop, type ShopView, type VendorView } from '../index.ts'

/** The shop plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings, such as `{ 'ui.buy': 'Get' }`. */
export const SHOP_WORDS = {
  /** The label of a good's buy button. */
  buy: 'Buy',
  /** The label of a good's sell button, with its `{price}`. */
  sellFor: 'Sell for {price}',
  /** The count of a good the vendor has left, with `{n}`. */
  stockLeft: '{n} left',
  /** The count of a good the player holds, with `{n}`. */
  owned: 'You have {n}',
  /** The badge on a good with today's discount, with its `{percent}`. */
  percentOff: '{percent}% off',
  /** The line a vendor's counter shows while it has no goods. */
  noGoods: 'Nothing for sale.',
} as const

/** The shop's UI, declared once: its id and its words, for `usePlugin` and `shopUi`. */
const SHOP = pluginKit('shop', SHOP_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    ShopCounter: Override<ShopCounterProps>
    ShopDialog: Override<ShopDialogProps>
  }
  interface PartNames {
    'shop': true
    'shop-closed': true
    'shop-empty': true
    'goods': true
    'good': true
    'good-name': true
    'good-desc': true
    'good-image': true
    'good-details': true
    'good-off': true
    'good-full-price': true
    'good-stock': true
    'good-owned': true
    'good-actions': true
  }
}

/** The shop plugin's view with the vendors here and functions that send its commands, as `useShop` returns it. */
export type ShopControls = ShopView & {
  /** The vendors whose `here` is true, for a layout of your own to show. */
  here: VendorView[]
  /** Sends `shop/buy` for `count` of a thing, 1 if left out. A refusal carries the same reason the buy button shows. */
  buy: (vendor: string, entity: EntityRef, count?: number) => Result<GameState>
  /** Sends `shop/sell` for `count` of a thing, 1 if left out. */
  sell: (vendor: string, entity: EntityRef, count?: number) => Result<GameState>
}

/** Returns the shop plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes. */
export function useShop(): ShopControls | null {
  const { view, send } = usePlugin(SHOP)
  if (!view) return null
  return {
    ...view,
    here: view.vendors.filter((vendor) => vendor.here),
    buy: (vendor, entity, count) => send(shop.buy(vendor, entity, count)),
    sell: (vendor, entity, count) => send(shop.sell(vendor, entity, count)),
  }
}

/** Props for `ShopCounter`. */
export type ShopCounterProps = {
  /** The vendor to render, from `view.plugins.shop`. */
  vendor: VendorView
  /** The class added to the counter's root. */
  className?: string
}

function ShopCounterImpl({ vendor, className }: ShopCounterProps) {
  const { words } = usePlugin(SHOP)
  const box = usePart('shop', 'flex flex-col gap-3', className)
  const closed = usePart('shop-closed', 'text-sm text-muted-foreground')
  const empty = usePart('shop-empty', 'text-sm text-muted-foreground')
  const list = usePart('goods', 'flex flex-col gap-2')
  const row = useKitPart('card', 'good', 'sm:flex-row sm:items-start')
  const name = useKitPart('title', 'good-name')
  const description = useKitPart('note', 'good-desc')
  const image = useKitPart('thumb', 'good-image')
  const details = usePart('good-details', 'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground')
  const stock = usePart('good-stock', '')
  const owned = usePart('good-owned', '')
  const off = useKitPart('badge', 'good-off')
  const full = usePart('good-full-price', '')
  const actions = useKitPart('commands', 'good-actions', 'sm:w-44 sm:shrink-0')
  return (
    <div {...box} data-vendor={vendor.id} data-closed={vendor.closed ? '' : undefined}>
      {vendor.closed ? <p {...closed}>{vendor.closed}</p> : null}
      {vendor.goods.length ? (
        <ul {...list}>
          {vendor.goods.map((good) => (
            <li key={good.entity} {...row} data-good={good.entity}>
              {good.image ? <img {...image} src={good.image} alt="" /> : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p {...name}>{good.name}</p>
                {good.description ? <p {...description}>{good.description}</p> : null}
                <p {...details}>
                  {good.off > 0 ? <span {...off}>{words('percentOff', { percent: Math.round(good.off * 100) })}</span> : null}
                  {good.fullPrice ? <s {...full}>{good.fullPrice.text}</s> : null}
                  {good.stock !== null ? <span {...stock}>{words('stockLeft', { n: good.stock })}</span> : null}
                  {good.owned > 0 ? <span {...owned}>{words('owned', { n: good.owned })}</span> : null}
                </p>
              </div>
              <div {...actions}>
                <ChoiceButton choice={{ ...good.buy, label: words('buy') }} />
                {good.sell && good.owned > 0 ? <ChoiceButton choice={{ ...good.sell, label: words('sellFor', { price: good.sellFor?.text ?? '' }) }} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p {...empty}>{words('noGoods')}</p>
      )}
    </div>
  )
}

/**
 * Renders a vendor's goods from a {@link VendorView}, each with its picture, name, price, stock and a buy button. A
 * sell button shows when the vendor buys back and the player holds one.
 *
 * Each good also shows its description, today's discount and how many the player holds.
 * A disabled button shows its reason, and a closed vendor shows its reason above its goods. A preset can style the
 * parts `shop`, `shop-closed`, `shop-empty`, `goods`, `good`, `good-name`, `good-desc`, `good-image`, `good-details`,
 * `good-off`, `good-full-price`, `good-stock`, `good-owned` and `good-actions`.
 */
export const ShopCounter = overridable('ShopCounter', ShopCounterImpl)

/** Props for `ShopDialog`. */
export type ShopDialogProps = {
  /** The id of the vendor to show, or null to keep the dialog closed. */
  vendorId: string | null
  /** The function the dialog calls when the player closes it. */
  onClose: () => void
}

function ShopDialogImpl({ vendorId, onClose }: ShopDialogProps) {
  const vendor = useShop()?.vendors.find((entry) => entry.id === vendorId)
  return (
    <PartDialog open={Boolean(vendor)} onClose={onClose} title={vendor?.name ?? ''}>
      {vendor ? <ShopCounter vendor={vendor} /> : null}
    </PartDialog>
  )
}

/**
 * Renders the vendor with this id from `view.plugins.shop.vendors` as a `ShopCounter` in a dialog titled with its name.
 * The dialog is closed while `vendorId` is null or names no vendor.
 */
export const ShopDialog = overridable('ShopDialog', ShopDialogImpl)

/** The `shop` panel: the vendor whose counter it shows, the view's `panel`. */
function ShopPanel() {
  const vendor = usePlugin(SHOP).view?.panel
  return vendor ? <ShopCounter vendor={vendor} /> : null
}

/**
 * The shop plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `shop` panel, which
 * `shop.open(vendor)` opens, as that vendor's `ShopCounter` titled with its name, and adds the plugin's words.
 *
 * It adds nothing to the layout, so a counter shows only when content opens one.
 */
export const shopUi: PluginUi = {
  ...SHOP,
  panels: {
    shop: { component: ShopPanel, title: (_data, view) => view.plugins.shop?.panel?.name ?? '' },
  },
}
