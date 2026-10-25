// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRunner, loadGame, memoryDriver, saves, startingState, type Game } from '@ifloom/engine'
import { GameShell } from '../src/index.ts'

afterEach(cleanup)

function game(): Game {
  return loadGame(
    [
      { name: 'base', introScene: 'intro', actions: [] },
      {
        name: 'town',
        actions: [{ id: 'wait', label: 'Wait a while', effects: [{ kv: 'waited', by: 1 }] }],
        scenes: [{ id: 'intro', title: 'Hello', body: [{ text: 'intro' }], choices: [{ id: 'go', effects: [{ scene: null }] }] }],
        inputs: [
          { id: 'catName', label: 'Name the cat', type: 'text', maxLength: 8 },
          {
            id: 'tea',
            label: 'Tea or coffee',
            type: 'choice',
            options: [
              { value: 'tea', label: 'Tea' },
              { value: 'coffee', label: 'Coffee' },
            ],
          },
        ],
        prose: { intro: 'Hi.', 'intro#go': 'Go in' },
      },
    ],
    {
      id: 'screens',
      title: 'Screens',
    },
  ).game
}

function play(options: Parameters<typeof createRunner>[2] = {}) {
  const g = game()
  const runner = createRunner(g, startingState(g), options)
  render(<GameShell runner={runner} />)
  return runner
}

const click = (element: Element) => act(() => void fireEvent.click(element))

describe('the React UI’s screens', () => {
  it('takes typed and picked input, and shows the refusal for a bad one', () => {
    const runner = play()
    const field = document.querySelector('[data-input="catName"]') as HTMLElement
    act(() => void fireEvent.change(within(field).getByLabelText('Name the cat'), { target: { value: 'Sir Biscuit' } }))
    click(within(field).getByRole('button', { name: 'Enter' }))
    expect(within(field).getByText('Keep it to 8 characters.')).toBeTruthy()
    act(() => void fireEvent.change(within(field).getByLabelText('Name the cat'), { target: { value: 'Biscuit' } }))
    click(within(field).getByRole('button', { name: 'Enter' }))
    click(screen.getByRole('button', { name: 'Coffee' }))
    expect(runner.state.kv).toMatchObject({ catName: 'Biscuit', tea: 'coffee' })
  })

  it('offers undo and the backlog only when the game turns them on', () => {
    play()
    expect(document.querySelector('[data-menu]')).toBeNull()
    cleanup()
    const runner = play({ history: true, backlog: { limit: 20 } })
    click(screen.getByRole('button', { name: /Go in/ }))
    click(screen.getByRole('button', { name: /Wait a while/ }))
    expect(runner.state.kv.waited).toBe(1)
    click(screen.getByRole('button', { name: 'Undo' }))
    expect(runner.canRedo).toBe(true)
    click(screen.getByRole('button', { name: 'Backlog' }))
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Go in')
  })

  it('saves, lists, and loads a slot', async () => {
    const g = game()
    const store = saves(g, memoryDriver())
    const runner = play({ saves: store })
    click(screen.getByRole('button', { name: /Go in/ }))
    click(screen.getByRole('button', { name: 'Saves' }))
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Save in a new slot' })))
    await waitFor(() => expect(document.querySelector('[data-save-slot="1"]')).toBeTruthy())
    const saved = runner.state
    click(screen.getByRole('button', { name: 'Close' }))
    click(screen.getByRole('button', { name: /Wait a while/ }))
    expect(runner.state).not.toEqual(saved)
    click(screen.getByRole('button', { name: 'Saves' }))
    await waitFor(() => expect(document.querySelector('[data-save-slot="1"]')).toBeTruthy())
    await act(async () => void fireEvent.click(within(document.querySelector('[data-save-slot="1"]') as HTMLElement).getByRole('button', { name: 'Load' })))
    await waitFor(() => expect(runner.state.kv).toEqual(saved.kv))
  })
})

