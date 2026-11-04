/**
 * Changes: the stats the last command moved, for a UI to show as feedback
 * ("+30 coins", "Ava's trust −1"). After every command it compares the stats
 * as everything reads them, the player's and those kept on entities, before
 * and after, and keeps what moved in `state.changes`, shown as
 * `view.changes`. A stat the player can't see is left out.
 *
 * A `tick` that moved nothing keeps the list, so a UI sending ticks while a
 * timer runs doesn't wipe it; any other command replaces it, with nothing if
 * it moved nothing.
 */
import type { Game } from '../game.ts'
import type { EntityRef } from '../entities.ts'
import { hasEntity } from '../entities.ts'
import type { Command, GameState } from '../types.ts'
import { defineFeature, type FeatureContext } from './feature.ts'
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

/** What the changes feature adds, as types. */
export type ChangesShape = {
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
  const out: Change[] = []
  const add = (id: string, of: EntityRef | undefined) => {
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

export const changes = defineFeature<ChangesShape>({
  name: 'changes',
  requires: ['stats', 'entities'],
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
