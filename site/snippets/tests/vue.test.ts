// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startUnlocks } from '@ifloom/plugin-unlocks'
import Backlog from '../vue/Backlog.vue'
import Saves from '../vue/Saves.vue'
import Unlocks from '../vue/Unlocks.vue'
import { createApp, nextTick, type Component } from 'vue'
import { runner } from '../vue/runner.ts'
import Inputs from '../vue/Inputs.vue'
import JobBoard from '../vue/JobBoard.vue'
import ShopCounter from '../vue/ShopCounter.vue'
import Timers from '../vue/Timers.vue'
import { atTheCounter, atTheJobBoard, phoneRinging, unpacked } from './play.ts'

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

  it('JobBoard: the jobs the board was opened with, each with its ready-made buttons', async () => {
    await runner.newGame()
    atTheJobBoard(runner)
    const box = mounted(JobBoard)
    expect([...box.querySelectorAll('h3')].map((heading) => heading.textContent)).toContain('Weekend help')
    expect(box.querySelector('button')?.textContent?.trim()).toBeTruthy()
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

  it('Backlog and Saves: follow the snapshot, so a command, a save and a delete show at once', async () => {
    await runner.newGame()
    const backlog = mounted(Backlog)
    expect((backlog.querySelector('button') as HTMLButtonElement).disabled).toBe(true)
    unpacked(runner)
    await nextTick()
    expect((backlog.querySelector('button') as HTMLButtonElement).disabled).toBe(false)
    expect(backlog.querySelectorAll('li').length).toBe(runner.snapshot().backlog.length)
    unmount()
    const saves = mounted(Saves)
    const before = saves.querySelectorAll('.slots li').length
    buttons(saves)
      .find((button) => button.textContent === 'Save')!
      .click()
    await runner.settled()
    await nextTick()
    expect(saves.querySelectorAll('.slots li').length).toBe(before + 1)
    buttons(saves)
      .find((button) => button.textContent === 'Delete')!
      .click()
    await vi.waitFor(() => expect(saves.querySelectorAll('.slots li').length).toBe(before))
  })

  it('Unlocks: a wrong code says why, from the snapshot', async () => {
    await runner.newGame()
    const stop = startUnlocks(runner)
    const box = mounted(Unlocks)
    await nextTick()
    const field = box.querySelector('input')!
    field.value = 'NOT-A-CODE'
    field.dispatchEvent(new Event('input'))
    box.querySelector('form')!.requestSubmit()
    await vi.waitFor(() => expect(box.querySelector('.reason')?.textContent).toBe('That code doesn’t unlock anything.'))
    stop()
  })
})
