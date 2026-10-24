/**
 * @ifloom/plugin-achievements: things the player has done that the game
 * wants to mark. Each is earned the first time its condition holds, checked
 * after every command, or by an effect. Secret ones stay hidden until they're
 * earned, and one with a target shows how close the player is.
 *
 * What a save has earned is in the plugin's state. Everything earned in any
 * save is also kept in the player's profile, which outlives saves, through
 * its `profile` provider, and the view, built by a runner with a profile, shows
 * both.
 */
import {
  customValue,
  definePlugin,
  holds,
  notify,
  say,
  statValue,
  type Condition,
  type DefinedPlugin,
  type EffectRef,
  type Formula,
  type Game,
  type GameState,
  type PluginProblem,
  type Reference,
  type ValueRef,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations } from './upgrade.ts'

/**
 * Where a progress count comes from: a formula over the player's stats (a
 * stat's id is the simplest), one stat of an entity, a key in the kv store, or a custom
 * value by name (the game's or a plugin's, such as `quests/updates`).
 */
export type ProgressValue = Formula | { stat: string; of?: string } | { kv: string } | ValueRef

/** How far towards an achievement the player is: the value, out of `target`. */
export type ProgressDef = { value: ProgressValue; target: number }

/** An achievement, as content declares it. */
export type AchievementDef = {
  id: string
  title: string
  /** What it's for, for the list. */
  description?: string
  /** A picture for it, for a UI to show. */
  image?: string
  /** Shown as `???`, with no description or progress, until it's earned. */
  secret?: boolean
  /**
   * Earned the first time this holds, checked after every command. Leave it
   * out to earn it when `progress` reaches its target, or only with the
   * `achievements/grant` effect.
   */
  when?: Condition
  /** A count towards it, such as 4 of 10. Without `when`, reaching the target earns it. */
  progress?: ProgressDef
}

/** What the plugin keeps in a save. */
export type AchievementsState = {
  /** Achievements earned in this save, with the turn each was earned. */
  earned: Record<string, number>
}

/** What the plugin keeps in the player's profile, under its id: every achievement earned in any save, in the order they were first earned. */
export type AchievementsProfile = { earned: string[] }

/** An achievement as the UI shows it. */
export type AchievementEntry = {
  id: string
  /** Its title, or `???` while it's secret and not earned. */
  title: string
  /** Its description, or `''` while it's secret and not earned. */
  description: string
  image: string | null
  secret: boolean
  earned: boolean
  /** The turn this save earned it, or null. Null too for one earned only in another save. */
  earnedOn: number | null
  /** How far towards it, or null if it has no progress or is a secret not yet earned. Earned, it reads as full. */
  progress: { value: number; target: number } | null
}

export type AchievementsView = {
  /** Every achievement, in the order the game declares them. */
  achievements: AchievementEntry[]
  /** How many are earned. */
  earned: number
  total: number
}

const ID = 'achievements'

function emptyState(): AchievementsState {
  return { earned: {} }
}

/** The game's achievements: `data.achievements.achievements`, from its packs. */
export function achievementDefs(game: Game): AchievementDef[] {
  return (game.data?.[ID]?.achievements ?? []) as AchievementDef[]
}

function evaluate(formula: Formula, state: GameState, game: Game): number {
  if (typeof formula === 'number') return formula
  if (typeof formula === 'string') return statValue(state, game, formula)
  const all = (list: Formula[]) => list.map((entry) => evaluate(entry, state, game))
  if ('sum' in formula) return all(formula.sum).reduce((a, b) => a + b, 0)
  if ('product' in formula) return all(formula.product).reduce((a, b) => a * b, 1)
  if ('min' in formula && Array.isArray(formula.min)) return formula.min.length ? Math.min(...all(formula.min)) : 0
  if ('max' in formula && Array.isArray(formula.max)) return formula.max.length ? Math.max(...all(formula.max)) : 0
  if ('scale' in formula) return evaluate(formula.scale, state, game) * formula.by
  if ('clamp' in formula) return Math.max(formula.min ?? -Infinity, Math.min(formula.max ?? Infinity, evaluate(formula.clamp, state, game)))
  return 0
}

/** A progress value read now. Anything that isn't a number reads as 0. */
export function progressValue(value: ProgressValue, state: GameState, game: Game): number {
  let out: unknown
  if (typeof value === 'object' && 'stat' in value) out = statValue(state, game, value.stat, value.of)
  else if (typeof value === 'object' && 'kv' in value) out = state.kv[value.kv]
  else if (typeof value === 'object' && 'value' in value) out = customValue(game, value.value)?.(state, value.with ?? {})
  else out = evaluate(value, state, game)
  return typeof out === 'number' && Number.isFinite(out) ? out : 0
}

/** Has this achievement's condition, or its progress, been met in this state? */
function met(def: AchievementDef, state: GameState, game: Game): boolean {
  if (def.when) return holds(state, def.when, game)
  if (def.progress) return progressValue(def.progress.value, state, game) >= def.progress.target
  return false
}

/** The state with these achievements recorded as earned now, and a notice for each. */
function earn(
  state: GameState,
  ids: readonly string[],
  game: Game,
  set: (next: AchievementsState, on: GameState) => GameState,
  record: AchievementsState,
): GameState {
  if (!ids.length) return state
  const earned = { ...record.earned }
  let next = state
  for (const id of ids) {
    earned[id] = state.turn
    const title = achievementDefs(game).find((def) => def.id === id)?.title ?? id
    next = notify(next, { id: `achievement.${id}`, title: say(game, 'achievements/earned', { title }), tag: 'achievements' })
  }
  return set({ earned }, next)
}

