import { describe, expect, it } from 'vitest'
import { apply, applyEffects } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { begin } from '../fixtures/town.ts'
import type { GameState } from '../../src/types.ts'

describe('data scenes', () => {
  it('load with no runtime written by hand: prose, tokens and a drawn line', () => {
    const { game, problems } = withCafe()
    expect(problems).toEqual([])
    const at = { ...begin(game), sceneId: 'cafe.counter', flags: { playerFirst: 'Sam' } }
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
      state = applyEffects(state, game, [{ kind: 'scene', id: 'cafe.counter' }])
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
    const regular = { ...begin(game), sceneId: 'cafe.counter', seen: { 'cafe.counter': 3 } }
    expect(view(regular, game).scene.body).toContain('your cup out')
    const stranger = { ...begin(game), sceneId: 'cafe.counter', seen: {} }
    expect(view(stranger, game).scene.body).not.toContain('your cup out')
  })
})
