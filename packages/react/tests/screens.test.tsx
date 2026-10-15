// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, memoryDriver, saves, startingState, type Game } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { GameShell } from '../src/index.ts'

afterEach(cleanup)

function game(): Game {
  return loadGame(
    [
      {
        id: 'town',
        schema: SCHEMA,
        items: [
          { id: 'coat', name: 'coat', desc: '', kind: 'gear' },
          { id: 'cape', name: 'cape', desc: '', kind: 'gear' },
        ],
        activities: [{ id: 'wait', effects: [{ kind: 'flag', key: 'waited', add: 1 }] }],
        scenes: [{ id: 'intro', title: 'Hello', body: [{ text: 'intro' }], choices: [{ id: 'go', effects: [{ kind: 'scene', id: null }] }] }],
        inputs: [
          { id: 'catName', label: 'Name the cat', kind: 'text', maxLength: 8 },
          { id: 'tea', label: 'Tea or coffee', kind: 'choice', options: [{ value: 'tea', label: 'Tea' }, { value: 'coffee', label: 'Coffee' }] },
        ],
        prose: { 'place.house': 'Home.', intro: 'Hi.', 'intro#go': 'Go in' },
        data: {
          places: { locations: [{ id: 'house', name: 'House', tag: 'Home', kind: 'room', exits: [], art: '', body: [{ text: 'place.house' }] }] },
          wardrobe: { clothes: [{ id: 'coat', slot: 'back' }, { id: 'cape', slot: 'back' }] },
        },
      },
    ],
    {
      id: 'screens',
      title: 'Screens',
      introScene: 'intro',
      plugins: [places({ start: 'house' }), wardrobe({ slots: [{ id: 'back', label: 'Back' }], start: { back: 'coat' } })],
      actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
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
  it('wears and takes off clothes', () => {
    const runner = play()
    const panel = document.querySelector('[data-wardrobe]') as HTMLElement
    expect(within(panel).getByText('coat')).toBeTruthy()
    click(within(panel).getByRole('button', { name: 'Wear cape' }))
    expect((runner.view().plugins.wardrobe as { slots: { item: string }[] }).slots[0].item).toBe('cape')
    click(within(panel).getByRole('button', { name: 'Take off' }))
    expect((runner.view().plugins.wardrobe as { slots: { item: string | null }[] }).slots[0].item).toBeNull()
  })

  it('takes typed and picked input, and shows the refusal for a bad one', () => {
    const runner = play()
    const field = document.querySelector('[data-input="catName"]') as HTMLElement
    act(() => void fireEvent.change(within(field).getByLabelText('Name the cat'), { target: { value: 'Sir Biscuit' } }))
    click(within(field).getByRole('button', { name: 'Enter' }))
    expect(within(field).getByText('Keep it to 8 characters.')).toBeTruthy()
    act(() => void fireEvent.change(within(field).getByLabelText('Name the cat'), { target: { value: 'Biscuit' } }))
    click(within(field).getByRole('button', { name: 'Enter' }))
    click(screen.getByRole('button', { name: 'Coffee' }))
    expect(runner.state.flags).toMatchObject({ catName: 'Biscuit', tea: 'coffee' })
  })

  it('offers undo and the backlog only when the game turns them on', () => {
    play()
    expect(document.querySelector('[data-menu]')).toBeNull()
    cleanup()
    const runner = play({ history: true, backlog: { limit: 20 } })
    click(screen.getByRole('button', { name: /Go in/ }))
    click(screen.getByRole('button', { name: /Wait a while/ }))
    expect(runner.state.flags.waited).toBe(1)
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
    await waitFor(() => expect(runner.state.flags).toEqual(saved.flags))
  })
})

describe('the mod manager', () => {
  it('adds a mod from a file, turns it off, and offers to restart with the change', async () => {
    const { mods, memoryDriver, SCHEMA: schema } = await import('@ifloom/engine')
    const store = mods('screens', memoryDriver())
    const g = game()
    let restarted = 0
    render(<GameShell runner={createRunner(g, startingState(g))} mods={{ store, problems: ['mod:extra · scene x · no prose for "x"'], onChange: () => void (restarted += 1) }} />)
    click(screen.getByRole('button', { name: 'Mods' }))
    const file = new File([JSON.stringify({ ifloomMod: 1, id: 'extra', name: 'Extra', game: 'screens', pack: { id: 'x', schema } })], 'extra.json', { type: 'application/json' })
    await act(async () => void fireEvent.change(document.querySelector('[data-mods] input[type=file]') as HTMLInputElement, { target: { files: [file] } }))
    await waitFor(() => expect(document.querySelector('[data-mod="extra"]')).toBeTruthy())
    expect(document.querySelector('[data-mod="extra"]')?.textContent).toContain('no prose for "x"')
    await act(async () => void fireEvent.click(within(document.querySelector('[data-mod="extra"]') as HTMLElement).getByRole('button', { name: 'On' })))
    await waitFor(async () => expect((await store.list())[0].enabled).toBe(false))
    click(screen.getByRole('button', { name: 'Restart with these mods' }))
    expect(restarted).toBe(1)
  })
})
