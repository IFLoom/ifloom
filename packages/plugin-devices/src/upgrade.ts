/**
 * How content and command logs written for an older version of this plugin
 * are carried forward. The versions follow the engine's schema, since the
 * engine once carried this plugin's content forward itself: each step is
 * keyed by the schema it upgrades from.
 */
import type { CommandStep, ContentStep } from '@ifloom/engine/plugin'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Arguments with some renamed, if they are an object. */
const renamed = (args: unknown, names: Record<string, string>): unknown =>
  isRecord(args) ? Object.fromEntries(Object.entries(args).map(([key, value]) => [names[key] ?? key, value])) : args

/** The commands whose one target became `id` at schema 6. */
const COMMANDS_6: Record<string, Record<string, string>> = { 'devices/open': { app: 'id' }, 'devices/close': { device: 'id' } }

/**
 * A badge's count by value name, as a value with its arguments: the
 * messages and feed plugins' values encoded their channel or feed in the
 * name (`messages/unread-texts`), and take it as an argument now.
 */
function valueCall(name: string): { value: string; with?: Record<string, unknown> } {
  const unread = /^messages\/unread-(.+)$/.exec(name)
  if (unread) return { value: 'messages/unread', with: { channel: unread[1] } }
  const unseen = /^feed\/unseen-(.+)$/.exec(name)
  if (unseen) return { value: 'feed/unseen', with: { feed: unseen[1] } }
  return { value: name }
}

/** The version of what content writes for this plugin. */
export const CONTENT_VERSION = 29

export const contentMigrations: Record<number, ContentStep> = {
  // 5 → 6: a command's one target is `id`.
  5: (pack, tools) =>
    tools.calls(pack, (call) =>
      call.form === 'command' && COMMANDS_6[call.name] ? { name: call.name, with: renamed(call.with, COMMANDS_6[call.name]) } : call,
    ),
  // 6 → 7: values take arguments, so an app's badge `{ count: 'messages/unread-texts' }` is
  // `{ value: 'messages/unread', with: { channel: 'texts' } }`.
  6: (pack, tools) =>
    tools.objects(pack, (value) => {
      if (!isRecord(value.badge) || typeof value.badge.count !== 'string') return value
      const { count, ...rest } = value.badge
      return { ...value, badge: { ...rest, ...valueCall(count as string) } }
    }),
  // 20 → 21: effects are told apart by their key, as conditions are: `{ stat: 'coins', by: -2 }`, never
  // `{ kind: 'stat', … }`. This plugin's content holds effects, so they are keyed here as well as by the engine.
  20: (pack, tools) => tools.effects(pack),
  // 26 → 27: an app's section of words is `{ blocks }`, so it doesn't read as a `{ prose: key }` block.
  26: (pack, tools) =>
    tools.entries(pack, 'devices/apps', (app) =>
      Array.isArray(app.sections)
        ? {
            ...app,
            sections: app.sections.map((section) =>
              isRecord(section) && Array.isArray(section.prose) && !('blocks' in section) ? renamed(section, { prose: 'blocks' }) : section,
            ),
          }
        : app,
    ),
  // 28 → 29: `devices/close` puts a device away, and `devices/home` is what it did before: back to the home screen.
  // Only a command is called `devices/close`, so its short form is one too.
  28: (pack, tools) => tools.calls(pack, (call) => (call.name === 'devices/close' && call.form !== 'long' ? { name: 'devices/home', with: call.with } : call)),
}

/** The version of this plugin's commands. */
export const COMMAND_VERSION = 7

export const commandMigrations: Record<number, CommandStep> = {
  // 5 → 6: a command's one target is `id`.
  5: (command) =>
    command.type === 'custom' && typeof command.name === 'string' && COMMANDS_6[command.name]
      ? { ...command, with: renamed(command.with, COMMANDS_6[command.name]) }
      : command,
  // 6 → 7: `devices/close` puts a device away, and `devices/home` is what it did before: back to the home screen.
  6: (command) => (command.type === 'custom' && command.name === 'devices/close' ? { ...command, name: 'devices/home' } : command),
}
