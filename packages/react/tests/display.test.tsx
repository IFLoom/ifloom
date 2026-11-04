// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { createRunner, loadGame, memoryDriver, profile, startingState, type Content } from '@ifloom/engine'
import { checkUiHints, GameShell } from '../src/index.ts'

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.textSize
})

/** A porch with a picture, and two ui settings the React UI honours by name. */
const porch: Content = {
  name: 'porch',
  introScene: 'porch',
  settings: [
    {
      id: 'size',
      label: 'Text size',
      type: 'choice',
      affects: 'ui',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Large' },
      ],
      default: 'normal',
    },
    { id: 'pictures', label: 'Show pictures', type: 'toggle', affects: 'ui', default: true },
  ],
  scenes: [
    { id: 'porch', title: 'The porch', body: [{ text: '[[wide:porch|The porch]]\n\nA swing creaks.' }], choices: [{ id: 'in', label: 'Go in', effects: [] }] },
  ],
}

function play() {
  const { game, problems } = loadGame([porch, { name: 'look', ui: { settings: { textSize: 'size', images: 'pictures' } } }], { id: 'porch', title: 'Porch' })
  expect(problems).toEqual([])
  const runner = createRunner(game, startingState(game), { profile: profile(game, memoryDriver()) })
  return { game, runner }
}

describe('the ui settings the React UI honours', () => {
  it('copies the text size to <html> and leaves pictures out while the toggle is off', async () => {
    const { game, runner } = play()
    expect(checkUiHints(game)).toEqual([])
    render(<GameShell runner={runner} />)
    expect(document.documentElement.dataset.textSize).toBe('normal')
    expect(document.querySelector('img[alt="The porch"]')).toBeTruthy()
    await act(async () => {
      runner.setSetting('size', 'large')
      runner.setSetting('pictures', false)
      await runner.settled()
    })
    expect(document.documentElement.dataset.textSize).toBe('large')
    expect(document.querySelector('img[alt="The porch"]')).toBeNull()
  })

  it('reports a setting that is missing, of the wrong type, or sized by no style', () => {
    const { game } = loadGame([porch], { id: 'porch', title: 'Porch' })
    const odd = {
      ...game,
      settings: [
        ...(game.settings ?? []),
        { id: 'huge', label: 'Huge', type: 'choice' as const, affects: 'ui' as const, options: [{ value: 'huge', label: 'Huge' }], default: 'huge' },
      ],
    }
    expect(checkUiHints({ ...odd, ui: { settings: { textSize: 'huge', images: 'size' } } })).toEqual([
      'game: ui.settings.textSize option "huge" is not a size the styles draw (small, normal, large, larger); size it with CSS of your own',
      'game: ui.settings.images "size" is not a ui toggle setting the game has',
    ])
    expect(checkUiHints({ ...game, ui: { settings: { textSize: 'nope', colour: 'x' } as never } })).toEqual([
      'game: ui.settings.colour is not a setting the React UI honours; it has textSize and images',
      'game: ui.settings.textSize "nope" is not a ui choice setting the game has',
    ])
  })
})
