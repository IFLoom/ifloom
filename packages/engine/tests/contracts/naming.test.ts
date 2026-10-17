import { describe, expect, it } from 'vitest'
import type { Command, Condition, Effect } from '../../src/index.ts'
import { CONDITION_KINDS, EFFECT_KINDS } from '../../src/core.ts'
import type { Plugin } from '../../src/plugin.ts'
import { achievementEarned, achievements, grantAchievement } from '@ifloom/plugin-achievements'
import { calendar, day, period, sleep, weekday, weekend } from '@ifloom/plugin-calendar'
import { call, cast, hasMet, here, isAt, talk } from '@ifloom/plugin-cast'
import { debug, goTo, jumpTo, setItem, setKv, setStat, setTime, setTurn } from '@ifloom/plugin-debug'
import { appOpen, closeApp, devices, openApp } from '@ifloom/plugin-devices'
import { applyEffect, effectActive, effects, removeEffect } from '@ifloom/plugin-effects'
import { feed, hasPosted, postTo, react, seeFeed } from '@ifloom/plugin-feed'
import { generate, generators } from '@ifloom/plugin-generators'
import { applyFor, fire, hasJob, hire, jobs, quit, shiftsWorked, wasFired, work } from '@ifloom/plugin-jobs'
import { messageArrived, messageReplied, messages, readThread, replyTo } from '@ifloom/plugin-messages'
import { at, go, moveTo, places, within } from '@ifloom/plugin-places'
import { questActive, questDone, questReached, quests, seeQuests, startQuest, trackQuest } from '@ifloom/plugin-quests'
import { buy, inStock, sell, shop, vendorOpen } from '@ifloom/plugin-shop'
import { takeOff, wardrobe, wear, wearing } from '@ifloom/plugin-wardrobe'

/**
 * Content naming (ADR 0008, `adr/0008-content-naming.md`): every condition,
 * effect and command, the core's and the first-party plugins', names its
 * fields by one rule.
 *
 * - An effect's or condition's target is named by its noun (`stat`, `item`,
 *   `entity`, `storyline`, `scene`); the kv stores keep `key`.
 * - `by` changes a number and `to` sets a value. Never `value`, `add`,
 *   `amount`, `delta` or `set`.
 * - A command that targets one thing names it `id`.
 *
 * The core's fields are held at compile time (`npm run typecheck`), from the
 * built `Condition`, `Effect` and `Command`, so a new kind can't add a field
 * the lists below don't know. The plugins' are held here at run time: every
 * kind a first-party plugin registers needs a sample call below, and every
 * argument its source reads must be a name the rule allows.
 */

/** Words that say how a value changes other than `by` and `to`. Never a field name. */
const BANNED = ['value', 'add', 'amount', 'delta', 'set', 'increment', 'change'] as const

/** Targets: the nouns a condition or an effect names what it works on by. */
const TARGETS = ['stat', 'item', 'entity', 'storyline', 'scene', 'collection', 'minigame', 'channel', 'track', 'key', 'kv', 'storylineKv', 'minigameVar', 'setting', 'chose', 'seen', 'since', 'count', 'tier', 'level', 'turn', 'phase'] as const

/** Qualifiers and details: who it belongs to, what it compares with, what it carries. */
const DETAILS = [
  // whose, or of which kind
  'of',
  // the comparisons
  'is', 'gte', 'gt', 'lte', 'lt', 'open', 'where',
  // a change
  'by', 'to', 'random', 'turns',
  // how long a transition takes
  'ms',
  // what is made or drawn
  'entry', 'effects', 'from', 'otherwise', 'title', 'text', 'image', 'tag',
  // a notice's own id: the notice it makes, not a target
  'id',
  // nesting and calls
  'all', 'any', 'not', 'custom', 'name', 'with',
] as const

/** A command's own fields: `id` for its one target, and what the command carries. */
const COMMAND_FIELDS = ['type', 'id', 'to', 'kv', 'seed', 'ms', 'input', 'name', 'with'] as const

type KeysOf<T> = T extends unknown ? keyof T : never
type Exactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Listed = (typeof TARGETS)[number] | (typeof DETAILS)[number]

// The core, at compile time: each line fails `npm run typecheck` when it stops being true.
const core = {
  // Every field of a condition or an effect is a target or a detail the rule names.
  conditions: true as Exactly<Exclude<KeysOf<Condition>, `${string}/${string}`>, Exclude<KeysOf<Condition>, `${string}/${string}`> & Listed>,
  effects: true as Exactly<Exclude<KeysOf<Effect>, 'kind'>, Exclude<KeysOf<Effect>, 'kind'> & Listed>,
  // Only the notice names something with `id`: the notice it makes.
  effectIds: true as Exactly<Extract<KeysOf<Exclude<Effect, { kind: 'notify' }>>, 'id'>, never>,
  conditionIds: true as Exactly<Extract<KeysOf<Condition>, 'id'>, never>,
  // A command names its target `id`, and sets with `to`.
  commands: true as Exactly<KeysOf<Command>, KeysOf<Command> & (typeof COMMAND_FIELDS)[number]>,
  // No banned word anywhere.
  banned: true as Exactly<Extract<KeysOf<Condition> | KeysOf<Effect> | KeysOf<Command>, (typeof BANNED)[number]>, never>,
} satisfies Record<string, true>

