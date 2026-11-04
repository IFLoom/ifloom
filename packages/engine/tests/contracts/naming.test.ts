import { describe, expect, it } from 'vitest'
import type { Command, Condition, Effect } from '../../src/index.ts'
import { CONDITION_KEYS, EFFECT_KEYS } from '../../src/core.ts'
import type { Plugin } from '../../src/plugin.ts'
import { achievements } from '@ifloom/plugin-achievements'
import { cheats } from '@ifloom/plugin-cheats'
import { unlocks } from '@ifloom/plugin-unlocks'
import { calendar } from '@ifloom/plugin-calendar'
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
 * Content naming (ADR 0008, `adr/0008-content-naming.md`): every condition,
 * effect and command, the core's and the first-party plugins', names its
 * fields by one rule.
 *
 * - An effect's or condition's target is named by its noun (`stat`,
 *   `entity`, `storyline`, `scene`), which is also the key that tells it
 *   apart; a kv store's key is named by `kv`, and an effect that does
 *   something to its target is named by what it does (`move`, `remove`).
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
const TARGETS = [
  'stat',
  'entity',
  'storyline',
  'scene',
  'minigame',
  'channel',
  'track',
  'key',
  'kv',
  'setting',
  'chose',
  'seen',
  'since',
  'count',
  'level',
  'turn',
  'panel',
  // a place in a flowing scene, which a choice's jump names
  'point',
  // the latest roll under a key, for the roll condition
  'roll',
  'timer',
  // effects named by what they do to their target
  'create',
  'remove',
  'each',
  'move',
  'you',
  'closeStoryline',
  'notify',
  'audio',
  'sound',
] as const

/** Qualifiers and details: who it belongs to, what it compares with, what it carries. */
const DETAILS = [
  // whose, or of which kind
  'of',
  // who holds it (a holder: 'player', 'you' or a unique entity)
  'at',
  // what a thing is made like, and what a selection picks by
  'like',
  'trait',
  // a count of units held, not of distinct things
  'units',
  // the comparisons
  'is',
  'gte',
  'gt',
  'lte',
  'lt',
  'open',
  'where',
  // which time `since` counts from: the latest, not the first
  'last',
  // a change
  'by',
  'to',
  'random',
  'turns',
  // how long a transition takes
  'ms',
  // dice: what is thrown, what is added, the target, and the outcome asked of a roll
  'dice',
  'plus',
  'against',
  'passed',
  'critical',
  // what is made or drawn
  'effects',
  'from',
  'otherwise',
  'title',
  'text',
  'image',
  'tag',
  // a notice's own id: the notice it makes, not a target
  'id',
  // nesting and calls
  'all',
  'any',
  'not',
  'custom',
  'name',
  'with',
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
  effects: true as Exactly<Exclude<KeysOf<Effect>, `${string}/${string}`>, Exclude<KeysOf<Effect>, `${string}/${string}`> & Listed>,
  // Only the notice names something with `id`: the notice it makes.
  effectIds: true as Exactly<Extract<KeysOf<Exclude<Effect, { notify: string }>>, 'id'>, never>,
  conditionIds: true as Exactly<Extract<KeysOf<Condition>, 'id'>, never>,
  // A command names its target `id`, and sets with `to`.
  // oxlint-disable-next-line typescript/no-duplicate-type-constituents -- the intersection is the test: every key is one of COMMAND_FIELDS
  commands: true as Exactly<KeysOf<Command>, KeysOf<Command> & (typeof COMMAND_FIELDS)[number]>,
  // No banned word anywhere.
  banned: true as Exactly<Extract<KeysOf<Condition> | KeysOf<Effect> | KeysOf<Command>, (typeof BANNED)[number]>, never>,
} satisfies Record<string, true>

/** A sample call of each plugin kind, by `kind:plugin/name`, as its helper writes it. */
type Call = { custom: string; with?: Record<string, unknown> } | { type: 'custom'; name: string; with?: Record<string, unknown> } | Record<string, unknown>

