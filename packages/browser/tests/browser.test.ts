// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRunner, loadGame, startingState, type Command, type Game, type MinigameDef, type Runner } from '@ifloom/engine'
import { minigameInput, nextSlot, startClock, startKeys, startMinigameKeys, startRevealSkip } from '../src/index.ts'

/** Catch: wait for the throw, then press space within a second. Left drops it. */
const catchBall: MinigameDef = {
  id: 'catch',
  start: 'ready',
  states: {
    ready: { on: [{ input: 'space', go: 'throw' }] },
    throw: {
      after: { ms: 1000, go: 'missed' },
      on: [
        { input: 'space', go: 'caught' },
        { input: 'left', go: 'missed' },
      ],
    },
    caught: { final: { effects: [{ kind: 'scene', scene: 'caught' }] } },
    missed: { final: { effects: [{ kind: 'scene', scene: 'missed' }] } },
  },
}

function game(): Game {
  const { game, problems } = loadGame(
    [
      { name: 'base', introScene: 'intro' },
      {
        name: 'park',
        stats: [{ id: 'energy', label: 'Energy', start: 60, max: 100 }],
        minigames: [catchBall],
        timers: [{ id: 'bell', ms: 2000, effects: [{ kind: 'scene', scene: 'missed' }] }],
        scenes: [
          {
            id: 'intro',
            title: 'The park',
            body: [{ text: 'intro' }],
            choices: [
              { id: 'play', effects: [{ kind: 'minigame', minigame: 'catch' }] },
              { id: 'rest', effects: [{ kind: 'stat', stat: 'energy', by: 10 }] },
              { id: 'tired', effects: [], blocked: [{ when: { stat: 'energy', lt: 100 }, reason: 'Not yet.' }] },
              { id: 'bell', effects: [{ kind: 'timer', timer: 'bell' }] },
            ],
          },
          { id: 'caught', title: 'Caught it', body: [{ text: 'caught' }], choices: [] },
          { id: 'missed', title: 'Missed', body: [{ text: 'missed' }], choices: [] },
        ],
        prose: {
          intro: 'Kids are throwing a ball about.',
          'intro#play': 'Join in',
          'intro#rest': 'Sit on the bench',
          'intro#tired': 'Run home',
          'intro#bell': 'Wait for the bell',
          caught: 'Got it.',
          missed: 'It rolls away.',
        },
      },
    ],
    { id: 'park-test', title: 'The Park' },
  )
  expect(problems).toEqual([])
  return game
}

const runnerFor = (): Runner => {
  const g = game()
  return createRunner(g, startingState(g))
}
const ticks = (runner: Runner) => runner.log().commands.filter((command): command is Extract<Command, { type: 'tick' }> => command.type === 'tick')
const press = (key: string, init: KeyboardEventInit = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...init }))

describe('startClock', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks only while a timer runs, with the time that passed', () => {
    const runner = runnerFor()
    const stop = startClock(runner)
    vi.advanceTimersByTime(500)
    expect(ticks(runner)).toEqual([])
    runner.apply({ type: 'choose', id: 'play' })
    // Ready has no timer: still nothing.
    vi.advanceTimersByTime(500)
    expect(ticks(runner)).toEqual([])
    runner.apply({ type: 'minigame', input: 'space' })
    vi.advanceTimersByTime(300)
    expect(ticks(runner).map((tick) => tick.ms)).toEqual([100, 100, 100])
    vi.advanceTimersByTime(1000)
    // The throw ran out after a second, and the clock stopped with it.
    expect(runner.state.sceneId).toBe('missed')
    expect(ticks(runner).reduce((sum, tick) => sum + tick.ms, 0)).toBe(1000)
    stop()
  })

  it('ticks while a named timer runs, outside any minigame, and stops when it runs out', () => {
    const runner = runnerFor()
    const stop = startClock(runner)
    runner.apply({ type: 'choose', id: 'bell' })
    vi.advanceTimersByTime(1000)
    expect(runner.view().timers).toEqual([{ id: 'bell', label: null, left: 1000, total: 2000 }])
    vi.advanceTimersByTime(1500)
    expect(runner.state.sceneId).toBe('missed')
    expect(runner.view().timers).toEqual([])
    expect(ticks(runner).reduce((sum, tick) => sum + tick.ms, 0)).toBe(2000)
    stop()
  })

  it('drops the time the page is hidden, and stops when told', () => {
    const runner = runnerFor()
    let hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    try {
      const stop = startClock(runner, { every: 50 })
      runner.apply({ type: 'choose', id: 'play' })
      runner.apply({ type: 'minigame', input: 'space' })
      vi.advanceTimersByTime(120)
      hidden = true
      document.dispatchEvent(new Event('visibilitychange'))
      const sent = ticks(runner).reduce((sum, tick) => sum + tick.ms, 0)
      expect(sent).toBe(120)
      vi.advanceTimersByTime(5000)
      expect(ticks(runner).reduce((sum, tick) => sum + tick.ms, 0)).toBe(120)
      hidden = false
      document.dispatchEvent(new Event('visibilitychange'))
      vi.advanceTimersByTime(100)
      expect(ticks(runner).reduce((sum, tick) => sum + tick.ms, 0)).toBe(220)
      stop()
      vi.advanceTimersByTime(1000)
      expect(ticks(runner).reduce((sum, tick) => sum + tick.ms, 0)).toBe(220)
      expect(runner.state.minigame).not.toBeNull()
    } finally {
      delete (document as { hidden?: boolean }).hidden
    }
  })
})

