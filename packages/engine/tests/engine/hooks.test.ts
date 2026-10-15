import { describe, expect, it } from 'vitest'
import { apply, applyEffects } from '../../src/reduce.ts'
import { begin, fixture } from '../fixtures/town.ts'

describe('the game’s hooks', () => {
  it('ends the turn: resets put back, the turn rules and onTurn run', () => {
    const game = fixture({
      resets: { tidied: false },
      turn: (_state, next) => ({ effects: [{ kind: 'flag', key: 'reached', value: next }] }),
      onTurn: (state) => ({ ...state, flags: { ...state.flags, mornings: Number(state.flags.mornings ?? 0) + 1 } }),
    })
    const evening = begin(game, { flags: { tidied: true } })
    const next = apply(evening, game, { type: 'activity', id: 'rest' })
    expect(next.ok).toBe(true)
    expect(next.state.turn).toBe(3)
    expect(next.state.flags.tidied).toBe(false)
    expect(next.state.flags.reached).toBe(3)
    expect(next.state.flags.mornings).toBe(1)
  })

  it('ends several turns by effect', () => {
    const game = fixture({ onTurn: (state) => ({ ...state, flags: { ...state.flags, turns: Number(state.flags.turns ?? 0) + 1 } }) })
    const next = applyEffects(begin(game), game, [{ kind: 'turn', by: 3 }])
    expect(next.turn).toBe(5)
    expect(next.flags.turns).toBe(3)
  })

  it('ignores a turn ended by the turn rules themselves, rather than looping', () => {
    const game = fixture({ turn: () => ({ effects: [{ kind: 'turn' }, { kind: 'flag', key: 'ran', add: 1 }] }) })
    const next = applyEffects(begin(game), game, [{ kind: 'turn' }])
    expect(next.turn).toBe(3)
    expect(next.flags.ran).toBe(1)
  })

  it('lets the game take a command over, and refuse it in its own words', () => {
    const game = fixture({
      commands: {
        leave: (state) => (state.sceneId === null ? 'Nothing to leave.' : { ...state, sceneId: null, flags: { ...state.flags, at: 'house' } }),
      },
    })
    const refused = apply(begin(game), game, { type: 'leave' })
    expect(refused.ok).toBe(false)
    expect(refused.refused).toBe('Nothing to leave.')
    const home = apply(begin(game, { flags: { at: 'shop' }, sceneId: 'rosa.hello' }), game, { type: 'leave' })
    expect(home.state.flags.at).toBe('house')
  })

  it('lets the game veto a stat change, or add to it', () => {
    const vetoed = fixture({ onStat: (before) => before })
    const state = begin(vetoed)
    expect(apply(state, vetoed, { type: 'activity', id: 'read' }).state.stats.intelligence).toBe(
      state.stats.intelligence,
    )
    const noted = fixture({
      onStat: (_before, after, key, by) => ({ ...after, flags: { ...after.flags, [`${key}+`]: by } }),
    })
    const read = apply(begin(noted), noted, { type: 'activity', id: 'read' }).state
    expect(read.flags['intelligence+']).toBe(2)
  })
})
