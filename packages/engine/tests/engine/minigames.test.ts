import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { whyNot } from '../../src/availability.ts'
import { view } from '../../src/view.ts'
import { checkGame } from '../../src/check.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { proseStore } from '../../src/prose.ts'
import { createRunner, replay } from '../../src/runner.ts'
import { saves } from '../../src/save.ts'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game, MinigameDef } from '../../src/index.ts'
import type { Command, GameState } from '../../src/types.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { unwrap } from '../fixtures/result.ts'

/**
 * Three rounds: each draws an arrow (1 up, 2 down) and gives 1.5 seconds to
 * press it. Two right wins coins and a scene; fewer ends the turn.
 */
const arrows: MinigameDef = {
  id: 'arrows',
  label: 'Quick feet',
  start: 'round',
  kv: { arrow: 0, round: 0, score: 0 },
  keys: { up: ['ArrowUp', 'w'], down: ['ArrowDown', 's'] },
  states: {
    round: {
      always: [
        { when: { kv: 'round', of: 'minigame', gte: 3 }, go: 'tally' },
        {
          go: 'show',
          effects: [
            { kv: 'round', of: 'minigame', by: 1 },
            { kv: 'arrow', of: 'minigame', random: [1, 2] },
          ],
        },
      ],
    },
    show: {
      label: 'arrows.show',
      after: { ms: 1500, go: 'round' },
      on: [
        { input: 'up', when: { kv: 'arrow', of: 'minigame', lte: 1 }, go: 'round', effects: [{ kv: 'score', of: 'minigame', by: 1 }] },
        { input: 'down', when: { kv: 'arrow', of: 'minigame', gte: 2 }, go: 'round', effects: [{ kv: 'score', of: 'minigame', by: 1 }] },
        { input: 'up', go: 'round' },
        { input: 'down', go: 'round' },
      ],
    },
    tally: { always: [{ when: { kv: 'score', of: 'minigame', gte: 2 }, go: 'won' }, { go: 'lost' }] },
    won: {
      final: {
        copy: { score: 'bestScore' },
        effects: [{ stat: 'coins', by: 5 }, { scene: 'rosa.hello' }],
      },
    },
    lost: { final: { effects: [{ turn: true }] } },
  },
}

/** A coin in the air: lands after a tenth of a second, tails three times as often. */
const toss: MinigameDef = {
  id: 'toss',
  start: 'air',
  states: {
    air: { after: { ms: 100, to: ['heads', { state: 'tails', weight: 3 }] } },
    heads: { final: { effects: [{ kv: 'side', to: 'heads' }] } },
    tails: { final: { effects: [{ kv: 'side', to: 'tails' }] } },
  },
}

function withMinigames(extra: Partial<Game> = {}): Game {
  const base = fixture()
  const game: Game = {
    ...base,
    minigames: [arrows, toss],
    actions: [...(base.actions ?? []), { id: 'play', effects: [{ minigame: 'arrows' }] }, { id: 'flip', effects: [{ minigame: 'toss' }] }],
    scenes: [...base.scenes, { id: 'yard', body: [{ text: 'yard' }], minigame: 'toss', choices: [{ id: 'go', effects: [{ scene: null }] }] }],
    ...extra,
  }
  game.prose = proseStore(game, { 'arrows.show': 'Quick!', yard: 'A coin on the step.', 'yard#go': 'Go' })
  return game
}

