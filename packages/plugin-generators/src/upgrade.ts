/**
 * How content written for an older version of this plugin is carried
 * forward. The versions follow the engine's schema, as the other
 * first-party plugins' do: each step is keyed by the schema it upgrades from.
 */
import type { ContentStep } from '@ifloom/engine'

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 26

export const contentMigrations: Record<number, ContentStep> = {
  // 25 → 26: one word each: a thing's line is its `description`, so a template's `desc` is `description`.
  25: (pack, tools) =>
    tools.entries(pack, 'generators/templates', (template) => {
      if (!('desc' in template) || 'description' in template) return template
      const { desc, ...rest } = template
      return { ...rest, description: desc }
    }),
}
