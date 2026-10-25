import type { View } from '@ifloom/engine'
// runner, add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The `shop` panel, from drawPanel: shop.open('counter') opens it with { vendor: 'counter' }. */
export function drawShop(parent: HTMLElement, view: View): void {
  if (view.panel?.panel !== 'shop') return
  const vendor = view.plugins.shop?.vendors.find((one) => one.id === view.panel?.with.vendor)
  if (!vendor) return
  add(parent, 'h2', vendor.name)
  if (vendor.closed) add(parent, 'p', vendor.closed, 'reason')
  for (const good of vendor.goods) {
    const row = add(parent, 'div', '', 'good')
    add(row, 'strong', good.name)
    const price = good.buy.price?.stats?.map((stat) => stat.text).join(', ')
    if (price) add(row, 'span', price, 'price')
    if (good.stock !== null) add(row, 'span', `${good.stock} left`, 'stock')
    // Ready-made buttons, with today's price and why one can't be pressed.
    drawChoices(row, good.sell ? [good.buy, good.sell] : [good.buy])
  }
}
