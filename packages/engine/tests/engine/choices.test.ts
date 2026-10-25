import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { loadGame } from '../../src/loader.ts'
import { apply, applyEffects } from '../../src/reduce.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { SAVE_VERSION } from '../../src/types.ts'
import { explain } from '../../src/explain.ts'
import { proseStore } from '../../src/prose.ts'
import { view } from '../../src/view.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { unwrap } from '../fixtures/result.ts'
import type { Game } from '../../src/game.ts'
import type { GameState } from '../../src/types.ts'

describe('choices the player made', () => {
  it('are remembered by scene and choice, and `{ chose }` reads them', () => {
    const { game } = withCafe()
    const at = { ...begin(game), sceneId: 'cafe.counter' }
    expect(holds(at, { chose: 'cafe.counter#chat' }, game)).toBe(false)
    const after = apply(at, game, { type: 'choose', id: 'chat' }).state
    expect(after.chosen).toEqual({ 'cafe.counter#chat': { n: 1, first: at.turn, last: at.turn } })
    expect(holds(after, { chose: 'cafe.counter#chat' }, game)).toBe(true)
    expect(holds(after, { chose: 'cafe.counter#chat', gte: 2 }, game)).toBe(false)
    expect(holds(after, { chose: 'cafe.counter#leave' }, game)).toBe(false)
    expect(explain(after, { chose: 'cafe.counter#chat', gt: 1 }, game).why).toBe('choice cafe.counter#chat picked 1 times; wants more than 1')
  })

  it('a choice that names a scene or choice the game does not have is reported', () => {
    const { id, title } = fixture()
    const { problems } = loadGame(
      [
        {
          name: 'chapter',
          scenes: [
            {
              id: 'ch1.door',
              body: [{ text: 'ch1.door' }],
              choices: [
                { id: 'knock', effects: [] },
                { id: 'thanks', when: { chose: 'ch1.door#kick' }, effects: [] },
                { id: 'later', when: { chose: 'ch9.end#leave' }, effects: [] },
                { id: 'again', when: { since: 'ch1.door#shout', last: true, gte: 2 }, effects: [] },
              ],
            },
          ],
          prose: { 'ch1.door': 'A door.', 'ch1.door#knock': 'Knock', 'ch1.door#thanks': 'Thanks', 'ch1.door#later': 'Later', 'ch1.door#again': 'Again' },
        },
      ],
      { id, title },
    )
    expect(problems.map((problem) => problem.what)).toEqual([
      'gated on unknown choice "ch1.door#kick"',
      'gated on a choice in unknown scene "ch9.end#leave"',
      'gated on unknown choice "ch1.door#shout"',
    ])
  })
})

describe('kv keys as counters', () => {
  it('add, starting from nothing, and range-test', () => {
    const game = fixture()
    let state = applyEffects(begin(game), game, [{ kv: 'lies', by: 1 }])
    state = applyEffects(state, game, [{ kv: 'lies', by: 2 }])
    expect(state.kv.lies).toBe(3)
    expect(holds(state, { kv: 'lies', gte: 3 }, game)).toBe(true)
    expect(holds(state, { kv: 'lies', gt: 3 }, game)).toBe(false)
    expect(holds(state, { kv: 'lies', lte: 3 }, game)).toBe(true)
    expect(holds(state, { kv: 'lies', lt: 3 }, game)).toBe(false)
    expect(explain(state, { kv: 'lies', gte: 1, lte: 2 }, game).why).toBe('kv lies is 3; wants 1 or more and 2 or less')
    // A value that is not a number counts as 0 in a range.
    const named = applyEffects(state, game, [{ kv: 'pet', to: 'Biscuit' }])
    expect(holds(named, { kv: 'pet', lte: 0 }, game)).toBe(true)
    expect(holds(named, { kv: 'pet' }, game)).toBe(true)
  })
})

