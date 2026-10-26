// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { startUnlocks } from '@ifloom/plugin-unlocks'
import { drawBacklog } from '../plain/backlog.ts'
import { drawSaves } from '../plain/saves.ts'
import { drawUnlocks } from '../plain/unlocks.ts'
import { runner } from '../plain/runner.ts'
import { drawInputs } from '../plain/inputs.ts'
import { drawNotices } from '../plain/notices.ts'
import { drawPlace } from '../plain/places.ts'
import { drawProse } from '../plain/prose.ts'
import { drawRolls } from '../plain/rolls.ts'
import { drawShop } from '../plain/shop.ts'
import { drawTimers } from '../plain/timers.ts'
import { atTheCounter, inTheCafe, inThePark, phoneRinging, steppedOut, unpacked } from './play.ts'

/** The Plain JS snippets, drawn into a box and pressed, as the vanilla template would. */
function drawn(draw: (box: HTMLElement) => void): HTMLElement {
  const box = document.createElement('div')
  draw(box)
  return box
}

const buttons = (box: HTMLElement) => [...box.querySelectorAll('button')]

describe('the Plain JS snippets', () => {
  it('inputs and notices: names the cat on moving day, and dismisses the note under the door', async () => {
    await runner.newGame()
    const box = drawn((into) => drawInputs(into, runner.snapshot()))
    box.querySelector('input')!.value = 'Biscuit'
    box.querySelector('form')!.requestSubmit()
    expect(runner.state.kv.catName).toBe('Biscuit')
    // A name too long is refused, with why under the field.
    box.querySelector('input')!.value = 'A very long name for a small cat'
    box.querySelector('form')!.requestSubmit()
    expect(box.querySelector('.reason')?.textContent).toBeTruthy()
    expect(runner.state.kv.catName).toBe('Biscuit')
  })

  it('prose and rolls: the stones line has its inline action, and the skim it presses is rolled', async () => {
    await runner.newGame()
    inThePark(runner)
    const prose = drawn((into) => drawProse(into, runner.snapshot()))
    prose.querySelector<HTMLButtonElement>('button.inline-action')!.click()
    const rolls = drawn((into) => drawRolls(into, runner.snapshot()))
    expect(rolls.querySelector('[data-roll="skim"]')?.textContent).toMatch(/^2d6: \d \+ \d = \d+ \((passed|failed)\)$/)
  })

  it('places: the café with its ways out, which take you there', async () => {
    await runner.newGame()
    inTheCafe(runner)
    const box = drawn((into) => drawPlace(into, runner.snapshot()))
    expect(box.querySelector('h3')?.textContent).toBe('The Corner Café')
    const out = [...box.querySelectorAll<HTMLButtonElement>('.exits button')].find((button) => button.textContent === 'High Street')!
    out.click()
    expect(runner.view().plugins.places?.location?.id).toBe('high-street')
  })

  it('timers: a countdown for the ringing phone, with the seconds left', async () => {
    await runner.newGame()
    phoneRinging(runner)
    const box = drawn((into) => drawTimers(into, runner.snapshot()))
    expect(box.querySelector('[data-timer="flat.ring"] .timer-left')?.textContent).toMatch(/^\d+s$/)
  })

  it('notices: a dismissed notice is gone from the next drawing', async () => {
    await runner.newGame()
    steppedOut(runner)
    const before = runner.view().notices.unseen.length
    expect(before).toBeGreaterThan(0)
    drawn((into) => drawNotices(into, runner.snapshot()))
      .querySelector('button')!
      .click()
    expect(runner.view().notices.unseen.length).toBe(before - 1)
  })

  it('shop: draws the counter the shop panel names, and its buy buttons buy', async () => {
    await runner.newGame()
    atTheCounter(runner)
    const view = runner.view()
    expect(view.panel?.panel).toBe('shop')
    const box = drawn((into) => drawShop(into, runner.snapshot()))
    expect(box.querySelector('h2')?.textContent).toBe('The counter')
    expect(box.textContent).toContain('2 left')
    const buy = buttons(box).find((button) => !button.disabled)!
    expect(buy).toBeTruthy()
    const coins = runner.state.stats.coins
    buy.click()
    expect(runner.state.stats.coins).toBeLessThan(coins)
  })

  it('backlog and saves: drawn from the snapshot, which follows each command, save and delete', async () => {
    await runner.newGame()
    unpacked(runner)
    const backlog = drawn((into) => drawBacklog(into, runner.snapshot()))
    expect(backlog.querySelector('h3')?.textContent).toBeTruthy()
    expect(backlog.querySelector('button')!.disabled).toBe(false)
    drawn((into) => drawSaves(into, runner.snapshot()))
      .querySelector('button')!
      .click()
    await runner.settled()
    const saves = drawn((into) => drawSaves(into, runner.snapshot()))
    expect(saves.querySelectorAll('.slots li').length).toBe(runner.snapshot().saves.length)
    expect(runner.snapshot().saves.some((entry) => entry.slot === '1')).toBe(true)
    buttons(saves)
      .find((button) => button.textContent === 'Delete')!
      .click()
    await runner.settled()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(runner.snapshot().saves.some((entry) => entry.slot === '1')).toBe(false)
  })

  it('unlocks: a wrong code says why, from the snapshot', async () => {
    await runner.newGame()
    const stop = startUnlocks(runner)
    const box = drawn((into) => drawUnlocks(into, runner.snapshot()))
    box.querySelector('input')!.value = 'NOT-A-CODE'
    box.querySelector('form')!.requestSubmit()
    await vi.waitFor(() => expect(runner.snapshot().helpers.unlocks?.status).toBe('wrong'))
    expect(drawn((into) => drawUnlocks(into, runner.snapshot())).querySelector('.reason')?.textContent).toBe('That code doesn’t unlock anything.')
    stop()
  })
})
