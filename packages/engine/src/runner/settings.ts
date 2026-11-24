/**
 * The player's settings as a runner keeps them: each one's value now, from
 * the game in play or the profile, and changing one. What the settings are
 * and how each changes is the settings feature's, through its runner hook;
 * this follows the profile's namespace for them and keeps the values for the
 * snapshot. Internal; `createRunner` composes it.
 */
import type { Game } from '../game.ts'
import { runnerHooks } from '../features/registry.ts'
import type { PlayerSettings } from '../features/feature.ts'
import { fail, ok, type Result } from '../result.ts'
import type { Command, GameState, KvValue } from '../types.ts'
import type { ProfileKeeper } from './profile.ts'

export type SettingsKeeper = {
  /** Every setting the game declares, by id, with its value in `state`: the same object until a value changes. */
  values(state: GameState): Readonly<Record<string, KvValue>>
  /** The profile's settings as last read or written: the play settings a new game starts with. Undefined without a profile, or before it's read. */
  stored(): Record<string, unknown> | undefined
  /** Change a setting: the command to run when the game in play keeps it, else the value written to the profile, or why it was refused. */
  change(id: string, to: KvValue): { command: Command } | Result<KvValue>
}

/** No settings at all, for a game whose features keep none. */
const NO_SETTINGS: PlayerSettings = {
  namespace: 'core:settings',
  values: () => ({}),
  fromStored: () => ({}),
  change: () => ({ refused: 'No settings.' }),
}

/** `changed` is told when a write to the profile changes what a setting reads. */
export function settingsKeeper(game: Game, profile: ProfileKeeper, changed: () => void): SettingsKeeper {
  const seam = runnerHooks.find((hooks) => hooks.settings)?.settings ?? NO_SETTINGS
  let stored: Record<string, unknown> | undefined
  let built: { state: GameState['settings']; stored: typeof stored; value: Readonly<Record<string, KvValue>> } | null = null
  const fromStored = (from: typeof stored) => JSON.stringify(seam.fromStored(game, from))

  /** The profile's settings were read or written. Listeners are told if a setting now reads differently. */
  function heard(value: unknown): void {
    const next = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
    const before = fromStored(stored)
    stored = next
    if (fromStored(next) !== before) changed()
  }

  profile.follow(seam.namespace, heard)

  return {
    values(state) {
      if (built && built.state === state.settings && built.stored === stored) return built.value
      built = { state: state.settings, stored, value: Object.freeze(seam.values(game, state, stored)) }
      return built.value
    },
    stored: () => stored,
    change(id, to) {
      const change = seam.change(game, id, to, profile.profile !== undefined)
      if ('refused' in change) return fail(change.refused)
      if ('command' in change) return change
      // Shown at once; the profile catches up in order.
      heard({ ...stored, [id]: change.stored })
      profile.remember((store) => store.update<Record<string, unknown>>(seam.namespace, (now) => ({ ...now, [id]: change.stored })))
      return ok(change.stored)
    },
  }
}
