// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { createRunner, loadGame, startingState } from '@ifloom/engine'
import { GameShell } from '../src/index.ts'

afterEach(cleanup)

/** A kitchen where cooking has levels and coins don't. */
function kitchen(strings: Record<string, string> = {}) {
  const { game, problems } = loadGame(
    [
      { name: 'base', strings, actions: [] },
      {
        name: 'kitchen',
        stats: [
          { id: 'cooking', label: 'Cooking', start: 15, levels: { at: [10, 30, 60] } },
          { id: 'coins', label: 'Coins', start: 5 },
        ],
        actions: [{ id: 'cook', label: 'Cook', effects: [{ kind: 'stat', stat: 'cooking', by: 50 }] }],
      },
    ],
    { id: 'kitchen', title: 'The Kitchen' },
  )
  expect(problems).toEqual([])
  return game
}

const row = (key: string) => document.querySelector(`[data-stat="${key}"]`) as HTMLElement

describe('StatList', () => {
  it('shows a levelled stat’s level and a bar towards the next, and nothing extra on other stats', () => {
    const game = kitchen()
    const runner = createRunner(game, startingState(game))
    render(<GameShell runner={runner} />)
    const level = row('cooking').querySelector('[data-part="stat-level"]')!
    expect(level.textContent).toBe('Level 1')
    expect(level.getAttribute('data-level')).toBe('1')
    const bar = row('cooking').querySelector('[data-part="stat-progress"]')!
    expect(bar.getAttribute('role')).toBe('progressbar')
    // 15 is a quarter of the way from 10 to 30.
    expect(bar.getAttribute('aria-valuenow')).toBe('25')
    expect(bar.getAttribute('aria-label')).toBe('Cooking: 25% of the way to level 2')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('25%')
    expect(row('coins').querySelector('[data-part="stat-level"]')).toBeNull()
    expect(row('coins').querySelector('[data-part="stat-progress"]')).toBeNull()

    // At the top level: the level, and no bar.
    act(() => void runner.apply({ type: 'action', id: 'cook' }))
    expect(row('cooking').querySelector('[data-part="stat-level"]')!.textContent).toBe('Level 3')
    expect(row('cooking').querySelector('[data-part="stat-progress"]')).toBeNull()
  })

  it('writes the level in the game’s words', () => {
    const game = kitchen({ 'ui.statLevel': 'Lv {level}' })
    render(<GameShell runner={createRunner(game, startingState(game))} />)
    expect(row('cooking').querySelector('[data-part="stat-level"]')!.textContent).toBe('Lv 1')
  })
})
