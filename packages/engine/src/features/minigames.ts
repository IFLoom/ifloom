/**
 * Minigames: small state machines declared as data, played with named inputs
 * and timed by ticks. A quick-time event, a lock to pick, a round of cards.
 *
 * A minigame has states. Each state can wait (`after`, a timer the `tick`
 * command runs down, beside the named timers of `timers.ts`), listen (`on`, the inputs the `minigame` command sends),
 * move on by itself (`always`), or end the game (`final`). It keeps a kv
 * store of its own, numbers its transitions set and conditions read with
 * `of: 'minigame'`, gone when it ends unless `final.copy` writes them out. Every random pick
 * is drawn from the save's seed, so a command log plays back exactly.
 */
import { stringOf } from '../strings.ts'
import type { EffectRef } from '../custom.ts'
import type { Game } from '../game.ts'
import type { Condition, GameState } from '../types.ts'
import { byId, defineFeature, listWords, mergedById, type FeatureCheckTools, type FeatureContext } from './feature.ts'

/** A state a transition can go to at random, as its id or as its id with a weight. The weight is 1 if left out. */
export type MinigameTarget = string | { state: string; weight?: number }

/** A minigame transition, the state it goes to and the effects it runs on the way. With no `go` or `to` it stays in its state. */
export type MinigameTransition = {
  /** The id of the state the transition goes to. */
  go?: string
  /** The states the transition draws one from at random, by weight, when there's no `go`. The draw is seeded by the save. */
  to?: MinigameTarget[]
  /**
   * The effects the transition runs before it moves. Any effect works, such as a `kv` effect with `of: 'minigame'` or
   * a `turn`.
   */
  effects?: EffectRef[]
}

/** A state of a minigame, in its `states`. It can wait (`after`), listen to inputs (`on`), move on by itself (`always`) or end the minigame (`final`). */
export type MinigameStateDef = {
  /** The words the player reads while the minigame is in this state, with tokens filled. */
  label?: string
  /**
   * The state's timer. Once `ms` milliseconds of ticks have passed in the state, the engine takes the transition, and
   * one that stays put starts the timer again.
   *
   * The `tick` that runs down the game's named timers runs it down too, in the order they run out.
   */
  after?: { ms: number } & MinigameTransition
  /**
   * The state's inputs. For each input, the first entry whose `when` holds is taken, and an input with no such entry
   * isn't live.
   *
   * `label` is the input's words for its button in this state, with tokens filled, such as a quiz's answer. The first
   * live entry with one gives it. Without one the button reads the `minigame.<input>` string, else the input's name.
   */
  on?: ({ input: string; when?: Condition; label?: string } & MinigameTransition)[]
  /**
   * The state's automatic transitions, the first whose `when` holds taken on entering the state. Use them for a state
   * that only decides where to go next, such as a win.
   */
  always?: ({ when?: Condition } & MinigameTransition)[]
  /**
   * The state's ending. Entering the state ends the minigame.
   *
   * `copy` writes keys of the minigame's kv store to the player's (`{ score: 'arrows.best' }`). Then the minigame
   * closes and `effects` run.
   */
  final?: { effects?: EffectRef[]; copy?: Record<string, string> }
}

/** A minigame the game declares in `minigames`, a small state machine played with named inputs and timed by ticks. Every key it uses must be in its `kv`. */
export type MinigameDef = {
  /** The minigame's id, which the `minigame` effect and a scene's `minigame` name. */
  id: string
  /** The minigame's title. */
  title?: string
  /** The id of the state the minigame starts in. */
  start: string
  /**
   * The minigame's kv store, with each key's starting number, such as `{ score: 0 }`. Content reads and writes the
   * keys with `of: 'minigame'`.
   */
  kv?: Record<string, number>
  /**
   * The keys a UI maps to each input, by input name, such as `{ up: ['ArrowUp', 'w'] }`. Key names are those
   * `KeyboardEvent.key` gives, and a UI picks its own if left out.
   */
  keys?: Record<string, string[]>
  /** The minigame's states, by name. */
  states: Record<string, MinigameStateDef>
}

