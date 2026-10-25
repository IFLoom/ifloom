import { describe, expect, it } from 'vitest'
import { apply, applyEffects } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { holds } from '../../src/condition.ts'
import { explain } from '../../src/explain.ts'
import type { GameState } from '../../src/types.ts'
import { loadState } from '../../src/intake.ts'
import { unwrap } from '../fixtures/result.ts'

describe('data scenes', () => {
  it('load with no runtime written by hand: prose, tokens and a drawn line', () => {
    const { game, problems } = withCafe()
    expect(problems).toEqual([])
    const at = { ...begin(game), sceneId: 'cafe.counter', kv: { playerFirst: 'Sam' } }
    const shown = view(at, game).scene
    expect(shown.title).toBe('The counter')
    expect(shown.body).toContain('"Morning, Sam."')
    expect(shown.body).toMatch(/Rain on the window\.|Sun on the tables\.|Fog in the street\./)
    expect(shown.choices.map((choice) => choice.label)).toEqual(['Talk about the weather', 'Leave'])
  })

  it('rotate their variants, so the same visit does not deal the same line twice running', () => {
    const { game } = withCafe()
    let state: GameState = { ...begin(game), sceneId: 'cafe.counter' }
    const lines = new Set<string>()
    for (let i = 0; i < 3; i += 1) {
      const body = view(state, game).scene.body
      lines.add(body.split('\n\n')[1])
      state = apply(state, game, { type: 'choose', id: 'leave' }).state
      state = applyEffects(state, game, [{ scene: 'cafe.counter' }])
    }
    expect(lines.size).toBe(3)
  })

  it('land a once-a-day choice once, then show why it will not', () => {
    const { game } = withCafe()
    const at = { ...begin(game), sceneId: 'cafe.counter' }
    const first = apply(at, game, { type: 'choose', id: 'chat' })
    expect(first.state.stats.luck).toBe(1)
    const again = view({ ...first.state, sceneId: 'cafe.counter' }, game).scene.choices
    expect(again.find((choice) => choice.id === 'chat')?.disabled).toBe('She has heard enough from you today.')
  })

  it('read the game’s own custom conditions', () => {
    const { game } = withCafe()
    const regular = { ...begin(game), sceneId: 'cafe.counter', seen: { 'cafe.counter': { n: 3, first: 0, last: 0 } } }
    expect(view(regular, game).scene.body).toContain('your cup out')
    const stranger = { ...begin(game), sceneId: 'cafe.counter', seen: {} }
    expect(view(stranger, game).scene.body).not.toContain('your cup out')
  })
})

describe('the first and last time', () => {
  it('counts `since` from the first visit, or with `last` from the latest, for scenes and choices', () => {
    const game = fixture()
    const visit = (state: GameState) => {
      const opened = apply(state, game, { type: 'scene', id: 'rosa.hello' })
      expect(opened.ok).toBe(true)
      return apply(opened.state, game, { type: 'choose', id: 'bye' }).state
    }
    const rest = (state: GameState) => apply(state, game, { type: 'action', id: 'rest' }).state
    // Turn 2: first visit. Turn 5: the second. Then turn 6.
    let state = visit(begin(game))
    state = visit(rest(rest(rest(state))))
    state = rest(state)
    expect(state.turn).toBe(6)
    expect(state).toMatchObject({
      seen: { 'rosa.hello': { n: 2, first: 2, last: 5 } },
      chosen: { 'rosa.hello#bye': { n: 2, first: 2, last: 5 } },
    })
    expect(holds(state, { since: 'rosa.hello', gte: 4 }, game)).toBe(true)
    expect(holds(state, { since: 'rosa.hello', last: true, gte: 2 }, game)).toBe(false)
    expect(holds(state, { since: 'rosa.hello', last: true, lt: 2 }, game)).toBe(true)
    expect(holds(state, { since: 'rosa.hello#bye', gte: 4 }, game)).toBe(true)
    expect(holds(state, { since: 'rosa.hello#bye', last: true, gte: 2 }, game)).toBe(false)
    // Never picked fails every range, `lt` included.
    expect(holds(state, { since: 'rosa.hello#stay', last: true, lt: 99 }, game)).toBe(false)
    expect(explain(state, { since: 'rosa.hello', last: true, gte: 2 }, game).why).toContain('scene rosa.hello last seen 1 turns ago')
  })

  it('reads the first time when a save from before kept no latest one', () => {
    const game = fixture()
    const old = { ...begin(game), version: 17, turn: 9, seen: { 'rosa.hello': 1 }, seenOn: { 'rosa.hello': 4 }, lastSeenOn: {} }
    const loaded = unwrap(loadState(old, game))
    expect(loaded.seen['rosa.hello']).toEqual({ n: 1, first: 4, last: 4 })
    expect(holds(loaded, { since: 'rosa.hello', last: true, gte: 5 }, game)).toBe(true)
  })
})
