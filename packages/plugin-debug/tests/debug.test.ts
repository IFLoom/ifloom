import { describe, expect, it } from 'vitest'
import { apply, startingState, view, whyNot, type Game, type GameState, type CommandRef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places, where } from '@ifloom/plugin-places'
import { debug, debugGo, debugScene, debugHeld, debugStat, debugTime, debugTurn, debugKv, type DebugView } from '../src/index.ts'

const clock = calendar()

function game(): Game {
  return {
    id: 'g',
    title: 'G',
    introScene: 'intro',
    actions: [],
    data: {
      places: {
        locations: [
          { id: 'house', name: 'House', tag: 'Home', exits: [], art: '', body: [] },
          { id: 'island', name: 'Island', tag: 'Far', exits: [], art: '', body: [] },
        ],
      },
    },
    kinds: [{ id: 'thing', label: 'Thing' }],
    entities: [{ id: 'key', of: 'thing', name: 'key' }],
    scenes: [
      { id: 'intro', body: [], choices: [] },
      { id: 'ending', body: [], choices: [] },
    ],
    storylines: [{ id: 'ava', name: 'Ava' }],
    stats: [{ id: 'luck', label: 'Luck', max: 10 }],
    plugins: [clock, places({ start: 'house' }), debug()],
    // An intro that stops everything: the debugger still works.
    locks: [{ when: { scene: ['intro'] }, deny: ['*'], reason: 'Finish the intro.' }],
  }
}

const run = (state: GameState, g: Game, ...commands: CommandRef[]) =>
  commands.reduce<GameState>((s, command) => {
    const out = apply(s, g, command)
    expect(out.reason).toBeUndefined()
    return out.state
  }, state)

describe('the debugger', () => {
  it('sets the state by hand, through any lock', () => {
    const g = game()
    const state = run(
      startingState(g),
      g,
      debugStat('luck', 50),
      debugKv('metAva', true),
      debugHeld('thing:key', 2),
      debugTime({ day: 6, period: 'evening' }),
      debugTurn(9),
      debugGo('island'),
      debugScene('ending'),
    )
    expect(state).toMatchObject({
      stats: { luck: 10 },
      kv: { metAva: true },
      held: { player: { 'thing:key': 2 } },
      turn: 9,
      sceneId: 'ending',
    })
    expect(clock.read(state, g)).toEqual({ day: 6, period: 'evening' })
    expect(where(state)).toBe('island')
    expect(run(state, g, debugScene()).sceneId).toBeNull()
  })

  it('refuses what the game does not have', () => {
    const g = game()
    const state = startingState(g)
    expect(whyNot(state, g, debugStat('charm', 1))).toBe('There is no stat called charm.')
    expect(whyNot(state, g, debugGo('moon'))).toBe('There is no location called moon.')
    expect(whyNot(state, g, debugScene('epilogue'))).toBe('There is no scene called epilogue.')
    expect(whyNot(state, g, debugTime({ day: -1 }))).toContain('A day is a whole number')
    expect(whyNot(state, g, debugTime({ period: 'teatime' }))).toContain('one of morning, afternoon, evening, night, late')
    expect(whyNot(state, g, debugTurn(-2))).toBe('A turn is a whole number from 0.')
    expect(whyNot(state, g, { type: 'custom', name: 'debug/turn', with: { to: '3' } })).toBe('A turn is a whole number from 0.')
    expect(whyNot(state, g, { type: 'custom', name: 'debug/time', with: { day: '' } })).toContain('A day is a whole number')
    const bare = { ...g, plugins: [debug()] }
    expect(whyNot(startingState(bare), bare, debugTime({ day: 1 }))).toBe('This game has no calendar.')
    expect(whyNot(startingState(bare), bare, debugGo('island'))).toBe('This game has no places.')
    expect(whyNot(state, g, debugStat('luck', Number('lots')))).toBe('That needs a number.')
    expect(whyNot(state, g, debugStat('luck', 1, 'character:nobody'))).toBe('There is nobody and nothing called character:nobody.')
    const withAva = { ...state, entities: { character: { ava: { name: 'Ava', stats: {}, kv: {} } } } }
    expect(whyNot(withAva, g, debugStat('luck', 1, 'character:ava'))).toBe('That is not whose luck it is.')
    expect(whyNot(state, g, debugHeld('thing:key', NaN))).toBe('That needs a number.')
    expect(whyNot(state, g, debugHeld('thing:lock', 1))).toBe('There is nobody and nothing called thing:lock.')
    expect(whyNot(state, g, debugHeld('thing:key', 1, 'thing:key'))).toBe('thing:key can’t hold things.')
  })

  it('shows the locks that are on, and the seed', () => {
    const g = game()
    const shown = view(startingState(g), g).plugins.debug as DebugView
    expect(shown.locks).toEqual([{ reason: 'Finish the intro.', deny: ['*'] }])
    expect(typeof shown.seed).toBe('number')
  })

  it('is simply absent from a game built without it', () => {
    const g = { ...game(), plugins: [] }
    expect(whyNot(startingState(g), g, debugStat('luck', 1))).toBe('Finish the intro.')
  })
})
