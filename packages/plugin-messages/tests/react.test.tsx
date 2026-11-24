// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createRunner, loadGame, type Game } from '@ifloom/engine'
import { freshState } from '@ifloom/engine/testing'
import { GameProvider } from '@ifloom/react'
import { messages } from '../src/index.ts'
import { MessagesSection, messagesUi } from '../src/react/index.tsx'

afterEach(cleanup)

function game(): Game {
  return loadGame(
    [
      {
        name: 'texts',
        actions: [{ id: 'goOut', label: 'Go out', effects: [{ kv: 'out', to: true }] }],
        data: {
          messages: {
            channels: [{ id: 'texts', name: 'Messages' }],
            messages: [
              { id: 'a.1', channel: 'texts', from: 'Ava', when: { kv: 'out' }, body: [{ text: 'Are you up?\nIt is early, sorry.' }] },
              { id: 'a.2', channel: 'texts', from: 'Ava', when: messages.arrived('a.1'), after: { ms: 1000 }, body: [{ text: 'Never mind.' }] },
              { id: 'b.1', channel: 'texts', from: 'Ben', when: { kv: 'out' }, body: [{ text: 'Bins are out.' }], replies: [{ id: 'ok', label: 'Thanks' }] },
            ],
          },
        },
      },
    ],
    { id: 'texts', title: 'Texts', plugins: [messages()] },
  ).game
}

const click = (element: Element) => act(() => void fireEvent.click(element))

function draw() {
  const g = game()
  const runner = createRunner(g, freshState(g))
  render(
    <GameProvider runner={runner} plugins={[messagesUi]}>
      <MessagesSection data={undefined} with={{ channel: 'texts' }} />
    </GameProvider>,
  )
  return runner
}

describe('the messages UI', () => {
  it('says so when nothing has come yet', () => {
    draw()
    expect(document.querySelector('[data-part="messages-empty"]')?.textContent).toBe('No messages yet.')
    expect(document.querySelector('[data-part="conversations"]')).toBeNull()
  })

  it('lists conversations with the last line and an unread dot, opens one, and goes back', () => {
    const runner = draw()
    act(() => void runner.apply({ type: 'action', id: 'goOut' }))
    const rows = [...document.querySelectorAll('[data-part="conversation"]')]
    expect(rows.map((row) => row.getAttribute('data-thread'))).toEqual(['Ben', 'Ava'])
    const ava = rows[1]
    expect(ava.querySelector('[data-part="conversation-last"]')?.textContent).toBe('typing…')
    expect(ava.querySelector('[data-part="conversation-unread"]')).not.toBeNull()
    click(ava)
    expect(document.querySelector('[data-part="conversations"]')).toBeNull()
    expect(document.querySelector('[data-part="thread-title"]')?.textContent).toBe('Ava')
    // Opened, it's read; the next message is on its way, so Ava is typing.
    expect(runner.view().plugins.messages).toMatchObject({ channels: [{ unread: 1 }] })
    const typing = document.querySelector('[data-part="bubble"][data-typing]')
    expect(typing?.getAttribute('data-from')).toBe('them')
    expect(typing?.getAttribute('aria-label')).toBe('Ava is typing')
    act(() => void runner.apply({ type: 'tick', ms: 1000 }))
    expect(document.querySelector('[data-typing]')).toBeNull()
    expect([...document.querySelectorAll('[data-from="them"]')].map((bubble) => bubble.textContent)).toEqual([
      'Are you up?\nIt is early, sorry.',
      'Never mind.',
    ])
    click(document.querySelector('[data-part="thread-back"]')!)
    expect(document.querySelectorAll('[data-part="conversation"]')).toHaveLength(2)
    expect(document.querySelector('[data-thread="Ava"] [data-part="conversation-last"]')?.textContent).toBe('Never mind.')
  })
})
