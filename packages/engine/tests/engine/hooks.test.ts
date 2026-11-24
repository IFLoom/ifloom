import { describe, expect, it } from 'vitest'
import { apply, applyEffects } from '../../src/reduce.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { definePlugin, pluginAudio, pluginSaveName, type PluginContext, type TurnContext } from '../../src/plugin.ts'
import { holds } from '../../src/condition.ts'
import { buildEffects, previewEffects } from '../../src/custom.ts'
import { fillTokens } from '../../src/prose.ts'
import { whyNot } from '../../src/availability.ts'
import { checkGame } from '../../src/check.ts'
import { view } from '../../src/view.ts'
import type { Game } from '../../src/game.ts'
import type { GameState } from '../../src/types.ts'
import { loadState } from '../../src/intake.ts'

describe('the game’s hooks', () => {
  it('ends the turn: resets put back, then onTurn, with the state the turn ended on and effects in order', () => {
    const game = fixture({
      resets: { tidied: false },
      onTurn: (state, { apply, before }) => {
        // Effects apply one after another, each seeing the last.
        const reached = apply([
          { kv: 'reached', to: state.turn },
          { kv: 'wasTidy', to: before.kv.tidied === true },
        ])
        return { ...reached, kv: { ...reached.kv, mornings: Number(reached.kv.mornings ?? 0) + 1 } }
      },
    })
    const evening = begin(game, { kv: { tidied: true } })
    const next = apply(evening, game, { type: 'action', id: 'rest' })
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
          return state.kv.day !== before.kv.day ? apply([{ kv: 'newDays', by: 1 }]) : state
        },
      }),
      plugins: [clock],
    }
    const next = applyEffects(begin(game, { kv: { day: 4 } }), game, [{ turn: { by: 2 } }])
    expect(order).toEqual(['onTurn day 4', 'onTurnDone day 5', 'onTurn day 5', 'onTurnDone day 6'])
    expect(next.kv.newDays).toBe(2)
  })

  it('ends several turns by effect', () => {
    const game = fixture({ onTurn: (state) => ({ ...state, kv: { ...state.kv, turns: Number(state.kv.turns ?? 0) + 1 } }) })
    const next = applyEffects(begin(game), game, [{ turn: { by: 3 } }])
    expect(next.turn).toBe(5)
    expect(next.kv.turns).toBe(3)
  })

  it('ignores a turn ended by the turn rules themselves, rather than looping', () => {
    const game = fixture({ onTurn: (_state, { apply }) => apply([{ turn: true }, { kv: 'ran', by: 1 }]) })
    const next = applyEffects(begin(game), game, [{ turn: true }])
    expect(next.turn).toBe(3)
    expect(next.kv.ran).toBe(1)
  })

  it('lets the game veto a stat change, or add to it', () => {
    const vetoed = fixture({ onStat: (before) => before })
    const state = begin(vetoed)
    expect(apply(state, vetoed, { type: 'action', id: 'read' }).state.stats.intelligence).toBe(state.stats.intelligence)
    const noted = fixture({
      onStat: (_before, after, key, by) => ({ ...after, kv: { ...after.kv, [`${key}+`]: by } }),
    })
    const read = apply(begin(noted), noted, { type: 'action', id: 'read' }).state
    expect(read.kv['intelligence+']).toBe(2)
  })
})

