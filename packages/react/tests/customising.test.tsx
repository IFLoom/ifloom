// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, notify, startingState, type Game, type SceneBeat } from '@ifloom/engine'
import { GameShell, mountGame, useGame, type Components, SceneStage } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function letter(): Game {
  return loadGame(
    [
      {
        id: 'letter',
        schema: SCHEMA,
        scenes: [
          {
            id: 'mat',
            title: 'The mat',
            body: [{ text: 'mat' }, { text: 'mat/ava' }],
            choices: [
              { id: 'open', effects: [{ kind: 'scene', scene: null }] },
              { id: 'shelf', effects: [{ kind: 'notify', title: 'Hello', text: 'hello' }] },
            ],
          },
        ],
        prose: { mat: 'A letter on the mat.', 'mat/ava': 'Ava: "Is that for me?"', hello: 'A notice.', 'mat#open': 'Open it', 'mat#shelf': 'Put it on the shelf' },
      },
    ],
    { id: 'letter', title: 'The Letter', introScene: 'mat' },
  ).game
}

function show(props: Partial<Parameters<typeof GameShell>[0]> = {}) {
  const game = letter()
  const runner = createRunner(game, startingState(game))
  render(<GameShell runner={runner} layout={Reading} {...props} />)
  return runner
}

describe('replacing components', () => {
  it('swaps a component everywhere it is drawn, and hands over the built-in one as Default', () => {
    const components: Components = {
      ChoiceButton: ({ choice }) => <a data-mine={choice.id}>{choice.label.toUpperCase()}</a>,
      Beat: ({ beat, Default }) =>
        beat.kind === 'say' ? <blockquote data-said>{(beat as Extract<SceneBeat, { kind: 'say' }>).text}</blockquote> : <Default beat={beat} />,
    }
    show({ components })
    expect(screen.getByText('OPEN IT').getAttribute('data-mine')).toBe('open')
    expect(document.querySelectorAll('[data-part="choice"]')).toHaveLength(0)
    expect(document.querySelector('[data-said]')?.textContent).toContain('Is that for me?')
    expect(screen.getByText('A letter on the mat.').getAttribute('data-beat')).toBe('text')
  })

  it('takes a layout of its own in place of the page, with no overlay', () => {
    const Layout = () => (
      <div data-my-frame>
        <header>My game</header>
        <SceneStage />
      </div>
    )
    show({ layout: Layout })
    expect(document.querySelector('[data-my-frame] header')?.textContent).toBe('My game')
    expect(document.querySelector('[data-part="page"]')).toBeNull()
    expect(document.querySelector('[data-part="notices"]')).toBeNull()
  })

  it('draws notices in the overlay by default', () => {
    const runner = show()
    act(() => void runner.apply({ type: 'choose', id: 'shelf' }))
    expect(document.querySelector('[data-part="overlay"] [data-part="notice"]')?.textContent).toContain('Hello')
  })

  it('puts the overlay after the story, sticky at the bottom rather than fixed, and empty with no notices', () => {
    show()
    const overlay = document.querySelector('[data-part="overlay"]')!
    expect(overlay.previousElementSibling?.getAttribute('data-part')).toBe('story')
    expect(overlay.className).toMatch(/\bsticky\b/)
    expect(overlay.className).not.toMatch(/\bfixed\b/)
    expect(overlay.childElementCount).toBe(0)
  })

  it('collapses the notices to the newest on a phone, with a button for the rest', () => {
    const game = letter()
    let state = startingState(game)
    state = notify(state, { title: 'A letter came' })
    state = notify(state, { title: 'The café is open late' })
    render(<GameShell runner={createRunner(game, state)} layout={Reading} />)
    const list = document.querySelector('[data-part="notices"]')!
    expect(list.hasAttribute('data-collapsed')).toBe(true)
    const more = document.querySelector('[data-part="notices-more"]') as HTMLButtonElement
    expect(more.textContent).toBe('+1 more')
    expect(more.getAttribute('aria-expanded')).toBe('false')
    act(() => void fireEvent.click(more))
    expect(list.hasAttribute('data-collapsed')).toBe(false)
    expect(more.textContent).toBe('Show fewer')
    expect(more.getAttribute('aria-expanded')).toBe('true')
  })
})

describe('classes and data-part', () => {
  it('names every part it draws', () => {
    const runner = show()
    act(() => void runner.apply({ type: 'choose', id: 'shelf' }))
    for (const part of ['page', 'story', 'overlay', 'title', 'scene', 'scene-title', 'beats', 'beat', 'choices', 'choice', 'choice-label', 'notice']) {
      expect(document.querySelector(`[data-part="${part}"]`), part).not.toBeNull()
    }
  })

  it('merges a string over the built-in classes, so yours win where they clash', () => {
    show({ classes: { 'scene-title': 'text-5xl italic' } })
    const title = document.querySelector('[data-part="scene-title"]')!
    expect(title.className).toContain('text-5xl')
    expect(title.className).toContain('italic')
    expect(title.className).toContain('font-semibold')
  })

  it('replaces them with a function, which gets the built-in ones', () => {
    let seen = ''
    show({
      classes: {
        choice: (defaults) => {
          seen = defaults
          return 'my-choice'
        },
      },
    })
    expect(seen).toContain('w-full')
    for (const button of document.querySelectorAll('[data-part="choice"]')) expect(button.className).toBe('my-choice')
  })

  it('drops every built-in class when unstyled, keeping the parts and your own classes', () => {
    show({ unstyled: true, classes: { choice: 'mine' } })
    expect(document.querySelector('[data-part="scene-title"]')!.className).toBe('')
    expect(document.querySelector('[data-part="choice"]')!.className).toBe('mine')
  })
})

describe('mountGame with an app of your own', () => {
  it('draws your component inside the game, where useGame works', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.append(root)
    function App() {
      const { view } = useGame()
      return <h1 data-own>{view.scene.title}</h1>
    }
    await act(async () => void mountGame(letter(), { app: App }))
    expect(document.querySelector('[data-own]')?.textContent).toBe('The mat')
    expect(document.querySelector('[data-part="page"]')).toBeNull()
  })
})
