/**
 * Minigames: small state machines declared as data, played with named inputs
 * and timed by ticks. A quick-time event, a lock to pick, a round of cards.
 *
 * A minigame has states. Each state can wait (`after`, a timer the `tick`
 * command runs down), listen (`on`, the inputs the `minigame` command sends),
 * move on by itself (`always`), or end the game (`final`). It keeps its own
 * number variables, which transitions set and conditions read, and they are
 * gone when it ends unless `final.copy` writes them out. Every random pick
 * is drawn from the save's seed, so a command log plays back exactly.
 */
import { say } from '../strings.ts'
import type { EffectRef } from '../custom.ts'
import type { Game } from '../game.ts'
import type { Condition, Effect, GameState, Range } from '../types.ts'
import { bounded, defineFeature, inRange, mergedById, wanted, type FeatureCheckTools, type FeatureContext } from './feature.ts'

/** A state a transition can go to at random: its id, or its id with a weight (1 if left out). */
export type MinigameTarget = string | { state: string; weight?: number }

/** Where a transition goes, and what it does on the way. */
export type MinigameTransition = {
  /** The state it goes to. */
  go?: string
  /**
   * A state drawn at random, by weight, when there is no `go`. Seeded by the
   * save, so the same save draws the same states.
   */
  to?: MinigameTarget[]
  /**
   * What it does before it moves: any effect, a `minigameVar` or a turn
   * among them. A transition with no `go` or `to` stays where it is.
   */
  effects?: EffectRef[]
}

/** One state of a minigame. */
export type MinigameStateDef = {
  /** A prose key: what the player reads while the minigame is in this state. */
  label?: string
  /**
   * A timer. Once `ms` milliseconds of ticks have passed in this state, the
   * transition is taken. Staying put (no `go` or `to`) starts the timer again.
   */
  after?: { ms: number } & MinigameTransition
  /**
   * What the inputs do here. The first entry for the input whose `when`
   * holds is taken; an input with none is not live.
   */
  on?: ({ input: string; when?: Condition } & MinigameTransition)[]
  /**
   * Taken as soon as the state is entered: the first whose `when` holds. A
   * state that only decides where to go next, such as a win or a loss.
   */
  always?: ({ when?: Condition } & MinigameTransition)[]
  /**
   * Entering this state ends the minigame. `copy` writes minigame variables
   * to the game's variables (`{ score: 'arrows.best' }`); then the minigame
   * closes and `effects` apply.
   */
  final?: { effects?: EffectRef[]; copy?: Record<string, string> }
}

/** A minigame: its states, the one it starts in, its variables and the keys a UI maps to its inputs. */
export type MinigameDef = {
  id: string
  /** What the UI calls it. */
  label?: string
  /** The state it starts in. */
  start: string
  /** Its variables and their starting values. A variable it uses must be declared here. */
  vars?: Record<string, number>
  /**
   * The keys a UI maps to each input, by input name: `{ up: ['ArrowUp', 'w'] }`.
   * Key names as `KeyboardEvent.key` gives them. A UI picks its own if left out.
   */
  keys?: Record<string, string[]>
  states: Record<string, MinigameStateDef>
}

/** The minigame being played. */
export type MinigameState = {
  id: string
  /** The state it is in. */
  state: string
  /** Milliseconds of ticks since it entered that state. */
  elapsed: number
  /** Its variables. */
  vars: Record<string, number>
  /** How many transitions it has taken, for its random draws. */
  steps: number
}

/** The minigame being played, as the UI draws it. */
export type MinigameView = {
  id: string
  /** The minigame's own label, or null. */
  title: string | null
  /** The state it is in. */
  state: string
  /** The state's words, from its `label`, or null. `view.scene.body` has them rendered. */
  label: string | null
  /** Milliseconds left on the state's timer, or null with no timer. */
  timeLeft: number | null
  /** The timer's whole length, or null with no timer. */
  timeTotal: number | null
  /** The inputs that do something now, in the order the state lists them. */
  inputs: string[]
  vars: Record<string, number>
  /** The keys the game maps to each input, by input name. Empty if it maps none. */
  keys: Record<string, string[]>
}

