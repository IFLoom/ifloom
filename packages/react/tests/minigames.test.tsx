// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, startingState, type Command, type Game, type MinigameDef, type Runner } from '@ifloom/engine'
import { phone } from '@ifloom/phone'
import { Game as Page, GameShell, NoticeStrip, RoomActions, SceneStage, Sidebar, Story, useGame, useMinigame } from '../src/index.ts'
import { storyOf } from './layouts.tsx'

/** Catch: wait for the throw, then press space within a second. Left drops it. */
const catchBall: MinigameDef = {
  id: 'catch',
  label: 'Catch the ball',
  start: 'ready',
  vars: { tries: 0 },
  states: {
    ready: { label: 'catch.ready', on: [{ input: 'space', go: 'throw' }] },
    throw: {
      label: 'catch.throw',
      after: { ms: 1000, go: 'missed' },
      on: [
        { input: 'space', go: 'caught' },
        { input: 'left', go: 'missed' },
      ],
    },
    caught: { final: { effects: [{ kind: 'scene', scene: 'caught' }] } },
    missed: { final: { effects: [{ kind: 'scene', scene: 'missed' }] } },
  },
}

function game(): Game {
  const { game, problems } = loadGame(
    [
      {
        id: 'park',
        schema: SCHEMA,
        stats: [
          { id: 'energy', label: 'Energy', start: 60, max: 100, display: 'bar' },
          { id: 'hearts', label: 'Hearts', start: 2, max: 5, display: 'pips' },
          { id: 'coins', label: 'Coins', start: 3 },
        ],
        minigames: [catchBall],
        scenes: [
          {
            id: 'intro',
            title: 'The park',
            body: [{ text: 'intro' }],
            choices: [
              { id: 'play', effects: [{ kind: 'minigame', minigame: 'catch' }] },
              { id: 'rest', effects: [{ kind: 'stat', stat: 'energy', by: 10 }] },
              { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
            ],
          },
          { id: 'caught', title: 'Caught it', body: [{ text: 'caught' }], choices: [{ id: 'back', effects: [{ kind: 'scene', scene: 'intro' }] }] },
          { id: 'missed', title: 'Missed', body: [{ text: 'missed' }], choices: [{ id: 'back', effects: [{ kind: 'scene', scene: 'intro' }] }] },
        ],
        activities: [{ id: 'wave', effects: [{ kind: 'notify', title: 'Someone waves back' }] }],
        prose: {
          intro: 'Kids are throwing a ball about.',
          'intro#play': 'Join in',
          'intro#rest': 'Sit on the bench',
          'intro#leave': 'Walk on',
          'catch.ready': 'Ready?',
          'catch.throw': 'Here it comes!',
          caught: 'Got it.',
          'caught#back': 'Again',
          missed: 'It rolls away.',
          'missed#back': 'Again',
        },
      },
    ],
    { id: 'park-test', title: 'The Park', introScene: 'intro', actions: [{ id: 'wave', label: 'Wave', command: { type: 'activity', id: 'wave' } }] },
  )
  expect(problems).toEqual([])
  return game
}

function runnerFor(g = game()): Runner {
  return createRunner(g, startingState(g), { history: true })
}

const ticks = (runner: Runner) => runner.log().commands.filter((command): command is Extract<Command, { type: 'tick' }> => command.type === 'tick')
const press = (key: string, init: KeyboardEventInit = {}) => act(() => void fireEvent.keyDown(window, { key, ...init }))
const button = (name: RegExp | string) => screen.getByRole('button', { name })
const click = (name: RegExp | string) => act(() => void fireEvent.click(button(name)))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useMinigame', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'] })
  })

  it('ticks with the real time only while a timer runs, and stops when the minigame ends', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} />)
    click(/Join in/)
    expect(screen.getByText('Ready?')).toBeTruthy()
    // No timer in the first state: nothing ticks.
    act(() => void vi.advanceTimersByTime(500))
    expect(ticks(runner)).toEqual([])

    click('Space')
    expect(screen.getByText('Here it comes!')).toBeTruthy()
    act(() => void vi.advanceTimersByTime(300))
    expect(ticks(runner).length).toBe(3)
    expect(ticks(runner).every((tick) => tick.ms === 100)).toBe(true)
    expect(screen.getByRole('progressbar', { name: 'Time left' }).getAttribute('aria-valuenow')).toBe('700')

    act(() => void vi.advanceTimersByTime(700))
    expect(runner.state.minigame).toBeNull()
    expect(screen.getByRole('heading', { name: 'Missed' })).toBeTruthy()
    const sent = ticks(runner).length
    act(() => void vi.advanceTimersByTime(1000))
    expect(ticks(runner).length).toBe(sent)
  })

  it('drops the time the page is hidden', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} />)
    click(/Join in/)
    click('Space')
    let hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    try {
      act(() => void vi.advanceTimersByTime(250))
      expect(ticks(runner).map((tick) => tick.ms)).toEqual([100, 100])
      hidden = true
      act(() => void document.dispatchEvent(new Event('visibilitychange')))
      // The 50 ms since the last tick go in as the page hides; then nothing.
      expect(ticks(runner).map((tick) => tick.ms)).toEqual([100, 100, 50])
      act(() => void vi.advanceTimersByTime(5000))
      expect(ticks(runner).length).toBe(3)
      hidden = false
      act(() => void document.dispatchEvent(new Event('visibilitychange')))
      act(() => void vi.advanceTimersByTime(100))
      expect(ticks(runner).map((tick) => tick.ms)).toEqual([100, 100, 50, 100])
      expect(runner.state.minigame?.elapsed).toBe(350)
    } finally {
      delete (document as { hidden?: boolean }).hidden
    }
  })

  it('runs one clock however many components use the hook', () => {
    const runner = runnerFor()
    function Extra() {
      useMinigame()
      return null
    }
    render(
      <GameShell runner={runner} layout={storyOf(<><SceneStage /><Extra /><Extra /></>)} />,
    )
    click(/Join in/)
    click('Space')
    act(() => void vi.advanceTimersByTime(200))
    expect(ticks(runner).length).toBe(2)
  })
})