/** A sample call of each plugin kind, by `kind:plugin/name`, as its helper writes it. */
type Call = { custom: string; with?: Record<string, unknown> } | { type: 'custom'; name: string; with?: Record<string, unknown> } | Record<string, unknown>

const SAMPLES: Record<string, Call> = {
  'conditions:achievements/earned': achievementEarned('regular'),
  'effects:achievements/grant': grantAchievement('regular'),
  'conditions:calendar/period': period('morning'),
  'conditions:calendar/weekday': weekday(0),
  'conditions:calendar/weekend': weekend(),
  'conditions:calendar/day': day({ gte: 3 }),
  'conditions:calendar/curfew': { 'calendar/curfew': true },
  'effects:calendar/pass': { custom: 'calendar/pass', with: { by: 2 } },
  'effects:calendar/set': { custom: 'calendar/set', with: { day: 3, period: 'morning' } },
  'commands:calendar/sleep': sleep(),
  'conditions:cast/here': here('ava'),
  'conditions:cast/at': isAt('ava', 'cafe'),
  'conditions:cast/met': hasMet('ava'),
  'commands:cast/talk': talk('ava'),
  'commands:cast/call': call('ava'),
  'commands:debug/stat': setStat('coins', 5),
  'commands:debug/kv': setKv('met', true),
  'commands:debug/item': setItem('scarf', 1),
  'commands:debug/scene': jumpTo('intro'),
  'commands:debug/time': setTime({ day: 2, period: 'morning' }),
  'commands:debug/turn': setTurn(3),
  'commands:debug/go': goTo('park'),
  'conditions:devices/open': appOpen('camera'),
  'commands:devices/open': openApp('camera'),
  'commands:devices/close': closeApp('phone'),
  'conditions:effects/active': effectActive('tired', { gte: 2 }),
  'effects:effects/apply': applyEffect('tired'),
  'effects:effects/remove': removeEffect('tired', true),
  'commands:effects/apply': { type: 'custom', name: 'effects/apply', with: { id: 'tired' } },
  'commands:effects/remove': { type: 'custom', name: 'effects/remove', with: { id: 'tired', runEnd: true } },
  'conditions:feed/appeared': { custom: 'feed/appeared', with: { post: 'p1' } },
  'conditions:feed/posted': hasPosted(2, 'fans'),
  'conditions:feed/likes': { custom: 'feed/likes', with: { post: 'p1', gte: 3 } },
  'effects:feed/post': postTo('fans', 'p1', { text: 'p1', image: 'p1.jpg', video: 'p1.mp4', likes: 2 }),
  'effects:feed/react': react('p1', { likes: 2, from: 'ava', text: 'p1.reply' }),
  'commands:feed/seen': seeFeed('fans'),
  'effects:generators/generate': generate('regular', 2),
  'conditions:jobs/hired': hasJob('barista', 'head'),
  'conditions:jobs/fired': wasFired('barista'),
  'conditions:jobs/shifts': shiftsWorked('barista', { gte: 3 }),
  'effects:jobs/hire': hire('barista'),
  'effects:jobs/fire': fire('barista'),
  'commands:jobs/apply': applyFor('barista'),
  'commands:jobs/work': work('barista'),
  'commands:jobs/quit': quit('barista'),
  'conditions:messages/arrived': messageArrived('hi'),
  'conditions:messages/replied': messageReplied('hi', 'yes'),
  'conditions:messages/read': { custom: 'messages/read', with: { message: 'hi' } },
  'commands:messages/reply': replyTo('hi', 'yes'),
  'commands:messages/read': readThread('ava'),
  'conditions:places/at': at('cafe'),
  'conditions:places/within': within('cafe'),
  'effects:places/move': moveTo('park'),
  'commands:places/go': go('park'),
  'conditions:quests/active': questActive('settle'),
  'conditions:quests/done': questDone('settle'),
  'conditions:quests/reached': questReached('settle', 'unpack'),
  'effects:quests/start': startQuest('settle'),
  'commands:quests/track': trackQuest('settle'),
  'commands:quests/seen': seeQuests('settle'),
  'conditions:shop/open': vendorOpen('baker'),
  'conditions:shop/inStock': inStock('baker', 'bun'),
  'commands:shop/buy': buy('baker', 'bun', 2),
  'commands:shop/sell': sell('baker', 'bun', 2),
  'conditions:wardrobe/wearing': wearing('scarf', 'neck'),
  'commands:wardrobe/wear': wear('scarf'),
  'commands:wardrobe/takeOff': takeOff('neck'),
}

