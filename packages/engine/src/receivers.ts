/**
 * Receivers: the plugins that keep things, which the `receive` and `release` effects and the `owned` condition ask
 * (ADR 0016). The core keeps no state of its own here and names no plugin. It asks the game's receivers in order: the
 * game's `receivers` list, else the order of its `plugins`. Without one, `receive` and `release` do nothing and
 * `owned` is 0, so a game that keeps things in kv keys never meets them.
 */
import type { Game } from './game.ts'
import type { EntityRef } from './entities.ts'
import { pluginContext, type Plugin, type Receiver } from './plugin.ts'
import type { GameState } from './types.ts'

/** A plugin with a receiver. */
type Receiving = Plugin & { receiver: Receiver }

const orderCache = new WeakMap<Game, Receiving[]>()

/** Returns the game's plugins that keep things, in the order `receive` asks them. */
export function receiversOf(game: Game | undefined): readonly Receiving[] {
  if (!game) return []
  let found = orderCache.get(game)
  if (!found) {
    const all = (game.plugins ?? []).filter((plugin): plugin is Receiving => plugin.receiver !== undefined)
    const listed = (game.receivers ?? []).map((id) => all.find((plugin) => plugin.id === id)).filter((plugin): plugin is Receiving => plugin !== undefined)
    found = [...listed, ...all.filter((plugin) => !listed.includes(plugin))]
    orderCache.set(game, found)
  }
  return found
}

/** The receivers a call asks: the one `via` names, or all of them. */
function asked(game: Game, via: string | undefined): readonly Receiving[] {
  const all = receiversOf(game)
  return via === undefined ? all : all.filter((plugin) => plugin.id === via)
}

/**
 * Returns the state with `count` of a thing given to `to`, by the first receiver that claims it.
 *
 * The one `via` names takes it whether it claims it or not. The state comes back unchanged when none takes it.
 */
export function receiveThing(state: GameState, game: Game, ref: EntityRef, count: number, to?: string, via?: string): GameState {
  if (!(count > 0)) return state
  for (const plugin of asked(game, via)) {
    const context = pluginContext(plugin, state, game)
    if (via === undefined && plugin.receiver.claims && !plugin.receiver.claims(state, ref, context)) continue
    return plugin.receiver.receive(state, ref, Math.floor(count), to, context)
  }
  return state
}

/** Returns how many of a thing `of` has, added up across the receivers, or in the one `via` names. */
export function ownedCount(state: GameState, game: Game, ref: EntityRef, of?: string, via?: string): number {
  let total = 0
  for (const plugin of asked(game, via)) total += Math.max(0, plugin.receiver.owned(state, ref, of, pluginContext(plugin, state, game)))
  return total
}

/** Returns the state with up to `count` of a thing taken from `from`, asking each receiver in order until it's done. */
export function releaseThing(state: GameState, game: Game, ref: EntityRef, count: number, from?: string, via?: string): GameState {
  let left = Math.floor(count)
  let next = state
  for (const plugin of asked(game, via)) {
    if (!(left > 0)) break
    const here = Math.min(left, plugin.receiver.owned(next, ref, from, pluginContext(plugin, next, game)))
    if (!(here > 0)) continue
    next = plugin.receiver.release(next, ref, here, from, pluginContext(plugin, next, game))
    left -= here
  }
  return next
}
