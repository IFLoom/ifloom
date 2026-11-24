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
import { amountOf, artSrc, holds, notify, stringOf, type Amount, type Condition, type EffectRef, type Game, type GameState } from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  type ConditionsOf,
  type DefinedPlugin,
  type EffectsOf,
  type PluginProblem,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations } from './upgrade.ts'

/**
 * How far towards an achievement the player is: the value, out of `target`.
 * The value is an `Amount`, such as a stat's id, a kv key (`{ kv: 'coffees' }`)
 * or a value by name (`{ value: 'quests/updates' }`).
 */
export type ProgressDef = { value: Amount; target: number }

/** An achievement, as content declares it. */
export type AchievementDef = {
  id: string
  /** What the player reads: "First loaf". */
  name: string
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
  /** Its name, or `???` while it's secret and not earned. */
  name: string
  /** Its description, or `''` while it's secret and not earned. */
  description: string
  /** Its picture's path, through `artSrc`; null with none, or while it's secret and not earned. */
  image: string | null
  /** Hidden until earned: its name, description and picture read `???`, `''` and null until then. */
  secret: boolean
  /** Earned in this save, or in any save the profile remembers. */
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
  /** How many the game declares, secret ones included. */
  total: number
}

const ID = 'achievements'

/** The plugin's content: `data.achievements.achievements`, with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, { achievements: list<AchievementDef>({ noun: 'achievement', words: { name: true, description: true } }) })

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** Earned in this save. */
    earned: { achievement: arg.entry(DATA.achievements) },
  },
  effects: {
    /** Earn it now, if it isn't earned. */
    grant: { achievement: arg.entry(DATA.achievements) },
  },
})

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface ViewRegistry {
    achievements: AchievementsView
  }
}

function emptyState(): AchievementsState {
  return { earned: {} }
}

/** The game's achievements: `data.achievements.achievements`, from its packs. */
export function achievementsOf(game: Game): AchievementDef[] {
  return DATA.achievements.all(game)
}

/** Has this achievement's condition, or its progress, been met in this state? */
function met(def: AchievementDef, state: GameState, game: Game): boolean {
  if (def.when) return holds(state, game, def.when)
  if (def.progress) return amountOf(state, game, def.progress.value) >= def.progress.target
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
    const title = DATA.achievements.get(game, id)?.name ?? id
    next = notify(next, { id: `achievement.${id}`, title: stringOf(game, 'achievements/earned', { title }), tag: 'achievements' })
  }
  return set({ earned }, next)
}

function entry(def: AchievementDef, earnedOn: number | null, earned: boolean, state: GameState, game: Game): AchievementEntry {
  const hidden = Boolean(def.secret) && !earned
  let progress: AchievementEntry['progress'] = null
  if (def.progress && !hidden) {
    const target = def.progress.target
    progress = { value: earned ? target : Math.max(0, Math.min(target, amountOf(state, game, def.progress.value))), target }
  }
  return {
    id: def.id,
    name: hidden ? stringOf(game, 'achievements/secret') : def.name,
    description: hidden ? '' : (def.description ?? ''),
    image: hidden || def.image === undefined ? null : artSrc(def.image),
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
function achievementsView(record: AchievementsState, state: GameState, game: Game, stored?: unknown): AchievementsView {
  const ever = new Set(profileIds(stored))
  const achievements = achievementsOf(game).map((def) => {
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
function achievementsPlugin(): DefinedPlugin<AchievementsState, AchievementsView> {
  return definePlugin<AchievementsState, AchievementsView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    start: emptyState,
    strings: { earned: 'Achievement: {title}', secret: '???' },
    conditions: {
      /** `{ 'achievements/earned': { achievement } }`: earned in this save. */
      earned: (_state, { achievement }, { slice }) => slice.earned[achievement] !== undefined,
    },
    effects: {
      /** `{ 'achievements/grant': { achievement } }`: earn it now, if it isn't earned. */
      grant: (state, { achievement: id }, { slice, set, game }) => {
        if (slice.earned[id] !== undefined || !DATA.achievements.get(game, id)) return state
        return earn(state, [id], game, set, slice)
      },
    },
    values: {
      /** <code v-pre>{{achievements/earned}}</code>: how many this save has earned. */
      earned: (_state, _args, { slice }) => Object.keys(slice.earned).length,
    },
    onCommand: (_before, after, { slice, set, game }) => {
      const ids = achievementsOf(game)
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
      content: (game) =>
        DATA.achievements.content(game, (def) => [
          { within: 'when', refs: [{ when: def.when }] },
          ...(def.progress ? [{ within: 'progress', refs: [{ amount: def.progress.value }] }] : []),
          ...(def.image ? [{ picture: def.image }] : []),
        ]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const def of achievementsOf(game)) {
        if (def.progress && !(def.progress.target > 0)) problems.push(DATA.achievements.problem(def.id, 'progress target must be more than 0'))
      }
      return problems
    },
  })
}

/** A condition: the achievement is earned in this save. */
const achievementEarned = (id: string): Condition => CALLS.conditions.earned({ achievement: id })
/** An effect: earn the achievement now. */
const grantAchievement = (id: string): EffectRef => CALLS.effects.grant({ achievement: id })

/**
 * The plugin, with its helpers on it: `achievements()` makes the plugin for the
 * game's `plugins`, and content is written with `achievements.earned('first-loaf')`.
 */
export const achievements = Object.assign(achievementsPlugin, { earned: achievementEarned, grant: grantAchievement })
