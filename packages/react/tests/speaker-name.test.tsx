// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { createRunner, loadGame, startingState, type GameRules } from '@ifloom/engine'
import { GameShell } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

/** A café counter: Ava speaks, the player answers twice, and a line of narration between. */
function show(rules?: GameRules) {
  const { game } = loadGame(
    [
      { name: 'base', introScene: 'counter' },
      {
        name: 'cafe',
        kinds: [{ id: 'character', label: 'Person', unique: true }],
        entities: [{ id: 'ava', of: 'character', name: 'Ava' }],
        scenes: [{ id: 'counter', title: 'The counter', body: [{ prose: 'counter' }], choices: [] }],
        prose: { counter: '@ava: "Morning. The usual?"\n\n"Please."\n\nRain runs down the window.\n\n@you: "And a flapjack."' },
      },
    ],
    { id: 'cafe', title: 'The Café', ...(rules ? { rules } : {}) },
  )
  render(<GameShell runner={createRunner(game, startingState(game))} layout={Reading} />)
}

const lines = () =>
  [...document.querySelectorAll('[data-beat="say"]')].map((line) => [
    line.getAttribute('data-who'),
    line.querySelector('[data-part="speaker-name"]')?.textContent ?? null,
  ])

describe('the name over a spoken line', () => {
  it('is the speaker’s entity’s, or the player’s on their own lines, and none on a quote that names no one', () => {
    show()
    expect(lines()).toEqual([
      ['character', 'Ava'],
      ['player', null],
      ['player', 'You'],
    ])
    // Narration has none.
    expect(document.querySelector('[data-beat="text"] [data-part="speaker-name"]')).toBeNull()
  })

  it('is the name the save is listed under on the player’s lines, when the game gives one', () => {
    show({ saveName: () => 'Sam' })
    expect(lines().at(-1)).toEqual(['player', 'Sam'])
  })
})
