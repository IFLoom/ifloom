// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { phone } from '@ifloom/phone'
import { at, go, location, places } from '@ifloom/plugin-places'
import { GameShell, Game as GamePage, Story } from '@ifloom/react'
import { LocationCard } from '@ifloom/plugin-places/react'
import { devicesUi } from '@ifloom/plugin-devices/react'
import { feedUi } from '@ifloom/plugin-feed/react'
import { messagesUi } from '@ifloom/plugin-messages/react'
import { placesUi } from '@ifloom/plugin-places/react'

/** The plugin UIs every game here is drawn with. */
const UIS = [devicesUi, feedUi, messagesUi, placesUi]

/** A layout of just a story with these children, and nothing over it. */
function storyOf(children: ReactNode) {
  return function StoryOnly() {
    return (
      <GamePage>
        <Story>{children}</Story>
      </GamePage>
    )
  }
}

afterEach(cleanup)

describe('media in places, messages and posts', () => {
  const kit = phone({ feeds: [{ id: 'town', name: 'Town' }] })

  function town(): Game {
    return loadGame(
      [
        kit.content,
        {
          name: 'town',
          prose: {
            'place.flat': 'Home.',
            'place.street': 'Busy.',
            'mum.hi': 'Look what I found.\n\n[[img:photo/cat.svg|The cat]]\n\n[[video:clips/cat]]',
            'post.cafe': 'New cakes today.\n\n[[img:photo/cake.svg|A cake]]',
          },
          entities: [
            location({
              id: 'flat',
              name: 'The flat',
              desc: 'Home',
              exits: ['street'],
              body: [{ prose: 'place.flat' }],
              stage: {
                layers: [{ id: 'room', src: 'flat/room.svg' }],
                hotspots: [{ id: 'out', rect: [80, 10, 15, 80], label: 'The front door', command: go('street') }],
              },
            }),
            location({ id: 'street', name: 'High Street', desc: 'Out', exits: ['flat'], body: [{ prose: 'place.street' }] }),
          ],
          data: {
            messages: { messages: [{ id: 'mum.hi', channel: 'texts', from: 'Mum', when: at('flat'), body: [{ prose: 'mum.hi' }] }] },
            feed: {
              posts: [{ id: 'post.cafe', feed: 'town', from: 'The Café', when: at('flat'), body: [{ prose: 'post.cafe' }], video: 'art/clips/steam.mp4' }],
            },
          },
        },
      ],
      { id: 'town', title: 'Town', plugins: [places({ start: 'flat' }), ...kit.plugins] },
    ).game
  }

  it('draws the place’s stage in the location panel, with its hotspots', () => {
    const runner = createRunner(town(), startingState(town()))
    render(<GameShell plugins={UIS} runner={runner} layout={storyOf(<LocationCard />)} />)
    const panel = document.querySelector('[data-part="location"]') as HTMLElement
    expect(panel.querySelector('[data-part="stage-layer"]')?.getAttribute('src')).toBe('art/flat/room.svg')
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'The front door' })))
    expect(runner.view().plugins.places).toMatchObject({ location: { id: 'street' } })
  })

  it('draws a message’s and a post’s beats, pictures and clips included', () => {
    const runner = createRunner(town(), startingState(town()))
    render(<GameShell plugins={UIS} runner={runner} />)
    act(() => void fireEvent.click(document.querySelector('[data-device="phone"]') as HTMLElement))
    act(() => void fireEvent.click(document.querySelector('[data-open-app="texts"]') as HTMLElement))
    const bubble = document.querySelector('[data-part="bubble"][data-from="them"]') as HTMLElement
    expect(bubble.querySelector('[data-beat="text"]')?.textContent).toBe('Look what I found.')
    expect(bubble.querySelector('img[data-beat="image"]')?.getAttribute('src')).toBe('art/photo/cat.svg')
    expect(bubble.querySelector('video[data-beat="video"]')?.getAttribute('src')).toBe('art/clips/cat.mp4')
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Back/ })))
    act(() => void fireEvent.click(document.querySelector('[data-open-app="town"]') as HTMLElement))
    const post = document.querySelector('[data-post="post.cafe"]') as HTMLElement
    expect(post.querySelector('img[data-beat="image"]')?.getAttribute('src')).toBe('art/photo/cake.svg')
    expect(post.querySelector('video[data-part="video"]')?.getAttribute('src')).toBe('art/clips/steam.mp4')
  })
})
