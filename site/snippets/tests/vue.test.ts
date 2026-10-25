// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, nextTick, type Component } from 'vue'
import { runner } from '../vue/runner.ts'
import ShopCounter from '../vue/ShopCounter.vue'
import { atTheCounter } from './play.ts'

let unmount = () => {}
afterEach(() => unmount())

/** Mounts a snippet's component, as the vue template's App.vue would place it. */
function mounted(component: Component, props: Record<string, unknown> = {}): HTMLElement {
  const box = document.body.appendChild(document.createElement('div'))
  const app = createApp(component, props)
  app.mount(box)
  unmount = () => {
    app.unmount()
    box.remove()
  }
  return box
}

const buttons = (box: HTMLElement) => [...box.querySelectorAll('button')]

describe('the Vue snippets', () => {
  it('ShopCounter: draws the counter the shop panel names, and its buy buttons buy', async () => {
    atTheCounter(runner)
    const box = mounted(ShopCounter)
    expect(box.querySelector('h2')?.textContent).toBe('The counter')
    expect(box.textContent).toContain('2 left')
    const coins = runner.state.stats.coins
    buttons(box)
      .find((button) => !button.disabled)!
      .click()
    await nextTick()
    expect(runner.state.stats.coins).toBeLessThan(coins)
    // Bought: a sell button for it now.
    expect(buttons(box).length).toBeGreaterThan(3)
  })
})
