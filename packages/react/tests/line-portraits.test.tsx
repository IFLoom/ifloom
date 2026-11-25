// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { createRunner, loadGame, startingState, type Content } from '@ifloom/engine'
import { GameShell } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

/** A café counter: Ava, who has a picture, speaks; Sam, who has none, speaks; the player answers. */
function show(extra: Partial<Content> = {}, sceneUi?: { portraits: boolean }) {
  const { game } = loadGame(
    [
      { name: 'base', introScene: 'counter' },
      {
        name: 'cafe',
        kinds: [{ id: 'character', label: 'Person', unique: true }],
        entities: [
          { id: 'ava', of: 'character', name: 'Ava', image: 'people/ava.png' },
          { id: 'sam', of: 'character', name: 'Sam' },
        ],
        scenes: [{ id: 'counter', title: 'The counter', body: [{ prose: 'counter' }], choices: [], ...(sceneUi ? { ui: sceneUi } : {}) }],
        prose: { counter: '@ava: "Morning."\n\n@sam: "Hi."\n\n@you: "A tea, please."' },
        ...extra,
      },
    ],
    { id: 'cafe', title: 'The Café' },
  )
  render(<GameShell runner={createRunner(game, startingState(game))} layout={Reading} />)
}

/** Each spoken line's speaker and the picture beside it, or null. */
const portraits = () =>
  [...document.querySelectorAll('[data-beat="say"]')].map((line) => [
    line.querySelector('[data-part="speaker-name"]')?.textContent ?? null,
    line.closest('[data-part="line"]')?.querySelector('[data-part="line-portrait"]')?.getAttribute('src') ?? null,
  ])

describe('the picture beside a spoken line', () => {
  it('is the speaker’s, shown whenever they have one, and the player’s from content’s player.image', () => {
    show()
    expect(portraits()).toEqual([
      ['Ava', 'art/people/ava.png'],
      ['Sam', null],
      ['You', null],
    ])
    cleanup()
    show({ player: { image: 'people/you.png' } })
    expect(portraits().at(-1)).toEqual(['You', 'art/people/you.png'])
  })

  it('is left out where the game or the scene says ui.portraits is false, the scene’s over the game’s', () => {
    show({ ui: { portraits: false } })
    expect(portraits().every(([, src]) => src === null)).toBe(true)
    cleanup()
    show({ ui: { portraits: false } }, { portraits: true })
    expect(portraits()[0]).toEqual(['Ava', 'art/people/ava.png'])
    cleanup()
    show({}, { portraits: false })
    expect(document.querySelector('[data-part="line-portrait"]')).toBeNull()
  })
})