describe('the mod manager', () => {
  it('adds a mod from a file, turns it off, and offers to restart with the change', async () => {
    const { mods, memoryDriver, SCHEMA: schema } = await import('@ifloom/engine')
    const store = mods('screens', memoryDriver())
    const g = game()
    let restarted = 0
    render(
      <GameShell
        runner={createRunner(g, startingState(g))}
        mods={{ store, problems: ['mod:extra · scene x · no prose for "x"'], onChange: () => void (restarted += 1) }}
      />,
    )
    click(screen.getByRole('button', { name: 'Mods' }))
    const file = new File([JSON.stringify({ ifloomMod: 1, id: 'extra', name: 'Extra', game: 'screens', pack: { id: 'x', schema } })], 'extra.json', {
      type: 'application/json',
    })
    await act(async () => void fireEvent.change(document.querySelector('[data-mods] input[type=file]') as HTMLInputElement, { target: { files: [file] } }))
    await waitFor(() => expect(document.querySelector('[data-mod="extra"]')).toBeTruthy())
    expect(document.querySelector('[data-mod="extra"]')?.textContent).toContain('no prose for "x"')
    await act(async () => void fireEvent.click(within(document.querySelector('[data-mod="extra"]') as HTMLElement).getByRole('button', { name: 'On' })))
    await waitFor(async () => expect((await store.list())[0].enabled).toBe(false))
    click(screen.getByRole('button', { name: 'Restart with these mods' }))
    expect(restarted).toBe(1)
  })

  it('is on the settings page with pages on, beside the menu entry', async () => {
    const { mods, SCHEMA: schema } = await import('@ifloom/engine')
    const store = mods('screens', memoryDriver())
    await store.add(
      JSON.stringify({
        ifloomMod: 1,
        id: 'naps',
        name: 'Naps',
        version: '1.2',
        description: 'A nap on the sofa.',
        game: 'screens',
        pack: { id: 'naps', schema },
      }),
    )
    const g = game()
    let restarted = 0
    render(
      <GameShell
        runner={createRunner(g, startingState(g))}
        pages={{}}
        mods={{ store, problems: ['mod:naps · scene nap · no prose for "nap"'], onChange: () => void (restarted += 1) }}
      />,
    )
    // The game declares no settings, but the page has the mods, so the title screen offers it.
    click(screen.getByRole('button', { name: 'Settings' }))
    const section = document.querySelector('[data-settings-mods]') as HTMLElement
    expect(within(section).getByRole('heading', { name: 'Mods' })).toBeTruthy()
    expect(screen.queryByText('No settings.')).toBeNull()
    await waitFor(() => expect(section.querySelector('[data-mod="naps"]')).toBeTruthy())
    const row = section.querySelector('[data-mod="naps"]') as HTMLElement
    expect(within(row).getByText('Naps')).toBeTruthy()
    expect(row.textContent).toContain('1.2')
    expect(row.textContent).toContain('A nap on the sofa.')
    expect(row.querySelector('[data-part="mod-problem"]')?.textContent).toBe('mod:naps · scene nap · no prose for "nap"')
    // The toggle says whether the mod is on, and a change offers the restart.
    expect(within(row).getByRole('button', { name: 'On' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('Changes to mods take effect when the game restarts.')).toBeNull()
    await act(async () => void fireEvent.click(within(row).getByRole('button', { name: 'On' })))
    await waitFor(() => expect(within(row).getByRole('button', { name: 'Off' }).getAttribute('aria-pressed')).toBe('false'))
    expect(within(section).getByRole('status').textContent).toContain('Changes to mods take effect when the game restarts.')
    await act(async () => void fireEvent.click(within(row).getByRole('button', { name: 'Delete' })))
    await waitFor(() => expect(section.querySelector('[data-mod="naps"]')).toBeNull())
    expect(await store.list()).toEqual([])
    click(within(section).getByRole('button', { name: 'Restart with these mods' }))
    expect(restarted).toBe(1)
  })

  it('keeps the menu entry, and offers Settings in the game when there are only mods', async () => {
    const { mods } = await import('@ifloom/engine')
    const g = game()
    render(
      <GameShell runner={createRunner(g, startingState(g))} pages={{}} mods={{ store: mods('screens', memoryDriver()), problems: [], onChange: () => {} }} />,
    )
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'New game' })))
    const menu = document.querySelector('[data-menu]') as HTMLElement
    expect(within(menu).getByRole('button', { name: 'Mods' })).toBeTruthy()
    click(within(menu).getByRole('button', { name: 'Settings' }))
    expect(document.querySelector('[data-settings-mods]')).toBeTruthy()
  })
})
