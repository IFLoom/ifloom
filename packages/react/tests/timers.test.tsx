// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { checkUiHints, Countdown, GameShell, Timers } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** A hallway where the phone rings for ten seconds: answer it, or miss it. */
function hallway(): Game {
  return loadGame(
    [
      { name: 'base', introScene: 'hall' },
      {
        name: 'hallway',
        timers: [{ id: 'phone', label: 'The phone', ms: 10_000, effects: [{ scene: 'missed' }] }],
        scenes: [
          {
            id: 'hall',
            title: 'The hall',
            body: [{ prose: 'hall' }, { prose: 'hall.ring', when: { timer: 'phone' }, ui: { timer: 'phone' } }],
            choices: [
              { id: 'ring', label: 'Wait by the phone', when: { not: { timer: 'phone' } }, effects: [{ timer: 'phone' }] },
              { id: 'answer', label: 'Answer it', when: { timer: 'phone' }, effects: [{ timer: 'phone', to: null }] },
            ],
          },
          { id: 'missed', title: 'Missed', body: [{ prose: 'missed' }], choices: [] },
        ],
        prose: {
          hall: 'Coats on hooks.',
          'hall.ring': 'The phone is ringing.',
          missed: 'It stops.',
        },
      },
    ],
    { id: 'hallway', title: 'The Hallway' },
  ).game
}

function reducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function play(props: Partial<Parameters<typeof GameShell>[0]> = {}) {
  const game = hallway()
  const runner = createRunner(game, startingState(game))
  render(<GameShell runner={runner} layout={Reading} {...props} />)
  return runner
}

const press = (name: RegExp) => act(() => screen.getByRole('button', { name }).click())
const countdowns = () => [...document.querySelectorAll('[data-part="timer"]')] as HTMLElement[]
const seconds = () => document.querySelector('[data-part="timer-left"]')?.textContent

describe('Countdown', () => {
  it('counts down after the block that names it, ticked by the game’s clock, and goes when the timer runs out', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'] })
    reducedMotion(false)
    const runner = play()
    expect(countdowns()).toEqual([])
    press(/Wait by the phone/)
    const [box] = countdowns()
    expect(box.getAttribute('data-timer')).toBe('phone')
    expect(box.previousElementSibling?.textContent).toContain('The phone is ringing.')
    expect(box.querySelector('[data-part="timer-label"]')?.textContent).toBe('The phone')
    expect(seconds()).toBe('10s')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(seconds()).toBe('7s')
    expect(box.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('7000')
    expect(box.hasAttribute('data-urgent')).toBe(false)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(countdowns()[0].hasAttribute('data-urgent')).toBe(true)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(runner.state.sceneId).toBe('missed')
    expect(countdowns()).toEqual([])
  })

  it('stops when the timer is stopped, and its effects never run', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'] })
    reducedMotion(false)
    const runner = play()
    press(/Wait by the phone/)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    press(/Answer it/)
    expect(countdowns()).toEqual([])
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(runner.state.sceneId).toBe('hall')
  })

  it('shows only the seconds to a player who asks for reduced motion', () => {
    reducedMotion(true)
    play()
    press(/Wait by the phone/)
    expect(countdowns()).toHaveLength(1)
    expect(document.querySelector('[data-part="timer-bar"]')).toBeNull()
    expect(seconds()).toBe('10s')
  })

  it('goes anywhere in a layout, alone or all together, and can be replaced by name', () => {
    reducedMotion(false)
    const Layout = () => (
      <>
        <Reading />
        <aside data-testid="side">
          <Countdown timer="phone" label={false} />
          <Timers />
        </aside>
      </>
    )
    play({ layout: Layout })
    press(/Wait by the phone/)
    const side = screen.getByTestId('side')
    expect(side.querySelectorAll('[data-part="timer"]')).toHaveLength(2)
    expect(side.querySelector('[data-part="timer-label"]')?.textContent).toBe('The phone')
    cleanup()
    play({ components: { Countdown: ({ timer }) => <p data-testid="mine">{timer}</p> } })
    press(/Wait by the phone/)
    expect(screen.getByTestId('mine').textContent).toBe('phone')
  })
})

describe('checkUiHints and timers', () => {
  it('accepts a declared timer, and reports anything else', () => {
    expect(checkUiHints(hallway())).toEqual([])
    const game = hallway()
    const bad = { ...game, scenes: [{ id: 'x', title: 'X', body: [{ prose: 'hall', ui: { timer: 'kettle' } }], choices: [] }] } as unknown as Game
    expect(checkUiHints(bad)).toEqual(['scene x block: ui.timer "kettle" is not a timer the game has'])
  })
})