describe('the minigame panel', () => {
  it('draws the title, the words and a button for each live input, which send it', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} />)
    click(/Join in/)
    const panel = document.querySelector('[data-part="minigame"]') as HTMLElement
    expect(panel.dataset.minigame).toBe('catch')
    expect(screen.getByRole('heading', { name: 'Catch the ball' })).toBeTruthy()
    // No timer, no bar; one live input.
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect([...document.querySelectorAll('[data-part="minigame-input"]')].map((node) => node.textContent)).toEqual(['Space'])
    // The scene's own choices are gone while it runs.
    expect(screen.queryByRole('button', { name: /Walk on/ })).toBeNull()
    click('Space')
    expect([...document.querySelectorAll('[data-part="minigame-input"]')].map((node) => node.textContent)).toEqual(['Space', 'Left'])
    const bar = document.querySelector('[data-part="minigame-timer"] > span') as HTMLElement
    expect(bar.style.transform).toBe('scaleX(1)')
    click('Left')
    expect(screen.getByRole('heading', { name: 'Missed' })).toBeTruthy()
  })

  it('takes the arrows and space from the keyboard, but not while typing or with a modifier', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} />)
    click(/Join in/)
    press(' ', { ctrlKey: true })
    expect(runner.state.minigame?.state).toBe('ready')
    const field = document.createElement('input')
    document.body.append(field)
    act(() => void fireEvent.keyDown(field, { key: ' ' }))
    expect(runner.state.minigame?.state).toBe('ready')
    field.remove()
    press(' ')
    expect(runner.state.minigame?.state).toBe('throw')
    // An input that isn't live does nothing.
    press('ArrowUp')
    expect(runner.state.minigame?.state).toBe('throw')
    press('ArrowLeft')
    expect(runner.state.minigame).toBeNull()
    expect(screen.getByRole('heading', { name: 'Missed' })).toBeTruthy()
  })

  it('uses the keys the minigame maps', () => {
    const g = game()
    g.minigames = [{ ...catchBall, keys: { space: ['j'], left: ['h'] } }]
    const runner = runnerFor(g)
    render(<GameShell runner={runner} />)
    click(/Join in/)
    press(' ')
    expect(runner.state.minigame?.state).toBe('ready')
    press('J')
    expect(runner.state.minigame?.state).toBe('throw')
  })

  it('is replaced by the game’s panel named by the minigame’s id, which the clock still drives', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'Date'] })
    const runner = runnerFor()
    function Catcher() {
      const { minigame, send } = useMinigame()
      return (
        <div data-testid="mine">
          {minigame?.state}
          <button type="button" onClick={() => send('space')}>
            Catch!
          </button>
        </div>
      )
    }
    render(<GameShell runner={runner} panels={{ catch: Catcher }} />)
    click(/Join in/)
    expect(document.querySelector('[data-part="minigame"]')).toBeNull()
    expect(screen.getByTestId('mine').textContent).toContain('ready')
    click('Catch!')
    act(() => void vi.advanceTimersByTime(300))
    expect(runner.state.minigame?.elapsed).toBe(300)
    click('Catch!')
    expect(screen.getByRole('heading', { name: 'Caught it' })).toBeTruthy()
  })

  it('can be replaced for every minigame through components', () => {
    const runner = runnerFor()
    function Plain() {
      const { minigame } = useGame().view
      return <p>Playing {minigame?.title}</p>
    }
    render(<GameShell runner={runner} components={{ MinigameCard: Plain }} />)
    click(/Join in/)
    expect(screen.getByText('Playing Catch the ball')).toBeTruthy()
  })
})