describe('the game’s own code, as a plugin’s', () => {
  it('is called as game/name from content: a condition, an effect, a value and a command', () => {
    const game = fixture({
      conditions: { tired: (state) => state.stats.coins < 5 },
      macros: { tip: (_state, args) => [{ stat: 'coins', by: Number(args.by ?? 1) }] },
      values: { purse: (state) => `${state.stats.coins} coins` },
      commands: {
        nap: {
          whyNot: (state) => (state.stats.coins > 10 ? 'Too rich to sleep.' : undefined),
          run: (state, _args, { apply }) => apply([{ kv: 'napped', to: true }], state),
          effectsOf: () => [{ kv: 'napped', to: true }],
        },
      },
    })
    const state = begin(game)
    expect(holds(state, game, { 'game/tired': true })).toBe(true)
    expect(applyEffects(state, game, buildEffects(game, [{ 'game/tip': { by: 4 } }])).stats.coins).toBe(7)
    expect(fillTokens(state, game, '{{purse}}')).toBe('3 coins')
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
          return asked.command.type === 'action' && asked.command.id === 'read' ? 'Not now.' : undefined
        },
        price: (_state, effects) => (effects.some((effect) => 'turn' in effect) ? ['the night'] : undefined),
        view: (state) => ({ coins: state.stats.coins }),
      }),
      plugins: [watch],
    }
    const state = begin(game)
    expect(whyNot(state, game, { type: 'action', id: 'read' })).toBe('Not now.')
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
    apply(begin(game), game, { type: 'action', id: 'wait' })
    expect(seen).toEqual(['game', 'plugin:true'])
  })

  it('keeps a state of its own in saves, read and written as a plugin’s slice is', () => {
    const game = fixture({
      start: () => ({ naps: 0 }),
      commands: { nap: { run: (_state, _args, { slice, set }) => set({ naps: slice.naps + 1 }) } },
      view: (_state, { slice }) => slice,
    })
    const state = begin(game)
    expect(state.plugins.game).toEqual({ version: 1, state: { naps: 0 } })
    const napped = apply(state, game, { 'game/nap': true })
    expect(napped.ok && view(napped.state, game).plugins.game).toEqual({ naps: 1 })
  })

  it('declares its own traits, checks and references, as a plugin does', () => {
    const game: Game = {
      ...fixture({
        traits: [
          { id: 'cosy', check: (data) => (typeof (data as { warmth?: unknown })?.warmth === 'number' ? [] : ['cosy needs a warmth']), words: { label: true } },
        ],
        check: () => [{ list: 'town', id: 'square', what: 'the square needs a bench' }],
        references: { calls: (_table, name, args) => (name === 'tip' && args.by === undefined ? [{ problem: 'a tip says by how much' }] : []) },
        macros: { tip: (_state, args) => [{ stat: 'coins', by: Number(args.by ?? 1) }] },
      }),
      kinds: [{ id: 'thing', label: 'Thing' }],
      entities: [{ of: 'thing', id: 'rug', name: 'Rug', traits: { cosy: { label: 'Soft' } } }],
      actions: [{ id: 'tipping', effects: [{ 'game/tip': {} }] }],
    }
    expect(checkGame(game).problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual(
      expect.arrayContaining([
        'trait cosy on thing:rug: cosy needs a warmth',
        'town square: the square needs a bench',
        'action tipping: a tip says by how much',
      ]),
    )
  })

  it('reports a plugin that takes the game’s id, and a call with no plugin in front', () => {
    const impostor = definePlugin<null>({ id: 'game', version: 1 })
    const game = { ...fixture(), plugins: [impostor], actions: [{ id: 'x', effects: [{ 'tired/now': true as const }] }] }
    const problems = checkGame(game).problems.map((problem) => `${problem.where}: ${problem.what}`)
    expect(problems).toContain('plugin game: "game" is reserved for the game\'s own rules')
    const bare = { ...fixture(), stats: [{ id: 'puff', label: 'Puff', max: { value: 'ceiling' } }] }
    expect(checkGame(bare).problems.map((problem) => problem.what)).toContain(
      'no game value named "ceiling"; the game\'s own code is called with "game/" in front, as "game/ceiling"',
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
    applyEffects(begin(game), game, [{ turn: true }])
    expect(order).toEqual(['game onTurn', 'clock onTurn', 'game onTurnDone', 'clock onTurnDone'])
    order.length = 0
    const spent = applyEffects(begin(game), game, [{ stat: 'coins', by: -2 }])
    expect(order).toEqual(['game onStat coins', 'clock onStat coins -2'])
    expect(spent.stats.coins).toBe(3)
  })
})

