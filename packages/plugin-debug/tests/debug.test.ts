import { describe, expect, it } from 'vitest'
import { startingState, view, whyNot, type Game } from '@ifloom/engine'
import { play } from '@ifloom/engine/testing'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { definePlugin } from '@ifloom/engine/plugin'
import { debug, type DebugView } from '../src/index.ts'

const clock = calendar()

/** A pocket for these tests: a plugin that keeps counts of things, which debug/held sets through. */
const pocket = definePlugin<Record<string, number>>({
  id: 'pocket',
  version: 1,
  start: () => ({}),
  receiver: {
    receive: (_state, ref, count, _to, { slice, set }) => set({ ...slice, [ref]: (slice[ref] ?? 0) + count }),
    owned: (_state, ref, _of, { slice }) => slice[ref] ?? 0,
    release: (_state, ref, count, _from, { slice, set }) => set({ ...slice, [ref]: (slice[ref] ?? 0) - count }),
  },
})

function game(): Game {
  return {
    id: 'g',
    title: 'G',
    introScene: 'intro',
    actions: [],
    kinds: [{ id: 'thing', label: 'Thing' }],
    entities: [
      { id: 'key', of: 'thing', name: 'key' },
      places.location({ id: 'house', name: 'House', description: 'Home', exits: [], body: [] }),
      places.location({ id: 'island', name: 'Island', description: 'Far', exits: [], body: [] }),
    ],
    scenes: [
      { id: 'intro', body: [], choices: [] },
      { id: 'ending', body: [], choices: [] },
    ],
    storylines: [{ id: 'ava', name: 'Ava' }],
    stats: [{ id: 'luck', label: 'Luck', max: 10 }],
    plugins: [clock, places({ start: 'house' }), pocket, debug()],
    // An intro that stops everything: the debugger still works.
    locks: [{ when: { scene: ['intro'] }, deny: ['*'], reason: 'Finish the intro.' }],
  }
}

describe('the debugger', () => {
  it('sets the state by hand, through any lock', () => {
    const g = game()
    const state = play(
      startingState(g),
      g,
      debug.stat('luck', 50),
      debug.kv('metAva', true),
      debug.held('thing:key', 2),
      debug.time({ day: 6, period: 'evening' }),
      debug.turn(9),
      debug.go('island'),
      debug.scene('ending'),
    )
    expect(state).toMatchObject({
      stats: { luck: 10 },
      kv: { metAva: true },
      plugins: { pocket: { state: { 'thing:key': 2 } } },
      turn: 9,
      sceneId: 'ending',
    })
    expect(clock.read(state, g)).toEqual({ day: 6, period: 'evening' })
    expect(places.where(state, g)).toBe('island')
    expect(play(state, g, debug.scene()).sceneId).toBeNull()
    // Down by the difference, released as the game would.
    expect(play(state, g, debug.held('thing:key', 1)).plugins.pocket.state).toEqual({ 'thing:key': 1 })
  })

  it('refuses what the game does not have', () => {
    const g = game()
    const state = startingState(g)
    expect(whyNot(state, g, debug.stat('charm', 1))).toBe('There is no stat called charm.')
    expect(whyNot(state, g, debug.go('moon'))).toBe('There is no location called moon.')
    expect(whyNot(state, g, debug.scene('epilogue'))).toBe('There is no scene called epilogue.')
    expect(whyNot(state, g, debug.time({ day: -1 }))).toContain('A day is a whole number')
    expect(whyNot(state, g, debug.time({ period: 'teatime' }))).toContain('one of morning, afternoon, evening, night, late')
    expect(whyNot(state, g, debug.turn(-2))).toBe('A turn is a whole number from 0.')
    // An argument of the wrong type is refused by the command's declaration.
    expect(whyNot(state, g, { type: 'custom', name: 'debug/turn', with: { to: '3' } })).toBe('That can’t be done: "to" must be a number.')
    expect(whyNot(state, g, { type: 'custom', name: 'debug/time', with: { day: '' } })).toBe('That can’t be done: "day" must be a number.')
    expect(whyNot(state, g, { type: 'custom', name: 'debug/kv', with: { key: 'mood', to: { odd: true } } })).toBe(
      'That can’t be done: "to" must be true or false, a number or text.',
    )
    const bare = { ...g, plugins: [debug()] }
    expect(whyNot(startingState(bare), bare, debug.time({ day: 1 }))).toBe('This game has no calendar.')
    expect(whyNot(startingState(bare), bare, debug.go('island'))).toBe('This game has no places.')
    expect(whyNot(state, g, debug.stat('luck', Number('lots')))).toBe('That needs a number.')
    expect(whyNot(state, g, debug.stat('luck', 1, 'character:nobody'))).toBe('There is nobody and nothing called character:nobody.')
    const withAva = { ...state, entities: { character: { ava: { name: 'Ava', stats: {}, kv: {} } } } }
    expect(whyNot(withAva, g, debug.stat('luck', 1, 'character:ava'))).toBe('That is not whose luck it is.')
    expect(whyNot(state, g, debug.held('thing:key', NaN))).toBe('That needs a number.')
    expect(whyNot(state, g, debug.held('thing:lock', 1))).toBe('There is nobody and nothing called thing:lock.')
    const keepsNothing = { ...g, plugins: [clock, debug()] }
    expect(whyNot(startingState(keepsNothing), keepsNothing, debug.held('thing:key', 1))).toBe('No plugin of this game keeps things.')
  })

  it('shows the locks that are on, and the seed', () => {
    const g = game()
    const shown = view(startingState(g), g).plugins.debug as DebugView
    expect(shown.locks).toEqual([{ reason: 'Finish the intro.', deny: ['*'] }])
    expect(typeof shown.seed).toBe('number')
    expect(shown.receivers).toEqual(['pocket'])
  })

  it('is simply absent from a game built without it', () => {
    const g = { ...game(), plugins: [] }
    expect(whyNot(startingState(g), g, debug.stat('luck', 1))).toBe('Finish the intro.')
  })
})
