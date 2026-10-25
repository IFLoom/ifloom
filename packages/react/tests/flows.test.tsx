// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState } from '@ifloom/engine'
import { choice, decide, fold, text } from '@ifloom/engine/flow'
import { GameShell, checkUiHints } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
})

/** A postcard on the mat, read on as you choose, with its words folded away. */
function mat() {
  return loadGame(
    [
      {
        name: 'mat',
        introScene: 'mat',
        scenes: [
          {
            id: 'mat',
            title: 'The mat',
            body: [
              text(`A postcard lies on the mat.`),
              decide('card', [
                choice('read', 'Turn it over', { then: [fold('The postcard', [text(`Wish you were here.`), text(`J.`)])] }),
                choice('leave', 'Leave it'),
              ]),
              text(`You put the kettle on.`),
            ],
            choices: [{ id: 'done', label: 'Done', effects: [{ scene: null }] }],
          },
        ],
      },
    ],
    { id: 'mat', title: 'The Mat' },
  ).game
}

describe('a flowing scene in the React UI', () => {
  it('draws a past pick where it was made, and a fold’s beats in one part that opens', () => {
    const game = mat()
    expect(checkUiHints(game)).toEqual([])
    const runner = createRunner(game, startingState(game))
    render(<GameShell runner={runner} layout={Reading} motion={false} />)
    expect(screen.getByRole('button', { name: /Turn it over/ })).toBeTruthy()
    act(() => {
      runner.apply({ type: 'choose', id: 'read' })
    })
    const chose = document.querySelector('[data-beat="chose"]')
    expect(chose?.textContent).toBe('› Turn it over')
    const folded = document.querySelector('[data-part="fold"]') as HTMLDetailsElement
    expect(folded.tagName).toBe('DETAILS')
    expect(folded.open).toBe(false)
    expect(folded.querySelector('[data-part="fold-summary"]')?.textContent).toBe('The postcard')
    expect([...folded.querySelectorAll('[data-beat="text"]')].map((beat) => beat.textContent)).toEqual(['Wish you were here.', 'J.'])
    expect(screen.getByText('You put the kettle on.').closest('[data-part="fold"]')).toBeNull()
    expect(screen.getByRole('button', { name: /Done/ })).toBeTruthy()
  })
})