const SAMPLES: Record<string, Call> = {
  'conditions:achievements/earned': achievements.earned('regular'),
  'effects:achievements/grant': achievements.grant('regular'),
  'conditions:calendar/period': calendar.period('morning'),
  'conditions:calendar/weekday': calendar.weekday(0),
  'conditions:calendar/weekend': calendar.weekend(),
  'conditions:calendar/day': calendar.day({ gte: 3 }),
  'conditions:calendar/curfew': { 'calendar/curfew': true },
  'effects:calendar/pass': { 'calendar/pass': { by: 2 } },
  'effects:calendar/set': { 'calendar/set': { day: 3, period: 'morning' } },
  'commands:calendar/sleep': calendar.sleep(),
  'conditions:cast/here': cast.here('ava'),
  'conditions:cast/at': cast.at('ava', 'cafe'),
  'conditions:cast/met': cast.met('ava'),
  'commands:cast/talk': cast.talk('ava'),
  'commands:cast/call': cast.call('ava'),
  'commands:debug/stat': debug.stat('coins', 5),
  'commands:debug/kv': debug.kv('met', true),
  'commands:debug/held': debug.held('clothing:scarf', 1),
  'commands:debug/scene': debug.scene('intro'),
  'commands:debug/time': debug.time({ day: 2, period: 'morning' }),
  'commands:debug/turn': debug.turn(3),
  'commands:debug/go': debug.go('park'),
  'conditions:devices/open': devices.appOpen('camera'),
  'commands:devices/open': devices.open('camera'),
  'commands:devices/home': devices.home('phone'),
  'commands:devices/close': devices.close('phone'),
  'conditions:statuses/active': statuses.active('tired', { gte: 2 }),
  'effects:statuses/apply': statuses.apply('tired'),
  'effects:statuses/remove': statuses.remove('tired', true),
  'commands:statuses/apply': { type: 'custom', name: 'statuses/apply', with: { id: 'tired' } },
  'commands:statuses/remove': { type: 'custom', name: 'statuses/remove', with: { id: 'tired', runEnd: true } },
  'conditions:feed/appeared': { 'feed/appeared': { post: 'p1' } },
  'conditions:feed/posted': feed.posted(2, 'fans'),
  'conditions:feed/likes': { 'feed/likes': { post: 'p1', gte: 3 } },
  'effects:feed/post': feed.post('fans', 'p1', { text: 'p1', image: 'p1.jpg', video: 'p1.mp4', likes: 2 }),
  'effects:feed/react': feed.react('p1', { likes: 2, from: 'ava', text: 'p1.reply' }),
  'commands:feed/seen': feed.seen('fans'),
  'effects:generators/generate': generators.generate('regular', 2),
  'conditions:jobs/hired': jobs.hired('barista', 'head'),
  'conditions:jobs/fired': jobs.fired('barista'),
  'conditions:jobs/shifts': jobs.shifts('barista', { gte: 3 }),
  'conditions:jobs/worked': jobs.worked('barista'),
  'effects:jobs/hire': jobs.hire('barista'),
  'effects:jobs/fire': jobs.fire('barista'),
  'conditions:cheats/used': cheats.used('coins'),
  'commands:cheats/use': cheats.use('coins'),
  'conditions:unlocks/has': unlocks.has('supporter'),
  'commands:unlocks/record': unlocks.record('supporter'),
  'commands:jobs/apply': jobs.apply('barista'),
  'commands:jobs/work': jobs.work('barista'),
  'commands:jobs/quit': jobs.quit('barista'),
  'conditions:messages/arrived': messages.arrived('hi'),
  'conditions:messages/replied': messages.replied('hi', 'yes'),
  'conditions:messages/since': messages.since('hi', { lt: 3 }),
  'effects:messages/draw': messages.draw('smalltalk'),
  'effects:messages/due': { 'messages/due': {} },
  'conditions:messages/read': { 'messages/read': { message: 'hi' } },
  'commands:messages/reply': messages.reply('hi', 'yes'),
  'commands:messages/read': messages.read('ava'),
  'conditions:places/at': places.at('cafe'),
  'conditions:places/within': places.within('cafe'),
  'effects:places/move': places.move('park'),
  'commands:places/go': places.go('park'),
  'commands:places/pickUp': places.pickUp('item:paper'),
  'conditions:quests/active': quests.active('settle'),
  'conditions:quests/done': quests.done('settle'),
  'conditions:quests/reached': quests.reached('settle', 'unpack'),
  'effects:quests/start': quests.start('settle'),
  'commands:quests/track': quests.track('settle'),
  'commands:quests/seen': quests.seen('settle'),
  'conditions:shop/open': shop.vendorOpen('baker'),
  'conditions:shop/outside': shop.outside('morning'),
  'conditions:shop/inStock': shop.inStock('baker', 'food:bun'),
  'commands:shop/buy': shop.buy('baker', 'food:bun', 2),
  'commands:shop/sell': shop.sell('baker', 'food:bun', 2),
  'conditions:wardrobe/wearing': wardrobe.wearing('clothing:scarf', 'neck'),
  'commands:wardrobe/wear': wardrobe.wear('clothing:scarf'),
  'commands:inventory/use': inventory.use('food:apple'),
  'commands:inventory/drop': inventory.drop('food:apple'),
  'commands:inventory/give': inventory.give('food:apple', 'character:ava'),
  'commands:wardrobe/takeOff': wardrobe.takeOff('neck'),
}

/** What a plugin call's arguments may be named, by role, beyond the core's targets and details. */
const PLUGIN_NOUNS = [
  // the plugins' own targets
  'achievement',
  'status',
  'character',
  'location',
  'quest',
  'stage',
  'job',
  'rank',
  'vendor',
  'message',
  'reply',
  'thread',
  'post',
  'feed',
  'template',
  'app',
  'device',
  'slot',
  'day',
  'period',
  'cheat',
  'unlock',
  // details: how many, where, who from, what with
  'count',
  'stacks',
  'runEnd',
  'likes',
  'video',
  'at',
  // a named pool a draw picks from
  'pool',
] as const

const allowed = new Set<string>([...TARGETS, ...DETAILS, ...PLUGIN_NOUNS])

const firstParty: Plugin<any>[] = [
  achievements(),
  calendar(),
  cast(),
  cheats(),
  debug(),
  devices(),
  feed(),
  generators(),
  inventory(),
  jobs(),
  messages(),
  places(),
  quests(),
  shop(),
  statuses(),
  unlocks(),
  wardrobe(),
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
    expect(CONDITION_KEYS.length).toBeGreaterThan(0)
    expect(EFFECT_KEYS).not.toContain('setStat')
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
