// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { startUnlocks } from '@ifloom/plugin-unlocks'
import { drawBacklog } from '../plain/backlog.ts'
import { drawDevices } from '../plain/devices.ts'
import { drawWardrobe } from '../plain/wardrobe.ts'
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
import { drawChanges } from '../plain/changes.ts'
import { drawTransition } from '../plain/transition.ts'
import { drawFlow } from '../plain/flow.ts'
import { drawBackground } from '../plain/background.ts'
import { drawVoices } from '../plain/audio.ts'
import { atTheCounter, atTheDoor, inTheCafe, inThePark, phoneRinging, readingTexts, steppedOut, unpacked } from './play.ts'

/** The Plain JS snippets, rendered into a box and pressed, as the vanilla template would. */
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

  it('changes: a pill for the coins the last command set, marked up', async () => {
    await runner.newGame()
    inTheCafe(runner)
    const box = drawn((into) => drawChanges(into, runner.snapshot()))
    expect(box.querySelector('[data-stat="coins"]')?.getAttribute('data-dir')).toBe('up')
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

  it('devices and wardrobe: ready buttons from the view, and the phone out or put away as the state says', async () => {
    await runner.newGame()
    readingTexts(runner)
    const phone = drawn((into) => drawDevices(into, runner.snapshot()))
    buttons(phone)
      .find((button) => button.textContent === 'Home')!
      .click()
    expect(runner.view().plugins.devices?.devices[0]).toMatchObject({ shown: true, open: null })
    buttons(drawn((into) => drawDevices(into, runner.snapshot())))
      .find((button) => button.textContent === 'Close')!
      .click()
    expect(runner.view().plugins.devices?.devices[0].shown).toBe(false)
    const wardrobe = drawn((into) => drawWardrobe(into, runner.snapshot()))
    const wear = buttons(wardrobe).find((button) => button.textContent?.startsWith('Wear'))
    if (wear) {
      wear.click()
      expect(runner.view().plugins.wardrobe?.spare.length).toBeLessThan(buttons(wardrobe).filter((button) => button.textContent?.startsWith('Wear')).length)
    }
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

  it('transition: the screen before goes out by its own transition, then the next comes in by its own', async () => {
    vi.useFakeTimers()
    try {
      await runner.newGame()
      const box = document.createElement('div')
      drawTransition(box, runner.snapshot())
      const moving = box.querySelector('article')!
      expect(moving.dataset.transitionIn).toBe('fade')
      // The second line waits for its reveal.
      expect(box.querySelector('[data-reveal]')).toBeTruthy()
      unpacked(runner)
      drawTransition(box, runner.snapshot())
      expect(moving.dataset.transitionOut).toBe('fade')
      vi.advanceTimersByTime(500)
      expect(box.querySelector('article')).not.toBe(moving)
      expect(box.querySelector('article')?.dataset.transitionIn).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('flow: the beats and the choices, which press', async () => {
    await runner.newGame()
    const box = drawn((into) => drawFlow(into, runner.snapshot()))
    expect(box.querySelector('.prose p')).toBeTruthy()
    buttons(box)
      .find((button) => button.textContent === 'Unpack')!
      .click()
    expect(runner.view().scene.title).not.toBe('Moving day')
  })

  it('background and voices: the knock at the door has the hall behind its words and its voiced line to hear again', async () => {
    await runner.newGame()
    atTheDoor(runner)
    const story = drawn((into) => drawBackground(into, runner.snapshot()))
    expect(story.style.backgroundImage).toBe('url("art/photo/ava.svg")')
    expect(buttons(drawn((into) => drawVoices(into, runner.snapshot()))).map((button) => button.textContent)).toEqual(['Play again'])
    // Once the scene closes, the story has no background.
    runner.apply({ type: 'choose', id: 'close' })
    drawBackground(story, runner.snapshot())
    expect(story.style.backgroundImage).toBe('')
  })
})
