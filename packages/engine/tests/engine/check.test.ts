import { describe, expect, it } from 'vitest'
import { checkGame, describeProblem } from '../../src/check.ts'
import type { Content } from '../../src/loader.ts'
import { definePlugin } from '../../src/plugin.ts'
import { proseStore } from '../../src/prose.ts'
import { startingState } from '../../src/intake.ts'
import type { Game } from '../../src/game.ts'
import { baked } from '../fixtures/baked.ts'
import { fixture, loadWhole } from '../fixtures/town.ts'
import { problemsOf } from '../fixtures/checked.ts'

/** The fixture's base, for loading packs over: its content comes from the packs. */
function base(patch: Partial<Game> = {}) {
  const { scenes: _s, introScene: _in, storylines: _t, actions: _a, stats: _st, actions: _ac, ...rest } = fixture()
  return { ...rest, ...patch }
}

describe('checkGame', () => {
  it('finds nothing wrong with the fixture', () => {
    expect(checkGame(fixture()).problems).toEqual([])
  })

  it('keeps the core and ui profile prefixes from plugin ids', () => {
    const plugins = ['core', 'ui', 'core:x', 'uix'].map((id) => definePlugin({ id, version: 1 }))
    expect(checkGame({ ...fixture(), plugins }).problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'plugin core: "core" and "ui" are reserved for the engine and the UI',
      'plugin ui: "core" and "ui" are reserved for the engine and the UI',
      'plugin core:x: a plugin id is letters, digits and "-" only',
      'plugin core:x: "core" and "ui" are reserved for the engine and the UI',
    ])
  })

  it('names the pack "game" for a hand-built game, and describes a problem as pack · where · what', () => {
    const game: Game = { ...fixture(), finished: { entity: 'thing:trophy', at: 'you' } }
    expect(checkGame(game).problems).toEqual([{ pack: 'game', where: 'finished', what: 'unknown kind "thing"' }])
    expect(checkGame(game).problems.map(describeProblem)).toEqual(['game · finished · unknown kind "thing"'])
  })

  it('reports a thing of a kind the game does not have, loaded or hand-built', () => {
    // A thing can be made in play, so only its kind is known ahead.
    const pack: Content = {
      name: 'town',
      prose: { 'shop#buy': 'Buy one.' },
      scenes: [{ id: 'shop', body: [], choices: [{ id: 'buy', when: { entity: 'thing:missing', at: 'you' }, effects: [] }] }],
    }
    expect(loadWhole([pack], base()).problems.map(describeProblem)).toEqual(['town · scene shop · unknown kind "thing"'])
    expect(
      problemsOf({
        ...fixture(),
        actions: [...(fixture().actions ?? []), { id: 'eat', blocked: [{ when: { not: { entity: 'thing:missing', at: 'you' } }, reason: 'Nothing to eat.' }] }],
      }),
    ).toEqual(['action eat: unknown kind "thing"'])
  })

  it('reports what the engine would quietly skip: a condition with no kind or two, an effect or command it does not have', () => {
    const town = fixture()
    const game = {
      ...town,
      // Each of these holds nowhere, does nothing or is refused at runtime, as it always has; now the checker says so.
      finished: { kv: 'done', setting: 'hints' },
      actions: [
        ...(town.actions ?? []),
        { id: 'blank', label: 'Blank', when: {} as never, command: { type: 'dance' } as never },
        { id: 'odd', label: 'Odd', command: { type: 'action', id: 'wait' } },
        { id: 'kite', effects: [{ kind: 'fly' } as never, {} as never] },
      ],
    } as Game
    expect(problemsOf(game)).toEqual([
      'action blank: a condition needs one key that says what it asks, such as kv or stat, or a call by name; this one has nothing in it',
      'action blank: unknown command type "dance"',
      'action kite: effects are told apart by their key now, as { fly: … }, not { kind: "fly" }',
      'action kite: an effect needs one key that says what it does, such as stat or kv, or a call by name; this one has nothing in it',
      // Its parts aren't looked into: the engine wouldn't know which one it means.
      'finished: a condition asks one thing, but this one has 2 keys that each say what it asks: kv, setting',
    ])
  })

  it('reports the same problems for a game whether it is loaded or checked again', () => {
    const pack: Content = {
      name: 'town',
      prose: { 'shop#buy': 'Buy one.' },
      scenes: [
        {
          id: 'shop',
          body: [{ text: 'shop.none' }],
          choices: [{ id: 'buy', when: { stat: 'grit' }, effects: [{ entity: 'thing:roll', by: 1 }] }],
        },
      ],
    }
    const { game, problems } = loadWhole([pack], base())
    const again = checkGame(game).problems
    expect(again.map((problem) => `${problem.where} · ${problem.what}`)).toEqual(problems.map((problem) => `${problem.where} · ${problem.what}`))
    expect(problems.map((problem) => problem.what)).toEqual(['no prose for "shop.none"', 'unknown stat "grit"', 'unknown kind "thing"'])
  })

  it('reports an introScene the game does not have', () => {
    expect(problemsOf({ ...fixture(), introScene: 'lost' })).toEqual(['introScene: unknown scene "lost"'])
  })

  it('renders every scene against each probe, and reports one that throws', () => {
    const game: Game = {
      ...fixture(),
      scenes: [
        ...fixture().scenes,
        baked({
          id: 'cellar',
          render: () => {
            throw new Error('too dark')
          },
        }),
      ],
    }
    expect(problemsOf(game)).toEqual([])
    const later = { ...startingState(game), turn: 3 }
    expect(problemsOf(game, [{ name: 'later', state: later }])).toEqual(['scene cellar (later): render threw: too dark'])
  })
})