describe('one pipeline: the game, then each plugin, in order', () => {
  /**
   * The same members for the game's rules and for two plugins: each hook and
   * provider writes who ran it, and what its context had, so every one is held
   * to the same order and the same context.
   */
  function owner(id: string, log: string[]) {
    const seen = (member: string, context: { slice?: unknown; get?: unknown; set?: unknown; apply?: unknown; query?: unknown; before?: unknown }) => {
      const has = ['get', 'set', 'apply', 'query'].every((key) => typeof context[key as keyof typeof context] === 'function')
      log.push(`${member}:${id}${has ? '' : ' (no context)'}${(context.slice as { id?: string } | undefined)?.id === id ? '' : ' (wrong slice)'}`)
      if (member.startsWith('onTurn')) log.push(`${member}:${id} before turn ${(context.before as GameState | undefined)?.turn}`)
    }
    return {
      start: () => ({ id }),
      onTurn: (state: GameState, context: TurnContext<{ id: string }>) => (seen('onTurn', context), state),
      onTurnDone: (state: GameState, context: TurnContext<{ id: string }>) => (seen('onTurnDone', context), state),
      onStat: (_before: GameState, after: GameState, _stat: string, _by: number, context: PluginContext<{ id: string }>) => (seen('onStat', context), after),
      onCommand: (_before: GameState, after: GameState, context: PluginContext<{ id: string }>) => (seen('onCommand', context), after),
      guard: (_state: GameState, _asked: unknown, context: PluginContext<{ id: string }>) => (seen('guard', context), undefined),
      price: (_state: GameState, _effects: unknown, context: PluginContext<{ id: string }>) => (seen('price', context), undefined),
      label: (_state: GameState, context: PluginContext<{ id: string }>) => (seen('label', context), undefined),
      saveName: (_state: GameState, context: PluginContext<{ id: string }>) => (seen('saveName', context), undefined),
      statModifiers: (_state: GameState, context: PluginContext<{ id: string }>) => (seen('statModifiers', context), undefined),
      audio: (_state: GameState, context: PluginContext<{ id: string }>) => (seen('audio', context), undefined),
      actions: (_state: GameState, context: PluginContext<{ id: string }>) => (seen('actions', context), undefined),
      scene: (_state: GameState, context: PluginContext<{ id: string }>) => (seen('scene', context), undefined),
      view: (_state: GameState, context: PluginContext<{ id: string }>) => (seen('view', context), id),
    }
  }

  function game(log: string[]): Game {
    return {
      ...fixture(owner('game', log)),
      plugins: [definePlugin({ id: 'first', version: 1, ...owner('first', log) }), definePlugin({ id: 'second', version: 1, ...owner('second', log) })],
    }
  }

  /** What the log says of one member: who ran it, in order. */
  const runs = (log: string[], member: string) => log.filter((line) => line.startsWith(`${member}:`))
  /** Each time the member was asked, the game then each plugin: a guard is asked more than once a command. */
  const inOrder = (log: string[], member: string) => {
    const lines = runs(log, member)
    const round = [`${member}:game`, `${member}:first`, `${member}:second`]
    expect(lines.length, member).toBeGreaterThan(0)
    expect(lines).toEqual(lines.map((_line, at) => round[at % 3]))
  }

  it('runs every hook the game first, then the plugins in the order the game lists them, with one context', () => {
    const log: string[] = []
    const played = game(log)
    const state = begin(played)
    log.length = 0
    // A turn: its onTurn hooks, then its onTurnDone hooks, each handed the state the turn ended on.
    apply(state, played, { type: 'action', id: 'rest' })
    const before = `before turn ${state.turn}`
    expect(runs(log, 'onTurn')).toEqual([
      'onTurn:game',
      `onTurn:game ${before}`,
      'onTurn:first',
      `onTurn:first ${before}`,
      'onTurn:second',
      `onTurn:second ${before}`,
    ])
    expect(runs(log, 'onTurnDone')).toEqual([
      'onTurnDone:game',
      `onTurnDone:game ${before}`,
      'onTurnDone:first',
      `onTurnDone:first ${before}`,
      'onTurnDone:second',
      `onTurnDone:second ${before}`,
    ])
    expect(log.indexOf('onTurnDone:game')).toBeGreaterThan(log.indexOf('onTurn:second'))
    // A stat change, and the command that made it.
    log.length = 0
    apply(state, played, { type: 'action', id: 'read' })
    for (const member of ['onStat', 'onCommand', 'guard']) inOrder(log, member)
    // The providers a view asks, and a save's name.
    log.length = 0
    expect(view(state, played).plugins).toMatchObject({ game: 'game', first: 'first', second: 'second' })
    for (const member of ['label', 'scene', 'actions', 'statModifiers', 'view']) inOrder(log, member)
    // What plays (asked by a view only when the game has audio), and a save's name.
    log.length = 0
    pluginAudio(played, state)
    expect(pluginSaveName(played, state)).toBeNull()
    inOrder(log, 'audio')
    inOrder(log, 'saveName')
    // Every one of them was handed a full context, with its own state as `slice`.
    expect(log.filter((line) => line.includes('('))).toEqual([])
  })

  it('starts and carries the game’s own state as each plugin’s, the game’s first', () => {
    const played = game([])
    expect(Object.keys(begin(played).plugins)).toEqual(['game', 'first', 'second'])
    const loaded = loadState({ ...begin(played), plugins: {} }, played)
    expect(loaded.ok && Object.keys(loaded.value.plugins)).toEqual(['game', 'first', 'second'])
  })

  it('names a save by the first that answers, the game before any plugin', () => {
    const named = (rules: string | undefined, plugin: string | undefined): Game => ({
      ...fixture({ saveName: () => rules }),
      plugins: [definePlugin({ id: 'card', version: 1, saveName: () => plugin })],
    })
    expect(pluginSaveName(named('Robin', 'Sam'), begin(named('Robin', 'Sam')))).toBe('Robin')
    expect(pluginSaveName(named(undefined, 'Sam'), begin(named(undefined, 'Sam')))).toBe('Sam')
  })

  it('runs a macro, the game’s or a plugin’s, and lets prices and guards see what it stands for', () => {
    const seen: unknown[] = []
    const bank = definePlugin({ id: 'bank', version: 1, macros: { fee: () => [{ stat: 'coins', by: -1 }] } })
    const played: Game = {
      ...fixture({
        macros: { rent: (_state, _args, { apply }) => (seen.push(typeof apply), [{ 'bank/fee': {} }, { stat: 'coins', by: -1 }]) },
        guard: (_state, asked) => (seen.push(asked.effects), undefined),
      }),
      plugins: [bank],
      actions: [{ id: 'pay', label: 'Pay', effects: [{ 'game/rent': {} }] }],
    }
    const state = begin(played)
    expect(previewEffects(state, played, [{ 'game/rent': {} }])).toEqual([
      { stat: 'coins', by: -1 },
      { stat: 'coins', by: -1 },
    ])
    const paid = apply(state, played, { type: 'action', id: 'pay' })
    expect(paid.ok && paid.state.stats.coins).toBe(state.stats.coins - 2)
    expect(seen).toContainEqual([
      { stat: 'coins', by: -1 },
      { stat: 'coins', by: -1 },
    ])
    expect(checkGame(played).problems).toEqual([])
  })

  it('reports a name that is both an effect and a macro', () => {
    const played = fixture({ effects: { tip: (state) => state }, macros: { tip: () => [] } })
    expect(checkGame(played).problems.map((problem) => problem.what)).toContain('"game/tip" is both an effect and a macro; give one of them another name')
  })
})
