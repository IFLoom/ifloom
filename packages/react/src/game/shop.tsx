import type { GameState, Result } from '@ifloom/engine'
import type { ShopView, VendorView } from '@ifloom/plugin-shop'
import { badgeVariants } from '../components/ui/badge.tsx'
import { ChoiceButton, usePriceText } from './choices.tsx'
import { useGame } from './context.tsx'
import { PartDialog } from './dialog.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** What `useShop` returns: the shop plugin's view, the vendors where the player is, and its commands. */
export type ShopControls = ShopView & {
  /** The vendors at the player's location (every vendor, in a game without places): what a layout of your own can show where the player is. */
  here: VendorView[]
  /** Buy `count` (1 if left out) of an item: sends `shop/buy`, refused with its reason as the buy button says. */
  buy: (vendor: string, item: string, count?: number) => Result<GameState>
  /** Sell `count` (1 if left out) of an item back: sends `shop/sell`. */
  sell: (vendor: string, item: string, count?: number) => Result<GameState>
}

/** The shop plugin's view with its commands, or null in a game without the plugin. `ShopDialog`, `ShopCounter` and the `shop` panel are drawn from it. */
export function useShop(): ShopControls | null {
  const { view, send } = useGame()
  const shop = view.plugins.shop as ShopView | undefined
  if (!shop) return null
  const args = (vendor: string, item: string, count?: number) => (count === undefined ? { vendor, item } : { vendor, item, count })
  return {
    ...shop,
    here: shop.vendors.filter((vendor) => vendor.here),
    buy: (vendor, item, count) => send({ type: 'custom', name: 'shop/buy', with: args(vendor, item, count) }),
    sell: (vendor, item, count) => send({ type: 'custom', name: 'shop/sell', with: args(vendor, item, count) }),
  }
}

function ShopCounterImpl({ vendor, className }: { vendor: VendorView; className?: string }) {
  const words = useWords()
  const priceText = usePriceText()
  const box = usePart('shop', 'flex flex-col gap-3', className)
  const closed = usePart('shop-closed', 'text-sm text-muted-foreground')
  const empty = usePart('shop-empty', 'text-sm text-muted-foreground')
  const list = usePart('goods', 'flex flex-col gap-2')
  const row = usePart('good', 'flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start')
  const name = usePart('good-name', 'font-medium')
  const details = usePart('good-details', 'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground')
  const stock = usePart('good-stock', '')
  const owned = usePart('good-owned', '')
  const off = usePart('good-off', badgeVariants())
  const full = usePart('good-full-price', 'line-through')
  const actions = usePart('good-actions', 'flex flex-col gap-1.5 sm:w-44 sm:shrink-0')
  return (
    <div {...box} data-vendor={vendor.id} data-closed={vendor.closed ? '' : undefined}>
      {vendor.closed ? <p {...closed}>{vendor.closed}</p> : null}
      {vendor.goods.length ? (
        <ul {...list}>
          {vendor.goods.map((good) => (
            <li key={good.item} {...row} data-good={good.item}>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p {...name}>{good.name}</p>
                <p {...details}>
                  {good.off > 0 ? <span {...off}>{words('percentOff', { percent: Math.round(good.off * 100) })}</span> : null}
                  {good.fullPrice ? <s {...full}>{priceText(good.fullPrice)}</s> : null}
                  {good.stock !== null ? <span {...stock}>{words('stockLeft', { n: good.stock })}</span> : null}
                  {good.owned > 0 ? <span {...owned}>{words('owned', { n: good.owned })}</span> : null}
                </p>
              </div>
              <div {...actions}>
                <ChoiceButton choice={{ ...good.buy, label: words('buy') }} />
                {good.sell && good.owned > 0 ? <ChoiceButton choice={{ ...good.sell, label: words('sellFor', { price: priceText(good.sellFor) }) }} /> : null}
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
 * A vendor's goods: each with its name, today's discount and the full price
 * struck out, how many are left and how many the player has, a Buy button
 * with today's price, and a Sell button with what it pays when the vendor
 * buys back and the player has one. A greyed-out button says why on it. A
 * closed vendor says so above its goods.
 */
export const ShopCounter = overridable('ShopCounter', ShopCounterImpl)

function ShopDialogImpl({ vendorId, onClose }: { vendorId: string | null; onClose: () => void }) {
  const vendor = useShop()?.vendors.find((entry) => entry.id === vendorId)
  return (
    <PartDialog open={Boolean(vendor)} onClose={onClose} title={vendor?.name ?? ''}>
      {vendor ? <ShopCounter vendor={vendor} /> : null}
    </PartDialog>
  )
}

/** The vendor with this id in a dialog, titled with its name and drawn as a `ShopCounter`. Closed while `vendorId` is null or names no vendor. */
export const ShopDialog = overridable('ShopDialog', ShopDialogImpl)
