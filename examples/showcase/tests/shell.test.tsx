// @vitest-environment jsdom
/** The showcase's own React UI: the notice strip over the stage, and the number keys on. */
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { apply, createRunner, notify, startingState, type Command, type CommandRef, type GameState } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'
import { GameShell } from '@ifloom/react'
import { clock, smallTown } from '../src/game.ts'
import { layout } from '../src/layout.ts'

const { game } = smallTown()

afterEach(cleanup)

describe('the showcase shell', () => {
  it('shows unseen notices in the strip and numbers the choices', () => {
    const unpacked = apply(startingState(game), game, { type: 'choose', id: 'unpack' }).state
    const runner = createRunner(game, notify(unpacked, { title: 'A letter came for you' }))
    render(<GameShell runner={runner} layout={layout} keys />)

    const strip = document.querySelector('main [data-part="notice-strip"]')
    expect(strip?.textContent).toMatch(/Notices/)
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Notices/ })))
    expect(screen.getByRole('dialog').textContent).toContain('A letter came for you')
  })

  it('shows each choice its number key', () => {
    const runner = createRunner(game, apply(startingState(game), game, { type: 'choose', id: 'unpack' }).state)
    render(<GameShell runner={runner} layout={layout} keys />)
    const keys = [...document.querySelectorAll('[data-part="choice-key"]')].map((key) => key.textContent)
    expect(keys.slice(0, 2)).toEqual(['1', '2'])
  })

  it('draws the plugins\' defaults: the counter, the job board, the achievements and the statuses', () => {
    const run = (state: GameState, ...commands: (Command | CommandRef)[]) => commands.reduce<GameState>((now, command) => apply(now, game, command).state, state)
    const unpacked = run(startingState(game), { type: 'choose', id: 'unpack' })
    const cafe = run(clock.write(unpacked, { day: 1, period: 'morning' }), go('high-street'), go('cafe'), { type: 'activity', id: 'coffee' })
    const runner = createRunner(game, cafe)
    render(<GameShell runner={runner} layout={layout} />)
    expect(document.querySelector('[data-status="caffeinated"]')?.textContent).toContain('Caffeinated')
    expect(document.querySelector('[data-job="weekend"]')?.textContent).toContain('Ava doesn’t know you well enough yet.')
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Shop at The counter/ })))
    expect(screen.getByRole('dialog', { name: 'The counter' }).querySelector('[data-good="flapjack"]')).not.toBeNull()
    act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' }))
    expect(screen.getByRole('button', { name: /Achievements/ }).textContent).toContain('of 2')
  })
})
