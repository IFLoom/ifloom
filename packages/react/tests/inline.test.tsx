// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { GameShell, checkUiHints } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
})

/** A hall with a ringing phone to pick up, a door to knock on while not shy, and a tooltip. */
function house(): Game {
  return loadGame(
    [
      { name: 'base', introScene: 'hall' },
      {
        name: 'house',
        scenes: [
          {
            id: 'hall',
            title: 'The hall',
            body: [{ prose: 'hall' }],
            choices: [
              { id: 'answer', label: 'Answer', effects: [{ kv: 'answered', to: true }] },
              { id: 'knock', label: 'Knock', blocked: [{ when: { kv: 'shy' }, reason: 'You feel too shy.' }], effects: [] },
              { id: 'leave', label: 'Leave', effects: [{ scene: null }] },
            ],
          },
        ],
        prose: {
          hall: 'The phone rings. [[act:answer|Pick it up]], or [[act:knock|knock]] on the door. The [[tip:hall.caller|caller]] waits.\n\nIt is **very** loud, and *still* ringing.',
          'hall.caller': 'Ava, from the café.',
        },
      },
    ],
    { id: 'house', title: 'The House' },
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

describe('bold and italics', () => {
  it('are a strong and an em in the line, with their parts', () => {
    play()
    const line = document.querySelectorAll('[data-beat="text"]')[1]
    expect(line.textContent).toBe('It is very loud, and still ringing.')
    expect(line.querySelector('strong[data-part="bold"]')?.textContent).toBe('very')
    expect(line.querySelector('em[data-part="italic"]')?.textContent).toBe('still')
  })
})

/** A hall with a note to read, a photo to look at, a piece of the game's own and one nothing draws. */
function hallway(): Game {
  return loadGame(
    [
      { name: 'base', introScene: 'hall' },
      {
        name: 'hallway',
        scenes: [{ id: 'hall', title: 'The hall', body: [{ prose: 'hall' }], choices: [{ id: 'leave', label: 'Leave', effects: [{ scene: null }] }] }],
        prose: {
          hall: 'A [[ui:modal|note|hall.note|From Sam]] is under the door, beside [[ui:image|a photo|photo/ava.svg|Ava by the river]]. The [[ui:stamp|stamp|blue]] is smudged, and the [[ui:sticker|sticker]] peels.',
          'hall.note': 'Welcome to the building, {{name}}!\n\nBins go out **Thursday**.',
        },
      },
    ],
    { id: 'house', title: 'The House' },
  ).game
}

function playHallway(props: Partial<Parameters<typeof GameShell>[0]> = {}) {
  const game = hallway()
  const start = startingState(game)
  const runner = createRunner(game, { ...start, kv: { ...start.kv, name: 'Robin' } })
  render(<GameShell runner={runner} layout={Reading} motion={false} {...props} />)
  return runner
}

describe('inline pieces', () => {
  it('keep their words in the line, and show a name nothing draws as its words', () => {
    playHallway()
    const line = document.querySelector('[data-beat="text"]')!
    expect(line.textContent).toBe('A note is under the door, beside a photo. The stamp is smudged, and the sticker peels.')
    expect(line.querySelectorAll('[data-part="inline-ui"]')).toHaveLength(2)
  })

  it('open a modal with a prose line, titled, and close it on Escape with focus back on the words', async () => {
    playHallway()
    const note = screen.getByRole('button', { name: 'note' })
    expect(note.getAttribute('data-ui')).toBe('modal')
    expect(note.getAttribute('aria-haspopup')).toBe('dialog')
    note.focus()
    fireEvent.click(note)
    const dialog = await screen.findByRole('dialog')
    expect(note.getAttribute('aria-expanded')).toBe('true')
    expect(dialog.querySelector('[data-part="dialog-title"]')?.textContent).toBe('From Sam')
    const body = dialog.querySelector('[data-part="inline-modal"]')!
    expect([...body.querySelectorAll('[data-beat="text"]')].map((beat) => beat.textContent)).toEqual([
      'Welcome to the building, Robin!',
      'Bins go out Thursday.',
    ])
    expect(body.querySelector('strong[data-part="bold"]')?.textContent).toBe('Thursday')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await act(async () => {})
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(note)
  })

  it('open a picture in the viewer', async () => {
    playHallway()
    const photo = screen.getByRole('button', { name: 'a photo' })
    expect(photo.getAttribute('data-ui')).toBe('image')
    fireEvent.click(photo)
    const viewer = await screen.findByRole('dialog')
    expect(viewer.getAttribute('data-part')).toBe('viewer')
    const img = viewer.querySelector('img')!
    expect(img.getAttribute('src')).toBe('art/photo/ava.svg')
    expect(img.getAttribute('alt')).toBe('Ava by the river')
  })

  it("draw the game's own by name, over a built-in one", () => {
    playHallway({
      inline: {
        stamp: ({ text, args }) => <mark data-colour={args[0]}>{text}</mark>,
        modal: ({ text }) => <u>{text}</u>,
      },
    })
    expect(document.querySelector('mark[data-colour="blue"]')?.textContent).toBe('stamp')
    expect(document.querySelector('u')?.textContent).toBe('note')
    expect(screen.queryByRole('button', { name: 'note' })).toBeNull()
  })

  it('are checked by checkUiHints: unknown names, a modal with no prose, an image with no path', () => {
    const game = loadGame(
      [
        {
          name: 'bad',
          prose: {
            a: 'A [[ui:stamp|stamp]], a [[ui:modal|note|nope]], a [[ui:modal|bare]], an [[ui:image|image]] and [[ui:image|more|x|y|z]].',
            b: 'A [[ui:mood|calm]] one.',
          },
        },
      ],
      { id: 'bad', title: 'Bad' },
    ).game
    const problems = checkUiHints(game, { allow: ['mood'] })
    expect(problems).toEqual([
      'prose a: [[ui:stamp|stamp]] is not an inline piece the React UI draws, so it shows only its words; add it to inline',
      'prose a: [[ui:modal|note]]: no prose for "nope"',
      'prose a: [[ui:modal|bare]] needs a prose key: [[ui:modal|words|key]]',
      "prose a: [[ui:image|image]] needs a picture's path: [[ui:image|words|path]]",
      'prose a: [[ui:image|more]] takes two arguments at most',
    ])
    expect(checkUiHints(game, { allow: ['mood'], inline: { stamp: () => null } })).toHaveLength(4)
  })
})