/** The running minigame a save keeps, in `state.minigame`. Its states are read from content. */
export type MinigameState = {
  /** The minigame's id. */
  id: string
  /** The name of the state the minigame is in. */
  state: string
  /** The milliseconds of ticks since the minigame entered that state. */
  elapsed: number
  /** The minigame's kv store, as play has left it. */
  kv: Record<string, number>
  /** The number of transitions the minigame has taken, part of its random draws' seed. */
  steps: number
}

/** An input of the running minigame as the player sees it, in `view.minigame.inputs`. It has what a `RenderedChoice` needs, so a UI renders it as any button. */
export type MinigameInput = {
  /** The input's name, as the minigame's `on` names it, such as `'up'`. */
  id: string
  /** The input's label, from its `on` entry, else the `minigame.<input>` string (`Up`, `Space`), else its name with a capital. */
  label: string
  /** The command pressing the input sends. */
  command: { type: 'minigame'; input: string }
}

/** The running minigame as the player sees it, in `view.minigame`. */
export type MinigameView = {
  /** The minigame's id. */
  id: string
  /** The minigame's title, or null. */
  title: string | null
  /** The name of the state the minigame is in. */
  state: string
  /** The state's `label`, with tokens filled, or null. `view.scene.body` has it rendered. */
  label: string | null
  /** The milliseconds left on the state's timer. Null when the state has no timer. */
  timeLeft: number | null
  /** The whole length of the state's timer in milliseconds. Null when the state has no timer. */
  timeTotal: number | null
  /** The inputs that are live now, in the order the state lists them. */
  inputs: MinigameInput[]
  /** The minigame's kv store now. */
  kv: Record<string, number>
  /** The keys the game maps to each input, by input name. Empty when it maps none. */
  keys: Record<string, string[]>
}

/** The minigames feature's state, calls, content key, view and references, as types. */
export type MinigamesShape = {
  state: {
    /** The minigame being played, or null. */
    minigame: MinigameState | null
  }
  effects: {
    /** An effect that starts a minigame in its `start` state. A minigame already running is dropped. */
    minigame: { minigame: string }
  }
  commands: {
    /**
     * A command that sends an input to the running minigame by name, such as `{ type: 'minigame', input: 'up' }`. The
     * engine refuses it when the input isn't live.
     */
    minigame: { type: 'minigame'; input: string }
  }
  game: {
    /** The game's minigames. None if left out. */
    minigames?: MinigameDef[]
  }
  pack: {
    /** The pack's minigames. A later pack's minigame replaces an earlier one with the same id. */
    minigames?: MinigameDef[]
  }
  view: {
    /** The minigame being played, or null. */
    minigame: MinigameView | null
  }
  lists: 'minigame'
  references: {
    /** A reference to a minigame by id. */
    minigame: { minigame: string }
    /** A reference to a key some minigame declares in its `kv`, as `{ kv, of: 'minigame' }` names it. */
    minigameKv: { minigameKv: string }
  }
}

/** The scene field that starts a minigame. */
export type MinigameSceneFields = {
  /** The id of the minigame that starts when the scene is entered. The scene shows again once it ends. */
  minigame?: string
}

/** The most transitions one command takes, so a timer of a tiny `ms` or `always` going round in a circle can't hang the game. */
const MOST_STEPS = 1000

/** Returns the minigame the game declares with this id. Undefined when there's none. */
export function minigameOf(game: Game, id: string): MinigameDef | undefined {
  return game.minigames?.find((entry) => entry.id === id)
}

/** The variable that counts how many times a minigame has started: `minigame:<id>`. */
function playsKey(id: string): string {
  return `minigame:${id}`
}

function plays(state: GameState, id: string): number {
  const value = state.kv[playsKey(id)]
  return typeof value === 'number' ? value : 0
}

/** Is this the same play of the same minigame? A transition's effects can end it, or start it again. */
function samePlay(state: GameState, id: string, play: number): boolean {
  return state.minigame?.id === id && plays(state, id) === play
}

