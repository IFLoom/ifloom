// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { checkUiHints, GameShell } from '../src/index.ts'
import { DICE_ROLL_MS } from '../src/hints.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** A riverbank where you skim a stone against 8, with a line for each outcome under the dice, and ducks counted by a roll no line names. */
function river(): Game {
  return loadGame(
    [
      { name: 'base', introScene: 'bank' },
      {
        name: 'river',
        scenes: [
          {
            id: 'bank',
            title: 'The bank',
            body: [
              { prose: 'bank' },
              { prose: 'bank.skipped', when: { roll: 'skim', passed: true }, ui: { dice: 'skim' } },
              { prose: 'bank.sank', when: { roll: 'skim', passed: false }, ui: { dice: 'skim' } },
            ],
            choices: [
              { id: 'skim', label: 'Skim a stone', effects: [{ roll: 'skim', dice: '2d6', against: 8 }] },
              { id: 'ducks', label: 'Count the ducks', effects: [{ roll: 'ducks', dice: '1d6+2' }] },
              { id: 'wait', label: 'Wait', effects: [] },
            ],
          },
        ],
        prose: {
          bank: 'Flat stones along the bank.',
          'bank.skipped': 'It skips to the far side.',
          'bank.sank': 'Plop.',
        },
      },
    ],
    { id: 'river', title: 'The River' },
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
  const game = river()
  const runner = createRunner(game, startingState(game, { seed: 3 }))
  render(<GameShell runner={runner} layout={Reading} {...props} />)
  return runner
}

const press = (name: RegExp) => act(() => screen.getByRole('button', { name }).click())
const dice = () => [...document.querySelectorAll('[data-part="dice"]')] as HTMLElement[]
const faces = (box: HTMLElement) => [...box.querySelectorAll('[data-part="dice-face"]')].map((face) => face.textContent)

describe('DiceRoll', () => {
  it('tumbles, then settles on the faces the engine rolled, with the total and the outcome, before its block comes', () => {
    vi.useFakeTimers()
    reducedMotion(false)
    const runner = play()
    expect(dice()).toEqual([])
    press(/Skim a stone/)
    const roll = runner.view().rolls[0]
    const [box] = dice()
    expect(box.getAttribute('data-roll')).toBe('skim')
    expect(box.getAttribute('data-state')).toBe('rolling')
    expect(box.querySelector('[data-part="dice-total"]')).toBeNull()
    // The line under the dice waits for them.
    const held = box.nextElementSibling as HTMLElement
    expect(held.getAttribute('data-part')).toBe('reveal')
    expect(held.style.getPropertyValue('--ifloom-reveal-at')).toBe(`${DICE_ROLL_MS}ms`)
    expect(held.textContent).toBe(roll.passed ? 'It skips to the far side.' : 'Plop.')
    act(() => {
      vi.advanceTimersByTime(DICE_ROLL_MS)
    })
    expect(box.getAttribute('data-state')).toBe('settled')
    expect(faces(box)).toEqual(roll.faces.map(String))
    expect(box.querySelector('[data-part="dice-total"]')?.textContent).toBe(`= ${roll.total}`)
    expect(box.getAttribute('data-passed')).toBe(String(roll.passed))
    expect(box.querySelector('[data-part="dice-outcome"]')?.textContent).toContain('needs 8')
    // Read out once settled.
    expect(screen.getByRole('status').textContent).toContain(`Rolled 2d6: ${roll.faces.join(', ')}, total ${roll.total}.`)
  })

  it('shows the dice settled at once when the player asks for reduced motion', () => {
    reducedMotion(true)
    const runner = play()
    press(/Skim a stone/)
    const [box] = dice()
    expect(box.getAttribute('data-state')).toBe('settled')
    expect(faces(box)).toEqual(runner.view().rolls[0].faces.map(String))
    expect(document.querySelector('[data-reveal]')).toBeNull()
  })

  it('draws a roll that is no longer new settled, and nothing once the command after made none', () => {
    reducedMotion(false)
    vi.useFakeTimers()
    play()
    press(/Skim a stone/)
    expect(dice()).toHaveLength(1)
    press(/Wait/)
    // The outcome line stays, but the last command rolled nothing.
    expect(dice()).toEqual([])
  })

  it('shows a roll no block names over the scene for a moment', () => {
    reducedMotion(false)
    vi.useFakeTimers()
    const runner = play()
    press(/Count the ducks/)
    const overlay = document.querySelector('[data-part="dice-overlay"]') as HTMLElement
    expect(overlay).not.toBeNull()
    expect(overlay.querySelector('[data-part="dice"]')?.getAttribute('data-roll')).toBe('ducks')
    act(() => {
      vi.advanceTimersByTime(DICE_ROLL_MS)
    })
    expect(overlay.querySelector('[data-part="dice-plus"]')?.textContent).toBe('+2')
    expect(overlay.querySelector('[data-part="dice-total"]')?.textContent).toBe(`= ${runner.view().rolls[0].total}`)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(document.querySelector('[data-part="dice-overlay"]')).toBeNull()
  })

  it('can be replaced by name', () => {
    reducedMotion(false)
    play({ components: { DiceRoll: ({ roll }) => <p data-testid="mine">{roll.total}</p> } })
    press(/Skim a stone/)
    expect(screen.getByTestId('mine')).toBeTruthy()
  })
})

describe('checkUiHints and dice', () => {
  it('accepts a roll key, and reports anything else', () => {
    expect(checkUiHints(river())).toEqual([])
    const game = river()
    const bad = { ...game, scenes: [{ id: 'x', title: 'X', body: [{ prose: 'bank', ui: { dice: 3 } }], choices: [] }] } as unknown as Game
    expect(checkUiHints(bad)).toEqual(["scene x block 1: ui.dice names a roll's key: letters, digits and _"])
  })
})
