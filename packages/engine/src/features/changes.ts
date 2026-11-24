/**
 * Changes: the stats the last command moved, for a UI to show as feedback
 * ("+30 coins", "Ava's trust −1"). Content names the stats to track in
 * `changes: { stats }`; none named, nothing is tracked. After every command it
 * compares those stats as everything reads them, the player's and those kept
 * on entities, before and after, and keeps what moved in `state.changes`,
 * shown as `view.changes`. A stat the player can't see is left out.
 *
 * A `tick` that moved nothing keeps the list, so a UI sending ticks while a
 * timer runs doesn't wipe it; any other command replaces it, with nothing if
 * it moved nothing.
 */
import type { Game } from '../game.ts'
import type { EntityRef } from '../entities.ts'
import { entityText, hasEntity, parseRef } from '../entities.ts'
import type { Command, GameState } from '../types.ts'
import { defineFeature, type FeatureContext, type PackMerge } from './feature.ts'
import { formatStat, statOf, statValue, type StatDef } from './stats.ts'

/** A stat the last command moved, with its old and new values and the change in the stat's own format. `state.changes` keeps these. */
export type Change = {
  /** The stat's id. */
  stat: string
  /** The entity the stat is kept on. Left out for the player's stat. */
  of?: EntityRef
  /** The stat's value before the command. */
  from: number
  /** The stat's value after the command. */
  to: number
  /** The amount the stat moved, `to - from`, above 0 when it went up. */
  by: number
  /** The stat's `label`. */
  label: string
  /** The change in the stat's `format`, signed, such as `'+30 coins'` or `'-£5'`. */
  text: string
}

/** A stat change as the player sees it, in `view.changes`. It adds the words that say what moved to a {@link Change}. */
export type ChangeView = Change & {
  /**
   * The words to show after `text`, so the change says what moved. Left out when the stat's format already says it
   * (`+30 coins`).
   *
   * It's the entity's name for an entity's stat (`+4 Ava`), else the stat's `label` when `text` has no words in it
   * (`+1 Charm`, `+20% Mood`).
   */
  name?: string
}

/** The stats the game declares in `changes` for `view.changes` to track, by id. An entity stat's id covers that stat on every entity. */
export type ChangesDef = {
  /** The ids of the stats to track. */
  stats: string[]
}

/** The changes feature's content key, state and view, as types. */
export type ChangesShape = {
  game: {
    /** The stats the engine tracks changes of, from the content and every pack together. Nothing is tracked if left out. */
    changes?: ChangesDef
  }
  pack: {
    /**
     * The pack's tracked stats, by id, such as `{ stats: ['coins', 'trust'] }`. The engine adds every file's and
     * pack's lists together.
     */
    changes?: ChangesDef
  }
  lists: 'changes'
  state: {
    /**
     * The stats the last command moved, in the order the game declares them, the player's first. A `tick` that moved
     * nothing keeps the list from before it.
     */
    changes: Change[]
  }
  view: {
    /** The stats the last command moved that the player can see, the player's first, each with the words that say what moved. */
    changes: ChangeView[]
  }
}

/** The entities with stats kept in either state, as references. */
function keptEntities(before: GameState, after: GameState): Map<EntityRef, Set<string>> {
  const out = new Map<EntityRef, Set<string>>()
  for (const state of [before, after]) {
    for (const [kind, byId] of Object.entries(state.entities ?? {})) {
      for (const [id, record] of Object.entries(byId ?? {})) {
        const keys = Object.keys(record?.stats ?? {})
        if (!keys.length) continue
        const ref = `${kind}:${id}` as EntityRef
        out.set(ref, new Set([...(out.get(ref) ?? []), ...keys]))
      }
    }
  }
  return out
}

/** Returns the tracked stats that moved between two states, leaving out any the player can't see. Empty when the game tracks no stats. */
export function statChanges(before: GameState, after: GameState, game: Game, cx: FeatureContext): Change[] {
  const tracked = new Set(game.changes?.stats ?? [])
  if (!tracked.size) return []
  const out: Change[] = []
  const add = (id: string, of: EntityRef | undefined) => {
    if (!tracked.has(id)) return
    const def = statOf(game, id)
    if (!def || !cx.holds(after, game, def.visible)) return
    const from = statValue(before, game, id, of, cx)
    const to = statValue(after, game, id, of, cx)
    if (from === to || !Number.isFinite(from) || !Number.isFinite(to)) return
    const by = to - from
    out.push({ stat: id, ...(of ? { of } : {}), from, to, by, label: def.label, text: `${by > 0 ? '+' : '-'}${formatStat(def, Math.abs(by))}` })
  }
  for (const stat of game.stats ?? []) if (!stat.of) add(stat.id, undefined)
  for (const [ref, keys] of keptEntities(before, after)) {
    if (!hasEntity(before, game, ref) || !hasEntity(after, game, ref)) continue
    for (const stat of game.stats ?? []) if (stat.of && keys.has(stat.id)) add(stat.id, ref)
  }
  return out
}

/** Whether a stat's format has words in it besides the number, so a change written with it says what it is: `{n} coins` does, `{n}%` and `£{n}` don't. */
function wordy(format: StatDef['format']): boolean {
  const words = typeof format === 'string' ? format : format ? format.other : ''
  return /\p{L}/u.test(words.replaceAll('{n}', ''))
}

/** A change as the view shows it, with the words that say what moved. */
function changeView(state: GameState, game: Game, change: Change, cx: FeatureContext): ChangeView {
  const name = change.of
    ? cx.fillTokens(state, game, entityText(state, game, change.of, 'name') ?? parseRef(change.of)?.id ?? change.of)
    : wordy(statOf(game, change.stat)?.format)
      ? undefined
      : change.label
  return name === undefined ? change : { ...change, name }
}

/** The tracked stats of every file and pack, together, in the order first named. */
function merge(): PackMerge<ChangesShape['game'], ChangesShape['pack']> {
  const stats = new Set<string>()
  return {
    base: (game) => {
      for (const id of game.changes?.stats ?? []) stats.add(id)
    },
    add: (pack) => {
      for (const id of pack.changes?.stats ?? []) stats.add(id)
    },
    finish: (game) => {
      if (stats.size) game.changes = { stats: [...stats] }
    },
    from: () => undefined,
  }
}

/** The changes feature, which records the tracked stats each command moved. */
export const changes = defineFeature<ChangesShape>({
  name: 'changes',
  requires: ['stats', 'entities'],
  pack: { merge },
  // Every file's tracked stats are added together.
  content: { changes: { declares: null, words: null } },
  lists: ['changes'],
  check: (game, tools) => {
    const stats = game.changes?.stats
    if (game.changes !== undefined && !Array.isArray(stats)) {
      tools.problem({ list: 'changes' }, 'changes', 'stats must be a list of stat ids')
      return
    }
    for (const id of stats ?? []) if (!statOf(game, id)) tools.problem({ list: 'changes' }, 'changes', `stats names "${id}", which is no stat`)
  },
  state: {
    changes: { start: () => [], load: () => [], keeps: (value) => Array.isArray(value) },
  },
  afterCommand: {
    at: 'afterPlugins',
    run: (before, after, game, cx, command: Command) => {
      const moved = statChanges(before, after, game, cx)
      if (!moved.length && command.type === 'tick') return after.changes === before.changes ? after : { ...after, changes: before.changes }
      if (!moved.length && !after.changes.length) return after
      return { ...after, changes: moved }
    },
  },
  view: (state, game, _shown, cx) => ({ changes: state.changes.map((change) => changeView(state, game, change, cx)) }),
})