/** What the minigames feature adds, as types. */
export type MinigamesShape = {
  state: {
    /** The minigame being played, or null. */
    minigame: MinigameState | null
  }
  conditions: {
    /**
     * A variable of the minigame being played, read as a number: bare, whether
     * it is above 0; with a range, whether it is in it. False with no minigame
     * running. `{ minigameVar: 'score', gte: 3 }`.
     */
    minigameVar: { minigameVar: string } & Range
  }
  effects: {
    /** Start a minigame, in its `start` state. One already running is dropped. */
    minigame: { kind: 'minigame'; minigame: string }
    /**
     * Set a variable of the minigame being played `to` a value, change it `by`
     * an amount, or set it to a whole number drawn from `random: [min, max]`,
     * both included. Does nothing with no minigame running.
     */
    minigameVar:
      | { kind: 'minigameVar'; key: string; to: number }
      | { kind: 'minigameVar'; key: string; by: number }
      | { kind: 'minigameVar'; key: string; random: [number, number] }
  }
  commands: {
    /**
     * Time passing in the minigame being played: `ms` milliseconds on the
     * running state's timer. A UI sends it while a timer runs. Refused with no
     * minigame running, or none counting down.
     */
    tick: { type: 'tick'; ms: number }
    /** An input to the minigame being played, by name: `{ type: 'minigame', input: 'up' }`. */
    minigame: { type: 'minigame'; input: string }
  }
  game: {
    /** The game's minigames. None if left out. */
    minigames?: MinigameDef[]
  }
  pack: {
    /** Minigames. A later pack's replaces an earlier one's by id. */
    minigames?: MinigameDef[]
  }
  view: {
    /** The minigame being played, or null. */
    minigame: MinigameView | null
  }
  lists: 'minigame'
}

/** A scene's field that starts a minigame. */
export type MinigameSceneFields = {
  /** A minigame that starts when the scene is entered. The scene shows again once it ends. */
  minigame?: string
}

/** The most transitions one command takes, so a timer of a tiny `ms` or `always` going round in a circle can't hang the game. */
const MOST_STEPS = 1000

