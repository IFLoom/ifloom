import { say } from './strings.ts'
import { buildEffects } from './custom.ts'
import { warningOf, whyNot } from './availability.ts'
import {
  itemById,
  sceneById,
  type Game,
} from './game.ts'
import { activityById, payCost } from './activity.ts'
import { sceneContext } from './context.ts'
import { emptyStoryline, storylineOf } from './storylines.ts'
import type { Command, Effect, FlagValue, GameState, StorylineState } from './types.ts'
import { SAVE_VERSION } from './types.ts'
import { clampStat, startingStats } from './stats.ts'
import { bindCurrent, entitiesOf, entityOf, newEntity, removeEntity, startingEntities, writeEntity } from './entities.ts'
import { holds } from './condition.ts'
import { hash } from './random.ts'
import { collect, discard } from './collections.ts'
import { dismiss, notify } from './notices.ts'
import { fireTriggers } from './triggers.ts'
import { inputById, inputValue } from './inputs.ts'
import { settingAffects, startingSettings } from './settings.ts'
import { migratePlugins, pluginCommand, pluginEffect, runAfter, runHooks, startingPlugins, useApplier } from './plugin.ts'

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

export type StartOptions = {
  /** Fixes the save's random draws. Left out, it is hashed from the game's id, so tests deal the same cards. */
  seed?: number
  /** Variables to write before the first scene: a name from a title screen, a difficulty. */
  flags?: Record<string, FlagValue>
  /**
   * The player's stored values for the game's `play` settings, usually the
   * profile's `settings`. A setting given no value, or one it doesn't take,
   * starts at its default; ids the game doesn't declare are ignored.
   */
  settings?: Record<string, unknown>
  /**
   * The state a finished game ended on, for a New Game+: the stats, variables
   * and items the game's `carryOver` lists are copied from it.
   */
  carry?: GameState
}

/** What `carryOver` takes from the game before, laid over a fresh state. */
function carried(state: GameState, game: Game, from: GameState): GameState {
  const listed = game.carryOver
  if (!listed) return state
  const stats = { ...state.stats }
  for (const id of listed.stats ?? []) {
    if (typeof from.stats?.[id] === 'number') stats[id] = clampStat(state, game, id, from.stats[id])
  }
  const flags = { ...state.flags }
  for (const key of listed.flags ?? []) {
    if (from.flags?.[key] !== undefined) flags[key] = from.flags[key]
  }
  const items = { ...state.items }
  const itemIds = listed.items === 'all' ? Object.keys(items) : (listed.items ?? [])
  for (const id of itemIds) {
    if (id in items && typeof from.items?.[id] === 'number') items[id] = from.items[id]
  }
  return { ...state, stats, flags, items }
}

export function startingState(game: Game, options: StartOptions = {}): GameState {
  const storylines: Record<string, StorylineState> = {}
  for (const storyline of game.storylines) {
    storylines[storyline.id] = emptyStoryline()
  }
  const items: Record<string, number> = {}
  for (const item of game.items) {
    items[item.id] = item.start ?? (item.kind === 'gear' ? 1 : 0)
  }
  const fresh: GameState = {
    version: SAVE_VERSION,
    seed: options.seed ?? hash(game.id),
    phase: game.startPhase ?? '',
    turn: 0,
    sceneId: game.introScene ?? null,
    stats: startingStats(game),
    entities: startingEntities(game),
    created: {},
    removed: [],
    storylines,
    flags: { ...options.flags },
    items,
    collections: {},
    notices: [],
    fired: {},
    plugins: startingPlugins(game),
    // The opening scene is on screen from the first frame, so it counts as seen
    // without a command ever having been run.
    seen: game.introScene ? { [game.introScene]: 1 } : {},
    seenOn: game.introScene ? { [game.introScene]: 0 } : {},
    chosen: {},
    settings: startingSettings(game, options.settings),
  }
  if (!options.carry) return fresh
  // Carried over first, so variables the caller gives still win.
  const plus = carried(fresh, game, options.carry)
  return { ...plus, flags: { ...plus.flags, ...options.flags } }
}

