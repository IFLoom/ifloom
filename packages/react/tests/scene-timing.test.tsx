// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createRunner, loadGame, startingState, type Game, type Runner } from '@ifloom/engine'
import { GameProvider, useScene } from '../src/index.ts'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** A hall whose lines come one at a time, and a bank where a stone is skimmed against 8, with a line under the dice and ducks no line names. */
function house(): Game {
  return loadGame(
    [
      { name: 'base', introScene: 'door' },
      {
        name: 'house',
        scenes: [
          {
            id: 'door',
            title: 'The door',
            body: [{ prose: 'door' }],
            choices: [
              { id: 'in', label: 'Go in', ui: { transition: { in: 'zoom', out: 'none', ms: 150 } }, effects: [{ scene: 'hall' }] },
              { id: 'bank', label: 'To the bank', effects: [{ scene: 'bank' }] },
            ],
          },
          {
            id: 'hall',
            title: 'The hall',
            ui: { transition: { in: 'slide-up', ms: 200 } },
            body: [{ prose: 'hall' }, { prose: 'hall.clock', ui: { reveal: { delay: 1000 } } }, { prose: 'hall.cough', ui: { reveal: { as: 'slide-left' } } }],
            choices: [{ id: 'out', label: 'Leave', effects: [{ scene: 'door' }] }],
          },
          {
            id: 'bank',
            title: 'The bank',
            body: [{ prose: 'bank' }, { prose: 'bank.after', when: { roll: 'skim' }, ui: { dice: 'skim' } }],
            choices: [
              { id: 'skim', label: 'Skim a stone', effects: [{ roll: 'skim', dice: '2d6', against: 8 }] },
              { id: 'ducks', label: 'Count the ducks', effects: [{ roll: 'ducks', dice: '1d6' }] },
              { id: 'wait', label: 'Wait', effects: [] },
            ],
          },
        ],
        prose: {
          door: 'A blue door.',
          hall: 'A long hall.',
          'hall.clock': 'A clock ticks.',
          'hall.cough': 'Somebody coughs upstairs.',
          bank: 'Flat stones.',
          'bank.after': 'Ripples.',
        },
      },
    ],
    { id: 'house', title: 'The House' },
  ).game
}

function timed(): { runner: Runner; result: { current: ReturnType<typeof useScene> } } {
  const game = house()
  const runner = createRunner(game, startingState(game, { seed: 3 }), { history: true })
  const wrapper = ({ children }: { children: ReactNode }) => <GameProvider runner={runner}>{children}</GameProvider>
  const { result } = renderHook(() => useScene(), { wrapper })
  return { runner, result }
}

const send = (runner: Runner, id: string) => act(() => void runner.apply({ type: 'choose', id }))

describe('useScene', () => {
  it('times the reveals from the screen coming on, with the choice that led here deciding how it comes in', () => {
    const { runner, result } = timed()
    expect(result.current).toMatchObject({ pending: false, last: 0, transition: { key: 'scene:door', in: 'none' } })
    send(runner, 'in')
    const timing = result.current
    expect(timing.transition).toEqual({ key: 'scene:hall', in: 'zoom', out: 'none', ms: 150 })
    expect(timing.leave).toEqual({ out: 'none', ms: 150 })
    expect(timing.groups.map((group) => [group.reveal?.at ?? 0, group.reveal?.as ?? null, group.beats.map((entry) => entry.index)])).toEqual([
      [0, null, [0]],
      [1000, 'fade', [1]],
      [1800, 'slide-left', [2]],
    ])
    expect(timing).toMatchObject({ last: 1800, pending: true, revealed: false })
  })

  it('stops waiting once every run has come in, or at once when skipped', () => {
    const { runner, result } = timed()
    send(runner, 'in')
    // The last run, the transition in, and the reveal's own fade.
    act(() => {
      vi.advanceTimersByTime(1800 + 150 + 399)
    })
    expect(result.current.pending).toBe(true)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toMatchObject({ pending: false, revealed: true })

    send(runner, 'out')
    send(runner, 'in')
    expect(result.current.pending).toBe(true)
    act(() => result.current.skip())
    expect(result.current).toMatchObject({ pending: false, revealed: true })
  })

  it('skips on the first key press while runs are to come', () => {
    const { runner, result } = timed()
    send(runner, 'in')
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })))
    expect(result.current.pending).toBe(false)
  })

  it('holds a run back for new dice, draws an old roll settled, and leaves new rolls no line names for the overlay', () => {
    const { runner, result } = timed()
    send(runner, 'bank')
    send(runner, 'skim')
    const skim = runner.view().rolls[0]
    expect(result.current.rolls.fresh).toEqual([skim])
    expect(result.current.groups[1]).toMatchObject({ dice: skim, reveal: { delay: 1000, at: 1000 } })
    expect(result.current.pending).toBe(true)
    expect(result.current.unnamed).toEqual([])
    const at = result.current.rolls.at

    send(runner, 'ducks')
    expect(result.current.unnamed.map((roll) => roll.key)).toEqual(['ducks'])
    expect(result.current.rolls.at).toBe(at + 1)
    // Ducks are counted with no stone thrown: the line about the stone shows its last roll settled.
    expect(result.current.groups).toHaveLength(1)

    send(runner, 'wait')
    expect(result.current.rolls.fresh).toEqual([])
    expect(result.current.unnamed).toEqual([])
  })

  it('tumbles nothing that an undo brings back', () => {
    const { runner, result } = timed()
    send(runner, 'bank')
    send(runner, 'skim')
    send(runner, 'wait')
    act(() => void runner.undo())
    expect(runner.view().rolls).toHaveLength(1)
    expect(result.current.rolls.fresh).toEqual([])
    expect(result.current.groups).toHaveLength(1)
    expect(result.current.groups[0].beats[1].roll?.key).toBe('skim')
    expect(result.current.pending).toBe(false)
  })
})
