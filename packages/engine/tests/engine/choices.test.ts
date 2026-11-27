import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { loadGame } from '../../src/loader.ts'
import { apply, applyEffects } from '../../src/reduce.ts'
import { loadState, startingState } from '../../src/intake.ts'
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
    expect(holds(at, game, { chose: 'cafe.counter#chat' })).toBe(false)
    const after = apply(at, game, { type: 'choose', id: 'chat' }).state
    expect(after.chosen).toEqual({ 'cafe.counter#chat': { n: 1, first: at.turn, last: at.turn } })
    expect(holds(after, game, { chose: 'cafe.counter#chat' })).toBe(true)
    expect(holds(after, game, { chose: 'cafe.counter#chat', gte: 2 })).toBe(false)
    expect(holds(after, game, { chose: 'cafe.counter#leave' })).toBe(false)
    expect(explain(after, game, { chose: 'cafe.counter#chat', gt: 1 }).why).toBe('choice cafe.counter#chat picked 1 times; wants more than 1')
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
              body: [{ prose: 'ch1.door' }],
              choices: [
                { id: 'knock', label: 'Knock', effects: [] },
                { id: 'thanks', label: 'Thanks', when: { chose: 'ch1.door#kick' }, effects: [] },
                { id: 'later', label: 'Later', when: { chose: 'ch9.end#leave' }, effects: [] },
                { id: 'again', label: 'Again', when: { since: 'ch1.door#shout', last: true, gte: 2 }, effects: [] },
              ],
            },
          ],
          prose: { 'ch1.door': 'A door.' },
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
    expect(holds(state, game, { kv: 'lies', gte: 3 })).toBe(true)
    expect(holds(state, game, { kv: 'lies', gt: 3 })).toBe(false)
    expect(holds(state, game, { kv: 'lies', lte: 3 })).toBe(true)
    expect(holds(state, game, { kv: 'lies', lt: 3 })).toBe(false)
    expect(explain(state, game, { kv: 'lies', gte: 1, lte: 2 }).why).toBe('kv lies is 3; wants 1 or more and 2 or less')
    // A value that is not a number counts as 0 in a range.
    const named = applyEffects(state, game, [{ kv: 'pet', to: 'Biscuit' }])
    expect(holds(named, game, { kv: 'pet', lte: 0 })).toBe(true)
    expect(holds(named, game, { kv: 'pet' })).toBe(true)
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
    // A key the save does not have prints nothing, or the words after a "|" in the token.
    expect(words.line('hello', state)).toBe('Hello, . Day .')
    expect(proseStore(game, { hello: 'Hello, {{playerName|you}}.' }).line('hello', state)).toBe('Hello, you.')
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
    expect(words.line('hello', { ...startingState(game), kv: { playerName: '{{nothing}}' } })).toBe('Hello, {{nothing}}.')
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
    expect(holds(state, game, { storyline: 'rosa' })).toBe(true)
    expect(holds(state, game, { storyline: 'rosa', open: false })).toBe(false)
    const closed = applyEffects(state, game, [{ closeStoryline: 'rosa', turns: 3 }])
    expect(holds(closed, game, { storyline: 'rosa' })).toBe(false)
    expect(holds(closed, game, { storyline: 'rosa', open: false })).toBe(true)
    expect(holds({ ...closed, turn: closed.turn + 3 }, game, { storyline: 'rosa' })).toBe(true)
    expect(explain(closed, game, { storyline: 'rosa' }).why).toBe('storyline rosa is closed; wants it open')
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
})
