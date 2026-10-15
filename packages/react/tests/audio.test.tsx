// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import type { AudioLike } from '@ifloom/audio'
import { GameShell, mountGame, useAudio } from '../src/index.ts'

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

function cafe(audio = true): Game {
  return loadGame(
    [
      {
        id: 'cafe',
        schema: SCHEMA,
        scenes: [
          { id: 'door', title: 'The door', body: [{ text: 'door' }], choices: [{ id: 'in', effects: [{ kind: 'sound', track: 'bell' }, { kind: 'scene', id: 'counter' }] }] },
          { id: 'counter', title: 'The counter', body: [{ text: 'counter' }], choices: [] },
        ],
        prose: {
          door: 'The café door.',
          'door#in': 'Go in',
          counter: '[[sound:bell]]\n\nAva: "Morning!" [[voice:ava.morning]]',
        },
        ...(audio
          ? { audio: { tracks: { bell: { src: 'bell.ogg' }, 'ava.morning': { src: 'voice/ava-morning.ogg', channel: 'voice' } } } }
          : {}),
      },
    ],
    { id: 'cafe', title: 'The Café', introScene: 'door' },
  ).game
}

afterEach(() => {
  document.body.innerHTML = ''
})

function page(): HTMLElement {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  return root
}

describe('audio in the React UI', () => {
  it('mountGame plays the game’s sound, and a voiced line gets a button to hear it again', async () => {
    page()
    const made: FakeAudio[] = []
    const createAudio = (src: string) => (made.push(new FakeAudio(src)), made.at(-1)!)
    let runner!: ReturnType<typeof mountGame>
    await act(async () => {
      runner = mountGame(cafe(), { audio: { createAudio } })
    })
    await act(async () => {
      fireEvent.pointerDown(document.body)
      runner.apply({ type: 'choose', id: 'in' })
    })
    expect(made.map((el) => el.src)).toEqual(['audio/bell.ogg', 'audio/bell.ogg', 'audio/voice/ava-morning.ogg'])
    // The sound beat draws nothing; the spoken line keeps its words.
    expect(document.querySelectorAll('[data-beat]')).toHaveLength(1)
    expect(screen.getByText('Morning!', { exact: false })).toBeTruthy()
    fireEvent.click(screen.getByTitle('Hear it again'))
    expect(made.at(-1)!.src).toBe('audio/voice/ava-morning.ogg')
    expect(document.querySelector('[data-part="voice-replay"]')).toBeTruthy()
  })

  it('mountGame leaves sound off with audio: false, and draws no replay button', async () => {
    page()
    let runner!: ReturnType<typeof mountGame>
    await act(async () => {
      runner = mountGame(cafe(), { audio: false })
    })
    await act(async () => void runner.apply({ type: 'choose', id: 'in' }))
    expect(document.querySelector('[data-part="voice-replay"]')).toBeNull()
  })

  it('useAudio plays a GameShell’s sound while it is mounted', async () => {
    const game = cafe()
    const runner = createRunner(game, startingState(game, { seed: 3 }))
    const made: FakeAudio[] = []
    function App() {
      useAudio({ runner, createAudio: (src) => (made.push(new FakeAudio(src)), made.at(-1)!), root: document.body })
      return <GameShell runner={runner} />
    }
    const shown = render(<App />)
    await act(async () => {
      fireEvent.keyDown(document.body)
      runner.apply({ type: 'choose', id: 'in' })
    })
    expect(made.map((el) => el.src)).toContain('audio/voice/ava-morning.ogg')
    shown.unmount()
    expect(made.every((el) => !el.playing)).toBe(true)
  })
})
