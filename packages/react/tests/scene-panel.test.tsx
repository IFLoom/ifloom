// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState } from '@ifloom/engine'
import { GameShell } from '../src/index.ts'

afterEach(cleanup)

/** A market stall whose scene holds its price board open while it is on screen. */
function stall() {
  const { game, problems } = loadGame(
    [
      {
        name: 'market',
        introScene: 'stall',
        scenes: [
          {
            id: 'stall',
            title: 'The stall',
            panel: { panel: 'prices', with: { loaf: 4 } },
            body: [{ prose: 'stall' }],
            choices: [{ id: 'bye', label: 'Walk on', effects: [{ scene: null }] }],
          },
        ],
        prose: { stall: 'Bread and jam on a trestle.' },
      },
    ],
    { id: 'market', title: 'Market' },
  )
  expect(problems).toEqual([])
  return game
}

describe('a scene’s panel', () => {
  it('is drawn in the scene, in place of its choices, with what the scene opens it with', () => {
    const game = stall()
    render(
      <GameShell runner={createRunner(game, startingState(game))} panels={{ prices: ({ data }) => <p>Loaf: {String((data as { loaf: number }).loaf)}</p> }} />,
    )
    expect(screen.getByText('Loaf: 4')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Walk on' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
