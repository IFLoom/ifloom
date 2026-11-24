// @vitest-environment jsdom
/**
 * The entries "Start your own UI" (how-to/render/start.md) shows, in each framework: each makes its runner with
 * browserRunner, as a reader's does, on jsdom's localStorage, emptied before each import, and renders into #root.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'

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

describe('the start snippets', () => {
  it('Plain JS: renders the game into #root, and renders it again after a choice', async () => {
    const root = page()
    await import('../plain/start.ts')
    expect(root.querySelector('h1')?.textContent).toBe('Small Town')
    expect(root.querySelector('h2')?.textContent).toBe('Moving day')
    const unpack = [...root.querySelectorAll('button')].find((button) => button.textContent === 'Unpack')!
    unpack.click()
    expect(root.querySelector('h2')?.textContent).not.toBe('Moving day')
  })

  it('Vue: the runner module gives the view as Vue state, which follows each command', async () => {
    page()
    const { runner, view } = await import('../vue/start.ts')
    expect(view.value.scene.title).toBe('Moving day')
    runner.apply({ type: 'choose', id: 'unpack' })
    expect(view.value.scene.title).not.toBe('Moving day')
  })

  it('React: mountGame renders the default layout into #root', async () => {
    const root = page()
    await import('../react/mount-game.tsx')
    await waitFor(() => expect(root.querySelector('[data-part="story"]')).toBeTruthy())
  })
})