/** What a plugin call's arguments may be named, by role, beyond the core's targets and details. */
const PLUGIN_NOUNS = [
  // the plugins' own targets
  'achievement', 'effect', 'character', 'location', 'quest', 'stage', 'job', 'rank', 'vendor', 'message', 'reply', 'thread', 'post', 'feed', 'template', 'app', 'device', 'slot', 'day', 'period',
  // details: how many, where, who from, what with
  'count', 'stacks', 'runEnd', 'likes', 'video', 'at',
] as const

const allowed = new Set<string>([...TARGETS, ...DETAILS, ...PLUGIN_NOUNS])

const firstParty: Plugin<any>[] = [
  achievements(),
  calendar(),
  cast(),
  debug(),
  devices({ devices: [{ id: 'phone', name: 'Phone' }] }),
  effects(),
  feed({ feeds: [{ id: 'fans', name: 'Fans' }] }),
  generators(),
  jobs(),
  messages({ channels: [{ id: 'texts', name: 'Texts' }] }),
  places(),
  quests(),
  shop(),
  wardrobe({ slots: [{ id: 'neck', label: 'Neck' }] }),
]

/** The first-party plugins' sources, by path, for the arguments they read. */
const SOURCES = import.meta.glob('../../../plugin-*/src/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** A call's arguments, long or short. A short call's are an object, or `true` for none (ADR 0009). */
function argsOf(call: Call): Record<string, unknown> {
  if ('with' in call || 'type' in call || 'custom' in call) return (call.with as Record<string, unknown> | undefined) ?? {}
  const [only] = Object.values(call)
  if (only === true) return {}
  expect(only !== null && typeof only === 'object' && !Array.isArray(only), `a short call's arguments are an object: ${JSON.stringify(call)}`).toBe(true)
  return only as Record<string, unknown>
}

describe('content naming (ADR 0008)', () => {
  it('holds the core’s conditions, effects and commands to the rule at compile time', () => {
    expect(Object.values(core).every(Boolean)).toBe(true)
    // Every core kind is in the unions the lines above read.
    expect(CONDITION_KINDS.length).toBeGreaterThan(0)
    expect(EFFECT_KINDS).not.toContain('setStat')
  })

  it('has a sample call for every kind a first-party plugin registers', () => {
    const registered = firstParty.flatMap((plugin) =>
      (['conditions', 'effects', 'commands'] as const).flatMap((role) => Object.keys(plugin[role] ?? {}).map((name) => `${role}:${plugin.id}/${name}`)),
    )
    expect(registered.filter((kind) => !(kind in SAMPLES))).toEqual([])
    expect(Object.keys(SAMPLES).filter((kind) => !registered.includes(kind))).toEqual([])
  })

  it('names every plugin call’s arguments by the rule', () => {
    const wrong: string[] = []
    for (const [kind, call] of Object.entries(SAMPLES)) {
      const role = kind.split(':')[0]
      const args = argsOf(call)
      const names = Object.keys(args).filter((name) => args[name] !== undefined)
      for (const name of names) {
        if ((BANNED as readonly string[]).includes(name)) wrong.push(`${kind}: ${name} is a banned word`)
        else if (/[a-z]Id$/.test(name)) wrong.push(`${kind}: ${name} names a target by its id; use the noun, or id in a command`)
        else if (!allowed.has(name)) wrong.push(`${kind}: ${name} is not a name the rule knows`)
      }
      // Conditions and effects name their target by its noun, never `id`.
      if (role !== 'commands' && names.includes('id')) wrong.push(`${kind}: names its target id, not by its noun`)
      // A command with one target names it `id`.
      if (role === 'commands' && names.length === 1 && !['id', 'to'].includes(names[0])) wrong.push(`${kind}: names its one target ${names[0]}, not id`)
    }
    expect(wrong).toEqual([])
  })

  it('reads no argument in a plugin’s source that the rule doesn’t name', () => {
    const wrong: string[] = []
    expect(Object.keys(SOURCES).length).toBeGreaterThanOrEqual(firstParty.length)
    for (const [path, source] of Object.entries(SOURCES)) {
      for (const [, name] of source.matchAll(/\bargs\.([A-Za-z]+)/g)) {
        if (!allowed.has(name)) wrong.push(`${path.split('/').at(-3)}: args.${name}`)
      }
    }
    expect([...new Set(wrong)]).toEqual([])
  })
})
