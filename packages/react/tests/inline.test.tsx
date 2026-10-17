// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { GameShell } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
})

/** A hall with a ringing phone to pick up, a door to knock on while not shy, and a tooltip. */
function house(): Game {
  return loadGame(
    [
      {
        id: 'house',
        schema: SCHEMA,
        scenes: [
          {
            id: 'hall',
            title: 'The hall',
            body: [{ text: 'hall' }],
            choices: [
              { id: 'answer', effects: [{ kind: 'kv', key: 'answered', to: true }] },
              { id: 'knock', blocked: [{ when: { kv: 'shy' }, reason: 'You feel too shy.' }], effects: [] },
              { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
            ],
          },
        ],
        prose: {
          hall: 'The phone rings. [[act:answer|Pick it up]], or [[act:knock|knock]] on the door. The [[tip:hall.caller|caller]] waits.',
          'hall.caller': 'Ava, from the café.',
          'hall#answer': 'Answer',
          'hall#knock': 'Knock',
          'hall#leave': 'Leave',
        },
      },
    ],
    { id: 'house', title: 'The House', introScene: 'hall' },
  ).game
}

function play(kv: Record<string, boolean> = {}, props: Partial<Parameters<typeof GameShell>[0]> = {}) {
  const game = house()
  const start = startingState(game)
  const runner = createRunner(game, { ...start, kv: { ...start.kv, ...kv } })
  render(<GameShell runner={runner} layout={Reading} motion={false} {...props} />)
  return runner
}

const inline = (id: string) => document.querySelector(`[data-part="inline-action"][data-choice="${id}"]`) as HTMLButtonElement

describe('inline actions', () => {
  it('are buttons in the line, and their choices leave the list', () => {
    play()
    const line = document.querySelector('[data-beat="text"]')!
    expect(line.textContent).toBe('The phone rings. Pick it up, or knock on the door. The caller waits.')
    expect(line.contains(inline('answer'))).toBe(true)
    expect(document.querySelector('[data-part="choices"] [data-choice="answer"]')).toBeNull()
    expect(document.querySelector('[data-part="choices"] [data-choice="leave"]')).not.toBeNull()
  })

  it('send their choice when pressed', () => {
    const runner = play()
    fireEvent.click(inline('answer'))
    expect(runner.state.kv.answered).toBe(true)
  })

  it('stay focusable when greyed out, and say why on a tap and to a screen reader', () => {
    const runner = play({ shy: true })
    const knock = inline('knock')
    expect(knock.hasAttribute('data-disabled')).toBe(true)
    expect(knock.getAttribute('aria-disabled')).toBe('true')
    expect(knock.disabled).toBe(false)
    const note = document.getElementById(knock.getAttribute('aria-describedby')!)!
    expect(note.textContent).toBe('You feel too shy.')
    expect(note.getAttribute('role')).toBe('tooltip')
    expect(note.hidden).toBe(true)
    fireEvent.click(knock)
    expect(note.hidden).toBe(false)
    expect(runner.log().commands).toEqual([])
    // Escape closes it, and doesn't reach the game's own keys.
    fireEvent.keyDown(knock, { key: 'Escape' })
    expect(note.hidden).toBe(true)
  })

  it('have no number key: the number keys pick the list', () => {
    const runner = play({}, { keys: true })
    expect(inline('answer').hasAttribute('data-choice-key')).toBe(false)
    expect(document.querySelector('[data-choice="leave"]')?.getAttribute('data-choice-key')).toBe('1')
    act(() => {
      fireEvent.keyDown(window, { key: '1' })
    })
    expect(runner.state.sceneId).toBeNull()
  })
})

describe('tooltips', () => {
  it('show their note on a tap, and describe their words', () => {
    play()
    const tip = screen.getByRole('button', { name: 'caller' })
    expect(tip.getAttribute('data-part')).toBe('tip')
    const note = document.getElementById(tip.getAttribute('aria-describedby')!)!
    expect(note.getAttribute('data-part')).toBe('tip-content')
    expect(note.textContent).toBe('Ava, from the café.')
    expect(note.hidden).toBe(true)
    fireEvent.click(tip)
    expect(note.hidden).toBe(false)
    expect(tip.getAttribute('aria-expanded')).toBe('true')
    // A tap anywhere else closes it.
    fireEvent.pointerDown(document.body)
    expect(note.hidden).toBe(true)
  })

  it('open on hover with a mouse', () => {
    play()
    const tip = screen.getByRole('button', { name: 'caller' })
    const note = document.getElementById(tip.getAttribute('aria-describedby')!)!
    fireEvent.pointerEnter(tip, { pointerType: 'mouse' })
    expect(note.hidden).toBe(false)
    fireEvent.pointerLeave(tip, { pointerType: 'mouse' })
    expect(note.hidden).toBe(true)
  })
})
