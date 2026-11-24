// @vitest-environment jsdom
/**
 * The files "A game with a world" ends on (guide/first-game.md), in each
 * framework: its game, played in the page from each tab's entry as a reader
 * would, from a new game through to talking to Ruth, and carried on from the
 * autosave. They run on `browserRunner`, as the reader's do, with jsdom's
 * localStorage, emptied before each tab's files are imported.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { browserRunner } from '@ifloom/browser'
import { createApp, nextTick } from 'vue'
import module from '../first-game/game.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

/** A fresh page with an empty #root, and nothing saved. */
function page(): HTMLElement {
  localStorage.clear()
  const root = document.body.appendChild(document.createElement('div'))
  root.id = 'root'
  return root
}

const pressed = (root: HTMLElement) => async (label: string) => {
  const button = [...root.querySelectorAll('button')].find((each) => each.textContent?.trim() === label)
  expect(button, `a button "${label}" in: ${root.textContent}`).toBeTruthy()
  expect(button!.disabled, `"${label}" is greyed out: ${button!.title}`).toBe(false)
  button!.click()
  await nextTick()
}

/** From moving day to Ruth's first line, by the buttons on screen. */
async function toRuth(root: HTMLElement): Promise<void> {
  const press = pressed(root)
  await press('Go to bed') // the intro's choice
  await press('Go to bed') // the game's action: to Tuesday morning
  await press('The high street')
  await press('The corner café')
  expect(root.textContent).toContain('Ruth is behind the counter')
  await press('Talk')
}

describe('A game with a world, in the browser', () => {
  it('loads with no problems', () => {
    expect(module.build().problems).toEqual([])
  })

  it('Plain JS: draws the exits by name, the Talk button and Ruth’s spoken line, and carries on from the autosave', async () => {
    const root = page()
    const { runner } = await import('../first-game/plain/runner.ts')
    await import('../first-game/plain/main.ts')
    expect(root.querySelector('h2')?.textContent).toBe('Moving day')
    await toRuth(root)
    expect(root.querySelector('h3')?.textContent).toBe('Ruth')
    expect(root.textContent).toContain('“Morning. What can I get you?”')

    await runner.settled()
    const again = await browserRunner(runner.game)
    expect((await again.load('auto')).ok).toBe(true)
    expect(again.view().scene.speaker?.name).toBe('Ruth')
  })

  it('Vue: the same, from App.vue', async () => {
    const root = page()
    const { default: App } = await import('../first-game/vue/App.vue')
    createApp(App).mount(root)
    await nextTick()
    expect(root.querySelector('h2')?.textContent).toBe('Moving day')
    await toRuth(root)
    expect(root.querySelector('h3')?.textContent).toBe('Ruth')
    expect(root.textContent).toContain('“Morning. What can I get you?”')
  })
  it('React: opens on the title screen, then draws the house with its way out from the places plugin’s UI', async () => {
    const root = page()
    await act(async () => {
      await import('../first-game/react/main.ts')
    })
    await waitFor(() => expect(root.querySelector('[data-page="title"]')).toBeTruthy())
    await act(async () => {
      ;[...root.querySelectorAll('button')].find((button) => button.textContent === 'New game')!.click()
    })
    await waitFor(() => expect(root.textContent).toContain('Moving day'))
    await act(async () => {
      ;[...root.querySelectorAll('button')].find((button) => button.textContent?.includes('Go to bed'))!.click()
    })
    await waitFor(() => expect([...root.querySelectorAll('button')].some((button) => button.textContent?.includes('The high street'))).toBe(true))
  })
})