export function hydrate(state: GameState, game: Game): GameState {
  let next = state
  let storylines = state.storylines
  let changed = false
  for (const def of game.storylines) {
    if (!storylines[def.id]) {
      if (!changed) {
        storylines = { ...storylines }
        changed = true
      }
      storylines[def.id] = emptyStoryline()
    }
  }
  if (changed) next = { ...next, storylines }
  if (!next.collections) next = { ...next, collections: {} }
  if (!next.notices) next = { ...next, notices: [] }
  if (!next.fired) next = { ...next, fired: {} }
  if (!next.seen) next = { ...next, seen: {} }
  if (!next.seenOn) next = { ...next, seenOn: {} }
  if (!next.chosen) next = { ...next, chosen: {} }
  if (typeof next.turn !== 'number') next = { ...next, turn: 0 }
  if (!next.entities) next = { ...next, entities: {} }
  if (!next.created) next = { ...next, created: {} }
  if (!next.removed) next = { ...next, removed: [] }
  // A play setting the save lacks (one the game added since, or every one in an older save) takes its default.
  const lacking = (game.settings ?? []).filter((setting) => settingAffects(setting) === 'play' && next.settings?.[setting.id] === undefined)
  if (lacking.length || !next.settings) {
    next = { ...next, settings: { ...next.settings, ...Object.fromEntries(lacking.map((setting) => [setting.id, setting.default])) } }
  }
  // A declared entity the save does not have — a mod's, a new version's — joins it, unless it was removed in play.
  const missing = (game.entities ?? []).filter(
    (entity) => !next.entities[entity.of]?.[entity.id] && !next.removed.includes(`${entity.of}:${entity.id}`),
  )
  for (const entity of missing) next = writeEntity(next, `${entity.of}:${entity.id}`, newEntity(game, entity.of, entity))
  // A save that cannot be carried forward was refused when it was read; here
  // the plugins' states are only brought up to date.
  const upgraded = migratePlugins(next, game)
  return typeof upgraded === 'string' ? next : upgraded
}

export type Applied = {
  state: GameState
  /** False when the command was refused: state comes back untouched. */
  ok: boolean
  /** Why it was refused. Diagnostic, not necessarily player-facing. */
  refused?: string
}

class Refused extends Error {
  readonly detail: string

  constructor(detail: string) {
    super(detail)
    this.name = 'Refused'
    this.detail = detail
  }
}

/** Bail out of a command. Nothing changes, and the caller is told why. */
function refuse(detail: string): never {
  throw new Refused(detail)
}

/**
 * Record a scene the command landed the player in.
 *
 * One chokepoint rather than a bump at each of the ten places that assign
 * `sceneId` — a talk, a plugin command, the intro and an effect all open scenes, and
 * a counter that some of those routes forget is worse than none. A command's
 * effects can pass through several ids; only the one the player is left looking
 * at is a viewing, which is what comparing before to after gives us.
 */
function witnessed(before: GameState, after: GameState): GameState {
  const id = after.sceneId
  if (!id || id === before.sceneId) return after
  const seen = { ...after.seen, [id]: (after.seen[id] ?? 0) + 1 }
  if (after.seenOn?.[id] !== undefined) return { ...after, seen }
  return { ...after, seen, seenOn: { ...after.seenOn, [id]: after.turn } }
}

/**
 * Run a command and say whether it took. Prefer this over `dispatch` anywhere
 * the answer matters — a refusal and a no-op look identical in the state alone.
 */
export function apply(
  state: GameState | null,
  game: Game,
  command: Command,
): Applied {
  if (command.type === 'start') {
    return {
      state: startingState(game, { seed: command.seed, flags: command.flags }),
      ok: true,
    }
  }
  if (!state) return { state: startingState(game), ok: true }
  // A plugin state that cannot be carried forward is refused, never run: the
  // plugin's next write would stamp it with the current version, and it would
  // then load as if it were readable.
  const unreadable = migratePlugins(state, game)
  if (typeof unreadable === 'string') return { state, ok: false, refused: unreadable }
  const current = hydrate(state, game)
  try {
    const ran = run(current, game, command)
    const next = witnessed(current, fireTriggers(ran, game, (state, effects) => applyEffects(state, game, effects)))
    return { state: runAfter(game, current, next), ok: true }
  } catch (error) {
    if (error instanceof Refused) {
      return { state: current, ok: false, refused: error.detail }
    }
    throw error
  }
}

export function dispatch(
  state: GameState | null,
  game: Game,
  command: Command,
): GameState {
  return apply(state, game, command).state
}

