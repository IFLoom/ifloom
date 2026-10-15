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
import { storylineOf } from './storylines.ts'
import type { Command, Effect, FlagValue, GameState } from './types.ts'
import { clampStat, statDef, statLevel } from './stats.ts'
import { bindCurrent, entitiesOf, entityOf, newEntity, removeEntity, writeEntity } from './entities.ts'
import { holds } from './condition.ts'
import { weighted } from './random.ts'
import { collect, discard } from './collections.ts'
import { dismiss, notify } from './notices.ts'
import { fireTriggers } from './triggers.ts'
import { inputById, inputValue } from './inputs.ts'
import { noteStarted, sceneShown, setChannel, soundCue } from './audio.ts'
import { emptyMedia, hasPools, notingPicks } from './media.ts'
import { view } from './view.ts'
import { pluginCommand, pluginEffect, runAfter, runHooks, useApplier } from './plugin.ts'
import { startingState } from './intake.ts'

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
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
  // A new showing: its sounds get keys of their own.
  const shown = sceneShown(after)
  const seen = { ...shown.seen, [id]: (shown.seen[id] ?? 0) + 1 }
  if (shown.seenOn?.[id] !== undefined) return { ...shown, seen }
  return { ...shown, seen, seenOn: { ...shown.seenOn, [id]: shown.turn } }
}

/**
 * Record the pool picks the screen now shows that the save doesn't hold yet:
 * the open scene's, the place's, anything a plugin's view draws. The view only
 * reads `state.media.picks`, so it stays pure; this is where they are written.
 * Only a game with pools pays for it.
 */
function notePicks(state: GameState, game: Game): GameState {
  if (!hasPools(game)) return state
  const picks = notingPicks(() => view(state, game))
  if (!Object.keys(picks).length) return state
  const media = state.media ?? emptyMedia()
  return { ...state, media: { ...media, picks: { ...media.picks, ...picks } } }
}

/**
 * A notice for each of the player's stats a command took up a level, when the
 * stat's `levels` has a `notice`. Tagged `level`, one per stat: a second
 * level-up replaces the first while it is unseen.
 */
function levelUps(before: GameState, after: GameState, game: Game): GameState {
  let next = after
  for (const stat of game.stats ?? []) {
    if (stat.of || !stat.levels?.notice) continue
    const was = statLevel(before, game, stat.id)?.level ?? 0
    const now = statLevel(after, game, stat.id)?.level ?? 0
    if (now <= was) continue
    const title = stat.levels.notice.replaceAll('{label}', stat.label).replaceAll('{level}', String(now))
    next = notify(next, { id: `level.${stat.id}`, title, tag: 'level' })
  }
  return next
}

/**
 * Open a scene drawn from a named set: one whose `drawnFrom` names it and
 * whose `when` holds, by weight. The draw is seeded by the save, the turn and
 * how many draws the set has had, which a variable `storylet:<name>` counts.
 */
function drawStorylet(state: GameState, game: Game, from: string, otherwise: string | undefined): GameState {
  const key = `storylet:${from}`
  const used = typeof state.flags[key] === 'number' ? (state.flags[key] as number) : 0
  const eligible = game.scenes.filter((scene) => scene.drawnFrom?.includes(from) && holds(state, scene.when, game))
  const drawn = weighted(eligible, (scene) => scene.weight, 'storylet', from, state.seed, state.turn, used)
  const counted = { ...state, flags: { ...state.flags, [key]: used + 1 } }
  if (drawn) return { ...counted, sceneId: drawn.id }
  return otherwise ? { ...counted, sceneId: otherwise } : counted
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
  // Every state comes in through `startingState` or `loadState`, so it is
  // already in this engine's and this game's shape.
  const current = state
  try {
    const ran = run(current, game, command)
    const next = witnessed(current, fireTriggers(ran, game, (state, effects) => applyEffects(state, game, effects)))
    return { state: notePicks(noteStarted(levelUps(current, runAfter(game, current, next), game), game), game), ok: true }
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
      // A derived stat is worked out, never written: the loader reports the effect.
      if (statDef(game, effect.key)?.derive !== undefined) return state
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
      if (statDef(game, effect.key)?.derive !== undefined) return state
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
      if ('from' in effect) return drawStorylet(state, game, effect.from, effect.otherwise)
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
    case 'audio':
      return setChannel(state, effect.channel, effect.track)
    case 'sound':
      return soundCue(state, effect.track)
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