function entry(def: AchievementDef, earnedOn: number | null, earned: boolean, state: GameState, game: Game): AchievementEntry {
  const hidden = Boolean(def.secret) && !earned
  let progress: AchievementEntry['progress'] = null
  if (def.progress && !hidden) {
    const target = def.progress.target
    progress = { value: earned ? target : Math.max(0, Math.min(target, progressValue(def.progress.value, state, game))), target }
  }
  return {
    id: def.id,
    title: hidden ? say(game, 'achievements/secret') : def.title,
    description: hidden ? '' : (def.description ?? ''),
    image: hidden ? null : (def.image ?? null),
    secret: Boolean(def.secret),
    earned,
    earnedOn,
    progress,
  }
}

/**
 * Everything the UI needs to draw the list of achievements: what this save's
 * record has earned, and what the profile has earned in any save, when it's
 * given (`stored`, what the profile's `achievements` namespace holds).
 */
export function achievementsView(record: AchievementsState, state: GameState, game: Game, stored?: unknown): AchievementsView {
  const ever = new Set(profileIds(stored))
  const achievements = achievementDefs(game).map((def) => {
    const on = record.earned[def.id]
    return entry(def, on ?? null, on !== undefined || ever.has(def.id), state, game)
  })
  return { achievements, earned: achievements.filter((item) => item.earned).length, total: achievements.length }
}

function profileIds(stored: unknown): string[] {
  const earned = (stored as AchievementsProfile | undefined)?.earned
  return Array.isArray(earned) ? earned.filter((id): id is string => typeof id === 'string') : []
}

/**
 * The plugin. Add it to the game's `plugins`, and put achievements in a
 * pack's `data.achievements.achievements`.
 */
export function achievements(): DefinedPlugin<AchievementsState, AchievementsView> {
  return definePlugin<AchievementsState, AchievementsView>({
    id: ID,
    version: 1,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    start: emptyState,
    strings: { earned: 'Achievement: {title}', secret: '???' },
    conditions: {
      /** `{ 'achievements/earned': { achievement } }`: earned in this save. */
      earned: (_state, args, { slice }) => slice.earned[String(args.achievement ?? '')] !== undefined,
    },
    effects: {
      /** `{ 'achievements/grant': { achievement } }`: earn it now, if it isn't earned. */
      grant: (state, args, { slice, set, game }) => {
        const id = String(args.achievement ?? '')
        if (slice.earned[id] !== undefined || !achievementDefs(game).some((def) => def.id === id)) return state
        return earn(state, [id], game, set, slice)
      },
    },
    values: {
      /** <code v-pre>{{v:achievements/earned}}</code>: how many this save has earned. */
      earned: (_state, _args, { slice }) => Object.keys(slice.earned).length,
    },
    onCommand: (_before, after, { slice, set, game }) => {
      const ids = achievementDefs(game)
        .filter((def) => slice.earned[def.id] === undefined && met(def, after, game))
        .map((def) => def.id)
      return earn(after, ids, game, set, slice)
    },
    profile: (_state, _previous, stored, { slice }) => {
      const known = profileIds(stored)
      const added = Object.keys(slice.earned)
        .sort((a, b) => slice.earned[a] - slice.earned[b])
        .filter((id) => !known.includes(id))
      return added.length ? ({ earned: [...known, ...added] } satisfies AchievementsProfile) : undefined
    },
    view: (state, { slice, game, profile }) => achievementsView(slice, state, game, profile),
    references: {
      calls: (_kind, _name, args) =>
        args.achievement === undefined ? [] : [{ entry: String(args.achievement), plugin: ID, list: 'achievements', noun: 'achievement' }],
      content: (game) =>
        achievementDefs(game).map((def) => ({
          list: 'achievements',
          id: def.id,
          refs: [
            { within: 'when', refs: [{ when: def.when }] },
            ...(def.progress ? [{ within: 'progress', refs: progressRefs(def.progress.value) }] : []),
            ...(def.image ? [{ picture: def.image }] : []),
          ],
        })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const def of achievementDefs(game)) {
        if (def.progress && !(def.progress.target > 0)) problems.push({ list: 'achievements', id: def.id, what: 'progress target must be more than 0' })
      }
      return problems
    },
  })
}

/** What a progress value names, for the content checker. */
function progressRefs(value: ProgressValue): Reference[] {
  if (typeof value === 'number') return []
  if (typeof value === 'string') return [{ stat: value }]
  if ('stat' in value) return [{ stat: value.stat, ...(value.of !== undefined ? { of: value.of } : {}) }]
  if ('kv' in value) return []
  if ('value' in value) return [{ value: value.value }]
  const parts: Formula[] =
    'sum' in value
      ? value.sum
      : 'product' in value
        ? value.product
        : 'min' in value && Array.isArray(value.min)
          ? value.min
          : 'max' in value && Array.isArray(value.max)
            ? value.max
            : 'scale' in value
              ? [value.scale]
              : 'clamp' in value
                ? [value.clamp]
                : []
  return parts.flatMap(progressRefs)
}

/** A condition: the achievement is earned in this save. */
export const achievementEarned = (id: string): Condition => ({ [`${ID}/earned`]: { achievement: id } })
/** An effect: earn the achievement now. */
export const grantAchievement = (id: string): EffectRef => ({ [`${ID}/grant`]: { achievement: id } })