function run(
  current: GameState,
  game: Game,
  command: Command,
): GameState {
  const why = whyNot(current, game, command)
  if (why) refuse(why)
  const warning = warningOf(current, game, command)
  if (warning) refuse(warning)
  const custom = game.rules?.commands?.[command.type]
  if (custom) return custom(current, command) as GameState
  switch (command.type) {
    case 'activity':
      return runActivity(current, game, command.id)
    case 'scene':
      return enterScene(current, game, command.id)
    case 'choose':
      return choose(current, game, command.id)
    case 'leave':
      return { ...current, sceneId: null }
    case 'use':
      return consumeItem(current, game, command.itemId)
    case 'custom':
      return pluginCommand(game, command.name)!.run(current, command.with ?? {})
    case 'dismiss':
      return dismiss(current, command.id)
    case 'setting':
      return { ...current, settings: { ...current.settings, [command.id]: command.value } }
    case 'input': {
      const input = inputById(game, command.id)!
      const key = input.variable ?? input.id
      return { ...current, flags: { ...current.flags, [key]: inputValue(input, command.value!) } }
    }
    default:
      return refuse(say(game, 'notSupported'))
  }
}

/**
 * Activities are content. The engine only knows how to charge for one and
 * apply what falls out — the reasons it can be refused live in the pack.
 */
function runActivity(
  state: GameState,
  game: Game,
  id: string,
): GameState {
  const activity = activityById(game, id)!
  const next = payCost(state, game, activity.cost ?? {})
  // Computed effects read the state as it was before the cost was paid.
  return applyEffects(next, game, buildEffects(state, game, activity.effects ?? []))
}

/**
 * The end of a turn: the counter moves on, `resets` are put back, `rules.turn`'s
 * effects apply, then the game's `onTurn` and every plugin's `turn` hook run.
 * `before` is the state the turn ended on, which `rules.turn` is asked about.
 */
function endTurn(state: GameState, game: Game, before: GameState = state): GameState {
  // A turn ending inside a turn's end would ask `rules.turn` again, and again: it does nothing.
  if (ending) return state
  ending = true
  try {
    const next = state.turn + 1
    const rule = game.rules?.turn?.(before, next) ?? { effects: [] }
    const begun = applyEffects(
      { ...state, turn: next, flags: { ...state.flags, ...game.rules?.resets } },
      game,
      rule.effects,
    )
    return runHooks(game, 'turn', game.rules?.onTurn?.(begun) ?? begun)
  } finally {
    ending = false
  }
}

/** True while a turn is ending, so a `turn` effect run by the turn's own rules is ignored. */
let ending = false

function enterScene(
  state: GameState,
  _game: Game,
  id: string,
): GameState {
  return { ...state, sceneId: id }
}

function choose(
  state: GameState,
  game: Game,
  choiceId: string,
): GameState {
  const scene = sceneById(game, state.sceneId!)
  if (!scene) return { ...state, sceneId: null }
  const view = scene.render(state, sceneContext(state, game))
  const choice = view.choices.find((entry) => entry.id === choiceId)!
  const key = `${scene.id}/${choice.id}`
  const marked = { ...state, chosen: { ...state.chosen, [key]: (state.chosen?.[key] ?? 0) + 1 } }
  return applyEffects(marked, game, choice.effects)
}

function consumeItem(
  state: GameState,
  game: Game,
  itemId: string,
): GameState {
  const item = itemById(game, itemId)!
  return applyEffects(state, game, [
    { kind: 'item', id: itemId, by: -1 },
    ...item.use!.effects,
  ])
}

export function applyEffects(
  state: GameState,
  game: Game,
  effects: Effect[],
): GameState {
  let next = state
  for (const effect of effects) {
    next = applyEffect(next, game, effect)
  }
  return next
}

