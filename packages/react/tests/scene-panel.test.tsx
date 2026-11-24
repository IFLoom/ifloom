// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState } from '@ifloom/engine'
import { definePlugin } from '@ifloom/engine/plugin'
import { GameShell, type PanelComponent } from '../src/index.ts'
import type { PluginUi } from '../src/kit.ts'

afterEach(cleanup)

/** A market stall whose scene holds its price board open while it is on screen. */
function stall(plugins: ReturnType<typeof definePlugin>[] = []) {
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
    { id: 'market', title: 'Market', plugins },
  )
  expect(problems).toEqual([])
  return game
}

/** A test plugin, and what its `/react` subpath would export: a `prices` panel and a `stats` one. */
const board = definePlugin({ id: 'board', version: 1 })
const boardUi: PluginUi = {
  id: 'board',
  panels: {
    prices: { component: ({ data }) => <p>Board: {JSON.stringify(data)}</p> },
    stats: { component: () => <p>Board stats</p> },
  },
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

describe('a panel found by name', () => {
  it('a scene holding a plugin UI’s panel draws it in place of its choices', () => {
    const game = stall([board])
    render(<GameShell runner={createRunner(game, startingState(game))} plugins={[boardUi]} />)
    expect(screen.getByText('Board: {"loaf":4}')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Walk on' })).toBeNull()
  })

  const own: PanelComponent = () => <p>The game’s own</p>
  // Where a name is drawn from, the game's own `panels` over a plugin UI's over a built-in one, wherever the panel opens.
  it.each<{ case: string; name: string; panels: Record<string, PanelComponent>; plugins: PluginUi[]; shows: string }>([
    { case: 'the game’s over a plugin UI’s', name: 'prices', panels: { prices: own }, plugins: [boardUi], shows: 'The game’s own' },
    { case: 'a plugin UI’s alone', name: 'prices', panels: {}, plugins: [boardUi], shows: 'Board: {}' },
    { case: 'the game’s over a plugin UI’s and a built-in', name: 'stats', panels: { stats: own }, plugins: [boardUi], shows: 'The game’s own' },
    { case: 'a plugin UI’s over a built-in', name: 'stats', panels: {}, plugins: [boardUi], shows: 'Board stats' },
    { case: 'a built-in alone', name: 'stats', panels: {}, plugins: [], shows: 'Coins' },
  ])('$case: $name draws "$shows"', ({ name, panels, plugins, shows }) => {
    const { game } = loadGame(
      [
        {
          name: 'market',
          stats: [{ id: 'coins', label: 'Coins', start: 2 }],
          actions: [{ id: 'open', label: 'Open it', effects: [{ panel: name }] }],
        },
      ],
      { id: 'market', title: 'Market', plugins: [board] },
    )
    render(<GameShell runner={createRunner(game, startingState(game))} panels={panels} plugins={plugins} />)
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Open it' })))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain(shows)
  })
})
