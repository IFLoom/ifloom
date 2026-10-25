/**
 * How content written for an older version of this plugin is carried
 * forward. The versions follow the engine's schema, as the other
 * first-party plugins' do: each step is keyed by the schema it upgrades from.
 */
import type { ContentStep } from '@ifloom/engine'

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 21

export const contentMigrations: Record<number, ContentStep> = {
  // 20 → 21: effects are told apart by their key, as conditions are: `{ stat: 'coins', by: -2 }`, never
  // `{ kind: 'stat', … }`. This plugin's content holds effects, so they are keyed here as well as by the engine.
  20: (pack, tools) => tools.effects(pack),
}
