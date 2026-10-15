import type { Game } from './game.ts'
import { pluginCondition, pluginEffect, pluginValue } from './plugin.ts'
import type { Effect, GameState } from './types.ts'

/**
 * The game's own code, by name.
 *
 * Content is data — conditions and effects a tool can read, a mod can ship and
 * the loader can check. The few things that are genuinely computed live here
 * instead, as named functions on the game, and content calls them by name:
 * `{ custom: 'canAffordRent' }` as a condition, `{ custom: 'payRent', with: {} }`
 * as an effect, `{{v:rentDue}}` in prose, `max: { value: 'energyCeiling' }` on
 * a stat, `panelData: 'stallPrices'` on a scene.
 *
 * Each game owns its own: two games in one page, or a test next to a game,
 * never see each other's functions.
 *
 * A name with a `/` in it belongs to a plugin — `quests/done` is the `done`
 * condition of the plugin `quests` — and is looked up there instead.
 */
export type CustomCondition = (state: GameState, args: Record<string, unknown>) => boolean
/**
 * Works out effects from the state. It can return anything content can write,
 * a plugin's `{ custom: 'quests/start' }` or another of the game's own included.
 */
export type CustomEffect = (state: GameState, args: Record<string, unknown>) => EffectRef[]
export type CustomValue = (state: GameState) => string | number
export type CustomPanel = (state: GameState) => unknown

export type Custom = {
  conditions?: Record<string, CustomCondition>
  effects?: Record<string, CustomEffect>
  values?: Record<string, CustomValue>
  panels?: Record<string, CustomPanel>
}

/**
 * A plugin's condition or effect in short: its full name as the only key,
 * what it is asked as the value. `{ 'quests/done': { quest: 'bakery' } }` is
 * `{ custom: 'quests/done', with: { quest: 'bakery' } }`. A value that is not
 * an object is passed as `with: { value }`: `{ 'calendar/period': ['morning'] }`
 * asks with `{ value: ['morning'] }`, and `true` asks with nothing.
 */
export type PluginCall = { [name: `${string}/${string}`]: unknown }

/** A call by name, in either form, as the engine reads it. */
export type CustomCall = { custom: string; with?: Record<string, unknown> }

/** An effect as content writes it: a plain effect, or a custom one by name, in either form. */
export type EffectRef = Effect | CustomCall | PluginCall

/**
 * The call a condition or effect makes, if it is one: `{ custom }` as written,
 * or the short form read into it. Anything else — a built-in — is undefined.
 */
export function customCall(entry: object): CustomCall | undefined {
  if ('custom' in entry && typeof entry.custom === 'string') return entry as CustomCall
  if ('kind' in entry) return undefined
  const keys = Object.keys(entry)
  if (keys.length !== 1 || !keys[0].includes('/')) return undefined
  const value = (entry as Record<string, unknown>)[keys[0]]
  if (value === true || value === undefined) return { custom: keys[0] }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return { custom: keys[0], with: value as Record<string, unknown> }
  }
  return { custom: keys[0], with: { value } }
}

export function customCondition(game: Game | undefined, name: string): CustomCondition | undefined {
  const fromPlugin = pluginCondition(game, name)
  if (fromPlugin) return fromPlugin
  return game?.custom?.conditions?.[name]
}

export function customEffect(game: Game | undefined, name: string): CustomEffect | undefined {
  return game?.custom?.effects?.[name]
}

export function customValue(game: Game | undefined, name: string): CustomValue | undefined {
  const fromPlugin = pluginValue(game, name)
  if (fromPlugin) return fromPlugin
  return game?.custom?.values?.[name]
}

/** Does the game or one of its plugins have an effect by this name? */
export function hasCustomEffect(game: Game | undefined, name: string): boolean {
  return Boolean(pluginEffect(game, name) ?? customEffect(game, name))
}

export function customPanel(game: Game | undefined, name: string): CustomPanel | undefined {
  return game?.custom?.panels?.[name]
}


/**
 * Flatten an effect list into the plain effects the reducer takes. A game's
 * custom effect is worked out here, from the state before any of the list
 * applies; a plugin's is passed on as `{ kind: 'custom' }` and runs in its turn,
 * on the state the effects before it left. A custom effect nobody has
 * contributes nothing; the content checker (`checkGame`) reports it by name.
 */
export function buildEffects(state: GameState, game: Game, refs: readonly EffectRef[], depth = 0): Effect[] {
  const out: Effect[] = []
  for (const entry of refs) {
    const ref = customCall(entry)
    if (!ref) {
      out.push(entry as Effect)
      continue
    }
    if (pluginEffect(game, ref.custom)) {
      out.push({ kind: 'custom', name: ref.custom, with: ref.with })
      continue
    }
    const fn = customEffect(game, ref.custom)
    // A custom effect can name others; ten deep is a loop, not a design.
    if (fn && depth < 10) out.push(...buildEffects(state, game, fn(state, ref.with ?? {}), depth + 1))
  }
  return out
}
