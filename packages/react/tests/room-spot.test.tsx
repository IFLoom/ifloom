// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createRunner, definePlugin, loadGame, startingState } from '@ifloom/engine'
import { Game, GameShell, Plugins, Story, type PluginUi } from '../src/index.ts'

afterEach(cleanup)

/** A plugin UI that draws a sign at the room spot, as the places' LocationCard does. */
const sign: PluginUi = { id: 'sign', layout: { room: [() => <p>The Fox and Hounds</p>] } }

/** A layout of the story with only the room spot in it. */
function RoomOnly() {
  return (
    <Game>
      <Story>
        <Plugins at="room" />
      </Story>
    </Game>
  )
}

describe('the room spot', () => {
  it('draws nothing while a minigame runs, since the minigame stands where the room is', () => {
    const { game: pub, problems } = loadGame(
      [
        {
          name: 'pub',
          minigames: [{ id: 'darts', title: 'Darts', start: 'throw', states: { throw: { on: [{ input: 'throw', go: 'done' }] }, done: { final: {} } } }],
          actions: [{ id: 'play', label: 'Play darts', effects: [{ minigame: 'darts' }] }],
        },
      ],
      { id: 'pub', title: 'Pub', plugins: [definePlugin({ id: 'sign', version: 1 })] },
    )
    expect(problems).toEqual([])
    const runner = createRunner(pub, { ...startingState(pub), sceneId: null })
    render(<GameShell runner={runner} plugins={[sign]} layout={RoomOnly} />)
    expect(screen.queryByText('The Fox and Hounds')).toBeTruthy()
    act(() => void runner.apply({ type: 'action', id: 'play' }))
    expect(runner.state.minigame?.id).toBe('darts')
    expect(screen.queryByText('The Fox and Hounds')).toBeNull()
  })
})
