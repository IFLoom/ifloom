import { describe, expect, it } from 'vitest'
import type { Plugin } from '../../src/plugin.ts'
import type { GameRules } from '../../src/game.ts'
import { PLUGIN_NAME } from './ids-rule.ts'
import { PLUGIN_NAMES, firstPartyPlugins } from './first-party.ts'

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
  // What it keeps for others to give, take and ask about (`receive`, `release`, `owned`), and what a New Game+ keeps.
  keeps: ['receiver', 'carry'],
  // How content and command logs written for an older version are carried forward.
  upgrades: ['contentVersion', 'contentMigrations', 'commandVersion', 'commandMigrations'],
  // Tables of named functions content and code call, and its words.
  tables: ['conditions', 'effects', 'macros', 'commands', 'queries', 'values', 'strings'],
  // Hooks: at an event, the next state.
  hooks: ['onTurn', 'onTurnDone', 'onStat', 'onCommand'],
  // Providers: answers, never a change to the state.
  providers: ['guard', 'price', 'label', 'saveName', 'scene', 'actions', 'action', 'audio', 'statModifiers', 'view', 'profile'],
  // What entities carry that it gives meaning to: data, each named `<id>/<name>`; the content it brings, under the game's;
  // its calls and what each takes, and its data lists with which of their fields are words a translation can replace.
  declares: ['traits', 'content', 'calls', 'data'],
  // What the content checker asks.
  checks: ['references', 'check'],
  // What `definePlugin` adds for code outside the plugin.
  defined: ['read', 'write'],
} as const

const allowed = new Set<string>(Object.values(MEMBERS).flat())

/** Every first-party plugin, found by glob (`first-party.ts`), so a new one is held to the shape with nothing to add here. */
const firstParty: Plugin<any>[] = firstPartyPlugins()

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
    onPickUp: 'a rule: what every pick-up runs, after the thing’s own',
  },
  inventory: {
    carryOver: 'what a New Game+ keeps of the player’s things',
  },
  wardrobe: {
    claims: 'whether it takes what is worn, or leaves it to be carried',
    onWear: 'a rule: what putting anything on runs, after the thing’s own',
    onTakeOff: 'a rule: what taking anything off runs, after the thing’s own',
  },
  shop: {
    onBuy: 'a rule: what every purchase runs, after the good’s and the vendor’s',
    onSell: 'a rule: what every sale runs, after the good’s and the vendor’s',
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
      calls: 'declares',
      references: 'checks',
      check: 'checks',
      saveName: 'provider',
      onTurn: 'hook',
      onTurnDone: 'hook',
      onStat: 'hook',
      onCommand: 'hook',
      conditions: 'table',
      effects: 'table',
      macros: 'table',
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
    // The game's rules declare what a plugin can, by the same names, and nothing else.
    expect(Object.keys(rules).filter((name) => !allowed.has(name))).toEqual([])
  })

  it('keeps content out of options: each option is a setting, and none is a list of entries', () => {
    const found: Record<string, string[]> = {}
    expect(PLUGIN_NAMES.filter((name) => !(`../../../plugin-${name}/src/index.ts` in SOURCES))).toEqual([])
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

  it('declares each call once, with what it takes, and writes its helpers from that declaration', () => {
    // A plugin with conditions, effects or commands declares them in `calls` (`defineCalls`); `definePlugin` holds the two to each other.
    const undeclared = firstParty
      .filter((plugin) => (plugin.conditions || plugin.effects || plugin.macros || plugin.commands) && !plugin.calls)
      .map((plugin) => plugin.id)
    expect(undeclared).toEqual([])
    // A helper writes its call with the declaration's writer, `CALLS.conditions.at({ ... })`, whose key is typed: never a key built
    // from the plugin's id, which widens to a string the registries can't check, nor a call's name spelled out by hand.
    const handWritten = Object.entries(SOURCES).flatMap(([path, source]) =>
      [...source.matchAll(/\(\{ ?(\[`\$\{ID\}\/\w+`\]|'[a-z]+\/\w+'): /g)].map((match) => `${path.split('/').at(-3)}: ${match[1]}`),
    )
    expect(handWritten.filter((line) => !line.includes('/upgrade.ts'))).toEqual([])
  })

  it('declares each list of its data once, and reads it through that declaration', () => {
    // A list of the plugin's `data` is declared in `data` (`defineData`), with its noun and words, and read with its `all` and `get`.
    const cast = Object.entries(SOURCES).flatMap(([path, source]) =>
      [...source.matchAll(/game\.data\?\.\[ID\]\?\.(\w+) \?\? \[\]\) as/g)].map((match) => `${path.split('/').at(-3)}: ${match[1]}`),
    )
    expect(cast).toEqual([])
    for (const plugin of firstParty) {
      for (const [name, list] of Object.entries(plugin.data ?? {})) {
        expect([plugin.id, list.plugin, list.list]).toEqual([plugin.id, plugin.id, name])
      }
    }
  })
})
