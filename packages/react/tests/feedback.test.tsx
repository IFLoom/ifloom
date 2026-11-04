// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createRunner, loadGame, startingState, text } from '@ifloom/engine'
import { Changes, GameShell, InputFields, Scene, checkUiHints } from '../src/index.ts'
import { storyOf } from './layouts.tsx'

afterEach(cleanup)

declare module '@ifloom/engine' {
  interface BlockUi {
    /** A game's own hint, for these tests: draw the section as a card. */
    card?: 'result'
    wide?: boolean
  }
}

/** A shift at the café: a result card, a fold, the pay as a change, and the till's name asked in the scene. */
function cafe() {
  return loadGame(
    [
      {
        name: 'cafe',
        introScene: 'shift',
        stats: [
          { id: 'coins', label: 'Coins', start: 0, format: '{n} coins' },
          { id: 'mood', label: 'Mood', start: 3, format: '{n}%' },
          { id: 'trust', label: 'Trust', of: 'character', start: 0 },
        ],
        kinds: [{ id: 'character', label: 'Person', unique: true }],
        entities: [{ id: 'ava', of: 'character', name: 'Ava' }],
        inputs: [
          { id: 'till', label: 'Name the till', type: 'text', when: { scene: ['shift'] } },
          { id: 'note', label: 'A note on the fridge', type: 'text', when: { not: { scene: ['shift'] } } },
        ],
        scenes: [
          {
            id: 'shift',
            title: 'The shift',
            body: [
              text('The lunch rush comes and goes.'),
              { blocks: [text('You made 30 coins.'), text('Ava says thanks.')], ui: { card: 'result', wide: true } },
              { blocks: [text('Tips: none.')], ui: { fold: 'The tips jar' } },
            ],
            choices: [
              {
                id: 'paid',
                label: 'Take the pay',
                effects: [{ stat: 'coins', by: 30 }, { stat: 'mood', by: -1 }, { stat: 'trust', of: 'character:ava', by: 2 }, { scene: null }],
              },
            ],
          },
        ],
      },
    ],
    { id: 'cafe', title: 'Café' },
  ).game
}

function play() {
  const g = cafe()
  const runner = createRunner(g, startingState(g))
  const Layout = storyOf(
    <>
      <Scene />
      <Changes />
      <InputFields />
    </>,
  )
  render(<GameShell runner={runner} layout={Layout} motion={false} />)
  return runner
}

describe('a section with ui hints', () => {
  it('is drawn as one group, its scalar hints as data attributes, with a fold inside its own group', () => {
    expect(checkUiHints(cafe(), { allow: ['card', 'wide'] })).toEqual([])
    play()
    const groups = [...document.querySelectorAll('[data-part="group"]')]
    expect(groups).toHaveLength(2)
    expect(groups[0].getAttribute('data-card')).toBe('result')
    expect(groups[0].getAttribute('data-wide')).toBe('')
    expect([...groups[0].querySelectorAll('[data-beat="text"]')].map((beat) => beat.textContent)).toEqual(['You made 30 coins.', 'Ava says thanks.'])
    expect(groups[1].getAttribute('data-fold')).toBe('The tips jar')
    expect(groups[1].querySelector('details[data-part="fold"]')).not.toBeNull()
    expect(document.querySelector('[data-beat="text"]')?.closest('[data-part="group"]')).toBeNull()
  })
})

describe('Changes', () => {
  it('lists what the last command moved, in each stat’s words, and nothing before', () => {
    const runner = play()
    expect(document.querySelector('[data-part="changes"]')).toBeNull()
    act(() => void fireEvent.click(document.querySelector('[data-part="choice"]')!))
    const items = [...document.querySelectorAll('[data-part="change"]')]
    expect(items.map((item) => item.textContent)).toEqual(['+30 coins', '-1%Mood', '+2Ava'])
    expect(items.map((item) => [item.getAttribute('data-stat'), item.getAttribute('data-of'), item.getAttribute('data-dir')])).toEqual([
      ['coins', null, 'up'],
      ['mood', null, 'down'],
      ['trust', 'character:ava', 'up'],
    ])
    expect(runner.view().changes).toHaveLength(3)
  })
})

describe('inputs', () => {
  it('come inside the scene, between its words and its choices; the layout’s InputFields has only those outside a scene', () => {
    play()
    const article = document.querySelector('[data-part="scene"]')!
    const field = article.querySelector('[data-input="till"]')!
    expect(field).not.toBeNull()
    const choices = article.querySelector('[data-part="choices"]')!
    const beats = article.querySelector('[data-part="beats"]')!
    expect(beats.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(field.compareDocumentPosition(choices) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.querySelectorAll('[data-input]')).toHaveLength(1)
    act(() => void fireEvent.click(document.querySelector('[data-part="choice"]')!))
    const note = document.querySelector('[data-input="note"]')!
    expect(note.closest('[data-part="scene"]')).toBeNull()
  })
})
