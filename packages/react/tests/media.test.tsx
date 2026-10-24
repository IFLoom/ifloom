// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRunner, loadGame, memoryDriver, profile, startingState, type Game, type Content } from '@ifloom/engine'
import { GameShell, Video } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// jsdom has no media player: play and pause are stubbed so a call is something to count.
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

/** The flat in the evening: a picture and a clip in the scene, and a layered stage with two hotspots. */
function flat(extra: Partial<Content> = {}): Game {
  return loadGame(
    [
      { name: 'base', introScene: 'evening' },
      {
        name: 'flat',
        activities: [{ id: 'taxi' }],
        scenes: [
          {
            id: 'evening',
            title: 'Evening',
            stage: {
              aspect: '4/3',
              layers: [
                { id: 'room', src: 'flat/room.svg' },
                { id: 'rain', src: 'flat/rain.mp4' },
              ],
              hotspots: [
                { id: 'phone', rect: [10, 60, 20, 15], label: 'The phone on the desk', choice: 'call' },
                { id: 'door', rect: [70, 10, 20, 80], label: 'The front door', command: { type: 'activity', id: 'taxi' } },
              ],
            },
            body: [{ text: 'evening' }],
            choices: [
              { id: 'call', effects: [{ kind: 'kv', key: 'called', to: true }] },
              { id: 'out', effects: [{ kind: 'scene', scene: null }] },
            ],
          },
        ],
        prose: {
          evening: 'The kettle clicks off.\n\n[[img:flat/cup.svg|A cup of tea]]\n\n[[video:flat/steam|Steam from the cup]]\n\nRain on the window.',
          'evening#call': 'Ring Ava',
          'evening#out': 'Go out',
        },
        ...extra,
      },
    ],
    { id: 'flat', title: 'The Flat' },
  ).game
}

function play(game: Game, props: Partial<Parameters<typeof GameShell>[0]> = {}, runnerOptions = {}) {
  const runner = createRunner(game, startingState(game), runnerOptions)
  render(<GameShell runner={runner} layout={Reading} {...props} />)
  return runner
}

const videoBeat = () => document.querySelector('video[data-beat="video"]') as HTMLVideoElement

describe('Video', () => {
  it('plays a clip like a GIF: inline, looping, muted, no controls, and started without an observer', () => {
    play(flat())
    const video = videoBeat()
    expect(video.getAttribute('data-part')).toBe('video')
    expect(video.getAttribute('src')).toBe('art/flat/steam.mp4')
    expect(video.hasAttribute('playsinline')).toBe(true)
    expect(video.loop).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.controls).toBe(false)
    expect(video.getAttribute('aria-label')).toBe('Steam from the cup')
    // No IntersectionObserver in jsdom: treated as on screen, and played.
    expect(video.autoplay).toBe(true)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })

  it('takes its kv: controls wait for the player, once does not loop, a poster shows first', () => {
    const game = flat()
    const runner = createRunner(game, startingState(game))
    render(
      <GameShell
        runner={runner}
        layout={() => <Video src="art/flat/rain.webm" poster="art/flat/rain.jpg" autoplay={false} loop={false} muted={false} controls />}
      />,
    )
    const video = document.querySelector('video') as HTMLVideoElement
    expect(video.controls).toBe(true)
    expect(video.loop).toBe(false)
    expect(video.autoplay).toBe(false)
    expect(video.muted).toBe(false)
    expect(video.getAttribute('poster')).toBe('art/flat/rain.jpg')
    expect(video.getAttribute('preload')).toBe('metadata')
  })

  it('loads nothing until it scrolls into view, then plays, and pauses when it leaves', () => {
    const observers: { callback: IntersectionObserverCallback; targets: Element[] }[] = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        targets: Element[] = []
        constructor(callback: IntersectionObserverCallback) {
          observers.push({ callback, targets: this.targets })
        }
        observe(target: Element) {
          this.targets.push(target)
        }
        disconnect() {}
      },
    )
    play(flat())
    const video = videoBeat()
    const observer = observers.find((entry) => entry.targets.includes(video))!
    expect(video.getAttribute('preload')).toBe('none')
    expect(video.autoplay).toBe(false)
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
    const seen = (isIntersecting: boolean) =>
      act(() => observer.callback([{ isIntersecting, target: video } as unknown as IntersectionObserverEntry], {} as IntersectionObserver))
    seen(true)
    expect(video.getAttribute('preload')).toBe('auto')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
    vi.spyOn(video, 'paused', 'get').mockReturnValue(false)
    seen(false)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('keeps a clip with sound muted while the game’s mute setting is on, and at the sfx volume', async () => {
    const game = flat({
      settings: [
        { id: 'mute', label: 'Mute', kind: 'toggle', affects: 'ui', default: false },
        { id: 'sfxVolume', label: 'Sounds', kind: 'range', affects: 'ui', min: 0, max: 10, default: 4 },
      ],
      audio: { tracks: {}, mute: 'mute', channels: { sfx: { mode: 'cue', volume: 'sfxVolume' } } },
      prose: { evening: '[[video:flat/radio|sound]]', 'evening#call': 'Ring Ava', 'evening#out': 'Go out' },
    })
    const driver = memoryDriver()
    const store = profile(game, driver)
    await store.set('core:settings', { mute: true })
    play(game, {}, { profile: store })
    await waitFor(() => expect(videoBeat().muted).toBe(true))
    await act(async () => store.set('core:settings', { mute: false, sfxVolume: 5 }))
    await waitFor(() => expect(videoBeat().muted).toBe(false))
    expect(videoBeat().volume).toBe(0.5)
  })
})

