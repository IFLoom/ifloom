// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createRunner, loadGame, memoryDriver, profile, startingState, type Game, type Runner } from '@ifloom/engine'
import type { AudioLike } from '@ifloom/audio'
import { GameShell, mountGame, Scene, useAudio, useGame } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  delete document.documentElement.dataset.textSize
})

class FakeAudio implements AudioLike {
  volume = 1
  loop = false
  currentTime = 0
  ended = false
  playing = false
  onended: ((event: Event) => void) | null = null
  src: string
  constructor(src: string) {
    this.src = src
  }
  play() {
    this.playing = true
    return Promise.resolve()
  }
  pause() {
    this.playing = false
  }
}

/** A porch with a bell, a text size setting and a door to ring. */
function porch(): Game {
  const { game, problems } = loadGame(
    [
      { name: 'base', introScene: 'porch' },
      {
        name: 'porch',
        ui: { settings: { textSize: 'size' } },
        settings: [
          {
            id: 'size',
            label: 'Text size',
            type: 'choice',
            affects: 'ui',
            options: [
              { value: 'normal', label: 'Normal' },
              { value: 'large', label: 'Large' },
            ],
            default: 'large',
          },
        ],
        scenes: [
          {
            id: 'porch',
            title: 'The porch',
            body: [{ text: 'A bell by the door.' }],
            choices: [{ id: 'ring', label: 'Ring it', effects: [{ sound: 'bell' }] }],
          },
        ],
        audio: { tracks: { bell: { src: 'bell.ogg' } } },
      },
    ],
    { id: 'porch', title: 'Porch' },
  )
  expect(problems).toEqual([])
  return game
}

function page(): HTMLElement {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  return root
}

/** A page of your own, with no `Game` region at all. */
function Bare() {
  const { view } = useGame()
  return (
    <div data-own>
      <h1>{view.title}</h1>
      <Scene />
    </div>
  )
}

describe('the one root every entry draws', () => {
  it('applies the text size with a page of your own', async () => {
    page()
    await act(async () => void (await mountGame(porch(), { layout: Bare, audio: false })))
    expect(document.querySelector('[data-own]')).toBeTruthy()
    expect(document.documentElement.dataset.textSize).toBe('large')
  })

  it('plays a GameShell’s sound with nothing else asked', async () => {
    const game = porch()
    const runner = createRunner(game, startingState(game))
    const made: FakeAudio[] = []
    const shown = render(<GameShell runner={runner} audio={{ createAudio: (src) => (made.push(new FakeAudio(src)), made.at(-1)!), root: document.body }} />)
    await act(async () => {
      fireEvent.keyDown(document.body)
      runner.apply({ type: 'choose', id: 'ring' })
    })
    expect(made.filter((el) => el.playing).map((el) => el.src)).toEqual(['audio/bell.ogg'])
    shown.unmount()
    expect(made.every((el) => !el.playing)).toBe(true)
  })

  it('plays each sound once when the page also calls useAudio, under StrictMode', async () => {
    page()
    const ours: FakeAudio[] = []
    const theirs: FakeAudio[] = []
    function Playing() {
      useAudio({ createAudio: (src) => (ours.push(new FakeAudio(src)), ours.at(-1)!), root: document.body })
      return <Scene />
    }
    let runner!: Runner
    await act(async () => {
      runner = await mountGame(porch(), {
        layout: Playing,
        audio: { createAudio: (src) => (theirs.push(new FakeAudio(src)), theirs.at(-1)!), root: document.body },
      })
    })
    await act(async () => {
      fireEvent.keyDown(document.body)
      runner.apply({ type: 'choose', id: 'ring' })
    })
    // The page's own useAudio goes over the shell's player, which plays nothing.
    expect(ours.filter((el) => el.playing).map((el) => el.src)).toEqual(['audio/bell.ogg'])
    expect(theirs.filter((el) => el.playing)).toEqual([])
  })

  it('draws the pages once, round a layout that has a Game', async () => {
    const game = porch()
    const driver = memoryDriver()
    const runner = createRunner(game, startingState(game), { profile: profile(game, driver) })
    render(<GameShell runner={runner} layout={Reading} pages={{ splash: false }} audio={false} />)
    expect(document.querySelectorAll('[data-part="title-page"]')).toHaveLength(1)
    await act(async () => void fireEvent.click(document.querySelector('[data-title-button="new"]')!))
    expect(document.querySelectorAll('[data-part="title-page"]')).toHaveLength(0)
    expect(document.querySelectorAll('[data-part="page"]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-scene="porch"]')).toHaveLength(1)
  })
})
