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

/** The effects whose arguments were renamed at schema 6, to the naming rule. */
const CALLS_6: Record<string, Record<string, string>> = { 'feed/post': { id: 'post' } }

/** The commands whose one target became `id` at schema 6. */
const COMMANDS_6: Record<string, Record<string, string>> = { 'feed/seen': { feed: 'id' } }

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 12

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: the naming rule. `feed/post` names its target `post`, and a command's one target is `id`.
  5: (pack, tools) =>
    tools.calls(pack, (call) => {
      const names = call.form === 'command' ? COMMANDS_6[call.name] : CALLS_6[call.name]
      return names ? { name: call.name, with: renamed(call.with, names) } : call
    }),
  // 6 → 7: values take arguments: `{{v:feed/unseen-social}}` is `{{v:feed/unseen feed=social}}`. (An
  // app's badge is the devices plugin's to rewrite.)
  6: (pack, tools) =>
    tools.words(pack, (text) => text.replace(/\{\{v:feed\/unseen-([A-Za-z0-9_-]+)\}\}/g, (_match, id: string) => `{{v:feed/unseen feed=${id}}}`)),
  // 11 → 12: the feed counts news as `unread`, as its view and the messages plugin do, so its value
  // `feed/unseen` is `feed/unread`: in a value's name (a badge, a stat's `max`, an achievement's
  // progress) and in prose and strings tokens.
  11: (pack, tools) =>
    tools.objects(
      tools.words(pack, (text) => text.replace(/\{\{v:feed\/unseen(?=[\s}])/g, '{{v:feed/unread')),
      (value) => (value.value === 'feed/unseen' ? { ...value, value: 'feed/unread' } : value),
    ),
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
