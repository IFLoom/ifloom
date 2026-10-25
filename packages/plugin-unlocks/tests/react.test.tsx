// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SCHEMA, createRunner, loadGame, memoryDriver, profile, startingState, type Game, type Pack, type Runner } from '@ifloom/engine'
import { GameProvider, GameShell, type PluginUi } from '@ifloom/react'
import { lockContent, startUnlocks, unlockHash, unlocks, type LockedContent, type UnlockDef } from '../src/index.ts'
import { UnlocksPanel, unlocksUi, unlocksUiWith, useUnlocks, type UnlocksUiOptions } from '../src/react/index.tsx'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const CODE = 'HIGH-STREET-2026'
const base = { id: 'supporter', name: 'Supporter edition', description: 'A scene behind the bakery.', iterations: 1000 }
const supporter: UnlockDef = { ...base, hash: await unlockHash(CODE, 'unlocks-ui', base) }
const extra: Pack = { id: 'supporter', schema: SCHEMA, prose: { thanks: 'Thank you for helping the bakery stay open.' } }
const content: Record<string, LockedContent> = { supporter: await lockContent(CODE, 'unlocks-ui', supporter, [extra]) }

function game(withPlugin = true): Game {
  return loadGame(
    [
      {
        scenes: [{ id: 'intro', body: [], choices: [] }],
        ...(withPlugin ? { data: { unlocks: { unlocks: [supporter] } } } : {}),
      },
    ],
    { id: 'unlocks-ui', title: 'High Street', plugins: withPlugin ? [unlocks()] : [] },
  ).game
}

function runnerFor(g = game()): Runner {
  return createRunner(g, { ...startingState(g), sceneId: null }, { profile: profile(g, memoryDriver()) })
}

/** The unlocks UI, its codes started with this file's locked content. */
const ui = (options: UnlocksUiOptions = {}): PluginUi[] => [
  unlocksUiWith({ start: (runner) => startUnlocks(runner, { content }), onChange: vi.fn(), ...options }),
]

async function enter(code: string) {
  const panel = document.querySelector('[data-part="unlocks"]') as HTMLElement
  fireEvent.change(within(panel).getByRole('textbox', { name: 'Code' }), { target: { value: code } })
  await act(async () => {
    fireEvent.click(within(panel).getByRole('button', { name: 'Unlock' }))
  })
}

describe('entering a code', () => {
  it('is on the settings page: a wrong code is refused, the right one unlocks and offers a restart for its content', async () => {
    const onChange = vi.fn()
    const runner = runnerFor()
    render(<GameShell runner={runner} pages={{}} plugins={ui({ onChange })} />)
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Settings' })))
    expect(screen.getByRole('heading', { name: 'Enter a code' })).toBeTruthy()
    const row = document.querySelector('[data-unlock="supporter"]') as HTMLElement
    expect(row.textContent).toBe('Supporter editionLockedA scene behind the bakery.')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Code' })).toBeTruthy())

    await enter('BAKERY-2026')
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('That code doesn’t unlock anything.'))

    await enter('high street 2026')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Unlocked: Supporter edition.'))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(row.hasAttribute('data-unlocked')).toBe(true)
    expect(within(row).getByText('Unlocked')).toBeTruthy()
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Restart to add it' })))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('textbox', { name: 'Code' }) as HTMLInputElement).value).toBe('')
  })

  it('is in the menu when the game has no pages', async () => {
    render(<GameShell runner={runnerFor()} plugins={ui()} />)
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Enter a code' })))
    const dialog = screen.getByRole('dialog', { name: 'Enter a code' })
    expect(within(dialog).getByText('Supporter edition')).toBeTruthy()
  })

  it('shows what the profile could not open under the box', () => {
    render(
      <GameShell
        runner={runnerFor()}
        pages={{}}
        plugins={ui({ problems: ['unlock:supporter · its code has changed since it was entered; enter the new one'] })}
      />,
    )
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Settings' })))
    expect(document.querySelector('[data-part="unlock-problem"]')?.textContent).toBe(
      'unlock:supporter · its code has changed since it was entered; enter the new one',
    )
  })

  it('is nowhere without the unlocks UI, and the panel then lists the unlocks with no box', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} />)
    expect(screen.queryByRole('button', { name: 'Enter a code' })).toBeNull()
    cleanup()
    render(
      <GameProvider runner={runner}>
        <UnlocksPanel />
      </GameProvider>,
    )
    expect(screen.getByText('Supporter edition')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('useUnlocks', () => {
  const wrap = (runner: Runner, plugins?: PluginUi[]) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <GameProvider runner={runner} plugins={plugins}>
          {children}
        </GameProvider>
      )
    }

  it('is null in a game without the plugin', () => {
    const { result } = renderHook(() => useUnlocks(), { wrapper: wrap(runnerFor(game(false))) })
    expect(result.current).toBeNull()
  })

  it('gives the view and enters a code, with no markup', async () => {
    const runner = runnerFor()
    const { result } = renderHook(() => useUnlocks(), { wrapper: wrap(runner, ui()) })
    expect(result.current).toMatchObject({ unlocked: 0, total: 1, entered: null, message: null })
    await waitFor(() => expect(result.current?.available).toBe(true))
    let worked = false
    await act(async () => {
      worked = await result.current!.enter(CODE)
    })
    expect(worked).toBe(true)
    expect(result.current).toMatchObject({ unlocked: 1, entered: { unlock: 'supporter', already: false, restart: true } })
    expect(typeof result.current!.restart).toBe('function')
  })
})

describe('unlocksUi', () => {
  it('starts codes with startUnlocks, and offers no restart without onChange', async () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} plugins={[unlocksUi]} />)
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Enter a code' })))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Code' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Restart to add it' })).toBeNull()
  })
})