describe('hotkeys', () => {
  it('are off unless the game turns them on', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} />)
    expect(document.querySelector('[data-part="choice-key"]')).toBeNull()
    press('2')
    expect(runner.state.stats.energy).toBe(60)
  })

  it('pick the choices on screen with 1 to 9, each showing its number', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} keys />)
    expect([...document.querySelectorAll('[data-part="choice-key"]')].map((node) => node.textContent)).toEqual(['1', '2', '3'])
    expect(button(/Sit on the bench/).getAttribute('aria-keyshortcuts')).toBe('2')
    press('2')
    expect(runner.state.stats.energy).toBe(70)
    press('2', { altKey: true })
    expect(runner.state.stats.energy).toBe(70)
    // The room's buttons, once the scene is closed.
    press('3')
    expect(runner.state.sceneId).toBeNull()
    press('1')
    expect(runner.view().notices.unseen[0]?.title).toBe('Someone waves back')
  })

  it('leave typing alone', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} keys />)
    const field = document.createElement('textarea')
    document.body.append(field)
    act(() => void fireEvent.keyDown(field, { key: '2' }))
    expect(runner.state.stats.energy).toBe(60)
    field.remove()
  })

  it('open the menu with Escape', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} keys />)
    expect(screen.queryByRole('dialog')).toBeNull()
    press('Escape')
    const dialog = screen.getByRole('dialog', { name: 'Menu' })
    expect(dialog.textContent).toContain('Undo')
    // A dialog is open: the number keys don't reach the scene behind it.
    press('2')
    expect(runner.state.stats.energy).toBe(60)
  })

  it('leave Escape to the page when there is no menu to open', () => {
    // Whether the page still gets the key: false once a handler takes it.
    const escape = () => {
      let passed = true
      act(() => void (passed = fireEvent.keyDown(window, { key: 'Escape' })))
      return passed
    }
    render(<GameShell runner={runnerFor()} keys />)
    expect(escape()).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy()
    cleanup()
    // A runner with no saves, undo or backlog, and no pages or mods: no menu.
    const g = game()
    render(<GameShell runner={createRunner(g, startingState(g))} keys />)
    expect(escape()).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('send the game’s own commands from its map, before the built-in keys', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} keys={{ map: { w: { type: 'activity', id: 'wave' }, '1': { type: 'choose', id: 'rest' } } }} />)
    press('1')
    expect(runner.state.stats.energy).toBe(70)
    press('3')
    press('w')
    expect(runner.view().notices.unseen[0]?.title).toBe('Someone waves back')
  })

  it('give way to the minigame’s keys while one runs', () => {
    const g = game()
    g.minigames = [{ ...catchBall, keys: { space: ['1'] } }]
    const runner = runnerFor(g)
    render(<GameShell runner={runner} keys={{ map: { '1': { type: 'activity', id: 'wave' } } }} />)
    act(() => void fireEvent.click(button(/Join in/)))
    press('1')
    expect(runner.state.minigame?.state).toBe('throw')
    expect(runner.view().notices.unseen).toEqual([])
  })
})

