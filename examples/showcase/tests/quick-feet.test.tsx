// @vitest-environment jsdom
/**
 * Quick feet in the React UI: the park's minigame played with the keyboard,
 * the clock running on fake timers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { apply, createRunner, startingState, type GameState, type CommandRef } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'
import { GameShell } from '@ifloom/react'
import { townUi } from '../src/ui.ts'
import { clock, smallTown } from '../src/game.ts'

const { game } = smallTown()

function run(state: GameState, ...commands: CommandRef[]): GameState {
  for (const command of commands) {
    const out = apply(state, game, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

/** The arrow keys, by the word the girl with the whistle shouts. */
const KEYS: Record<string, string> = { Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('quick feet, in the browser', () => {
  it('reads the arrow, takes the key in time, and pays out after five rounds', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(clock.write({ ...state, turn: 1 }, { day: 1, period: 'morning' }), go('high-street'), go('park'))
    const runner = createRunner(game, state)
    render(<GameShell runner={runner} plugins={townUi()} keys />)
    const coins = runner.state.stats.coins

    act(() => void fireEvent.click(screen.getByRole('button', { name: /Play quick feet with the kids/ })))
    expect(screen.getByRole('heading', { name: 'Quick feet' })).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Time left' }).getAttribute('aria-valuemax')).toBe('1500')

    // Three rounds: read the shout, think for half a second, press the arrow.
    for (let round = 1; round <= 3; round += 1) {
      const words = document.querySelector('[data-part="minigame-state"]')!.textContent!
      const arrow = words.match(/(Up|Down|Left|Right)!$/)![1]
      act(() => void vi.advanceTimersByTime(500))
      expect(Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))).toBe(1000)
      act(() => void fireEvent.keyDown(window, { key: KEYS[arrow] }))
      expect(runner.state.minigame?.kv).toMatchObject({ round: round + 1, score: round })
    }
    // The last two rounds run out on the clock.
    act(() => void vi.advanceTimersByTime(3000))
    expect(runner.state.minigame).toBeNull()
    expect(runner.state.stats.coins).toBe(coins + 5)
    expect(screen.getByText(/you win/)).toBeTruthy()
    // The number keys are on: 1 takes the bow.
    act(() => void fireEvent.keyDown(window, { key: '1' }))
    expect(runner.state.sceneId).toBeNull()
  })
})