describe('a cooperating partner the game does not have', () => {
  const beach = definePlugin({ id: 'beach', version: 1, cooperates: ['tides'] })
  const named = {
    when: { 'tides/high': true as const },
    short: { 'tides/turn': true as const },
    long: { 'tides/turn': {} },
    command: { type: 'custom' as const, name: 'tides/check' },
  }

  it('is excused everywhere, in a loaded game and a hand-built one: conditions, effects in either form, and commands', () => {
    const pack: Content = {
      name: 'shore',
      prose: { 'shore#wade': 'Wade in.' },
      scenes: [{ id: 'shore', body: [], choices: [{ id: 'wade', when: named.when, effects: [named.short, named.long] }] }],
      actions: [{ id: 'paddle', blocked: [{ when: { not: named.when }, reason: 'Not now.' }], effects: [named.short, named.long] }],
    }
    const loaded = loadWhole([pack], base({ plugins: [beach], actions: [{ id: 'look', label: 'Look', command: named.command }] }))
    expect(loaded.problems).toEqual([])
    expect(checkGame(loaded.game).problems).toEqual([])
  })

  it('is not a name from a plugin nobody cooperates with', () => {
    const game: Game = {
      ...fixture(),
      plugins: [beach],
      actions: [
        ...(fixture().actions ?? []),
        { id: 'net', effects: [{ 'moon/pull': true }] },
        { id: 'look', label: 'Look', when: { 'moon/up': true }, command: { type: 'custom', name: 'moon/look' } },
      ],
    }
    expect(problemsOf(game)).toEqual([
      'action net: no custom effect named "moon/pull"',
      'action look: no custom condition named "moon/up"',
      'action look: no plugin command named "moon/look"',
    ])
  })
})

describe('the files a game names', () => {
  it('lists every picture, video and sound, as the page asks for it, with where it is named', () => {
    const game: Game = {
      ...fixture(),
      audio: { tracks: { calm: { src: 'music/calm', channel: 'music' }, knock: { src: '/audio/knock.mp3' }, radio: { playlist: ['calm'] } } },
      media: { pools: { door: [{ src: 'door/blue.jpg', tags: ['day'] }, { src: 'door/rain.mp4' }] } },
      kinds: [{ id: 'photo', label: 'Photo' }],
      scenes: [
        ...fixture().scenes,
        {
          id: 'flat',
          body: [{ text: 'flat.in' }, { media: { src: 'clip', video: true, poster: 'clip-still' } }, { media: { pool: 'door', tags: ['day'] } }],
          stage: { layers: [{ src: 'room.png' }] },
          choices: [
            {
              id: 'snap',
              label: 'flat.in',
              effects: [
                { create: 'photo', with: { id: 'flat', image: 'photo/flat.png' }, at: 'player' },
                { notify: 'Snap', image: 'https://example.com/x.png' },
              ],
            },
          ],
        },
      ],
    }
    game.prose = proseStore(game, { 'flat.in': 'In. [[img:hall]] [[widevideo:walk|poster=walk-still]] [[img:@door|day]]' })
    expect(checkGame(game).problems).toEqual([])
    expect(checkGame(game).files).toEqual([
      { path: 'art/clip.mp4', type: 'video', where: 'scene flat' },
      { path: 'art/clip-still.jpg', type: 'picture', where: 'scene flat' },
      { path: 'art/photo/flat.png', type: 'picture', where: 'scene flat' },
      { path: 'art/room.png', type: 'picture', where: 'scene flat' },
      { path: 'audio/music/calm.ogg', type: 'audio', where: 'track calm' },
      { path: 'audio/knock.mp3', type: 'audio', where: 'track knock' },
      { path: 'art/door/blue.jpg', type: 'picture', where: 'pool door' },
      { path: 'art/door/rain.mp4', type: 'video', where: 'pool door' },
      { path: 'art/hall.jpg', type: 'picture', where: 'prose flat.in' },
      { path: 'art/walk-still.jpg', type: 'picture', where: 'prose flat.in' },
      { path: 'art/walk.mp4', type: 'video', where: 'prose flat.in' },
    ])
  })
})