function applyEffect(
  state: GameState,
  game: Game,
  effect: Effect,
): GameState {
  switch (effect.kind) {
    case 'custom': {
      // A plugin the game no longer has does nothing, as an unknown custom effect does.
      const fn = pluginEffect(game, effect.name)
      return fn ? fn(state, effect.with ?? {}) : state
    }
    case 'collect':
      return collect(state, game, effect.to, effect.entry)
    case 'discard':
      return discard(state, effect.from, effect.id)
    case 'notify': {
      const { kind: _kind, ...notice } = effect
      return notify(state, notice)
    }
    case 'stat': {
      if (effect.of !== undefined) {
        const entity = entityOf(state, effect.of)
        if (!entity) return state
        const to = clampStat(state, game, effect.key, (entity.stats[effect.key] ?? 0) + effect.by)
        return writeEntity(state, effect.of, { ...entity, stats: { ...entity.stats, [effect.key]: to } })
      }
      const stats = {
        ...state.stats,
        [effect.key]: clampStat(state, game, effect.key, (state.stats[effect.key] ?? 0) + effect.by),
      }
      const after = { ...state, stats }
      return game.rules?.onStat?.(state, after, effect.key, effect.by) ?? after
    }
    case 'setStat': {
      if (effect.of !== undefined) {
        const entity = entityOf(state, effect.of)
        if (!entity) return state
        const to = clampStat(state, game, effect.key, effect.to)
        return writeEntity(state, effect.of, { ...entity, stats: { ...entity.stats, [effect.key]: to } })
      }
      const before = state.stats[effect.key] ?? 0
      const to = clampStat(state, game, effect.key, effect.to)
      const after = { ...state, stats: { ...state.stats, [effect.key]: to } }
      return game.rules?.onStat?.(state, after, effect.key, to - before) ?? after
    }
    case 'storylineFlag': {
      const cur = storylineOf(state, effect.id)
      return {
        ...state,
        storylines: {
          ...state.storylines,
          [effect.id]: {
            ...cur,
            flags: { ...cur.flags, [effect.key]: effect.value },
          },
        },
      }
    }
    case 'flag': {
      const entity = effect.of === undefined ? undefined : entityOf(state, effect.of)
      if (effect.of !== undefined && !entity) return state
      const flags = entity ? entity.flags : state.flags
      let value: FlagValue
      if ('add' in effect) {
        const was = flags[effect.key]
        value = (typeof was === 'number' ? was : 0) + effect.add
      } else value = effect.value
      if (entity) return writeEntity(state, effect.of!, { ...entity, flags: { ...flags, [effect.key]: value } })
      return { ...state, flags: { ...state.flags, [effect.key]: value } }
    }
    case 'create': {
      const kind = state.entities?.[effect.of] ?? {}
      const made = (id: string) => writeEntity(state, `${effect.of}:${id}`, newEntity(game, effect.of, effect.entity))
      // A given id is used as it is, unless it is taken, or a whole number that would sort first.
      if (effect.entity.id !== undefined) {
        if (kind[effect.entity.id] || /^\d+$/.test(effect.entity.id)) return state
        // Back after being removed: no longer gone for good.
        const back = made(effect.entity.id)
        const ref = `${effect.of}:${effect.entity.id}`
        return back.removed?.includes(ref) ? { ...back, removed: back.removed.filter((entry) => entry !== ref) } : back
      }
      // The next free number, `#1`, `#2`, never reused. Not a bare number: object keys
      // that look like numbers sort before the rest, and entities keep the order they came.
      let n = state.created?.[effect.of] ?? 0
      do n += 1
      while (kind[`#${n}`])
      return { ...made(`#${n}`), created: { ...state.created, [effect.of]: n } }
    }
    case 'remove': {
      if (!entityOf(state, effect.of)) return state
      const gone = removeEntity(state, effect.of)
      // A declared one stays gone when the save is next loaded.
      const declared = (game.entities ?? []).some((entity) => `${entity.of}:${entity.id}` === effect.of)
      return declared && !(gone.removed ?? []).includes(effect.of) ? { ...gone, removed: [...(gone.removed ?? []), effect.of] } : gone
    }
    case 'each': {
      // Who it runs for is decided before it starts: one created on the way is not visited, one removed is skipped.
      let next = state
      for (const ref of entitiesOf(state, effect.of)) {
        if (!entityOf(next, ref)) continue
        if (effect.where && !holds(next, bindCurrent(effect.where, ref), game)) continue
        next = applyEffects(next, game, buildEffects(next, game, bindCurrent(effect.effects, ref)))
      }
      return next
    }
    case 'scene':
      return { ...state, sceneId: effect.id }
    case 'item': {
      const count = Math.max(0, (state.items[effect.id] ?? 0) + effect.by)
      return { ...state, items: { ...state.items, [effect.id]: count } }
    }
    case 'phase':
      return { ...state, phase: effect.value }
    case 'closeStoryline': {
      const cur = storylineOf(state, effect.id)
      return {
        ...state,
        storylines: {
          ...state.storylines,
          [effect.id]: {
            ...cur,
            closedUntil: state.turn + effect.turns,
          },
        },
      }
    }
    case 'turn': {
      let next = state
      for (let n = 0; n < (effect.by ?? 1); n += 1) next = endTurn(next, game)
      return next
    }
    default:
      return state
  }
}

// Plugins apply effects through their context; this is how.
useApplier((state, game, effects) => applyEffects(state, game, buildEffects(state, game, effects)))