/** A state of the running minigame drawn from `to`, by weight. */
function drawTarget(state: GameState, to: readonly MinigameTarget[], cx: FeatureContext): string | undefined {
  const running = state.minigame!
  const picked = cx.weighted(
    to,
    (target) => (typeof target === 'string' ? 1 : target.weight),
    'minigame',
    running.id,
    state.seed,
    plays(state, running.id),
    running.steps,
    'to',
  )
  return picked === undefined ? undefined : typeof picked === 'string' ? picked : picked.state
}

/** Returns the state with a minigame started in its `start` state. An unknown id does nothing, and the content checker reports it. */
export function startMinigame(state: GameState, game: Game, id: string, cx: FeatureContext): GameState {
  const def = minigameOf(game, id)
  if (!def) return state
  const started: GameState = {
    ...state,
    kv: { ...state.kv, [playsKey(id)]: plays(state, id) + 1 },
    minigame: { id, state: def.start, elapsed: 0, kv: { ...def.kv }, steps: 0 },
  }
  return enter(started, game, def.start, cx, 0)
}

/** Enter a state of the running minigame: a final state ends it, an `always` moves on. */
function enter(state: GameState, game: Game, target: string, cx: FeatureContext, depth: number): GameState {
  const running = state.minigame!
  const def = minigameOf(game, running.id)
  const entered = def?.states[target]
  // A state the minigame doesn't have ends it. The content checker reports it.
  if (!entered) return { ...state, minigame: null }
  const next: GameState = { ...state, minigame: { ...running, state: target, elapsed: 0 } }
  if (entered.final) {
    const copied = Object.entries(entered.final.copy ?? {}).map(([key, into]) => [into, running.kv[key] ?? 0])
    const closed: GameState = { ...next, minigame: null, kv: { ...next.kv, ...Object.fromEntries(copied) } }
    return cx.runEffects(closed, game, cx.buildEffects(game, entered.final.effects ?? []), false)
  }
  const moving = entered.always?.find((entry) => cx.holds(next, game, entry.when))
  if (!moving || depth >= MOST_STEPS) return next
  return take(next, game, moving, 'always', cx, depth + 1)
}

/** Take a transition: its effects, then where it goes. */
function take(state: GameState, game: Game, transition: MinigameTransition, from: 'after' | 'on' | 'always', cx: FeatureContext, depth: number): GameState {
  const running = state.minigame!
  const play = plays(state, running.id)
  // Drawn before the effects, so they can't change the draw.
  const drawn = transition.go ?? (transition.to?.length ? drawTarget(state, transition.to, cx) : undefined)
  const done = cx.runEffects(state, game, cx.buildEffects(game, transition.effects ?? []), false)
  // The effects ended the minigame, or started one again: nothing more to do here.
  if (!samePlay(done, running.id, play)) return done
  const next: GameState = { ...done, minigame: { ...done.minigame!, steps: done.minigame!.steps + 1 } }
  if (drawn === undefined) return from === 'after' ? { ...next, minigame: { ...next.minigame!, elapsed: 0 } } : next
  return enter(next, game, drawn, cx, depth)
}

/** The `on` entry an input takes now, if it is live. */
function liveOn(state: GameState, game: Game, input: string, cx: FeatureContext) {
  const running = state.minigame
  if (!running) return undefined
  return minigameOf(game, running.id)?.states[running.state]?.on?.find((entry) => entry.input === input && cx.holds(state, game, entry.when))
}

/** The running state's timer, if it has one. */
function clockOf(state: GameState, game: Game) {
  const running = state.minigame
  return running ? minigameOf(game, running.id)?.states[running.state]?.after : undefined
}

/**
 * Returns the milliseconds until the running state's timer runs out. Undefined with no minigame or no timer.
 *
 * The timers feature's `tick` command reads it to run the minigame's clock beside the named timers.
 */
export function minigameDue(state: GameState, game: Game): number | undefined {
  const running = state.minigame
  const timer = clockOf(state, game)
  return running && timer ? Math.max(timer.ms - running.elapsed, 0) : undefined
}

