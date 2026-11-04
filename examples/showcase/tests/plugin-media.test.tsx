// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState, type Content, type Game } from '@ifloom/engine'
import { devices } from '@ifloom/plugin-devices'
import { feed } from '@ifloom/plugin-feed'
import { messages } from '@ifloom/plugin-messages'
import { places } from '@ifloom/plugin-places'
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
  /** A phone on the sidebar with an app for the texts and one for the town's feed. */
  const phone: Content = {
    name: 'phone',
    data: {
      devices: {
        devices: [{ id: 'phone', name: 'Phone', frame: 'phone', sidebar: true }],
        apps: [
          { id: 'texts', name: 'Messages', icon: 'messages', on: 'phone', sections: [{ plugin: 'messages', with: { channel: 'texts' } }] },
          { id: 'town', name: 'Town', icon: 'feed', on: 'phone', sections: [{ plugin: 'feed', with: { feed: 'town' } }] },
        ],
      },
      messages: { channels: [{ id: 'texts', name: 'Messages' }] },
      feed: { feeds: [{ id: 'town', name: 'Town' }] },
    },
  }

  function town(): Game {
    return loadGame(
      [
        phone,
        {
          name: 'town',
          prose: {
            'place.flat': 'Home.',
            'place.street': 'Busy.',
            'mum.hi': 'Look what I found.\n\n[[img:photo/cat.svg|The cat]]\n\n[[video:clips/cat]]',
            'post.cafe': 'New cakes today.\n\n[[img:photo/cake.svg|A cake]]',
          },
          entities: [
            places.location({
              id: 'flat',
              name: 'The flat',
              description: 'Home',
              exits: ['street'],
              body: [{ prose: 'place.flat' }],
              picture: {
                layers: [{ id: 'room', src: 'flat/room.svg' }],
                hotspots: [{ id: 'out', rect: [80, 10, 15, 80], label: 'The front door', command: places.go('street') }],
              },
            }),
            places.location({ id: 'street', name: 'High Street', description: 'Out', exits: ['flat'], body: [{ prose: 'place.street' }] }),
          ],
          data: {
            messages: { messages: [{ id: 'mum.hi', channel: 'texts', from: 'Mum', when: places.at('flat'), body: [{ prose: 'mum.hi' }] }] },
            feed: {
              posts: [
                { id: 'post.cafe', feed: 'town', from: 'The Café', when: places.at('flat'), body: [{ prose: 'post.cafe' }], video: 'art/clips/steam.mp4' },
              ],
            },
          },
        },
      ],
      { id: 'town', title: 'Town', plugins: [places({ start: 'flat' }), devices(), messages(), feed()] },
    ).game
  }

  it('draws the place’s picture in the location panel, with its hotspots', () => {
    const runner = createRunner(town(), startingState(town()))
    render(<GameShell plugins={UIS} runner={runner} layout={storyOf(<LocationCard />)} />)
    const panel = document.querySelector('[data-part="location"]') as HTMLElement
    expect(panel.querySelector('[data-part="picture-layer"]')?.getAttribute('src')).toBe('art/flat/room.svg')
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'The front door' })))
    expect(runner.view().plugins.places).toMatchObject({ location: { id: 'street' } })
  })

  it('draws a message’s and a post’s beats, pictures and clips included', () => {
    const runner = createRunner(town(), startingState(town()))
    render(<GameShell plugins={UIS} runner={runner} />)
    act(() => void fireEvent.click(document.querySelector('[data-device="phone"]') as HTMLElement))
    act(() => void fireEvent.click(document.querySelector('[data-open-app="texts"]') as HTMLElement))
    act(() => void fireEvent.click(document.querySelector('[data-part="conversation"]') as HTMLElement))
    const bubble = document.querySelector('[data-part="bubble"][data-from="them"]') as HTMLElement
    expect(bubble.querySelector('[data-beat="text"]')?.textContent).toBe('Look what I found.')
    expect(bubble.querySelector('img[data-beat="image"]')?.getAttribute('src')).toBe('art/photo/cat.svg')
    expect(bubble.querySelector('video[data-beat="video"]')?.getAttribute('src')).toBe('art/clips/cat.mp4')
    // Back to the conversations, then back to the home screen.
    act(() => void fireEvent.click(document.querySelector('[data-part="thread-back"]') as HTMLElement))
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Back/ })))
    act(() => void fireEvent.click(document.querySelector('[data-open-app="town"]') as HTMLElement))
    const post = document.querySelector('[data-post="post.cafe"]') as HTMLElement
    expect(post.querySelector('img[data-beat="image"]')?.getAttribute('src')).toBe('art/photo/cake.svg')
    expect(post.querySelector('video[data-part="video"]')?.getAttribute('src')).toBe('art/clips/steam.mp4')
  })
})
