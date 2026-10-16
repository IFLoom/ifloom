import { describe, expect, it } from 'vitest'
import type { Game, Scene } from '../../src/game.ts'
import { definePlugin } from '../../src/plugin.ts'
import { apply } from '../../src/reduce.ts'
import { createRunner } from '../../src/runner.ts'
import { memoryDriver } from '../../src/drivers.ts'
import { profile } from '../../src/profile.ts'
import { screen, stageView } from '../../src/screen.ts'
import type { GameState } from '../../src/types.ts'
import { begin, fixture } from '../fixtures/town.ts'

/**
 * A state's open scene is rendered once per screen of it, not once per
 * question asked about it. These tests count renders by wrapping each scene's
 * `render`, keyed by the state object it was handed.
 */

/** The tide: guards and prices every command, so each choice's effects are asked for, and draws a pool on its own stage. */
const tide = definePlugin<{ height: number }>({
  id: 'tide',
  version: 1,
  start: () => ({ height: 0 }),
  effects: { rise: (_state, _args, { slice, set }) => set({ height: slice.height + 1 }) },
  guard: (_state, { effects }) => (effects.length > 3 ? 'Too much at once.' : undefined),
  price: (_state, effects) => (effects.some((effect) => effect.kind === 'custom') ? ['the tide rises'] : undefined),
  view: (state, { game, picks, profile }) => ({ stage: stageView(state, game, { layers: [{ pool: 'sea' }] }, 'tide', null, picks), remembered: profile ?? null }),
})

function counted(): { game: Game; renders: Map<GameState, number> } {
  const renders = new Map<GameState, number>()
  const count = (state: GameState) => renders.set(state, (renders.get(state) ?? 0) + 1)
  const porch: Scene = {
    id: 'porch',
    render: (state) => {
      count(state)
      return {
        body: 'The porch.\n\n[[img:@door|red]]',
        audio: { music: 'calm' },
        choices: [
          { id: 'knock', label: 'Knock', effects: [{ kind: 'flag', key: 'knocked', add: 1 }] },
          { id: 'wade', label: 'Wade in', effects: [{ kind: 'custom', name: 'tide/rise' }] },
          { id: 'in', label: 'Go in', effects: [{ kind: 'scene', id: 'hall' }] },
        ],
      }
    },
  }
  const hall: Scene = {
    id: 'hall',
    render: (state) => {
      count(state)
      return { body: 'The hall.', choices: [{ id: 'out', label: 'Go out', effects: [{ kind: 'scene', id: 'porch' }] }] }
    },
  }
  const town = fixture({
    // Never stops anything, but asks every choice what it would apply.
    locks: [{ when: { flag: 'at', is: 'house' }, deny: ['choose'], effect: 'tide/ebb', reason: 'The tide is out.' }],
  })
  const game: Game = {
    ...town,
    scenes: [...town.scenes, porch, hall],
    plugins: [tide],
    media: { pools: { door: [{ src: 'door/red.jpg', tags: ['red'] }, { src: 'door/blue.jpg', tags: ['blue'] }], sea: [{ src: 'sea/calm.jpg' }] } },
    audio: { tracks: { calm: { src: 'calm.ogg', channel: 'music' } } },
  }
  return { game, renders }
}

describe('one render per state', () => {
  it('a screen renders the open scene once, for every choice’s availability, effects and price', () => {
    const { game, renders } = counted()
    const state = begin(game, { sceneId: 'porch' })
    const shown = screen(state, game)
    expect(renders.get(state)).toBe(1)
    expect(shown.choices.map((choice) => [choice.id, choice.effects.length, choice.price?.notes ?? []])).toEqual([
      ['knock', 1, []],
      ['wade', 1, ['the tide rises']],
      ['in', 1, []],
    ])
    expect(shown.picks).toEqual({ 'door|red|porch|body.0': 'door/red.jpg', 'sea||tide|stage:0': 'sea/calm.jpg' })
    expect(shown.audio.tracks).toEqual({ music: 'calm', ambience: null })
  })

  it('one apply renders a given state’s scene at most once', () => {
    const { game, renders } = counted()
    let state = begin(game, { sceneId: 'porch' })
    for (const id of ['knock', 'wade', 'in', 'out']) {
      renders.clear()
      const result = apply(state, game, { type: 'choose', id })
      expect(result.ok).toBe(true)
      expect(Math.max(...renders.values())).toBe(1)
      // The state it started from, rendered once for the refusal, the warning and the choice.
      expect(renders.get(state)).toBe(1)
      state = result.state
    }
    // What the screens showed was recorded, the plugin's stage included.
    expect(state.media.picks).toEqual({ 'door|red|porch|body.0': 'door/red.jpg', 'sea||tide|stage:0': 'sea/calm.jpg' })
    expect(state.audio.started.music).toEqual({ track: 'calm', turn: state.turn })
  })

  it('a browser-style cycle builds one view per new state, shared by the UI, the audio player and the backlog', () => {
    const { game, renders } = counted()
    const runner = createRunner(game, begin(game, { sceneId: 'porch' }), { backlog: true, history: true })
    // The UI draws the first state.
    const first = runner.view()
    for (const id of ['knock', 'in', 'out']) {
      const before = runner.state
      renders.clear()
      expect(runner.apply({ type: 'choose', id }).ok).toBe(true)
      // The UI and the audio player both read the view after the change.
      const ui = runner.view()
      const audio = runner.view()
      expect(audio).toBe(ui)
      // The state the command came from: once by the reducer, never again for its view.
      expect(renders.get(before)).toBe(1)
      // The new state: once, for its one view, which the backlog built and the UI reused.
      expect(renders.get(runner.state)).toBe(1)
    }
    expect(runner.view()).not.toBe(first)
    // Knocking stays in the porch: it is shown again, after the choice made in it.
    expect(runner.backlog().map((entry) => entry.sceneId)).toEqual(['porch', 'porch', 'hall', 'porch'])
  })

  it('runner.view() is the same object for the same state, and a new one for a new state', () => {
    const { game } = counted()
    const runner = createRunner(game, begin(game, { sceneId: 'porch' }), { history: true })
    const shown = runner.view()
    expect(runner.view()).toBe(shown)
    runner.apply({ type: 'choose', id: 'knock' })
    const after = runner.view()
    expect(after).not.toBe(shown)
    expect(runner.view()).toBe(after)
    runner.undo()
    expect(runner.view()).toEqual(shown)
  })

  it('a profile change rebuilds the plugin’s view only, never the scene', async () => {
    const { game, renders } = counted()
    const stored = profile(game, memoryDriver())
    const runner = createRunner(game, begin(game, { sceneId: 'porch' }), { profile: stored })
    await runner.settled()
    const before = runner.view()
    renders.clear()
    await stored.set('tide', { highest: 3 })
    const after = runner.view()
    expect(after).not.toBe(before)
    expect((after.plugins.tide as { remembered: unknown }).remembered).toEqual({ highest: 3 })
    expect(after.scene).toBe(before.scene)
    expect(renders.size).toBe(0)
  })
})