/** Returns the state with the running minigame's clock moved on by `ms`. It doesn't take the timer's transition. */
export function minigameAdvanced(state: GameState, ms: number): GameState {
  const running = state.minigame
  return running && ms > 0 ? { ...state, minigame: { ...running, elapsed: running.elapsed + ms } } : state
}

/** Returns the state after the running state's timer runs out, with its transition taken as a tick that reaches it would. */
export function minigameTimedOut(state: GameState, game: Game, cx: FeatureContext): GameState {
  const running = state.minigame
  const timer = clockOf(state, game)
  if (!running || !timer) return state
  return take({ ...state, minigame: { ...running, elapsed: timer.ms } }, game, timer, 'after', cx, 0)
}

/**
 * Returns the running play of a minigame as its id and the number of times it has started. Undefined when none runs.
 *
 * A tick runs one play's clock, so a minigame that starts part way through a tick starts its clock on the next.
 */
export function minigamePlay(state: GameState): string | undefined {
  return state.minigame ? `${state.minigame.id}#${plays(state, state.minigame.id)}` : undefined
}

/** The minigame's keys a condition reads (`{ kv, of: 'minigame' }`), looking inside `all`, `any` and `not`. */
function conditionVars(condition: Condition | undefined): string[] {
  if (!condition || typeof condition !== 'object') return []
  if ('kv' in condition && typeof condition.kv === 'string' && condition.of === 'minigame') return [condition.kv]
  if ('all' in condition && Array.isArray(condition.all)) return condition.all.flatMap(conditionVars)
  if ('any' in condition && Array.isArray(condition.any)) return condition.any.flatMap(conditionVars)
  if ('not' in condition && condition.not && typeof condition.not === 'object') return conditionVars(condition.not as Condition)
  return []
}

/** The minigame's keys effects write (`{ kv, of: 'minigame' }`). */
function effectVars(effects: readonly EffectRef[] | undefined): string[] {
  return (effects ?? []).flatMap((effect) => {
    if (!('kv' in effect) || typeof effect.kv !== 'string') return []
    return effect.of === 'minigame' ? [effect.kv] : []
  })
}

/** The live inputs of a state, each once, in order, with the words the first live entry with a `label` gives it. */
function inputsOf(on: NonNullable<MinigameStateDef['on']>, live: (entry: NonNullable<MinigameStateDef['on']>[number]) => boolean) {
  const out = new Map<string, string | undefined>()
  for (const entry of on) {
    if (!live(entry)) continue
    if (!out.has(entry.input) || (out.get(entry.input) === undefined && entry.label !== undefined)) out.set(entry.input, entry.label)
  }
  return [...out].map(([input, label]) => ({ input, label }))
}

/** An input's words for its button: the `minigame.<input>` string, else its name with a capital. */
function inputLabel(game: Game, input: string): string {
  const key = `minigame.${input}`
  const said = stringOf(game, key)
  return said === key ? input.charAt(0).toUpperCase() + input.slice(1) : said
}

