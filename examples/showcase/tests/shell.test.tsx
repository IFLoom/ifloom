// @vitest-environment jsdom
/** The showcase's own React UI: the notice strip over the story, and the number keys on. */
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { apply, createRunner, notify, startingState, type Command, type CommandRef, type GameState } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { GameShell } from '@ifloom/react'
import { townUi } from '../src/ui.ts'
import { clock, smallTown } from '../src/game.ts'
import { Layout } from '../src/layout.tsx'

const { game } = smallTown()

afterEach(cleanup)

describe('the showcase shell', () => {
  it('shows unseen notices in the strip and numbers the choices', () => {
    const unpacked = apply(startingState(game), game, { type: 'choose', id: 'unpack' }).state
    const runner = createRunner(game, notify(unpacked, { title: 'A letter came for you' }))
    render(<GameShell runner={runner} plugins={townUi()} layout={Layout} keys />)

    const strip = document.querySelector('main [data-part="notice-strip"]')
    expect(strip?.textContent).toMatch(/Notices/)
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Notices/ })))
    expect(screen.getByRole('dialog').textContent).toContain('A letter came for you')
  })

  it('shows each choice its number key', () => {
    const runner = createRunner(game, apply(startingState(game), game, { type: 'choose', id: 'unpack' }).state)
    render(<GameShell runner={runner} plugins={townUi()} layout={Layout} keys />)
    const keys = [...document.querySelectorAll('[data-part="choice-key"]')].map((key) => key.textContent)
    expect(keys.slice(0, 2)).toEqual(['1', '2'])
  })

  it("draws the plugins' defaults: the achievements and the statuses, and the counter and the job board in panels", () => {
    const run = (state: GameState, ...commands: (Command | CommandRef)[]) =>
      commands.reduce<GameState>((now, command) => apply(now, game, command).state, state)
    const unpacked = run(startingState(game), { type: 'choose', id: 'unpack' })
    const cafe = run(clock.write(unpacked, { day: 1, period: 'morning' }), places.go('high-street'), places.go('cafe'), { type: 'action', id: 'places/coffee' })
    const runner = createRunner(game, cafe)
    render(<GameShell runner={runner} plugins={townUi()} layout={Layout} />)
    expect(document.querySelector('[data-status="caffeinated"]')?.textContent).toContain('Caffeinated')
    expect(screen.getByRole('button', { name: /Achievements/ }).textContent).toContain('of 2')
    // Nothing about the shop or the jobs is on screen until content opens it.
    expect(document.querySelector('[data-job], [data-vendor]')).toBeNull()
    // The café's "Go to the counter" opens the counter.
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Go to the counter/ })))
    expect(screen.getByRole('dialog', { name: 'The counter' }).querySelector('[data-good="item:flapjack"]')).not.toBeNull()
    act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' }))
    expect(runner.state.panel).toBeNull()
    // Asking Ava about work opens the job board, every job on it.
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Talk to Ava/ })))
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Ask about weekend work/ })))
    const board = screen.getByRole('dialog', { name: 'Jobs' })
    expect(board.querySelector('[data-job="weekend"]')?.textContent).toContain('Ava doesn’t know you well enough yet.')
    expect(board.querySelector('[data-job="dogs"]')).not.toBeNull()
  })

  it("opens the newspaper's job ads from the inventory: the board, with only the paper's jobs", () => {
    const runner = createRunner(game, apply(startingState(game), game, { type: 'choose', id: 'unpack' }).state)
    render(<GameShell runner={runner} plugins={townUi()} layout={Layout} />)
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Read the job ads/ })))
    const board = screen.getByRole('dialog', { name: 'Jobs' })
    expect([...board.querySelectorAll('[data-job]')].map((job) => job.getAttribute('data-job'))).toEqual(['dogs'])
  })

  it('shows what you are wearing at home only, and the flat’s wardrobe opens it as a panel', () => {
    const unpacked = apply(startingState(game), game, { type: 'choose', id: 'unpack' }).state
    const runner = createRunner(game, unpacked)
    render(<GameShell runner={runner} plugins={townUi()} layout={Layout} />)
    expect(document.querySelector('[data-section="wardrobe"]')).not.toBeNull()
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Open the wardrobe/ })))
    expect(screen.getByRole('dialog', { name: 'Wearing' }).querySelector('[data-part="wardrobe"]')).not.toBeNull()
    act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' }))
    act(() => void runner.apply(places.go('high-street')))
    expect(document.querySelector('[data-section="wardrobe"]')).toBeNull()
  })
})
