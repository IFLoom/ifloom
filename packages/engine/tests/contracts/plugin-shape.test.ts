import { describe, expect, it } from 'vitest'
import type { Plugin } from '../../src/plugin.ts'
import type { GameRules } from '../../src/game.ts'
import { PLUGIN_NAME } from './ids-rule.ts'
import { achievements } from '@ifloom/plugin-achievements'
import { calendar } from '@ifloom/plugin-calendar'
import { cheats } from '@ifloom/plugin-cheats'
import { unlocks } from '@ifloom/plugin-unlocks'
import { cast } from '@ifloom/plugin-cast'
import { debug } from '@ifloom/plugin-debug'
import { devices } from '@ifloom/plugin-devices'
import { statuses } from '@ifloom/plugin-statuses'
import { feed } from '@ifloom/plugin-feed'
import { generators } from '@ifloom/plugin-generators'
import { jobs } from '@ifloom/plugin-jobs'
import { messages } from '@ifloom/plugin-messages'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'
import { shop } from '@ifloom/plugin-shop'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { inventory } from '@ifloom/plugin-inventory'

/**
 * The plugin shape (ADR 0009, `adr/0009-plugin-shape.md`).
 *
 * - A hook runs at an event and returns the next state, and is named `on`
 *   and the event. A provider answers a question, never changes the state,
 *   and is a noun. Nothing is nested: no `hooks: {}`, no `profile: {}`.
 * - Options are settings, which are code. Anything a mod could add or
 *   change (entries content names by id) is the plugin's content, in a
 *   pack's `data`.
 */

/** Every member a plugin may have, by role. A new member needs a role here, and the ADR's say-so. */
const MEMBERS = {
  // Who it is, and its state.
  identity: ['id', 'version', 'start', 'migrations', 'cooperates'],
  // How content and command logs written for an older version are carried forward.
  upgrades: ['contentVersion', 'contentMigrations', 'commandVersion', 'commandMigrations'],
  // Tables of named functions content and code call, and its words.
  tables: ['conditions', 'effects', 'commands', 'queries', 'values', 'strings'],
  // Hooks: at an event, the next state.
  hooks: ['onTurn', 'onTurnDone', 'onStat', 'onCommand'],
  // Providers: answers, never a change to the state.
  providers: ['guard', 'price', 'label', 'scene', 'actions', 'action', 'audio', 'statModifiers', 'view', 'profile'],
  // What entities carry that it gives meaning to: data, each named `<id>/<name>`; the content it brings, under the game's;
  // and which fields of its content are words a translation can replace.
  declares: ['traits', 'content', 'words', 'callWords'],
  // What the content checker asks.
  checks: ['references', 'check'],
  // What `definePlugin` adds for code outside the plugin.
  defined: ['read', 'write', 'viewIn'],
} as const

const allowed = new Set<string>(Object.values(MEMBERS).flat())

const firstParty: Plugin<any>[] = [
  achievements(),
  calendar(),
  cast(),
  cheats(),
  debug(),
  devices(),
  feed(),
  generators(),
  jobs(),
  messages(),
  places(),
  quests(),
  shop(),
  statuses(),
  unlocks(),
  wardrobe(),
  inventory(),
]

/** The first-party plugins' sources, by path. */
const SOURCES = import.meta.glob('../../../plugin-*/src/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/**
 * Each plugin's options, field by field, and why each is a setting rather
 * than content. A field that is a list of entries with ids (rooms, channels,
 * apps, slots) is content and belongs in `data`, where a mod can reach it.
 */
const OPTIONS: Record<string, Record<string, string>> = {
  calendar: {
    periods: 'the shape of a day: the clock itself',
    week: 'the length of a week',
    weekend: 'which days of the week are the weekend',
    turn: 'what a turn is',
    start: 'when a new game starts',
    sleep: 'when the player can sleep and wakes',
    curfew: 'a rule: when the curfew binds',
  },
  cast: {
    kind: 'the kind of entity characters are',
  },
  places: {
    start: 'where a new game starts',
  },
}

/** Every `export type <Name>Options = { … }` in a source, with its top-level fields. */
function optionTypes(source: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const match of source.matchAll(/^export type (\w+)Options = \{\n([\s\S]*?)^\}/gm)) {
    out[match[1]] = [...match[2].matchAll(/^ {2}(\w+)\??:/gm)].map((field) => field[1])
  }
  return out
}

