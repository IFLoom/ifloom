/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from.
 */
import type { CommandStep, ContentStep } from '@ifloom/engine'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The commands whose one target became `id` at schema 6. */
const COMMANDS_6: Record<string, Record<string, string>> = { 'messages/read': { thread: 'id' } }

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 21

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: a command's one target is `id`.
  5: (pack, tools) =>
    tools.calls(pack, (call) =>
      call.form === 'command' && COMMANDS_6[call.name] ? { name: call.name, with: renamed(call.with, COMMANDS_6[call.name]) } : call,
    ),
  // 6 → 7: values take arguments: `{{v:messages/unread-texts}}` is `{{v:messages/unread channel=texts}}`.
  // (An app's badge is the devices plugin's to rewrite.)
  6: (pack, tools) =>
    tools.words(pack, (text) => text.replace(/\{\{v:messages\/unread-([A-Za-z0-9_-]+)\}\}/g, (_match, id: string) => `{{v:messages/unread channel=${id}}}`)),
  // 20 → 21: effects are told apart by their key, as conditions are: `{ stat: 'coins', by: -2 }`, never
  // `{ kind: 'stat', … }`. This plugin's content holds effects, so they are keyed here as well as by the engine.
  20: (pack, tools) => tools.effects(pack),
}

/** The version of this plugin's commands. */
export const COMMAND_VERSION = 6

export const commandMigrations: Record<number, CommandStep> = {
  // 5 → 6: a command's one target is `id`.
  5: (command) =>
    command.type === 'custom' && typeof command.name === 'string' && COMMANDS_6[command.name]
      ? { ...command, with: renamed(command.with, COMMANDS_6[command.name]) }
      : command,
}
