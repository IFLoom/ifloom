// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'
import { debug } from '@ifloom/plugin-debug'
import { phone } from '@ifloom/phone'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { GameShell } from '@ifloom/react'
import { calendarUi } from '@ifloom/plugin-calendar/react'
import { debugUi } from '@ifloom/plugin-debug/react'
import { devicesUi } from '@ifloom/plugin-devices/react'
import { feedUi } from '@ifloom/plugin-feed/react'
import { messagesUi } from '@ifloom/plugin-messages/react'
import { placesUi } from '@ifloom/plugin-places/react'
import { questsUi } from '@ifloom/plugin-quests/react'

/** The plugin UIs every game here is drawn with. */
const UIS = [calendarUi, debugUi, devicesUi, feedUi, messagesUi, placesUi, questsUi]

afterEach(cleanup)

const kit = phone({ feeds: [] })

function game(strings: Record<string, string> = {}): Game {
  const loaded = loadGame(
    [
      kit.content,
      {
        name: 'base',
        introScene: 'intro',
        actions: [],
        strings,
      },
      {
        name: 'town',
        stats: [{ id: 'coins', label: 'Coins', start: 3, format: '{n}c', spendable: true }],
        actions: [
          { id: 'wait', label: 'Wait a while', effects: [calendar.pass(1)] },
          { id: 'cake', label: 'Buy a cake', cost: { stats: { coins: 10 } } },
        ],
        scenes: [{ id: 'intro', title: 'Morning', body: [{ prose: 'intro' }], choices: [{ id: 'up', label: 'Get up', effects: [{ scene: null }] }] }],
        prose: {
          'place.house': 'Quiet.',
          'place.street': 'Busy.',
          intro: 'The alarm goes.',
          'mum.hi': 'Did you eat?',
        },
        entities: [
          places.location({ id: 'house', name: 'House', desc: 'Home', exits: ['street'], body: [{ prose: 'place.house' }] }),
          places.location({ id: 'street', name: 'High Street', desc: 'Out', exits: ['house'], body: [{ prose: 'place.street' }] }),
        ],
        data: {
          messages: {
            messages: [
              {
                id: 'mum.hi',
                channel: 'texts',
                from: 'Mum',
                when: places.at('street'),
                body: [{ prose: 'mum.hi' }],
                replies: [{ id: 'yes', label: 'Yes, Mum' }],
              },
            ],
          },
          quests: { quests: [{ id: 'out', title: 'Get out of the house', starts: { kv: 'never' }, stages: [] }] },
        },
      },
    ],
    {
      id: 'ui-test',
      title: 'Small Town',
      plugins: [calendar(), places({ start: 'house' }), ...kit.plugins, quests(), debug()],
    },
  )
  return loaded.game
}

function play(g: Game) {
  const runner = createRunner(g, startingState(g))
  render(<GameShell plugins={UIS} runner={runner} />)
  return runner
}

describe('the React UI', () => {
  it('draws the scene, and a choice sends its command', () => {
    play(game())
    expect(screen.getByRole('heading', { name: 'Morning' })).toBeTruthy()
    expect(screen.getByText('The alarm goes.')).toBeTruthy()
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Get up/ })))
    expect(screen.getByRole('heading', { level: 2, name: 'House' })).toBeTruthy()
    expect(screen.getByText('Quiet.')).toBeTruthy()
  })

  it('shows the clock and the stats, and travels by exit', () => {
    play(game())
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Get up/ })))
    expect(screen.getByText(/Day 1/)).toBeTruthy()
    expect(within(document.querySelector('[data-stat="coins"]') as HTMLElement).getByText('3c')).toBeTruthy()
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'High Street' })))
    expect(screen.getByRole('heading', { level: 2, name: 'High Street' })).toBeTruthy()
  })

  it('raises a notice and a phone badge when a text arrives, and replies from the phone', () => {
    play(game())
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Get up/ })))
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'High Street' })))
    expect(document.querySelector('[data-notice]')?.textContent).toContain('Mum')
    const phoneButton = document.querySelector('[data-device="phone"]') as HTMLElement
    expect(phoneButton.textContent).toContain('1')
    act(() => void fireEvent.click(phoneButton))
    act(() => void fireEvent.click(document.querySelector('[data-open-app="texts"]') as HTMLElement))
    expect(screen.getByText('Did you eat?')).toBeTruthy()
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Yes, Mum/ })))
    expect(document.querySelector('[data-thread="Mum"]')?.textContent).toContain('Yes, Mum')
  })

  it('greys out a button with its reason on it', () => {
    play(game())
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Get up/ })))
    const cake = document.querySelector('[data-choice="cake"]') as HTMLButtonElement
    expect(cake.disabled).toBe(true)
    expect(cake.textContent).toContain('10c')
    expect(cake.textContent).toContain('Not enough coins.')
  })

  it('speaks the game’s words in its own labels', () => {
    play(game({ 'calendar/label': 'Dag {day}', talk: 'Praat', 'ui.quests': 'Dagboek' }))
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Get up/ })))
    expect(screen.getByText('Dag 1 · House')).toBeTruthy()
  })

  it('has a debug panel that sets the state by hand', () => {
    const runner = play(game())
    const form = screen.getByLabelText('Stat stat').closest('form') as HTMLElement
    act(() => {
      fireEvent.change(within(form).getByLabelText('Stat stat'), { target: { value: 'coins' } })
      fireEvent.change(within(form).getByLabelText('Stat value'), { target: { value: '40' } })
      fireEvent.click(within(form).getByRole('button', { name: 'Set' }))
    })
    expect(runner.state.stats.coins).toBe(40)
  })
})
