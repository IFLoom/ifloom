import { describe, expect, expectTypeOf, it } from 'vitest'
import { loadGame, type Content } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { parseBeats } from '../../src/sceneBody.ts'
import { view } from '../../src/view.ts'
import type { Game } from '../../src/game.ts'
import type { DataScene } from '../../src/scene.ts'
import type { Ui, SceneUi } from '../../src/index.ts'

// A UI package types its hints by augmenting the interfaces, as this test does for a made-up `mood`.
declare module '@ifloom/engine' {
  interface SceneUi {
    mood?: 'calm' | 'tense'
  }
}

const porch: DataScene = {
  id: 'porch',
  ui: { mood: 'calm', backdrop: 'dusk' },
  body: [
    { prose: 'porch.text' },
    { prose: 'porch.more', ui: { reveal: { delay: 1200 } } },
    { prose: 'porch.never', when: { kv: 'never' }, ui: { lost: true } },
    { prose: 'porch.last', ui: { style: 'whisper' } },
  ],
  choices: [
    { id: 'in', label: 'Go in', ui: { transition: 'zoom' }, effects: [{ scene: null }] },
    { id: 'wait', label: 'Wait', effects: [] },
  ],
}

const prose = {
  'porch.text': 'A porch.',
  'porch.more': 'A swing creaks.\n\nThen it stops.',
  'porch.never': 'Never shown.',
  'porch.last': 'Somebody hums.',
}

function make(extra: Partial<Content> = {}, base: Partial<Game> = {}) {
  const content: Content = {
    name: 'house',
    prose,
    scenes: [porch],
    stats: [{ id: 'energy', label: 'Energy', start: 5, ui: { display: 'bar' } }],
    kinds: [{ id: 'cat', label: 'Cat', ui: { hue: 30, badge: 'paw' } }],
    entities: [
      { id: 'tom', of: 'cat', name: 'Tom', ui: { hue: 200 } },
      { id: 'kit', of: 'cat', name: 'Kit' },
    ],
    ...extra,
  }
  const actions: Game['actions'] = [{ id: 'nap', label: 'Nap', command: { type: 'leave' }, ui: { icon: 'moon' } }]
  // The scene it opens on, unless `base` says none.
  const { introScene, ...rest } = 'introScene' in base ? base : { ...base, introScene: 'porch' }
  return loadGame([{ name: 'base', ...(introScene ? { introScene } : {}), actions }, content], { id: 'house', title: 'The House', ...rest })
}

describe('ui hints', () => {
  it("carry a scene's and its choices' hints to the view as written", () => {
    const { game } = make()
    const shown = view(startingState(game), game)
    expect(shown.scene.ui).toEqual({ mood: 'calm', backdrop: 'dusk' })
    expect(shown.scene.choices.map((choice) => choice.ui)).toEqual([{ transition: 'zoom' }, undefined])
    expect('ui' in shown.scene.choices[1]).toBe(false)
  })

  it("put a block's hints on the first beat it makes, and leave out a block that isn't shown", () => {
    const { game } = make()
    const beats = view(startingState(game), game).scene.beats
    expect(beats.map((beat) => [beat.type === 'text' ? beat.text : beat.type, beat.ui])).toEqual([
      ['A porch.', undefined],
      ['A swing creaks.', { reveal: { delay: 1200 } }],
      ['Then it stops.', undefined],
      ['Somebody hums.', { style: 'whisper' }],
    ])
  })

  it('put hints on beats by where each block starts in the body', () => {
    const beats = parseBeats('One.\n\nTwo.\n\n[[ui:mail|Hi.\n\nBye.|From: Ava]]\n\nThree.', [
      { at: 6, ui: { a: 1 } },
      { at: 12, ui: { b: 2 } },
      { at: 45, ui: { c: 3 } },
    ])
    expect(beats.map((beat) => ['text' in beat ? beat.text : beat.type, beat.ui])).toEqual([
      ['One.', undefined],
      ['Two.', { a: 1 }],
      ['[[ui:mail|Hi.\n\nBye.|From: Ava]]', { b: 2 }],
      ['Three.', { c: 3 }],
    ])
  })

  it("carry stats', entities' and the room's buttons' hints, an entity's over its kind's", () => {
    const { game } = make({ scenes: [] }, { introScene: undefined })
    const shown = view(startingState(game), game)
    expect(shown.statsById.energy.ui).toEqual({ display: 'bar' })
    expect(shown.entities.cat.entries.map((entry) => entry.ui)).toEqual([
      { hue: 200, badge: 'paw' },
      { hue: 30, badge: 'paw' },
    ])
    expect(shown.actions.find((action) => action.id === 'nap')?.ui).toEqual({ icon: 'moon' })
  })

  it('have no effect on play', () => {
    const plain = make({ scenes: [{ ...porch, ui: undefined, choices: porch.choices.map(({ ui: _ui, ...choice }) => choice) }] }).game
    const hinted = make().game
    const step = (game: Game) => {
      const applied = apply(startingState(game), game, { type: 'choose', id: 'in' })
      if (!applied.ok) throw new Error(applied.reason)
      return applied.state
    }
    expect(step(hinted)).toEqual(step(plain))
  })

  it('are reported when they are not data', () => {
    const odd: DataScene = {
      ...porch,
      ui: { mood: 'calm', onShow: () => 1 } as unknown as DataScene['ui'],
      body: [{ prose: 'porch.text', ui: 'fade' as unknown as DataScene['ui'] }],
      choices: [{ id: 'in', ui: { list: [1, new Date(0)] }, effects: [] }],
    }
    const problems = make({ scenes: [odd], ui: { fine: true } }).problems.map(describeProblem)
    expect(problems).toEqual([
      'house · scene porch · ui must be an object of hints',
      'house · scene porch · choice in: ui.list[1] is not plain data; ui hints are objects, arrays, text, numbers and true/false',
      'house · scene porch · ui.onShow is a function; ui hints are data',
    ])
  })

  it('are typed by what a UI package declares, and let anything else through', () => {
    expectTypeOf<Ui<SceneUi>['mood']>().toEqualTypeOf<'calm' | 'tense' | undefined>()
    expectTypeOf<{ mood: 'calm'; other: number }>().toExtend<Ui<SceneUi>>()
  })
})
