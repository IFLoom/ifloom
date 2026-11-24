/**
 * How content written for an older version of this plugin is carried
 * forward. The versions follow the engine's schema, as the other
 * first-party plugins' do: each step is keyed by the schema it upgrades from.
 */
import type { ContentStep } from '@ifloom/engine/plugin'

/** The schema of the content this plugin reads, numbered by the engine's schema. */
export const CONTENT_VERSION = 26

/** The steps that carry this plugin's content forward, each keyed by the schema it upgrades from. */
export const contentMigrations: Record<number, ContentStep> = {
  // 25 → 26: one word each: an unlock's `label` is its `name`, and the words table's keys follow.
  25: (pack, tools) =>
    tools.wordKeys(
      tools.entries(pack, 'unlocks/unlocks', (unlock) => {
        if (!('label' in unlock) || 'name' in unlock) return unlock
        const { label, ...rest } = unlock
        return { ...rest, name: label }
      }),
      (key) => (key.startsWith('unlocks/unlocks.') && key.endsWith('.label') ? `${key.slice(0, -'.label'.length)}.name` : key),
    ),
}
