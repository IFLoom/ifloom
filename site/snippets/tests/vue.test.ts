// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, nextTick, type Component } from 'vue'
import { runner } from '../vue/runner.ts'
import Inputs from '../vue/Inputs.vue'
import ShopCounter from '../vue/ShopCounter.vue'
import Timers from '../vue/Timers.vue'
import { atTheCounter, phoneRinging } from './play.ts'

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
  it('Inputs: names the cat, and shows why a name is refused', async () => {
    await runner.newGame()
    const box = mounted(Inputs)
    const field = box.querySelector('input')!
    field.value = 'A very long name for a small cat'
    field.dispatchEvent(new Event('input'))
    box.querySelector('form')!.requestSubmit()
    await nextTick()
    expect(box.querySelector('.reason')?.textContent).toBeTruthy()
    field.value = 'Biscuit'
    field.dispatchEvent(new Event('input'))
    box.querySelector('form')!.requestSubmit()
    expect(runner.state.kv.catName).toBe('Biscuit')
  })

  it('Timers: a countdown for the ringing phone, gone once it is answered', async () => {
    await runner.newGame()
    phoneRinging(runner)
    const box = mounted(Timers)
    expect(box.querySelector('[data-timer="flat.ring"]')).toBeTruthy()
    runner.apply({ type: 'choose', id: 'answer' })
    await nextTick()
    expect(box.querySelector('[data-timer="flat.ring"]')).toBeNull()
  })

  it('ShopCounter: draws the counter the shop panel names, and its buy buttons buy', async () => {
    await runner.newGame()
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