/** Everything wrong with one minigame. */
function checkMinigame(minigame: MinigameDef, declaredAnywhere: ReadonlySet<string>, tools: FeatureCheckTools): void {
  const source = { list: 'minigame', id: minigame.id }
  const where = `minigame ${minigame.id}`
  const states = minigame.states ?? {}
  const known = (id: string) => Object.hasOwn(states, id)
  if (!known(minigame.start)) tools.problem(source, where, `starts in unknown state "${minigame.start}"`)
  const declared = new Set(Object.keys(minigame.kv ?? {}))
  const used = new Set<string>()
  const inputs = new Set<string>()
  const edges = new Map<string, string[]>()
  for (const [id, state] of Object.entries(states)) {
    const at = `${where} state ${id}`
    const transitions: [string, MinigameTransition & { when?: Condition }][] = [
      ...(state.after ? [['after', state.after] as [string, MinigameTransition]] : []),
      ...(state.on ?? []).map((entry) => [`on ${entry.input}`, entry] as [string, MinigameTransition & { when?: Condition }]),
      ...(state.always ?? []).map((entry, index) => [`always ${index + 1}`, entry] as [string, MinigameTransition & { when?: Condition }]),
    ]
    const targets: string[] = []
    if (state.label !== undefined) tools.check(source, at, [{ words: state.label, field: 'label' }])
    if (state.after && !(Number.isFinite(state.after.ms) && state.after.ms > 0)) tools.problem(source, at, 'a timer needs ms above 0')
    if (state.final && transitions.length) tools.problem(source, at, 'a final state ends the minigame, so its after, on and always never run')
    for (const entry of state.on ?? []) {
      inputs.add(entry.input)
      if (entry.label !== undefined) tools.check(source, `${at} on ${entry.input}`, [{ words: entry.label, field: 'label' }])
    }
    for (const [label, transition] of transitions) {
      const go = [transition.go, ...(transition.to ?? []).map((target) => (typeof target === 'string' ? target : target.state))].filter(
        (target): target is string => target !== undefined,
      )
      for (const target of go) {
        if (known(target)) targets.push(target)
        else tools.problem(source, at, `${label}: goes to unknown state "${target}"`)
      }
      if (transition.to && !transition.to.length) tools.problem(source, at, `${label}: to lists no states`)
      for (const target of transition.to ?? []) {
        if (typeof target !== 'string' && target.weight !== undefined && !(target.weight > 0))
          tools.problem(source, at, `${label}: the weight of "${target.state}" must be above 0`)
      }
      // A transition that stays where it is goes back to its own state, for reachability.
      if (!go.length) targets.push(id)
      tools.check(source, `${at} ${label}`, [{ when: transition.when }, { effects: transition.effects }])
      for (const key of [...conditionVars(transition.when), ...effectVars(transition.effects)]) used.add(key)
    }
    if (state.final) {
      tools.check(source, `${at} final`, [{ effects: state.final.effects }])
      for (const key of [...effectVars(state.final.effects), ...Object.keys(state.final.copy ?? {})]) used.add(key)
    }
    edges.set(id, targets)
  }
  // Keys it uses but doesn't declare. One in a condition or effect that no minigame declares is reported where it is named; see `resolve`.
  for (const key of used) {
    if (!declared.has(key) && declaredAnywhere.has(key)) tools.problem(source, where, `uses key "${key}", which is not in its kv`)
  }
  for (const state of Object.values(states)) {
    for (const key of Object.keys(state.final?.copy ?? {})) {
      if (!declared.has(key) && !declaredAnywhere.has(key)) tools.problem(source, where, `copies key "${key}", which is not in its kv`)
    }
  }
  for (const input of Object.keys(minigame.keys ?? {})) {
    if (!inputs.has(input)) tools.problem(source, where, `keys maps input "${input}", which no state's on uses`)
  }
  // Can it end? Walk from the start along every transition.
  if (known(minigame.start)) {
    const reached = new Set([minigame.start])
    const queue = [minigame.start]
    while (queue.length) {
      for (const target of edges.get(queue.shift()!) ?? []) {
        if (reached.has(target)) continue
        reached.add(target)
        queue.push(target)
      }
    }
    if (![...reached].some((id) => states[id]?.final)) tools.problem(source, where, 'no final state can be reached from its start, so it never ends')
  }
}