describe('the plugin shape (ADR 0009)', () => {
  it('names every member of a first-party plugin by its role, with nothing nested', () => {
    const wrong: string[] = []
    for (const plugin of firstParty) {
      for (const key of Object.keys(plugin)) {
        if (!allowed.has(key)) wrong.push(`${plugin.id}: ${key} is not a member the plugin shape knows`)
      }
      if ('hooks' in plugin) wrong.push(`${plugin.id}: hooks are flat members (onTurn, onCommand), not a hooks table`)
      if (plugin.profile !== undefined && typeof plugin.profile !== 'function') wrong.push(`${plugin.id}: profile is a function, not a table`)
      for (const trait of plugin.traits ?? []) {
        if (!PLUGIN_NAME.test(trait.id) || !trait.id.startsWith(`${plugin.id}/`)) wrong.push(`${plugin.id}: trait "${trait.id}" is not ${plugin.id}/<name>`)
      }
      for (const hook of MEMBERS.hooks) {
        const fn = (plugin as Record<string, unknown>)[hook]
        if (fn !== undefined && typeof fn !== 'function') wrong.push(`${plugin.id}: ${hook} is a function`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('names hooks onX and nothing else that way', () => {
    // Every on-name a plugin may have is a hook, and every hook is an on-name.
    expect([...allowed].filter((name) => /^on[A-Z]/.test(name)).sort()).toEqual([...MEMBERS.hooks].sort())
    // The game's rules follow the same rule: its hooks are on-names, and there's no `turn` beside `onTurn`.
    const rules: Record<keyof GameRules, 'hook' | 'provider' | 'table' | 'upgrade' | 'identity' | 'declares' | 'checks'> = {
      migrations: 'upgrade',
      start: 'identity',
      traits: 'declares',
      references: 'checks',
      check: 'checks',
      saveName: 'provider',
      onTurn: 'hook',
      onTurnDone: 'hook',
      onStat: 'hook',
      onCommand: 'hook',
      conditions: 'table',
      effects: 'table',
      values: 'table',
      queries: 'table',
      commands: 'table',
      guard: 'provider',
      price: 'provider',
      label: 'provider',
      scene: 'provider',
      actions: 'provider',
      action: 'provider',
      statModifiers: 'provider',
      audio: 'provider',
      view: 'provider',
      profile: 'provider',
    }
    expect(Object.entries(rules).filter(([name, role]) => (role === 'hook') !== /^on[A-Z]/.test(name))).toEqual([])
    // The game's rules declare what a plugin can, by the same names, besides the name a save is listed under.
    expect(Object.keys(rules).filter((name) => !allowed.has(name))).toEqual(['saveName'])
  })

  it('keeps content out of options: each option is a setting, and none is a list of entries', () => {
    const found: Record<string, string[]> = {}
    expect(Object.keys(SOURCES).length).toBeGreaterThanOrEqual(firstParty.length)
    for (const source of Object.values(SOURCES)) Object.assign(found, optionTypes(source))
    // Options types, by plugin, with their fields: exactly those listed above.
    const listed = Object.fromEntries(Object.entries(OPTIONS).map(([plugin, fields]) => [plugin, Object.keys(fields).sort()]))
    const named = Object.fromEntries(Object.entries(found).map(([name, fields]) => [name.toLowerCase(), fields.sort()]))
    expect(named).toEqual(listed)
    // A factory that takes no options takes no content either: only these three take any.
    const takes = Object.values(SOURCES).flatMap((source) => [...source.matchAll(/^function (\w+)Plugin\((options)[^)]*\)/gm)].map((match) => match[1]))
    expect(takes.sort()).toEqual(Object.keys(OPTIONS).sort())
  })

  it('declares what each factory returns', () => {
    const bare = Object.entries(SOURCES).flatMap(([path, source]) =>
      [...source.matchAll(/^(?:export )?function (\w+)\(([^)]*)\)\s*\{/gm)]
        .filter((match) => source.slice(match.index, match.index + 400).includes('definePlugin'))
        .map((match) => `${path.split('/').at(-3)}: ${match[1]}`),
    )
    expect(bare).toEqual([])
  })

  it('puts its helpers on its factory, so no helper is exported on its own', () => {
    // A helper writes a call: `quests.done('bread')`, a property of the factory `quests`, never a bare `questDone`.
    const loose = Object.entries(SOURCES).flatMap(([path, source]) =>
      [
        ...source.matchAll(
          /^export (?:const (\w+) = \([^)]*\): (?:Condition|EffectRef|CommandRef|Effect|Blocked)\b|function (\w+)\([^)]*\): (?:Condition|EffectRef|CommandRef|Effect|Blocked)\b)/gm,
        ),
      ].map((match) => `${path.split('/').at(-3)}: ${match[1] ?? match[2]}`),
    )
    expect(loose).toEqual([])
    const assigned = Object.entries(SOURCES)
      .filter(([path]) => path.endsWith('/src/index.ts'))
      .flatMap(([path, source]) => (/^export const (\w+) = Object\.assign\(\1Plugin, \{/m.test(source) ? [] : [path.split('/').at(-3)]))
    expect(assigned).toEqual([])
  })
})
