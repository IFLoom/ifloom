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
import { hasEntity } from '../entities.ts'
import type { Command, GameState } from '../types.ts'
import { defineFeature, type FeatureContext, type PackMerge } from './feature.ts'
import { formatStat, statOf, statValue } from './stats.ts'

/** One stat a command moved: whose, from what to what, and the change written in the stat's own words. */
export type Change = {
  /** The stat's id. */
  stat: string
  /** The entity whose stat it is; left out for the player's. */
  of?: EntityRef
  /** What it read before the command. */
  from: number
  /** What it reads now. */
  to: number
  /** How far it moved: `to - from`, above 0 for up. */
  by: number
  /** The stat's `label`. */
  label: string
  /** The change written with the stat's `format`, signed: `'+30 coins'`, `'-£5'`. */
  text: string
}

/** Which stats `view.changes` tracks: their ids. An entity stat's id covers that stat on every entity. */
export type ChangesDef = { stats: string[] }

/** What the changes feature adds, as types. */
export type ChangesShape = {
  game: {
    /** The stats whose changes are tracked, from content and every pack together. Left out, nothing is tracked. */
    changes?: ChangesDef
  }
  pack: {
    /**
     * The stats whose changes `view.changes` lists, by id: `{ stats: ['coins', 'trust'] }`.
     * Every file's and pack's lists are added together. With none, nothing is tracked.
     */
    changes?: ChangesDef
  }
  lists: 'changes'
  state: {
    /** The stats the last command moved, in the order the game declares them, the player's first. A tick that moved nothing keeps the list before it. */
    changes: Change[]
  }
  view: {
    /** The stats the last command moved that the player can see, the player's first. See `Change`. */
    changes: Change[]
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

/** The stats that moved between two states, as the player can see them. */
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
  view: (state) => ({ changes: state.changes }),
})