/** The minigames feature, which runs minigames and refuses other commands while one runs, except `dismiss` and commands that ignore locks. */
export const minigames = defineFeature<MinigamesShape>({
  name: 'minigames',
  state: {
    minigame: { start: () => null, load: () => null, keeps: (value) => value === null || typeof value === 'object' },
  },
  effects: {
    minigame: {
      apply: (state, effect, game, cx) => startMinigame(state, game, effect.minigame, cx),
      references: (effect) => [{ minigame: effect.minigame }],
    },
  },
  commands: {
    minigame: {
      whyNot: (state, command, game, cx) => {
        if (!state.minigame) return stringOf(game, 'noMinigame')
        return liveOn(state, game, command.input, cx) ? undefined : stringOf(game, 'notLive')
      },
      run: (state, command, game, cx) => take(state, game, liveOn(state, game, command.input, cx)!, 'on', cx, 0),
      ignoresLocks: () => true,
      references: () => [],
    },
  },
  started: (state, game, cx) => {
    const intro = state.sceneId ? game.scenes.find((scene) => scene.id === state.sceneId)?.minigame : undefined
    return intro ? startMinigame(state, game, intro, cx) : state
  },
  // While a minigame runs, only its own commands and dismissing a notice go through. Settings ignore locks, so they do too.
  refuses: (state, command, game) => (state.minigame && command.type !== 'dismiss' ? stringOf(game, 'finishFirst') : undefined),
  pack: mergedById<MinigamesShape['game'], MinigamesShape['pack'], MinigameDef>(
    { base: (game) => game.minigames, pack: (pack) => pack.minigames },
    (game, list) => {
      game.minigames = list
    },
  ),
  content: {
    minigames: {
      declares: byId('minigame'),
      words: listWords('minigames', 'minigame', {
        title: true,
        states: {
          '*': {
            label: true,
            after: { effects: 'effects' },
            on: [{ label: true, effects: 'effects' }],
            always: [{ effects: 'effects' }],
            final: { effects: 'effects' },
          },
        },
      }),
    },
  },
  lists: ['minigame'],
  check: (game, tools) => {
    const list = game.minigames ?? []
    tools.twice(
      'minigame',
      'minigames',
      list.map((entry) => entry.id),
    )
    const declaredAnywhere = new Set(list.flatMap((entry) => Object.keys(entry.kv ?? {})))
    for (const minigame of list) checkMinigame(minigame, declaredAnywhere, tools)
    for (const scene of game.scenes) {
      if (scene.minigame !== undefined) tools.check({ list: 'scene', id: scene.id }, `scene ${scene.id}`, [{ minigame: scene.minigame }])
    }
  },
  resolve: (game) => {
    const ids = new Set((game.minigames ?? []).map((entry) => entry.id))
    const keys = new Set((game.minigames ?? []).flatMap((entry) => Object.keys(entry.kv ?? {})))
    return {
      minigame: (ref) => (ids.has(ref.minigame) ? [] : [`unknown minigame "${ref.minigame}"`]),
      minigameKv: (ref) => (keys.has(ref.minigameKv) ? [] : [`minigame key "${ref.minigameKv}" is not in any minigame's kv`]),
    }
  },
  view: (state, game, _shown, cx) => {
    const running = state.minigame
    const def = running ? minigameOf(game, running.id) : undefined
    if (!running || !def) return { minigame: null }
    const current = def.states[running.state]
    const timer = current?.after
    return {
      minigame: {
        id: running.id,
        title: def.title ?? null,
        state: running.state,
        label: current?.label !== undefined ? cx.fillTokens(state, game, current.label) : null,
        timeLeft: timer ? Math.max(0, timer.ms - running.elapsed) : null,
        timeTotal: timer ? timer.ms : null,
        inputs: inputsOf(current?.on ?? [], (entry) => cx.holds(state, game, entry.when)).map(({ input, label }) => ({
          id: input,
          label: label !== undefined ? cx.fillTokens(state, game, label) : inputLabel(game, input),
          command: { type: 'minigame', input },
        })),
        kv: { ...running.kv },
        keys: def.keys ?? {},
      },
    }
  },
  // A scene with a minigame starts it when it is entered. After the scenes' step, so a scene a trigger opens starts its minigame in the same command, and before the plugins' hooks, so they see it running.
  afterCommand: {
    at: 'beforePlugins',
    run: (before, after, game, cx) => {
      if (!after.sceneId || after.sceneId === before.sceneId) return after
      const id = game.scenes.find((scene) => scene.id === after.sceneId)?.minigame
      return id ? startMinigame(after, game, id, cx) : after
    },
  },
})