describe('the stat display', () => {
  it('draws a bar and pips as meters with their values', () => {
    render(<GameShell runner={runnerFor()} />)
    const energy = screen.getByRole('meter', { name: 'Energy' })
    expect(energy.dataset.part).toBe('stat-bar')
    expect([energy.getAttribute('aria-valuemin'), energy.getAttribute('aria-valuemax'), energy.getAttribute('aria-valuenow')]).toEqual(['0', '100', '60'])
    expect((energy.firstElementChild as HTMLElement).style.width).toBe('60%')
    const hearts = screen.getByRole('meter', { name: 'Hearts' })
    expect(hearts.dataset.part).toBe('stat-pips')
    expect(hearts.getAttribute('aria-valuetext')).toBe('2')
    const pips = [...hearts.querySelectorAll('[data-part="stat-pip"]')]
    expect(pips.length).toBe(5)
    expect(pips.filter((pip) => pip.hasAttribute('data-filled')).length).toBe(2)
    // A stat drawn as a number has no meter.
    expect(screen.queryByRole('meter', { name: 'Coins' })).toBeNull()
  })
})

describe('the notice strip', () => {
  it('counts the unseen notices, and opens them', () => {
    const runner = runnerFor()
    render(<GameShell runner={runner} layout={() => (<Page><Sidebar><NoticeStrip /></Sidebar><Story><SceneStage /><RoomActions /></Story></Page>)} />)
    expect(document.querySelector('[data-part="notice-strip"]')).toBeNull()
    click(/Walk on/)
    click('Wave')
    click('Wave')
    const item = document.querySelector('[data-strip="notices"]') as HTMLElement
    expect(runner.view().notices.unseen.length).toBe(2)
    expect(item.textContent).toBe('Notices2')
    act(() => void fireEvent.click(item))
    const dialog = screen.getByRole('dialog', { name: 'Notices' })
    expect(dialog.textContent).toContain('Someone waves back')
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Mark all seen' })))
    expect(document.querySelector('[data-part="notice-strip"]')).toBeNull()
  })
})

describe('the notice strip, with a phone', () => {
  it('counts each app with a badge, and opens the device on it', () => {
    const kit = phone({ feeds: [] })
    const { game: g, problems } = loadGame(
      [
        {
          id: 'home',
          schema: SCHEMA,
          scenes: [{ id: 'intro', title: 'Home', body: [{ text: 'intro' }], choices: [{ id: 'wait', effects: [] }] }],
          prose: { intro: 'The kettle is on.', 'intro#wait': 'Wait', 'mum.hi': 'Did you eat?', 'mum.hi#yes': 'Yes, Mum' },
          data: { messages: { messages: [{ id: 'mum.hi', channel: 'texts', from: 'Mum', body: [{ text: 'mum.hi' }], replies: [{ id: 'yes' }] }] } },
        },
      ],
      { id: 'phone-test', title: 'Home', introScene: 'intro', plugins: [...kit.plugins], collections: kit.collections, data: kit.data },
    )
    expect(problems).toEqual([])
    const runner = createRunner(g, startingState(g))
    render(<GameShell runner={runner} layout={storyOf(<><NoticeStrip /><SceneStage /></>)} />)
    expect(document.querySelector('[data-part="notice-strip"]')).toBeNull()
    // A message arrives after the first command.
    click('Wait')
    // The message raises a notice too.
    const items = [...document.querySelectorAll<HTMLElement>('[data-part="notice-strip-item"]')]
    expect(items.map((node) => [node.dataset.strip, node.textContent])).toEqual([
      ['notices', 'Notices1'],
      ['phone/texts', 'Messages1'],
    ])
    const item = items[1]
    act(() => void fireEvent.click(item))
    const dialog = screen.getByRole('dialog', { name: 'Phone' })
    expect(dialog.querySelector('[data-app="texts"]')).toBeTruthy()
  })
})
