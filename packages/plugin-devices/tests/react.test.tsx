// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState } from '@ifloom/engine'
import { phone } from '@ifloom/phone'
import { Game as GamePage, GameShell, NoticeStrip, Scene, Story } from '@ifloom/react'
import { devicesUi } from '../src/react/index.tsx'
import { messagesUi } from '@ifloom/plugin-messages/react'

/** The plugin UIs every game here is drawn with. */
const UIS = [devicesUi, messagesUi]

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

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const click = (name: string) => act(() => void fireEvent.click(screen.getByRole('button', { name })))

describe('the notice strip, with a phone', () => {
  it('counts each app with a badge, and opens the device on it', () => {
    const kit = phone({ feeds: [] })
    const { game: g, problems } = loadGame(
      [
        kit.content,
        { name: 'base', introScene: 'intro' },
        {
          name: 'home',
          scenes: [{ id: 'intro', title: 'Home', body: [{ prose: 'intro' }], choices: [{ id: 'wait', label: 'Wait', effects: [] }] }],
          prose: { intro: 'The kettle is on.', 'mum.hi': 'Did you eat?' },
          data: {
            messages: { messages: [{ id: 'mum.hi', channel: 'texts', from: 'Mum', body: [{ prose: 'mum.hi' }], replies: [{ id: 'yes', label: 'Yes, Mum' }] }] },
          },
        },
      ],
      { id: 'phone-test', title: 'Home', plugins: [...kit.plugins] },
    )
    expect(problems).toEqual([])
    const runner = createRunner(g, startingState(g))
    render(
      <GameShell
        plugins={UIS}
        runner={runner}
        layout={storyOf(
          <>
            <NoticeStrip />
            <Scene />
          </>,
        )}
      />,
    )
    // Nothing new yet: the strip draws nothing it can be seen by.
    expect(document.querySelector<HTMLElement>('[data-part="notice-strip"]')?.hidden ?? true).toBe(true)
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