function run(state: GameState, game: Game, ...commands: Command[]): GameState {
  for (const command of commands) {
    const out = apply(state, game, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

/** The input that matches the arrow on screen, or the one that doesn't. */
const right = (state: GameState): Command => ({ type: 'minigame', input: state.minigame!.kv.arrow === 1 ? 'up' : 'down' })
const wrong = (state: GameState): Command => ({ type: 'minigame', input: state.minigame!.kv.arrow === 1 ? 'down' : 'up' })

describe('minigames', () => {
  it('start from an effect, and show over the room with its own inputs, timer and keys', () => {
    const game = withMinigames()
    const state = run(begin(game), game, { type: 'action', id: 'play' })
    expect(state.minigame).toMatchObject({ id: 'arrows', state: 'show', elapsed: 0, kv: { round: 1, score: 0 } })
    expect(state.kv['minigame:arrows']).toBe(1)
    const shown = view(state, game)
    expect(shown.minigame).toEqual({
      id: 'arrows',
      title: 'Quick feet',
      state: 'show',
      label: 'Quick!',
      timeLeft: 1500,
      timeTotal: 1500,
      // Both arrows are live: one scores, the other doesn't.
      inputs: state.minigame!.kv.arrow === 1 ? ['up', 'down'] : ['down', 'up'],
      kv: state.minigame!.kv,
      keys: { up: ['ArrowUp', 'w'], down: ['ArrowDown', 's'] },
    })
    expect(shown.scene).toMatchObject({ title: 'Quick feet', body: 'Quick!', choices: [] })
    expect(shown.actions).toEqual([])
    expect(view(begin(game), game).minigame).toBeNull()
  })

  it('refuse everything else while one runs, but not a notice dismissed', () => {
    const game = withMinigames()
    const state = run(begin(game), game, { type: 'action', id: 'play' })
    expect(whyNot(state, game, { type: 'action', id: 'wait' })).toBe('Finish this first.')
    expect(whyNot(state, game, { type: 'scene', id: 'rosa.hello' })).toBe('Finish this first.')
    expect(whyNot(state, game, { type: 'dismiss' })).toBeUndefined()
    // In a scene too: its choices are refused, and hidden.
    const inScene = run(begin(game), game, { type: 'scene', id: 'yard' })
    expect(inScene.minigame?.id).toBe('toss')
    expect(view(inScene, game).scene.choices).toEqual([])
    expect(whyNot(inScene, game, { type: 'choose', id: 'go' })).toBe('Finish this first.')
  })

  it('take the first live input, and refuse one that does nothing now', () => {
    const game = withMinigames()
    let state = run(begin(game), game, { type: 'action', id: 'play' })
    expect(whyNot(state, game, { type: 'minigame', input: 'left' })).toBe('That does nothing now.')
    expect(whyNot(begin(game), game, { type: 'minigame', input: 'up' })).toBe('Nothing is being played.')
    state = run(state, game, right(state))
    expect(state.minigame).toMatchObject({ state: 'show', kv: { round: 2, score: 1 } })
    state = run(state, game, wrong(state))
    expect(state.minigame).toMatchObject({ state: 'show', kv: { round: 3, score: 1 } })
  })

  it('run timers down with ticks, carrying what is left into the next state', () => {
    const game = withMinigames()
    let state = run(begin(game), game, { type: 'action', id: 'play' })
    state = run(state, game, { type: 'tick', ms: 1000 })
    expect(state.minigame).toMatchObject({ state: 'show', elapsed: 1000, kv: { round: 1 } })
    expect(view(state, game).minigame?.timeLeft).toBe(500)
    state = run(state, game, { type: 'tick', ms: 600 })
    expect(state.minigame).toMatchObject({ state: 'show', elapsed: 100, kv: { round: 2 } })
    // One long tick runs every timer left in turn: rounds 2 and 3 time out, and the game is lost.
    const turn = state.turn
    state = run(state, game, { type: 'tick', ms: 60_000 })
    expect(state.minigame).toBeNull()
    expect(state.turn).toBe(turn + 1)
    expect(view(state, game).minigame).toBeNull()
  })

  it('refuse a tick with nothing counting down', () => {
    const game = withMinigames()
    expect(whyNot(begin(game), game, { type: 'tick', ms: 100 })).toBe('Nothing is counting down.')
    const playing = run(begin(game), game, { type: 'action', id: 'play' })
    expect(whyNot(playing, game, { type: 'tick', ms: 0 })).toBe('A tick is a number of milliseconds above 0.')
    const untimed: Game = withMinigames({
      minigames: [{ id: 'arrows', start: 'a', states: { a: { on: [{ input: 'go', go: 'b' }] }, b: { final: {} } } }],
    })
    const waiting = run(begin(untimed), untimed, { type: 'action', id: 'play' })
    expect(waiting.minigame?.state).toBe('a')
    expect(whyNot(waiting, untimed, { type: 'tick', ms: 100 })).toBe('Nothing is counting down.')
  })

  it('end in a final state: variables copied out, then its effects, a scene among them', () => {
    const game = withMinigames()
    let state = run(begin(game), game, { type: 'action', id: 'play' })
    for (let round = 0; round < 3; round += 1) state = run(state, game, right(state))
    expect(state.minigame).toBeNull()
    expect(state.stats.coins).toBe(8)
    expect(state.kv.bestScore).toBe(3)
    expect(state.sceneId).toBe('rosa.hello')
    expect(state.seen['rosa.hello']?.n).toBe(1)
  })

  it('end with a turn effect among the final effects', () => {
    const game = withMinigames()
    let state = run(begin(game), game, { type: 'action', id: 'play' })
    for (let round = 0; round < 3; round += 1) state = run(state, game, wrong(state))
    expect(state.minigame).toBeNull()
    expect(state.turn).toBe(3)
    expect(state.kv.bestScore).toBeUndefined()
  })

  it('draw random variables and states from the seed, the same every time', () => {
    const game = withMinigames()
    const arrowsOf = (seed: number) => {
      let state = run(startingState(game, { seed }), game, { type: 'leave' }, { type: 'action', id: 'play' })
      const seen: number[] = []
      while (state.minigame) {
        seen.push(state.minigame.kv.arrow)
        state = run(state, game, right(state))
      }
      return seen.join('')
    }
    expect(arrowsOf(7)).toBe(arrowsOf(7))
    const drawn = new Set(Array.from({ length: 12 }, (_, seed) => arrowsOf(seed)))
    expect(drawn.size).toBeGreaterThan(1)
    // A second play in the same save draws afresh.
    const sides = Array.from(
      { length: 200 },
      (_, seed) => run(startingState(game, { seed }), game, { type: 'leave' }, { type: 'action', id: 'flip' }, { type: 'tick', ms: 100 }).kv.side,
    )
    expect(new Set(sides)).toEqual(new Set(['heads', 'tails']))
    expect(sides.filter((side) => side === 'tails').length).toBeGreaterThan(sides.filter((side) => side === 'heads').length)
  })

  it('start when a scene with one is entered, or when a new game opens on one', () => {
    const game = withMinigames()
    const state = run(begin(game), game, { type: 'scene', id: 'yard' })
    expect(state.minigame).toMatchObject({ id: 'toss', state: 'air' })
    const landed = run(state, game, { type: 'tick', ms: 250 })
    expect(landed.minigame).toBeNull()
    expect(landed.sceneId).toBe('yard')
    expect(view(landed, game).scene.choices.map((choice) => choice.id)).toEqual(['go'])
    const opening = withMinigames({ introScene: 'yard' })
    expect(startingState(opening).minigame?.id).toBe('toss')
  })

  it('load an old save with no minigame field as none running', () => {
    const game = withMinigames()
    const { minigame: _minigame, ...old } = begin(game)
    const loaded = loadState(JSON.parse(JSON.stringify(old)), game)
    expect(loaded.ok && loaded.value.minigame).toBeNull()
  })
})

describe('the runner, with a minigame', () => {
  it('logs ticks and plays them back exactly', () => {
    const game = withMinigames()
    const runner = createRunner(game, begin(game))
    runner.apply({ type: 'action', id: 'play' })
    runner.apply({ type: 'tick', ms: 700 })
    runner.apply(right(runner.state))
    runner.apply({ type: 'tick', ms: 1600 })
    runner.apply(wrong(runner.state))
    expect(runner.log().commands.filter((command) => command.type === 'tick')).toHaveLength(2)
    expect(unwrap(replay(game, runner.log()))).toEqual(runner.state)
  })

  it('undoes past ticks to before the last command that was not one', () => {
    const game = withMinigames()
    const runner = createRunner(game, begin(game), { history: true })
    const before = runner.state
    runner.apply({ type: 'action', id: 'play' })
    runner.apply({ type: 'tick', ms: 300 })
    runner.apply(right(runner.state))
    runner.apply({ type: 'tick', ms: 200 })
    runner.apply({ type: 'tick', ms: 200 })
    expect(runner.undo()).toBe(true)
    // Back to before the input: the tick before it stays.
    expect(runner.state.minigame).toMatchObject({ elapsed: 300, kv: { round: 1 } })
    expect(runner.log().commands.map((command) => command.type)).toEqual(['action', 'tick'])
    expect(runner.undo()).toBe(true)
    expect(runner.canUndo).toBe(false)
    expect(runner.state).toBe(before)
    // Redo goes forward to where the first undo started from: the tick before the input with it.
    expect(runner.redo()).toBe(true)
    expect(runner.state.minigame).toMatchObject({ elapsed: 300, kv: { round: 1 } })
  })

  it('adds nothing to the backlog for a tick, or for the minigame over a scene', () => {
    const game = withMinigames()
    const runner = createRunner(game, begin(game), { backlog: true })
    runner.apply({ type: 'scene', id: 'yard' })
    runner.apply({ type: 'tick', ms: 50 })
    runner.apply({ type: 'tick', ms: 50 })
    expect(runner.state.minigame).toBeNull()
    runner.apply({ type: 'choose', id: 'go' })
    expect(runner.backlog().map((entry) => [entry.sceneId, entry.chose])).toEqual([['yard', 'Go']])
  })

  it('autosaves on a tick only when it changes what the policy watches', async () => {
    const game = withMinigames()
    const store = saves(game, memoryDriver())
    const writes: string[] = []
    const watched = {
      ...store,
      write: (...args: Parameters<typeof store.write>) => {
        writes.push(args[0])
        return store.write(...args)
      },
    }
    const runner = createRunner(game, begin(game), { saves: watched, autosave: { every: 'command' } })
    runner.apply({ type: 'action', id: 'play' })
    runner.apply({ type: 'tick', ms: 100 })
    runner.apply({ type: 'tick', ms: 100 })
    await runner.settled()
    expect(writes).toHaveLength(1)
    const turns = createRunner(game, begin(game), { saves: watched, autosave: { every: 'turn' } })
    turns.apply({ type: 'action', id: 'play' })
    // Three rounds time out, and the lost game ends the turn: that tick saves.
    turns.apply({ type: 'tick', ms: 10_000 })
    await turns.settled()
    expect(writes).toHaveLength(2)
  })
})

describe('the minigame checks', () => {
  const broken = (def: Partial<MinigameDef>, extra: Partial<Game> = {}) => {
    const game = withMinigames({ minigames: [arrows, toss, { id: 'bad', start: 'a', states: { a: { final: {} } }, ...def }], ...extra })
    return checkGame(game)
      .problems.filter((problem) => problem.where.includes('bad') || problem.what.includes('minigame'))
      .map((problem) => `${problem.where} · ${problem.what}`)
  }

  it('are quiet on a good minigame', () => {
    expect(checkGame(withMinigames()).problems).toEqual([])
  })

  it('report unknown states, and a minigame that can never end', () => {
    expect(broken({ start: 'nowhere' })).toContain('minigame bad · starts in unknown state "nowhere"')
    expect(
      broken({
        states: {
          a: { on: [{ input: 'go', go: 'b' }], after: { ms: 0, to: ['c'] } },
          b: { always: [{ go: 'a' }] },
        },
      }),
    ).toEqual([
      'minigame bad state a · a timer needs ms above 0',
      'minigame bad state a · after: goes to unknown state "c"',
      'minigame bad · no final state can be reached from its start, so it never ends',
    ])
  })

  it('report keys for an input no state uses, and transitions in a final state', () => {
    expect(broken({ keys: { jump: [' '] }, states: { a: { final: {}, on: [{ input: 'go' }] } } })).toEqual([
      'minigame bad state a · a final state ends the minigame, so its after, on and always never run',
      'minigame bad · keys maps input "jump", which no state\'s on uses',
    ])
  })

  it('report variables used but not declared, and unknown minigames in effects and scenes', () => {
    expect(
      broken({
        states: {
          a: { on: [{ input: 'go', when: { kv: 'score', of: 'minigame' }, go: 'b', effects: [{ kv: 'lives', of: 'minigame', by: -1 }] }] },
          b: { final: { copy: { streak: 'best' } } },
        },
      }),
    ).toEqual([
      'minigame bad state a on go · minigame key "lives" is not in any minigame\'s kv',
      'minigame bad · uses key "score", which is not in its kv',
      'minigame bad · copies key "streak", which is not in its kv',
    ])
    const good = withMinigames()
    const game: Game = {
      ...good,
      actions: [...(good.actions ?? []), { id: 'chess', effects: [{ minigame: 'chess' }] }],
      scenes: [...good.scenes, { id: 'board', body: [], minigame: 'draughts', choices: [] }],
    }
    expect(checkGame(game).problems.map((problem) => `${problem.where} · ${problem.what}`)).toEqual([
      'scene board · unknown minigame "draughts"',
      'action chess · unknown minigame "chess"',
    ])
  })
})
