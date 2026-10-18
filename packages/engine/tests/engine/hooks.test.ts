import { describe, expect, it } from 'vitest'
import { apply, applyEffects } from '../../src/reduce.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { definePlugin } from '../../src/plugin.ts'

describe('the game’s hooks', () => {
  it('ends the turn: resets put back, then onTurn, with the state the turn ended on and effects in order', () => {
    const game = fixture({
      resets: { tidied: false },
      onTurn: (state, { apply, before }) => {
        // Effects apply one after another, each seeing the last.
        const reached = apply([{ kind: 'kv', key: 'reached', to: state.turn }, { kind: 'kv', key: 'wasTidy', to: before.kv.tidied === true }])
        return { ...reached, kv: { ...reached.kv, mornings: Number(reached.kv.mornings ?? 0) + 1 } }
      },
    })
    const evening = begin(game, { kv: { tidied: true } })
    const next = apply(evening, game, { type: 'activity', id: 'rest' })
    expect(next.ok).toBe(true)
    expect(next.state.turn).toBe(3)
    expect(next.state.kv.tidied).toBe(false)
    expect(next.state.kv.reached).toBe(3)
    expect(next.state.kv.wasTidy).toBe(true)
    expect(next.state.kv.mornings).toBe(1)
  })

  it('runs onTurnDone after every plugin’s onTurn, so it sees what they did', () => {
    // A stand-in clock: a plugin that moves the day on each turn.
    const clock = definePlugin({ id: 'clock', version: 1, onTurn: (state) => ({ ...state, kv: { ...state.kv, day: Number(state.kv.day ?? 0) + 1 } }) })
    const order: string[] = []
    const game = {
      ...fixture({
        onTurn: (state) => (order.push(`onTurn day ${state.kv.day}`), state),
        onTurnDone: (state, { apply, before }) => {
          order.push(`onTurnDone day ${state.kv.day}`)
          return state.kv.day !== before.kv.day ? apply([{ kind: 'kv', key: 'newDays', by: 1 }]) : state
        },
      }),
      plugins: [clock],
    }
    const next = applyEffects(begin(game, { kv: { day: 4 } }), game, [{ kind: 'turn', by: 2 }])
    expect(order).toEqual(['onTurn day 4', 'onTurnDone day 5', 'onTurn day 5', 'onTurnDone day 6'])
    expect(next.kv.newDays).toBe(2)
  })

  it('ends several turns by effect', () => {
    const game = fixture({ onTurn: (state) => ({ ...state, kv: { ...state.kv, turns: Number(state.kv.turns ?? 0) + 1 } }) })
    const next = applyEffects(begin(game), game, [{ kind: 'turn', by: 3 }])
    expect(next.turn).toBe(5)
    expect(next.kv.turns).toBe(3)
  })

  it('ignores a turn ended by the turn rules themselves, rather than looping', () => {
    const game = fixture({ onTurn: (_state, { apply }) => apply([{ kind: 'turn' }, { kind: 'kv', key: 'ran', by: 1 }]) })
    const next = applyEffects(begin(game), game, [{ kind: 'turn' }])
    expect(next.turn).toBe(3)
    expect(next.kv.ran).toBe(1)
  })

  it('lets the game take a command over, and refuse it in its own words', () => {
    const game = fixture({
      commands: {
        leave: (state) => (state.sceneId === null ? 'Nothing to leave.' : { ...state, sceneId: null, kv: { ...state.kv, at: 'house' } }),
      },
    })
    const refused = apply(begin(game), game, { type: 'leave' })
    expect(refused.ok).toBe(false)
    expect(refused.reason).toBe('Nothing to leave.')
    const home = apply(begin(game, { kv: { at: 'shop' }, sceneId: 'rosa.hello' }), game, { type: 'leave' })
    expect(home.state.kv.at).toBe('house')
  })

  it('lets the game veto a stat change, or add to it', () => {
    const vetoed = fixture({ onStat: (before) => before })
    const state = begin(vetoed)
    expect(apply(state, vetoed, { type: 'activity', id: 'read' }).state.stats.intelligence).toBe(
      state.stats.intelligence,
    )
    const noted = fixture({
      onStat: (_before, after, key, by) => ({ ...after, kv: { ...after.kv, [`${key}+`]: by } }),
    })
    const read = apply(begin(noted), noted, { type: 'activity', id: 'read' }).state
    expect(read.kv['intelligence+']).toBe(2)
  })
})
