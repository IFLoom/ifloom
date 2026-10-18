// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { GameShell } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** A front door that fades, and a hall whose lines come one at a time. */
function house(): Game {
  return loadGame(
    [
      {
        id: 'house',
        schema: SCHEMA,
        scenes: [
          {
            id: 'door',
            title: 'The door',
            transition: { in: 'fade', out: 'fade', ms: 200 },
            body: [{ text: 'door' }],
            choices: [{ id: 'in', effects: [{ kind: 'scene', scene: 'hall' }] }],
          },
          {
            id: 'hall',
            title: 'The hall',
            transition: { in: 'slide-up', ms: 200 },
            body: [{ text: 'hall' }, { text: 'hall.clock', reveal: { delay: 1000 } }, { text: 'hall.cough', reveal: { as: 'slide-left' } }],
            choices: [{ id: 'out', effects: [{ kind: 'scene', scene: null }] }],
          },
        ],
        prose: {
          door: 'A blue door.',
          'door#in': 'Go in',
          hall: 'A long hall.',
          'hall.clock': 'A clock ticks.',
          'hall.cough': 'Somebody coughs upstairs.',
          'hall#out': 'Leave',
        },
      },
    ],
    { id: 'house', title: 'The House', introScene: 'door' },
  ).game
}

function play(props: Partial<Parameters<typeof GameShell>[0]> = {}) {
  const game = house()
  const runner = createRunner(game, startingState(game))
  render(<GameShell runner={runner} layout={Reading} {...props} />)
  return runner
}

const scene = () => document.querySelector('[data-part="scene"]:not([data-leaving] *)') as HTMLElement
const frame = () => document.querySelector('[data-part="scene-transition"]') as HTMLElement

/** Go into the hall, and wait for the door to go. */
function goIn() {
  act(() => screen.getByRole('button', { name: /Go in/ }).click())
  act(() => vi.advanceTimersByTime(200))
}

/** The player's system asking for reduced motion, or not. */
function reducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('scene transitions', () => {
  it('bring a scene in by its name, after the one before has gone out', () => {
    vi.useFakeTimers()
    play()
    expect(scene().getAttribute('data-transition-in')).toBe('fade')
    expect(frame().style.getPropertyValue('--ifloom-transition-ms')).toBe('200ms')
    act(() => screen.getByRole('button', { name: /Go in/ }).click())
    // The door is kept, faded out, inert and hidden from screen readers; the hall waits for it.
    const leaving = document.querySelector('[data-leaving]') as HTMLElement
    expect(leaving.getAttribute('data-transition-out')).toBe('fade')
    expect(leaving.getAttribute('aria-hidden')).toBe('true')
    expect(leaving.hasAttribute('inert')).toBe(true)
    expect(leaving.textContent).toContain('A blue door.')
    expect(leaving.querySelector('[data-choice-key]')).toBeNull()
    expect(scene()).toBeNull()
    act(() => vi.advanceTimersByTime(200))
    expect(document.querySelector('[data-leaving]')).toBeNull()
    expect(scene().getAttribute('data-scene')).toBe('hall')
    expect(scene().getAttribute('data-transition-in')).toBe('slide-up')
  })

  it('reveal later lines in groups, with every word in the page from the start', () => {
    vi.useFakeTimers()
    play()
    goIn()
    const groups = [...scene().querySelectorAll('[data-part="reveal"]:not([data-reveal-choices])')] as HTMLElement[]
    expect(groups.map((group) => [group.getAttribute('data-reveal'), group.style.getPropertyValue('--ifloom-reveal-at'), group.textContent])).toEqual([
      ['fade', '1000ms', 'A clock ticks.'],
      ['slide-left', '1800ms', 'Somebody coughs upstairs.'],
    ])
    // The choices come with the last line.
    const choices = scene().querySelector('[data-reveal-choices]') as HTMLElement
    expect(choices.style.getPropertyValue('--ifloom-reveal-at')).toBe('1800ms')
    expect(choices.textContent).toContain('Leave')
    expect(scene().hasAttribute('data-revealed')).toBe(false)
  })

  it('show everything at once on a click on the scene', () => {
    vi.useFakeTimers()
    play()
    goIn()
    fireEvent.click(screen.getByText('A long hall.'))
    expect(scene().hasAttribute('data-revealed')).toBe(true)
  })

  it('show everything at once on a key, without the key picking a choice', () => {
    vi.useFakeTimers()
    const runner = play({ keys: true })
    goIn()
    fireEvent.keyDown(window, { key: '1' })
    expect(scene().hasAttribute('data-revealed')).toBe(true)
    expect(runner.state.sceneId).toBe('hall')
    // Once all is shown, the key picks the choice again.
    fireEvent.keyDown(window, { key: '1' })
    expect(runner.state.sceneId).toBeNull()
  })

  it('play nothing when the player asks for reduced motion', () => {
    reducedMotion(true)
    play()
    expect(scene().hasAttribute('data-transition-in')).toBe(false)
    act(() => screen.getByRole('button', { name: /Go in/ }).click())
    expect(document.querySelector('[data-leaving]')).toBeNull()
    expect(scene().querySelector('[data-reveal]')).toBeNull()
    expect(scene().textContent).toContain('Somebody coughs upstairs.')
    expect(frame().getAttribute('data-motion')).toBe('off')
    // The choices are there at once.
    expect(screen.getByRole('button', { name: /Leave/ })).toBeTruthy()
  })

  it('play nothing with the motion option off', () => {
    reducedMotion(false)
    play({ motion: false })
    act(() => screen.getByRole('button', { name: /Go in/ }).click())
    expect(document.querySelector('[data-leaving]')).toBeNull()
    expect(scene().hasAttribute('data-transition-in')).toBe(false)
    expect(scene().querySelector('[data-reveal]')).toBeNull()
  })
})

describe('the paper preset', async () => {
  /** Paper's drop-cap selector, as its stylesheet writes it. */
  // Read as text from disk: a stylesheet imported in a test comes back empty. The package has no Node types, hence the loose import.
  const fs = (await import(/* @vite-ignore */ `node:${'fs'}`)) as { readFileSync: (path: string, encoding: string) => string }
  // Under jsdom the test's URL can be from the project root rather than a file URL.
  const url = new URL('../src/themes/paper.css', import.meta.url)
  const cwd = (globalThis as unknown as { process: { cwd: () => string } }).process.cwd()
  const paper = fs.readFileSync(decodeURIComponent(url.protocol === 'file:' ? url.pathname : cwd + url.pathname), 'utf8')
  const dropCap = /([^{}/]+)::first-letter\s*\{/.exec(paper)![1].trim()

  it("gives only a scene's first paragraph a drop cap, in the scene and in the copy of it going out", () => {
    vi.useFakeTimers()
    play()
    goIn()
    const capped = (root: Element) => [...root.querySelectorAll(dropCap)].map((line) => line.textContent)
    // The hall's revealed lines have none.
    expect(capped(scene())).toEqual(['A long hall.'])
    // The copy SceneFrame keeps on screen while a scene goes out is its HTML, inside `data-leaving`.
    const copy = document.createElement('div')
    copy.setAttribute('data-leaving', '')
    copy.innerHTML = scene().outerHTML
    document.body.append(copy)
    expect(capped(copy)).toEqual(['A long hall.'])
  })
})