describe('a new game', () => {
  it('has no name unless the game gives one, and its words read the kv store', () => {
    const game = fixture()
    const state = startingState(game)
    // The kv store a new game starts with is the content's: the town opens in its open phase.
    expect(state.kv).toEqual({ phase: 'open' })
    expect(startingState(game, { kv: { playerName: 'Robin' } }).kv.playerName).toBe('Robin')
    const words = proseStore(game, { hello: 'Hello, {{playerName}}. Day {{visits}}.' })
    expect(words.line('hello', { ...state, kv: { playerName: 'Robin', visits: 3 } })).toBe('Hello, Robin. Day 3.')
    // A key the save does not have shows as written, so the gap is visible.
    expect(words.line('hello', state)).toBe('Hello, {{playerName}}. Day {{visits}}.')
  })

  it('takes its seed from the start command, or from the game when none is given', () => {
    const game = fixture()
    expect(apply(null, game, { type: 'start', seed: 42 }).state.seed).toBe(42)
    expect(startingState(game).seed).toBe(startingState(game).seed)
    expect(startingState(game, { seed: 7 }).seed).toBe(7)
  })

  it('shows a typed value as typed, never reading it as a token', () => {
    const game = fixture()
    const words = proseStore(game, { hello: 'Hello, {{playerName}}.' })
    expect(words.line('hello', { ...startingState(game), kv: { playerName: '{{v:game/nothing}}' } })).toBe('Hello, {{v:game/nothing}}.')
  })

  it('carries a version-1 save’s name into the kv store', () => {
    const game = fixture()
    const { chosen: _chosen, kv: _kv, ...now } = startingState(game)
    const old = { ...now, version: 1, playerName: 'Robin Hale', playerFirst: 'Robin', playerLast: 'Hale', flags: { tidy: true } }
    expect(unwrap(loadState(old, game))).toMatchObject({
      version: SAVE_VERSION,
      chosen: {},
      kv: { playerName: 'Robin Hale', playerFirst: 'Robin', playerLast: 'Hale', tidy: true },
    })
    expect(unwrap(loadState(old, game))).not.toHaveProperty('playerName')
  })

  it('carries a version-2 save onto turns: the day is the turn, and day stamps become turn stamps', () => {
    const game = fixture()
    const { turn: _turn, kv: _kv, ...now } = startingState(game)
    const old = {
      ...now,
      version: 2,
      time: { day: 4, period: 'evening' },
      flags: { 'day:cafe.counter.chat': 4, tidy: true },
      storylines: { rosa: { standing: 5, rapport: 0, closedUntilDay: 6, flags: {} } },
      collections: { gallery: [{ id: 'house', day: 2 }] },
      notices: [{ id: 'n', title: 'Rent', day: 3, seen: false }],
    }
    expect(unwrap(loadState(old, game))).toMatchObject({
      version: SAVE_VERSION,
      turn: 4,
      kv: { 'turn:cafe.counter.chat': 4, tidy: true },
      storylines: { rosa: { closedUntil: 6, kv: {} } },
      // The gallery's entries are the photos you hold since version 16.
      entities: { photo: { house: {} } },
      held: { player: { 'photo:house': 1 } },
      notices: [{ id: 'n', title: 'Rent', turn: 3, seen: false }],
    })
  })

  it('carries a version-4 save’s clock to the calendar, the small hours called late', () => {
    const game = fixture()
    const now = startingState(game)
    const old = { ...now, version: 4, time: { day: 3, period: 'sleep' } }
    const moved = unwrap(loadState(old, game))
    expect(moved).not.toHaveProperty('time')
    expect(moved.plugins.calendar).toEqual({ version: 1, state: { day: 3, period: 'late' } })
    expect(unwrap(loadState({ ...now, version: 4, time: { day: 1, period: 'morning' } }, game)).plugins.calendar).toEqual({
      version: 1,
      state: { day: 1, period: 'morning' },
    })
  })

  it('carries a version-5 save’s place to the places plugin', () => {
    const game = fixture()
    const now = startingState(game)
    const moved = unwrap(loadState({ ...now, version: 5, locationId: 'shop' }, game))
    expect(moved).not.toHaveProperty('locationId')
    expect(moved.plugins.places).toEqual({ version: 1, state: { at: 'shop' } })
    expect(unwrap(loadState({ ...now, version: 5, locationId: null }, game)).plugins.places).toBeUndefined()
  })

  it('carries a version-7 save’s storylines on without standing or rapport', () => {
    const game = fixture()
    const now = startingState(game)
    const moved = unwrap(loadState({ ...now, version: 7, storylines: { rosa: { standing: 40, rapport: 3, closedUntil: null, flags: { met: true } } } }, game))
    expect(moved.storylines.rosa).toEqual({ closedUntil: null, kv: { met: true } })
  })

  it('saves and loads without a player name', () => {
    const game = fixture()
    const state = startingState(game)
    expect(unwrap(loadState(JSON.parse(JSON.stringify(state)), game))).toEqual(state)
  })
})

