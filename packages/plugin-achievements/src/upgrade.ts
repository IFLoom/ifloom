/**
 * How content written for an older version of this plugin is carried
 * forward. The versions follow the engine's schema, since the engine once
 * carried this plugin's content forward itself: each step is keyed by the
 * schema it upgrades from.
 */
import type { ContentStep } from '@ifloom/engine'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The calls whose arguments were renamed at schema 6, to the naming rule. */
const SCHEMA_6: Record<string, Record<string, string>> = {
  'achievements/earned': { id: 'achievement' },
  'achievements/grant': { id: 'achievement' },
}

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 6

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: a condition's or an effect's target is named by its noun: `{ achievement }`, not `{ id }`.
  5: (pack, tools) =>
    tools.calls(pack, (call) => (call.form !== 'command' && SCHEMA_6[call.name] ? { name: call.name, with: renamed(call.with, SCHEMA_6[call.name]) } : call)),
}
