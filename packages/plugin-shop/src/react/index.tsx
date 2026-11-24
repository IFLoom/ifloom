/**
 * @ifloom/plugin-shop/react: the shop's React UI, for a game drawn with
 * `@ifloom/react`. List `shopUi` in the game's `plugins` to have the `shop`
 * panel drawn as a vendor's counter, or draw it yourself from `useShop`.
 */
import type { EntityRef, GameState, Result } from '@ifloom/engine'
import { ChoiceButton, usePart } from '@ifloom/react'
import { overridable, type Override, PartDialog, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'
import { shop, type ShopView, type VendorView } from '../index.ts'

/** The shop's words, in English. A game rewords any with `ui.<key>` in its strings: `{ 'ui.buy': 'Get' }`. */
export const SHOP_WORDS = {
  buy: 'Buy',
  sellFor: 'Sell for {price}',
  stockLeft: '{n} left',
  owned: 'You have {n}',
  percentOff: '{percent}% off',
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

/** What `useShop` returns: the shop plugin's view, the vendors where the player is, and its commands. */
export type ShopControls = ShopView & {
  /** The vendors at the player's location (every vendor, in a game without places): what a layout of your own can show where the player is. */
  here: VendorView[]
  /** Buy `count` (1 if left out) of a thing, by its reference: sends `shop/buy`, refused with its reason as the buy button says. */
  buy: (vendor: string, entity: EntityRef, count?: number) => Result<GameState>
  /** Sell `count` (1 if left out) of a thing back: sends `shop/sell`. */
  sell: (vendor: string, entity: EntityRef, count?: number) => Result<GameState>
}

/** The shop plugin's view with its commands, or null in a game without the plugin. `ShopDialog`, `ShopCounter` and the `shop` panel are drawn from it. */
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

export type ShopCounterProps = { vendor: VendorView; className?: string }

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
 * A vendor's goods: each with its picture and name and a line about it,
 * today's discount and the full price struck out, how many are left (when
 * they can run out) and how many the player has, a Buy button
 * with today's price, and a Sell button with what it pays when the vendor
 * buys back and the player has one. A greyed-out button says why on it. A
 * closed vendor says so above its goods.
 */
export const ShopCounter = overridable('ShopCounter', ShopCounterImpl)

export type ShopDialogProps = { vendorId: string | null; onClose: () => void }

function ShopDialogImpl({ vendorId, onClose }: ShopDialogProps) {
  const vendor = useShop()?.vendors.find((entry) => entry.id === vendorId)
  return (
    <PartDialog open={Boolean(vendor)} onClose={onClose} title={vendor?.name ?? ''}>
      {vendor ? <ShopCounter vendor={vendor} /> : null}
    </PartDialog>
  )
}

/** The vendor with this id in a dialog, titled with its name and drawn as a `ShopCounter`. Closed while `vendorId` is null or names no vendor. */
export const ShopDialog = overridable('ShopDialog', ShopDialogImpl)

/** The `shop` panel: the vendor whose counter it shows, the view's `panel`. */
function ShopPanel() {
  const vendor = usePlugin(SHOP).view?.panel
  return vendor ? <ShopCounter vendor={vendor} /> : null
}

/**
 * The shop's React UI, for `plugins` on `mountGame` or `GameProvider`: the
 * `shop` panel, which `shop.open(vendor)` opens, drawn as that vendor's
 * `ShopCounter` and titled with its name, and the shop's words. The shop puts
 * nothing in the layout by itself: content opens a vendor.
 */
export const shopUi: PluginUi = {
  ...SHOP,
  panels: {
    shop: { component: ShopPanel, title: (_data, view) => view.plugins.shop?.panel?.name ?? '' },
  },
}
