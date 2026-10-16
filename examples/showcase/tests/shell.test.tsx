// @vitest-environment jsdom
/** The showcase's own React UI: the notice strip over the stage, and the number keys on. */
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { apply, createRunner, notify, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import { smallTown } from '../src/game.ts'
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
})
