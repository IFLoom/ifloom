import { describe, expect, it } from 'vitest'
import { apply, applyEffects } from '../../src/reduce.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { definePlugin } from '../../src/plugin.ts'
import { holds } from '../../src/condition.ts'
import { buildEffects } from '../../src/custom.ts'
import { fillTokens } from '../../src/prose.ts'
import { whyNot } from '../../src/availability.ts'
import { checkGame } from '../../src/check.ts'
import { view } from '../../src/view.ts'

describe('the game’s hooks', () => {
  it('ends the turn: resets put back, then onTurn, with the state the turn ended on and effects in order', () => {
    const game = fixture({
      resets: { tidied: false },
      onTurn: (state, { apply, before }) => {
        // Effects apply one after another, each seeing the last.
        const reached = apply([
          { kind: 'kv', key: 'reached', to: state.turn },
          { kind: 'kv', key: 'wasTidy', to: before.kv.tidied === true },
        ])
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

  it('lets the game veto a stat change, or add to it', () => {
    const vetoed = fixture({ onStat: (before) => before })
    const state = begin(vetoed)
    expect(apply(state, vetoed, { type: 'activity', id: 'read' }).state.stats.intelligence).toBe(state.stats.intelligence)
    const noted = fixture({
      onStat: (_before, after, key, by) => ({ ...after, kv: { ...after.kv, [`${key}+`]: by } }),
    })
    const read = apply(begin(noted), noted, { type: 'activity', id: 'read' }).state
    expect(read.kv['intelligence+']).toBe(2)
  })
})

describe('the game’s own code, as a plugin’s', () => {
  it('is called as game/name from content: a condition, an effect, a value and a command', () => {
    const game = fixture({
      conditions: { tired: (state) => state.stats.coins < 5 },
      effects: { tip: (_state, args) => [{ kind: 'stat', stat: 'coins', by: Number(args.by ?? 1) }] },
      values: { purse: (state) => `${state.stats.coins} coins` },
      commands: {
        nap: {
          whyNot: (state) => (state.stats.coins > 10 ? 'Too rich to sleep.' : undefined),
          run: (state, _args, { apply }) => apply([{ kind: 'kv', key: 'napped', to: true }], state),
          effectsOf: () => [{ kind: 'kv', key: 'napped', to: true }],
        },
      },
    })
    const state = begin(game)
    expect(holds(state, { 'game/tired': true }, game)).toBe(true)
    expect(applyEffects(state, game, buildEffects(state, game, [{ 'game/tip': { by: 4 } }])).stats.coins).toBe(7)
    expect(fillTokens('{{v:game/purse}}', state, game)).toBe('3 coins')
    const napped = apply(state, game, { 'game/nap': true })
    expect(napped.ok && napped.state.kv.napped).toBe(true)
    expect(whyNot({ ...state, stats: { ...state.stats, coins: 20 } }, game, { type: 'custom', name: 'game/nap' })).toBe('Too rich to sleep.')
    expect(checkGame(game).problems).toEqual([])
  })

  it('guards, prices and labels commands, and has a view, before any plugin', () => {
    const order: string[] = []
    const watch = definePlugin<null>({
      id: 'watch',
      version: 1,
      label: () => 'the watch',
      guard: () => {
        order.push('plugin')
        return undefined
      },
    })
    const game = {
      ...fixture({
        label: () => 'the game',
        guard: (_state, asked) => {
          order.push('game')
          return asked.command.type === 'activity' && asked.command.id === 'read' ? 'Not now.' : undefined
        },
        price: (_state, effects) => (effects.some((effect) => effect.kind === 'turn') ? ['the night'] : undefined),
        view: (state) => ({ coins: state.stats.coins }),
      }),
      plugins: [watch],
    }
    const state = begin(game)
    expect(whyNot(state, game, { type: 'activity', id: 'read' })).toBe('Not now.')
    expect(order).toEqual(['game', 'plugin'])
    const shown = view(state, game)
    expect(shown.when).toBe('the game · the watch')
    expect(shown.plugins.game).toEqual({ coins: 3 })
  })

  it('runs onCommand before every plugin’s', () => {
    const seen: string[] = []
    const after = definePlugin<null>({
      id: 'after',
      version: 1,
      onCommand: (_before, state) => {
        seen.push(`plugin:${String(state.kv.ran)}`)
        return state
      },
    })
    const game = {
      ...fixture({
        onCommand: (_before, state) => {
          seen.push('game')
          return { ...state, kv: { ...state.kv, ran: true } }
        },
      }),
      plugins: [after],
    }
    apply(begin(game), game, { type: 'activity', id: 'wait' })
    expect(seen).toEqual(['game', 'plugin:true'])
  })

  it('reports a plugin that takes the game’s id, and a call with no plugin in front', () => {
    const impostor = definePlugin<null>({ id: 'game', version: 1 })
    const game = { ...fixture(), plugins: [impostor], activities: [{ id: 'x', effects: [{ 'tired/now': true as const }] }] }
    const problems = checkGame(game).problems.map((problem) => `${problem.where}: ${problem.what}`)
    expect(problems).toContain('plugin game: "game" is reserved for the game\'s own rules')
    const bare = { ...fixture(), stats: [{ id: 'puff', label: 'Puff', max: { value: 'ceiling' } }] }
    expect(checkGame(bare).problems.map((problem) => problem.what)).toContain(
      'no custom value named "ceiling"; the game\'s own code is called with "game/" in front, as "game/ceiling"',
    )
  })
})

describe('plugins’ turn and stat hooks', () => {
  it('run onTurnDone after the game’s, in plugin order, and onStat after the game’s', () => {
    const order: string[] = []
    const clock = definePlugin<null>({
      id: 'clock',
      version: 1,
      onTurn: (state) => {
        order.push('clock onTurn')
        return state
      },
      onTurnDone: (state) => {
        order.push('clock onTurnDone')
        return state
      },
      onStat: (before, after, stat, by) => {
        order.push(`clock onStat ${stat} ${by}`)
        // Coins never go below what they were before, whatever the game let through.
        return stat === 'coins' && by < 0 ? before : after
      },
    })
    const game = {
      ...fixture({
        onTurn: (state) => {
          order.push('game onTurn')
          return state
        },
        onTurnDone: (state) => {
          order.push('game onTurnDone')
          return state
        },
        onStat: (_before, after, stat) => {
          order.push(`game onStat ${stat}`)
          return after
        },
      }),
      plugins: [clock],
    }
    applyEffects(begin(game), game, [{ kind: 'turn' }])
    expect(order).toEqual(['game onTurn', 'clock onTurn', 'game onTurnDone', 'clock onTurnDone'])
    order.length = 0
    const spent = applyEffects(begin(game), game, [{ kind: 'stat', stat: 'coins', by: -2 }])
    expect(order).toEqual(['game onStat coins', 'clock onStat coins -2'])
    expect(spent.stats.coins).toBe(3)
  })
})
