// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { createRunner, loadGame, startingState } from '@ifloom/engine'
import { EntityTable, GameShell } from '../src/index.ts'
import { storyOf } from './layouts.tsx'

afterEach(cleanup)

/** A café with no places: two members of staff, each with their own numbers, and a way to hire a third. */
function cafe() {
  const { game, problems } = loadGame(
    [
      { name: 'base', actions: [] },
      {
        name: 'cafe',
        kinds: [{ id: 'staff', label: 'Member of staff', plural: 'Staff' }],
        stats: [
          { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
          { id: 'wage', label: 'Wage', of: 'staff', start: 10, format: '£{n}' },
        ],
        entities: [
          { id: 'ana', of: 'staff', name: 'Ana', stats: { wage: 12 } },
          { id: 'ben', of: 'staff', name: 'Ben', desc: 'New this week.', image: 'staff/ben' },
        ],
        actions: [{ id: 'hire', label: 'Hire someone', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Cleo', stats: { morale: 90 } } }] }],
      },
    ],
    { id: 'cafe', title: 'The Café' },
  )
  expect(problems).toEqual([])
  return game
}

describe('EntityTable', () => {
  it('draws a table per kind, a row each, and a row for one hired in play', () => {
    const game = cafe()
    const runner = createRunner(game, startingState(game))
    render(<GameShell runner={runner} layout={storyOf(<EntityTable />)} />)
    const staff = document.querySelector('[data-kind="staff"]') as HTMLElement
    expect(within(staff).getByText('Staff')).toBeTruthy()
    const rows = () => [...staff.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent))
    expect(rows()).toEqual([
      ['Ana', '60', '£12'],
      ['BenNew this week.', '60', '£10'],
    ])
    expect(staff.querySelector('[data-entity="staff:ben"] img')?.getAttribute('src')).toBe('art/staff/ben.jpg')
    expect(staff.querySelector('[data-entity="staff:ana"] img')).toBeNull()
    act(() => void runner.apply({ type: 'action', id: 'hire' }))
    expect(rows()).toEqual([
      ['Ana', '60', '£12'],
      ['BenNew this week.', '60', '£10'],
      ['Cleo', '90', '£10'],
    ])
    expect(staff.querySelector('[data-entity="staff:#1"]')).toBeTruthy()
    // No places: no location panel.
    expect(screen.queryByText('The Café', { selector: 'h3' })).toBeNull()
  })
})
