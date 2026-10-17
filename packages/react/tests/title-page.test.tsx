// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, memoryDriver, profile, saves, startingState, type Game } from '@ifloom/engine'
import { GameShell, READING_LAYOUT, usePage, useSetting, type PagesOptions } from '../src/index.ts'

afterEach(cleanup)

function letter(): Game {
  return loadGame(
    [
      {
        id: 'letter',
        schema: SCHEMA,
        settings: [
          { id: 'hints', label: 'Show hints', kind: 'toggle', default: true },
          {
            id: 'textSize',
            label: 'Text size',
            kind: 'choice',
            affects: 'ui',
            options: [
              { value: 'normal', label: 'Normal' },
              { value: 'large', label: 'Large' },
            ],
            default: 'normal',
          },
        ],
        scenes: [
          {
            id: 'mat',
            title: 'The mat',
            body: [{ text: 'mat' }, { when: { kv: 'readBefore' }, text: 'again' }],
            choices: [
              { id: 'open', effects: [{ kind: 'kv', key: 'readBefore', to: true }] },
              { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
            ],
          },
        ],
        prose: { mat: 'A letter on the mat.', again: 'You have read it before.', 'mat#open': 'Open it', 'mat#leave': 'Leave it' },
      },
    ],
    { id: 'letter', title: 'The Letter', introScene: 'mat', carryOver: { kv: ['readBefore'] }, finished: { kv: 'readBefore' } },
  ).game
}

function play(pages: boolean | PagesOptions = true, driver = memoryDriver()) {
  const game = letter()
  const runner = createRunner(game, startingState(game), {
    saves: saves(game, driver),
    profile: profile(game, driver),
  })
  const view = render(<GameShell runner={runner} layout={READING_LAYOUT} pages={pages} />)
  return { runner, driver, view }
}

const titleButton = (name: string) => document.querySelector(`[data-title-button="${name}"]`) as HTMLElement | null

describe('the pages', () => {
  it('goes from the gate to the title, into the game, and back through the menu', async () => {
    play({
      subtitle: 'A short story',
      gate: { title: 'Before you start', text: 'One.\n\nTwo.', confirm: 'Go on', decline: { label: 'Leave', href: 'https://example.com/' } },
    })
    expect(await screen.findByText('Before you start')).toBeTruthy()
    expect(document.querySelectorAll('[data-part="gate-text"] p')).toHaveLength(2)
    expect(screen.getByText('Leave').getAttribute('href')).toBe('https://example.com/')
    await act(async () => fireEvent.click(screen.getByText('Go on')))
    expect(await screen.findByText('A short story')).toBeTruthy()
    expect(document.querySelector('[data-part="title-name"]')?.textContent).toBe('The Letter')
    expect(document.querySelector('[data-part="scene"]')).toBeNull()

    await act(async () => fireEvent.click(titleButton('new')!))
    expect(await screen.findByText('A letter on the mat.')).toBeTruthy()
    fireEvent.click(screen.getByText('Title screen'))
    expect(document.querySelector('[data-page="title"]')).not.toBeNull()
  })

  it('remembers that the gate was confirmed', async () => {
    const gate = { title: 'Before you start', text: 'One.', confirm: 'Go on' }
    const { driver, view } = play({ gate })
    const confirm = await screen.findByText('Go on')
    await act(async () => fireEvent.click(confirm))
    view.unmount()
    play({ gate }, driver)
    await waitFor(() => expect(document.querySelector('[data-page="title"]')).not.toBeNull())
    expect(screen.queryByText('Before you start')).toBeNull()
  })

  it('offers Continue only once there is a save, and loads the newest', async () => {
    const { runner, view, driver } = play()
    await screen.findByText('The Letter')
    expect(titleButton('continue')).toBeNull()
    view.unmount()

    runner.apply({ type: 'choose', id: 'open' })
    runner.apply({ type: 'choose', id: 'leave' })
    await runner.saves!.write('2', runner.state, { played: 0, savedAt: 2000 })
    await runner.newGame()
    await runner.saves!.write('1', runner.state, { played: 0, savedAt: 1000 })

    const next = play(true, driver).runner
    await waitFor(() => expect(titleButton('continue')).not.toBeNull())
    await act(async () => fireEvent.click(titleButton('continue')!))
    await waitFor(() => expect(document.querySelector('[data-page="title"]')).toBeNull())
    // Slot 2 is the newer, saved after leaving the scene.
    expect(next.state.sceneId).toBeNull()
    expect(next.state.kv.readBefore).toBe(true)
  })

  it('lists a save that can’t be read on the load page, and deletes it', async () => {
    const driver = memoryDriver()
    await driver.set('letter.save.3', '{ half a save')
    play(true, driver)
    await screen.findByText('The Letter')
    // A broken save is never the one Continue loads.
    expect(titleButton('continue')).toBeNull()
    await act(async () => fireEvent.click(titleButton('load')!))
    const broken = await waitFor(() => document.querySelector('[data-save-slot="3"][data-broken]') as HTMLElement)
    expect(broken.textContent).toContain('A save that can’t be read')
    expect(broken.textContent).toContain('That is not a save file.')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Delete' })))
    await waitFor(() => expect(document.querySelector('[data-save-slot="3"]')).toBeNull())
    expect(await driver.get('letter.save.3')).toBeNull()
  })

  it('stores a play setting changed before a game, and the next new game uses it', async () => {
    const { runner } = play()
    fireEvent.click(await screen.findByText('Settings'))
    const hints = document.querySelector('#setting-hints') as HTMLInputElement
    expect(hints.checked).toBe(true)
    await act(async () => fireEvent.click(hints))
    await runner.settled()
    expect(await runner.profile!.get('core:settings')).toEqual({ hints: false })
    expect(runner.state.settings.hints).toBe(true)

    fireEvent.click(screen.getByText('Back'))
    await act(async () => fireEvent.click(titleButton('new')!))
    await screen.findByText('A letter on the mat.')
    expect(runner.state.settings.hints).toBe(false)
  })

  it('sends a play setting changed during a game as a command', async () => {
    const { runner } = play()
    await act(async () => fireEvent.click((await screen.findByText('New game')) as HTMLElement))
    await screen.findByText('A letter on the mat.')
    fireEvent.click(screen.getByText('Settings'))
    await act(async () => fireEvent.click(document.querySelector('#setting-hints')!))
    expect(runner.state.settings.hints).toBe(false)
    expect(runner.log().commands).toContainEqual({ type: 'setting', id: 'hints', to: false })
    fireEvent.click(screen.getByText('Back'))
    expect(await screen.findByText('A letter on the mat.')).toBeTruthy()
  })

  it('writes a ui setting to the profile, where useSetting reads it', async () => {
    const game = letter()
    const driver = memoryDriver()
    const runner = createRunner(game, startingState(game), { profile: profile(game, driver) })
    function Size() {
      const size = useSetting('textSize')
      const { go } = usePage()
      return (
        <p data-size={String(size)} onClick={() => go('settings')}>
          size
        </p>
      )
    }
    render(<GameShell runner={runner} layout={{ stage: [<Size key="size" />] }} pages />)
    await act(async () => fireEvent.click(titleButton('new')!))
    expect(document.querySelector('[data-size]')?.getAttribute('data-size')).toBe('normal')
    fireEvent.click(screen.getByText('size'))
    await act(async () => fireEvent.click(screen.getByLabelText('Large')))
    await runner.settled()
    expect(await runner.profile!.get('core:settings')).toEqual({ textSize: 'large' })
    expect(runner.state.settings).not.toHaveProperty('textSize')
    fireEvent.click(screen.getByText('Back'))
    await waitFor(() => expect(document.querySelector('[data-size]')?.getAttribute('data-size')).toBe('large'))
  })

  it('offers New Game+ only once the game is finished, and carries over what the game says', async () => {
    const { runner } = play()
    await screen.findByText('The Letter')
    expect(titleButton('new-game-plus')).toBeNull()
    await act(async () => fireEvent.click(titleButton('new')!))
    await act(async () => void runner.apply({ type: 'choose', id: 'open' }))
    await runner.settled()
    fireEvent.click(screen.getByText('Title screen'))
    await waitFor(() => expect(titleButton('new-game-plus')).not.toBeNull())
    await act(async () => fireEvent.click(titleButton('new-game-plus')!))
    expect(await screen.findByText('You have read it before.')).toBeTruthy()
    expect(runner.state.kv.readBefore).toBe(true)
  })

  it('puts the pages a game adds on the title screen', async () => {
    function Gallery() {
      const { back } = usePage()
      return <button onClick={back}>Gallery here</button>
    }
    play({ pages: { gallery: { label: 'Gallery', component: Gallery }, hidden: { label: 'Hidden', component: Gallery, showOnTitle: false } }, credits: ['Written by a friend', { label: 'Site', href: 'https://example.com/' }] })
    fireEvent.click(await screen.findByText('Gallery'))
    expect(screen.queryByText('Hidden')).toBeNull()
    fireEvent.click(screen.getByText('Gallery here'))
    fireEvent.click(screen.getByText('Credits'))
    expect(screen.getByText('Written by a friend')).toBeTruthy()
    expect(screen.getByText('Site').getAttribute('href')).toBe('https://example.com/')
  })

  it('starts straight in the game when pages are off', () => {
    play(false)
    expect(screen.getByText('A letter on the mat.')).toBeTruthy()
    expect(document.querySelector('[data-page]')).toBeNull()
  })
})