describe('startKeys', () => {
  it('picks the choices on screen by number, skipping a greyed-out one', () => {
    const runner = runnerFor()
    const stop = startKeys(runner)
    press('3')
    expect(runner.log().commands).toEqual([])
    press('2')
    expect(runner.log().commands).toEqual([{ type: 'choose', id: 'rest' }])
    // Not while typing, and not with a modifier.
    const field = document.body.appendChild(document.createElement('input'))
    field.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))
    press('2', { ctrlKey: true })
    expect(runner.log().commands).toHaveLength(1)
    field.remove()
    stop()
    press('2')
    expect(runner.log().commands).toHaveLength(1)
  })

  it('sends the game’s own keys first, and gives Escape to the menu', () => {
    const runner = runnerFor()
    const menu = vi.fn()
    const picked: number[] = []
    const stop = startKeys(runner, { escape: menu, map: { r: { type: 'choose', id: 'rest' } }, choices: (key) => (picked.push(key), true) })
    press('r')
    expect(runner.log().commands).toEqual([{ type: 'choose', id: 'rest' }])
    press('Escape')
    expect(menu).toHaveBeenCalledTimes(1)
    press('1')
    expect(picked).toEqual([1])
    expect(runner.log().commands).toHaveLength(1)
    stop()
  })

  it('lets Escape through when its handler says it did nothing', () => {
    const runner = runnerFor()
    let menuOnScreen = false
    const stop = startKeys(runner, { escape: () => menuOnScreen })
    expect(press('Escape')).toBe(true) // not taken: the page still gets it
    menuOnScreen = true
    expect(press('Escape')).toBe(false)
    stop()
  })

  it('presses a minigame’s inputs from the keyboard, before the number keys', () => {
    const runner = runnerFor()
    const stop = startKeys(runner)
    press('1')
    expect(runner.state.minigame?.state).toBe('ready')
    expect(press(' ')).toBe(false) // taken, so the page doesn't scroll
    expect(runner.state.minigame?.state).toBe('throw')
    // Left belongs to the minigame even where it does nothing.
    press('ArrowLeft')
    expect(runner.state.sceneId).toBe('missed')
    stop()
  })

  it('leaves a dialog its own keys', () => {
    const runner = runnerFor()
    const stop = startMinigameKeys(runner)
    const dialog = document.body.appendChild(document.createElement('div'))
    dialog.setAttribute('role', 'dialog')
    runner.apply({ type: 'choose', id: 'play' })
    press(' ')
    expect(runner.state.minigame?.state).toBe('ready')
    dialog.remove()
    press(' ')
    expect(runner.state.minigame?.state).toBe('throw')
    stop()
  })
})

describe('minigameInput', () => {
  it('maps a key to an input: the minigame’s keys, the arrows and space, or a one-letter name', () => {
    const view = { inputs: ['space', 'a'], keys: { jump: ['w', 'ArrowUp'] } } as unknown as Parameters<typeof minigameInput>[0]
    expect(minigameInput(view, ' ')).toBe('space')
    expect(minigameInput(view, 'A')).toBe('a')
    expect(minigameInput(view, 'W')).toBe('jump')
    expect(minigameInput(view, 'ArrowUp')).toBe('jump')
    expect(minigameInput(view, 'x')).toBeUndefined()
  })
})

describe('nextSlot', () => {
  it('numbers a new save one past the highest numbered slot, broken ones included', () => {
    expect(nextSlot([])).toBe('1')
    const meta = (slot: string) => ({ slot }) as Parameters<typeof nextSlot>[0][number]
    expect(nextSlot([meta('auto'), meta('2'), meta('quick')])).toBe('3')
    expect(nextSlot([meta('1'), { slot: '7', broken: 'That is not a save file.' }])).toBe('8')
  })
})

describe('reveals', () => {
  it('swallows the next key press to show everything, until stopped', () => {
    const skip = vi.fn()
    const runner = runnerFor()
    const stopKeys = startKeys(runner)
    const stop = startRevealSkip(skip)
    press('2')
    expect(skip).toHaveBeenCalledTimes(1)
    expect(runner.log().commands).toEqual([])
    stop()
    press('2')
    expect(skip).toHaveBeenCalledTimes(1)
    expect(runner.log().commands).toHaveLength(1)
    stopKeys()
  })
})