export function minigameDef(game: Game, id: string): MinigameDef | undefined {
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

/** Start a minigame. Unknown ids do nothing; the content checker reports them. */
export function startMinigame(state: GameState, game: Game, id: string, cx: FeatureContext): GameState {
  const def = minigameDef(game, id)
  if (!def) return state
  const started: GameState = {
    ...state,
    kv: { ...state.kv, [playsKey(id)]: plays(state, id) + 1 },
    minigame: { id, state: def.start, elapsed: 0, vars: { ...def.vars }, steps: 0 },
  }
  return enter(started, game, def.start, cx, 0)
}

/** Enter a state of the running minigame: a final state ends it, an `always` moves on. */
function enter(state: GameState, game: Game, target: string, cx: FeatureContext, depth: number): GameState {
  const running = state.minigame!
  const def = minigameDef(game, running.id)
  const entered = def?.states[target]
  // A state the minigame doesn't have ends it. The content checker reports it.
  if (!entered) return { ...state, minigame: null }
  const next: GameState = { ...state, minigame: { ...running, state: target, elapsed: 0 } }
  if (entered.final) {
    const copied = Object.entries(entered.final.copy ?? {}).map(([key, into]) => [into, running.vars[key] ?? 0])
    const closed: GameState = { ...next, minigame: null, kv: { ...next.kv, ...Object.fromEntries(copied) } }
    return cx.runEffects(closed, game, cx.buildEffects(closed, game, entered.final.effects ?? []), false)
  }
  const moving = entered.always?.find((entry) => cx.holds(next, entry.when, game))
  if (!moving || depth >= MOST_STEPS) return next
  return take(next, game, moving, 'always', cx, depth + 1)
}

/** Take a transition: its effects, then where it goes. */
function take(state: GameState, game: Game, transition: MinigameTransition, from: 'after' | 'on' | 'always', cx: FeatureContext, depth: number): GameState {
  const running = state.minigame!
  const play = plays(state, running.id)
  // Drawn before the effects, so they can't change the draw.
  const drawn = transition.go ?? (transition.to?.length ? drawTarget(state, transition.to, cx) : undefined)
  const done = cx.runEffects(state, game, cx.buildEffects(state, game, transition.effects ?? []), false)
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
  return minigameDef(game, running.id)?.states[running.state]?.on?.find((entry) => entry.input === input && cx.holds(state, entry.when, game))
}

/** The running state's timer, if it has one. */
function timerOf(state: GameState, game: Game) {
  const running = state.minigame
  return running ? minigameDef(game, running.id)?.states[running.state]?.after : undefined
}

/**
 * Run the clock down by `ms`. When a timer runs out its transition is taken,
 * and what is left of `ms` goes on to the state after, so one long tick can
 * fire several timers in turn, up to `MOST_STEPS`. It stops when the
 * minigame ends or a new one starts.
 */
function tick(state: GameState, game: Game, ms: number, cx: FeatureContext): GameState {
  let next = state
  let left = ms
  for (let steps = 0; left > 0 && next.minigame && steps < MOST_STEPS; steps += 1) {
    const running: MinigameState = next.minigame
    const timer = timerOf(next, game)
    const need = timer ? timer.ms - running.elapsed : Infinity
    if (left < need) return { ...next, minigame: { ...running, elapsed: running.elapsed + left } }
    left -= Math.max(need, 0)
    const play = plays(next, running.id)
    next = take({ ...next, minigame: { ...running, elapsed: timer!.ms } }, game, timer!, 'after', cx, 0)
    if (!samePlay(next, running.id, play)) break
  }
  return next
}

/** The minigame variables a condition reads, looking inside `all`, `any` and `not`. */
function conditionVars(condition: Condition | undefined): string[] {
  if (!condition || typeof condition !== 'object') return []
  if ('minigameVar' in condition && typeof condition.minigameVar === 'string') return [condition.minigameVar]
  if ('all' in condition && Array.isArray(condition.all)) return condition.all.flatMap(conditionVars)
  if ('any' in condition && Array.isArray(condition.any)) return condition.any.flatMap(conditionVars)
  if ('not' in condition && condition.not && typeof condition.not === 'object') return conditionVars(condition.not as Condition)
  return []
}

/** The minigame variables effects write. */
function effectVars(effects: readonly EffectRef[] | undefined): string[] {
  return (effects ?? []).flatMap((effect) => ('kind' in effect && effect.kind === 'minigameVar' ? [(effect as Extract<Effect, { kind: 'minigameVar' }>).key] : []))
}

/** Everything wrong with one minigame. */
function checkMinigame(minigame: MinigameDef, declaredAnywhere: ReadonlySet<string>, tools: FeatureCheckTools): void {
  const source = { list: 'minigame', id: minigame.id }
  const where = `minigame ${minigame.id}`
  const states = minigame.states ?? {}
  const known = (id: string) => Object.hasOwn(states, id)
  if (!known(minigame.start)) tools.problem(source, where, `starts in unknown state "${minigame.start}"`)
  const declared = new Set(Object.keys(minigame.vars ?? {}))
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
    if (state.label !== undefined) tools.check(source, at, [{ prose: state.label }])
    if (state.after && !(Number.isFinite(state.after.ms) && state.after.ms > 0)) tools.problem(source, at, 'a timer needs ms above 0')
    if (state.final && transitions.length) tools.problem(source, at, 'a final state ends the minigame, so its after, on and always never run')
    for (const entry of state.on ?? []) inputs.add(entry.input)
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
        if (typeof target !== 'string' && target.weight !== undefined && !(target.weight > 0)) tools.problem(source, at, `${label}: the weight of "${target.state}" must be above 0`)
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
  // Variables it uses but doesn't declare. One in a condition or effect that no minigame declares is reported where it is named; see `resolve`.
  for (const key of used) {
    if (!declared.has(key) && declaredAnywhere.has(key)) tools.problem(source, where, `uses variable "${key}", which is not in its vars`)
  }
  for (const state of Object.values(states)) {
    for (const key of Object.keys(state.final?.copy ?? {})) {
      if (!declared.has(key) && !declaredAnywhere.has(key)) tools.problem(source, where, `copies variable "${key}", which is not in its vars`)
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

export const minigames = defineFeature<MinigamesShape>({
  name: 'minigames',
  state: {
    minigame: { start: () => null, load: () => null, keeps: (value) => value === null || typeof value === 'object' },
  },
  conditions: {
    minigameVar: {
      holds: (state, condition) => {
        const value = state.minigame?.vars[condition.minigameVar]
        return value !== undefined && inRange(value, condition)
      },
      explain: (state, condition) => {
        const want = bounded(condition) ? wanted(condition) : 'more than 0'
        if (!state.minigame) return `no minigame running; wants minigame variable ${condition.minigameVar} ${want}`
        return `minigame variable ${condition.minigameVar} is ${state.minigame.vars[condition.minigameVar] ?? 'unset'}; wants ${want}`
      },
      references: (condition) => [{ minigameVar: condition.minigameVar }],
    },
  },
  effects: {
    minigame: {
      apply: (state, effect, game, cx) => startMinigame(state, game, effect.minigame, cx),
      references: (effect) => [{ minigame: effect.minigame }],
    },
    minigameVar: {
      apply: (state, effect, _game, cx) => {
        const running = state.minigame
        if (!running) return state
        let value: number
        if ('by' in effect) value = (running.vars[effect.key] ?? 0) + effect.by
        else if ('random' in effect) {
          const [low, high] = [Math.min(...effect.random), Math.max(...effect.random)].map(Math.round)
          value = low + cx.roll(high - low + 1, 'minigame', running.id, state.seed, plays(state, running.id), running.steps, 'var', effect.key)
        } else value = effect.to
        return { ...state, minigame: { ...running, vars: { ...running.vars, [effect.key]: value } } }
      },
      references: (effect) => [{ minigameVar: effect.key }],
    },
  },
  commands: {
    tick: {
      whyNot: (state, command, game) => {
        if (!state.minigame) return say(game, 'noMinigame')
        if (!(Number.isFinite(command.ms) && command.ms > 0)) return say(game, 'tickLength')
        return timerOf(state, game) ? undefined : say(game, 'noTimer')
      },
      run: (state, command, game, cx) => tick(state, game, command.ms, cx),
      // The minigame is already running: no lock or guard stops its clock.
      ignoresLocks: () => true,
      references: () => [],
    },
    minigame: {
      whyNot: (state, command, game, cx) => {
        if (!state.minigame) return say(game, 'noMinigame')
        return liveOn(state, game, command.input, cx) ? undefined : say(game, 'notLive')
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
  refuses: (state, command, game) => (state.minigame && command.type !== 'dismiss' ? say(game, 'finishFirst') : undefined),
  pack: mergedById<MinigamesShape['game'], MinigamesShape['pack'], MinigameDef>(
    { base: (game) => game.minigames, pack: (pack) => pack.minigames },
    (game, list) => {
      game.minigames = list
    },
  ),
  lists: ['minigame'],
  check: (game, tools) => {
    const list = game.minigames ?? []
    tools.twice('minigame', 'minigames', list.map((entry) => entry.id))
    const declaredAnywhere = new Set(list.flatMap((entry) => Object.keys(entry.vars ?? {})))
    for (const minigame of list) checkMinigame(minigame, declaredAnywhere, tools)
    for (const scene of game.scenes) {
      if (scene.minigame !== undefined) tools.check({ list: 'scene', id: scene.id }, `scene ${scene.id}`, [{ minigame: scene.minigame }])
    }
  },
  resolve: (game) => {
    const ids = new Set((game.minigames ?? []).map((entry) => entry.id))
    const vars = new Set((game.minigames ?? []).flatMap((entry) => Object.keys(entry.vars ?? {})))
    return {
      minigame: (ref) => (ids.has(ref.minigame) ? [] : [`unknown minigame "${ref.minigame}"`]),
      minigameVar: (ref) => (vars.has(ref.minigameVar) ? [] : [`minigame variable "${ref.minigameVar}" is not in any minigame's vars`]),
    }
  },
  view: (state, game, _shown, cx) => {
    const running = state.minigame
    const def = running ? minigameDef(game, running.id) : undefined
    if (!running || !def) return { minigame: null }
    const current = def.states[running.state]
    const timer = current?.after
    return {
      minigame: {
        id: running.id,
        title: def.label ?? null,
        state: running.state,
        label: current?.label !== undefined ? (game.prose?.line(current.label, state) ?? null) : null,
        timeLeft: timer ? Math.max(0, timer.ms - running.elapsed) : null,
        timeTotal: timer ? timer.ms : null,
        inputs: [...new Set((current?.on ?? []).filter((entry) => cx.holds(state, entry.when, game)).map((entry) => entry.input))],
        vars: { ...running.vars },
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

