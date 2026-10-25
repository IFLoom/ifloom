// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { runner } from '../plain/runner.ts'
import { drawShop } from '../plain/shop.ts'
import { atTheCounter } from './play.ts'

/** The Plain JS snippets, drawn into a box and pressed, as the vanilla template would. */
function drawn(draw: (box: HTMLElement) => void): HTMLElement {
  const box = document.createElement('div')
  draw(box)
  return box
}

const buttons = (box: HTMLElement) => [...box.querySelectorAll('button')]

describe('the Plain JS snippets', () => {
  it('shop: draws the counter the shop panel names, and its buy buttons buy', () => {
    atTheCounter(runner)
    const view = runner.view()
    expect(view.panel?.panel).toBe('shop')
    const box = drawn((into) => drawShop(into, view))
    expect(box.querySelector('h2')?.textContent).toBe('The counter')
    expect(box.textContent).toContain('2 left')
    const buy = buttons(box).find((button) => !button.disabled)!
    expect(buy).toBeTruthy()
    const coins = runner.state.stats.coins
    buy.click()
    expect(runner.state.stats.coins).toBeLessThan(coins)
  })
})