describe('who is speaking', () => {
  it('is never guessed from a scene id', () => {
    const game = fixture()
    // Begins with a character's id, but names no speaker.
    game.scenes = [...game.scenes, { id: 'rosa.aside', body: [], choices: [] }]
    const shown = view({ ...begin(game), sceneId: 'rosa.aside' }, game).scene
    expect(shown.speaker).toBeNull()
    expect(shown.tags).toEqual([])
  })
})

describe('storylines', () => {
  it('are open, or closed until a turn, and `{ storyline }` asks which', () => {
    const game = fixture()
    const state = begin(game)
    expect(holds(state, { storyline: 'rosa' }, game)).toBe(true)
    expect(holds(state, { storyline: 'rosa', open: false }, game)).toBe(false)
    const closed = applyEffects(state, game, [{ closeStoryline: 'rosa', turns: 3 }])
    expect(holds(closed, { storyline: 'rosa' }, game)).toBe(false)
    expect(holds(closed, { storyline: 'rosa', open: false }, game)).toBe(true)
    expect(holds({ ...closed, turn: closed.turn + 3 }, { storyline: 'rosa' }, game)).toBe(true)
    expect(explain(closed, { storyline: 'rosa' }, game).why).toBe('storyline rosa is closed; wants it open')
  })
})

describe('a choice once a turn', () => {
  const chat = (state: GameState, game: Game) => view(state, game).scene.choices.find((choice) => choice.id === 'chat')

  it('is spent while the choice was last picked this turn, and writes nothing to the kv store', () => {
    const { game } = withCafe()
    const at = { ...begin(game), sceneId: 'cafe.counter' }
    expect(chat(at, game)?.disabled).toBeUndefined()
    const after = { ...apply(at, game, { type: 'choose', id: 'chat' }).state, sceneId: 'cafe.counter' }
    expect(after.chosen['cafe.counter#chat']).toEqual({ n: 1, first: at.turn, last: at.turn })
    expect(Object.keys(after.kv).filter((key) => key.startsWith('turn:'))).toEqual([])
    expect(chat(after, game)?.disabled).toBe('She has heard enough from you today.')
    // Picked again it pays nothing, and the line works again the next turn.
    expect(apply(after, game, { type: 'choose', id: 'chat' }).ok).toBe(false)
    expect(chat({ ...after, turn: after.turn + 1 }, game)?.disabled).toBeUndefined()
  })

  it('keeps the cap an older save set this turn, under its own key or under once.key', () => {
    const { game } = withCafe()
    const { seen: _seen, chosen: _chosen, ...now } = { ...begin(game), sceneId: 'cafe.counter', turn: 5 }
    const old = { ...now, version: 17, seen: {}, seenOn: {}, lastSeenOn: {}, chosen: {}, chosenOn: {}, lastChosenOn: {} }
    const capped = unwrap(loadState({ ...old, kv: { 'turn:cafe.counter#chat': 5, tidy: true } }, game))
    expect(capped.kv).toEqual({ tidy: true })
    expect(capped.chosen['cafe.counter#chat']).toEqual({ n: 0, first: 5, last: 5 })
    expect(chat(capped, game)?.disabled).toBe('She has heard enough from you today.')
    // A cap from an earlier turn has run out: it goes, and caps nothing.
    const stale = unwrap(loadState({ ...old, kv: { 'turn:cafe.counter#chat': 4 } }, game))
    expect(stale.kv).toEqual({})
    expect(stale.chosen).toEqual({})
    // A choice that kept its cap under a key of its own.
    const keyed = withKey(game, 'counter.chat')
    const moved = unwrap(loadState({ ...old, kv: { 'turn:counter.chat': 5 } }, keyed))
    expect(moved.kv).toEqual({})
    expect(chat(moved, keyed)?.disabled).toBe('She has heard enough from you today.')
  })
})

/** The cafe game with its chat's cap kept under `key`, as a game renaming the choice would. */
function withKey(game: Game, key: string): Game {
  return {
    ...game,
    scenes: game.scenes.map((scene) =>
      scene.id === 'cafe.counter' && 'choices' in scene && Array.isArray(scene.choices)
        ? { ...scene, choices: scene.choices.map((choice) => (choice.id === 'chat' && choice.once ? { ...choice, once: { ...choice.once, key } } : choice)) }
        : scene,
    ),
  }
}
