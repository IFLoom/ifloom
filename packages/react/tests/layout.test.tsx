// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, startingState } from '@ifloom/engine'
import { GameShell, READING_LAYOUT } from '../src/index.ts'

afterEach(cleanup)

/** A page of a novel: no plugins, no places, no clock. */
function novel() {
  const { game, problems } = loadGame(
    [
      {
        id: 'book',
        schema: SCHEMA,
        stats: [{ id: 'courage', label: 'Courage', start: 1 }],
        scenes: [{ id: 'ch1', title: 'Chapter one', body: [{ text: 'ch1' }], choices: [{ id: 'on', effects: [{ kind: 'scene', scene: null }] }] }],
        prose: { ch1: 'The letter is on the mat.', 'ch1#on': 'Read on' },
      },
    ],
    { id: 'book', title: 'The Letter', introScene: 'ch1' },
  )
  expect(problems).toEqual([])
  return game
}

describe('layouts', () => {
  it('draw a novel as one column to read, with no clock, map or people', () => {
    const game = novel()
    render(<GameShell runner={createRunner(game, startingState(game))} layout={READING_LAYOUT} />)
    expect(document.querySelector('[data-sidebar]')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'The Letter' })).toBeTruthy()
    expect(screen.getByText('The letter is on the mat.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Read on/ })).toBeTruthy()
    expect(document.querySelector('[data-exit]')).toBeNull()
    expect(document.querySelector('[data-person]')).toBeNull()
  })

  it('take the game’s own parts beside the built-in ones, in the order given', () => {
    const game = novel()
    render(
      <GameShell
        runner={createRunner(game, startingState(game))}
        layout={{ sidebar: ['stats', <p key="note">A note in the margin.</p>], stage: ['scene'] }}
      />,
    )
    const side = document.querySelector('[data-sidebar]') as HTMLElement
    expect(side.textContent).toContain('Courage')
    expect(side.textContent).toContain('A note in the margin.')
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
