// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'
import { debug } from '@ifloom/plugin-debug'
import { phone } from '@ifloom/phone'
import { calendar, pass } from '@ifloom/plugin-calendar'
import { at, places } from '@ifloom/plugin-places'
import { GameShell } from '../src/index.ts'

afterEach(cleanup)

const kit = phone({ feeds: [] })

function game(strings: Record<string, string> = {}): Game {
  const loaded = loadGame(
    [
      {
        id: 'town',
        schema: SCHEMA,
        stats: [{ id: 'coins', label: 'Coins', start: 3, format: '{n}c', spendable: true }],
        activities: [{ id: 'wait', effects: [pass(1)] }, { id: 'cake', cost: { stats: { coins: 10 } } }],
        scenes: [{ id: 'intro', title: 'Morning', body: [{ text: 'intro' }], choices: [{ id: 'up', effects: [{ kind: 'scene', scene: null }] }] }],
        prose: {
          'place.house': 'Quiet.',
          'place.street': 'Busy.',
          intro: 'The alarm goes.',
          'intro#up': 'Get up',
          'mum.hi': 'Did you eat?',
          'mum.hi#yes': 'Yes, Mum',
        },
        data: {
          places: {
            locations: [
              { id: 'house', name: 'House', tag: 'Home', kind: 'room', exits: ['street'], art: '', body: [{ text: 'place.house' }] },
              { id: 'street', name: 'High Street', tag: 'Out', kind: 'street', exits: ['house'], art: '', body: [{ text: 'place.street' }] },
            ],
          },
          messages: { messages: [{ id: 'mum.hi', channel: 'texts', from: 'Mum', when: at('street'), body: [{ text: 'mum.hi' }], replies: [{ id: 'yes' }] }] },
          quests: { quests: [{ id: 'out', title: 'Get out of the house', starts: { kv: 'never' }, stages: [] }] },
        },
      },
    ],
    {
      id: 'ui-test',
      title: 'Small Town',
      introScene: 'intro',
      plugins: [calendar(), places({ start: 'house' }), ...kit.plugins, quests(), debug()],
      collections: kit.collections,
      actions: [
        { id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } },
        { id: 'cake', label: 'Buy a cake', command: { type: 'activity', id: 'cake' } },
      ],
      strings,
    },
  )
  return loaded.game
}

function play(g: Game) {
  const runner = createRunner(g, startingState(g))
  render(<GameShell runner={runner} />)
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

describe('Picture', () => {
  it('gives a new picture its own chance after one failed', async () => {
    const { Picture } = await import('../src/index.ts')
    const { rerender, container } = render(<Picture src="art/missing.jpg" alt="" />)
    act(() => void fireEvent.error(container.querySelector('img')!))
    expect(container.querySelector('img')).toBeNull()
    rerender(<Picture src="art/next.jpg" alt="" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('art/next.jpg')
  })
})

describe('assetUrl', () => {
  it('finds a picture inlined into the page, and leaves any other path alone', async () => {
    const { assetUrl } = await import('../src/index.ts')
    ;(globalThis as { __ifloomAssets?: Record<string, string> }).__ifloomAssets = { 'art/a.png': 'data:image/png;base64,AA' }
    expect(assetUrl('art/a.png')).toBe('data:image/png;base64,AA')
    expect(assetUrl('./art/a.png')).toBe('data:image/png;base64,AA')
    expect(assetUrl('art/b.png')).toBe('art/b.png')
    delete (globalThis as { __ifloomAssets?: unknown }).__ifloomAssets
  })
})