describe('Stage', () => {
  it('stacks the layers in order in a box of the stage’s shape', () => {
    play(flat())
    const box = document.querySelector('[data-part="stage-picture"]') as HTMLElement
    expect(box.style.aspectRatio.replace(/ /g, '')).toBe('4/3')
    const layers = [...box.querySelectorAll('[data-part="stage-layer"]')]
    expect(layers.map((layer) => [layer.tagName, layer.getAttribute('data-layer'), layer.getAttribute('src')])).toEqual([
      ['IMG', 'room', 'art/flat/room.svg'],
      ['VIDEO', 'rain', 'art/flat/rain.mp4'],
    ])
    // A stage replaces the old single picture.
    expect(document.querySelector('[data-part="stage-image"]')).toBeNull()
  })

  it('sends a hotspot’s command when it is clicked', () => {
    const runner = play(flat())
    const phoneSpot = screen.getByRole('button', { name: 'The phone on the desk' })
    expect(phoneSpot.style.left).toBe('10%')
    expect(phoneSpot.style.width).toBe('20%')
    act(() => void fireEvent.click(phoneSpot))
    expect(runner.state.kv.called).toBe(true)
  })

  it('greys out a hotspot with its reason, and sends nothing', () => {
    const runner = play(flat())
    const door = screen.getByRole('button', { name: 'The front door' })
    expect(door.getAttribute('aria-disabled')).toBe('true')
    const reason = runner.view().scene.stage!.hotspots.find((spot) => spot.id === 'door')!.disabled!
    // An activity waits until the scene is over.
    expect(reason).toBe('Finish this first.')
    expect(door.title).toContain(reason)
    expect(document.getElementById(door.getAttribute('aria-describedby')!)?.textContent).toBe(reason)
    act(() => void fireEvent.click(door))
    expect(runner.state.sceneId).toBe('evening')
    expect(runner.log().commands).toEqual([])
  })
})

describe('the media viewer', () => {
  it('opens a picture large and closes it with Escape or the close button', async () => {
    play(flat())
    const opener = screen.getByRole('button', { name: 'Enlarge: A cup of tea' })
    act(() => void fireEvent.click(opener))
    const dialog = await screen.findByRole('dialog')
    expect(dialog.getAttribute('data-part')).toBe('viewer')
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('art/flat/cup.svg')
    act(() => void fireEvent.keyDown(dialog, { key: 'Escape' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Enlarge: Steam from the cup' })))
    expect((await screen.findByRole('dialog')).querySelector('video')?.getAttribute('src')).toBe('art/flat/steam.mp4')
    act(() => void fireEvent.click(document.querySelector('[data-part="viewer-close"]')!))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('is off with viewer: false', () => {
    play(flat(), { viewer: false })
    expect(screen.queryByRole('button', { name: /Enlarge/ })).toBeNull()
    expect(document.querySelector('img[data-beat="image"]')).toBeTruthy()
  })
})
