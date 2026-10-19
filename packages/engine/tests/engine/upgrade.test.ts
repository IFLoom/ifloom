import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadGame, type Content, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { memoryDriver } from '../../src/drivers.ts'
import { mods, readMod } from '../../src/mods.ts'
import { PACK_STEPS, SCHEMA, upgradeCommand, upgradePack, type RawPack } from '../../src/upgrade.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { unwrap } from '../fixtures/result.ts'

/**
 * A made-up schema before the oldest real one, whose packs called prose
 * `lines`. The step is added for these tests only, so they hold whatever the
 * real steps are: an old pack goes through this one and then every real one.
 */
const OLD = 3
const renameLines = ({ lines, ...pack }: RawPack): RawPack => ({ ...pack, prose: lines })

beforeEach(() => {
  expect(PACK_STEPS[OLD]).toBeUndefined()
  PACK_STEPS[OLD] = renameLines
})
afterEach(() => {
  delete PACK_STEPS[OLD]
})

/** The cafe fixture's game, split into its base and its own pack. */
function cafe() {
  const { game } = withCafe()
  const { scenes, storylines, activities, stats, packs: _p, ...base } = game
  const own: Content = { name: 'town', scenes, storylines, activities, stats, prose: { 'cafe.counter': 'Rosa wipes the counter.' } }
  return { base, own }
}

const oldPack = { id: 'mod:evening', schema: OLD, lines: { 'cafe.counter': 'Lanterns over the counter tonight.' } }

describe('content migrations', () => {
  it('bring an old pack up to this schema, step by step, without changing it', () => {
    const upgraded = upgradePack(oldPack)
    expect(upgraded.ok && upgraded.value.schema).toBe(SCHEMA)
    expect(upgraded.ok && upgraded.value.prose).toEqual(oldPack.lines)
    expect(oldPack.schema).toBe(OLD)
  })

  it('leave a pack at this schema as it is', () => {
    const pack: Pack = { id: 'now', schema: SCHEMA, prose: { a: 'A.' } }
    expect(unwrap(upgradePack(pack))).toBe(pack)
  })

  it('refuse a pack from a newer engine, or one older than any step', () => {
    expect(upgradePack({ schema: SCHEMA + 1 })).toEqual({ ok: false, reason: `written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}` })
    expect(upgradePack({ schema: OLD - 1 })).toEqual({
      ok: false,
      reason: `written for schema ${OLD - 1}, too old for this engine to read (it reads ${SCHEMA})`,
    })
  })

  it('let loadGame load an old pack, and skip a newer one with a problem', () => {
    const { base, own } = cafe()
    const future = { id: 'future', schema: SCHEMA + 1, prose: { 'cafe.counter': 'From the future.' } } as Pack
    const { game, problems } = loadGame([own], base, { packs: [oldPack as unknown as Pack, future] })
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
    expect(problems.filter((problem) => problem.pack !== 'town').map(describeProblem)).toEqual([
      `future · pack · written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}`,
    ])
  })

  it('let a player install an old mod, kept at this schema', async () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'evening', name: 'Evening', game: 'fixture', pack: oldPack })
    const store = mods('fixture', memoryDriver())
    const added = await store.add(file)
    expect(added.ok && added.value.pack).toMatchObject({ id: 'mod:evening', schema: SCHEMA, prose: oldPack.lines })
    const { base, own } = cafe()
    const { game, problems } = loadGame([own], base, { packs: await store.packs() })
    expect(problems.filter((problem) => problem.pack === 'mod:evening')).toEqual([])
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
  })

  it('refuse a mod from a newer engine', () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'later', name: 'Later', game: 'fixture', pack: { id: 'later', schema: SCHEMA + 1 } })
    expect(readMod(file, 'fixture')).toEqual({ ok: false, reason: `That mod was written for a version this game cannot read (schema ${SCHEMA + 1}).` })
  })

  it('turn schema 4 flags into the kv store, however deep they sit', () => {
    const v4 = {
      id: 'evening',
      schema: 4,
      prose: { flag: 'A prose key called flag stays as it is.' },
      inputs: [{ id: 'name', label: 'Name', kind: 'text', variable: 'playerName', when: { not: { flag: 'playerName' } } }],
      entities: [{ id: 'ana', of: 'staff', name: 'Ana', flags: { role: 'cook' } }],
      scenes: [
        {
          id: 'cafe.evening',
          body: [{ text: 'cafe.evening/back', when: { all: [{ flag: 'visits', gte: 3 }, { storylineFlag: { storyline: 'rosa', key: 'met' } }] } }],
          choices: [
            {
              id: 'stay',
              blocked: [{ when: { any: [{ flag: 'role', of: 'staff:ana', is: 'cook' }] }, reason: 'Busy.' }],
              effects: [
                { kind: 'flag', key: 'metAva', value: true },
                { kind: 'flag', key: 'visits', add: 1 },
                { kind: 'storylineFlag', id: 'rosa', key: 'met', value: true },
                { kind: 'create', of: 'staff', entity: { name: 'Bo', flags: { role: 'waiter' } } },
              ],
            },
          ],
        },
      ],
      data: { cast: { characters: [{ id: 'rosa', name: 'Rosa', flags: { mood: 'calm' } }] } },
    }
    const pack = unwrap(upgradePack(v4)) as unknown as Record<string, unknown>
    expect(pack).toEqual({
      id: 'evening',
      schema: SCHEMA,
      prose: { flag: 'A prose key called flag stays as it is.' },
      inputs: [{ id: 'name', label: 'Name', kind: 'text', key: 'playerName', when: { not: { kv: 'playerName' } } }],
      entities: [
        { id: 'ana', of: 'staff', name: 'Ana', kv: { role: 'cook' } },
        { id: 'rosa', of: 'character', name: 'Rosa', kv: { mood: 'calm' }, traits: { 'cast/person': {} } },
      ],
      scenes: [
        {
          id: 'cafe.evening',
          body: [{ text: 'cafe.evening/back', when: { all: [{ kv: 'visits', gte: 3 }, { storylineKv: { storyline: 'rosa', key: 'met' } }] } }],
          choices: [
            {
              id: 'stay',
              blocked: [{ when: { any: [{ kv: 'role', of: 'staff:ana', is: 'cook' }] }, reason: 'Busy.' }],
              effects: [
                { kind: 'kv', key: 'metAva', to: true },
                { kind: 'kv', key: 'visits', by: 1 },
                { kind: 'storylineKv', storyline: 'rosa', key: 'met', to: true },
                { kind: 'create', of: 'staff', entity: { name: 'Bo', kv: { role: 'waiter' } } },
              ],
            },
          ],
        },
      ],
    })
    // The pack it was given is left alone.
    expect(v4.entities[0].flags).toEqual({ role: 'cook' })
  })

  it('install a schema 4 mod that sets flags, and play it with the kv store', async () => {
    const file = JSON.stringify({
      ifloomMod: 1,
      id: 'regulars',
      name: 'Regulars',
      game: 'fixture',
      pack: {
        id: 'regulars',
        schema: 4,
        triggers: [{ id: 'regular', when: { flag: 'visits', gte: 2 }, effects: [{ kind: 'flag', key: 'regular', value: true }] }],
      },
    })
    const added = await mods('fixture', memoryDriver()).add(file)
    expect(added.ok && added.value.pack).toEqual({
      id: 'mod:regulars',
      schema: SCHEMA,
      triggers: [{ id: 'regular', when: { kv: 'visits', gte: 2 }, effects: [{ kind: 'kv', key: 'regular', to: true }] }],
    })
  })

  it('rename schema 5 fields to the naming rule and gating to blocked, however deep they sit', () => {
    const v5 = {
      id: 'evening',
      schema: 5,
      prose: { has: 'Words are left alone.' },
      activities: [
        {
          id: 'nap',
          requires: [
            { when: { not: { kv: 'napped' } }, reason: 'Once a day.' },
            { when: { stat: 'energy', lt: 50 }, reason: 'Not tired.' },
          ],
        },
        { id: 'jog', blocked: [{ when: { kv: 'raining' }, reason: 'Wet.' }], requires: [{ when: { 'places/at': ['park'] }, reason: 'Not here.' }] },
      ],
      items: [
        { id: 'tea', name: 'Tea', desc: '', kind: 'stuff', use: { label: 'Drink', effects: [{ kind: 'setStat', key: 'energy', to: 100, of: 'staff:ana' }] } },
      ],
      triggers: [
        {
          id: 'late',
          when: {
            all: [
              { turn: true, gte: 3 },
              { has: 'tea' },
              { counter: { storyline: 'rosa', key: 'visits' }, gte: 2 },
              { storylineKv: { storyline: 'rosa', key: 'met', is: true } },
            ],
          },
          effects: [
            { kind: 'stat', key: 'coins', by: -2 },
            { kind: 'item', id: 'tea', by: 1 },
            { kind: 'phase', value: 'night' },
            { kind: 'scene', id: null },
            { kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' },
            { kind: 'storylineKv', id: 'rosa', key: 'met', to: true },
            { kind: 'closeStoryline', id: 'rosa', turns: 2 },
            { kind: 'collect', to: 'notes', entry: { id: 'n1' } },
            { kind: 'discard', from: 'notes', id: 'n1' },
            { kind: 'each', of: 'staff', where: { collection: 'notes', id: 'n1' }, effects: [{ kind: 'remove', of: '$' }] },
            { kind: 'audio', channel: 'music', track: null },
            { kind: 'minigame', id: 'arrows' },
            { kind: 'minigameVar', key: 'score', add: 1 },
            { kind: 'minigameVar', key: 'round', value: 0 },
            { custom: 'achievements/grant', with: { id: 'regular' } },
            { 'effects/apply': { id: 'tired' } },
            { kind: 'custom', name: 'calendar/pass', with: { periods: 2 } },
          ],
        },
      ],
      scenes: [
        {
          id: 'cafe',
          body: [{ text: 'cafe', when: { 'cast/at': { who: 'ava', at: ['cafe'] } } }],
          choices: [{ id: 'sit', when: { custom: 'effects/active', with: { id: 'tired' } }, effects: [] }],
        },
      ],
      data: {
        places: {
          locations: [
            {
              id: 'cafe',
              locked: [{ when: { phase: ['night'] }, reason: 'Shut.', hide: true }],
              actions: [
                { id: 'talk', label: 'Talk', command: { type: 'custom', name: 'cast/talk', with: { who: 'ava' } } },
                { id: 'drink', label: 'Drink', command: { type: 'use', itemId: 'tea' } },
                { id: 'quiet', label: 'Quiet', command: { type: 'setting', id: 'volume', value: 0 } },
              ],
            },
          ],
        },
        jobs: {
          jobs: [{ id: 'barista', requires: [{ when: { kv: 'metAva' }, reason: 'Not yet.' }], ranks: [{ id: 'a' }, { id: 'b', requires: { shifts: 3 } }] }],
        },
      },
    }
    expect(unwrap(upgradePack(v5))).toEqual({
      id: 'evening',
      schema: SCHEMA,
      prose: { has: 'Words are left alone.' },
      activities: [
        {
          id: 'nap',
          blocked: [
            { when: { kv: 'napped' }, reason: 'Once a day.' },
            { when: { not: { stat: 'energy', lt: 50 } }, reason: 'Not tired.' },
          ],
        },
        {
          id: 'jog',
          blocked: [
            { when: { kv: 'raining' }, reason: 'Wet.' },
            { when: { not: { 'places/at': { location: ['park'] } } }, reason: 'Not here.' },
          ],
        },
      ],
      // Items are things since schema 13: entities of an item kind, with their use the inventory's trait.
      kinds: [{ id: 'item', label: 'Item', plural: 'Items', listed: false }],
      entities: [
        {
          id: 'tea',
          of: 'item',
          name: 'Tea',
          desc: '',
          tags: ['stuff'],
          traits: { 'inventory/usable': { label: 'Drink', effects: [{ kind: 'stat', stat: 'energy', to: 100, of: 'staff:ana' }] } },
        },
      ],
      triggers: [
        {
          id: 'late',
          when: {
            all: [
              { turn: { gte: 3 } },
              { entity: 'item:tea', at: 'you' },
              { storylineKv: { storyline: 'rosa', key: 'visits' }, gte: 2 },
              { storylineKv: { storyline: 'rosa', key: 'met' }, is: true },
            ],
          },
          effects: [
            { kind: 'stat', stat: 'coins', by: -2 },
            { kind: 'entity', entity: 'item:tea', at: 'you', by: 1 },
            { kind: 'phase', to: 'night' },
            { kind: 'scene', scene: null },
            { kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' },
            { kind: 'storylineKv', storyline: 'rosa', key: 'met', to: true },
            { kind: 'closeStoryline', storyline: 'rosa', turns: 2 },
            { kind: 'create', of: 'notes', entity: { id: 'n1' }, at: 'player' },
            { kind: 'remove', entity: 'notes:n1' },
            { kind: 'each', of: 'staff', where: { entity: 'notes:n1' }, effects: [{ kind: 'remove', entity: '$' }] },
            { kind: 'audio', channel: 'music', to: null },
            { kind: 'minigame', minigame: 'arrows' },
            { kind: 'minigameVar', key: 'score', by: 1 },
            { kind: 'minigameVar', key: 'round', to: 0 },
            { custom: 'achievements/grant', with: { achievement: 'regular' } },
            { 'statuses/apply': { status: 'tired' } },
            { kind: 'custom', name: 'calendar/pass', with: { by: 2 } },
          ],
        },
      ],
      scenes: [
        {
          id: 'cafe',
          body: [{ text: 'cafe', when: { 'cast/at': { character: 'ava', at: ['cafe'] } } }],
          choices: [{ id: 'sit', when: { custom: 'statuses/active', with: { status: 'tired' } }, effects: [] }],
        },
      ],
      data: {
        places: {
          locations: [
            {
              id: 'cafe',
              actions: [
                { id: 'talk', label: 'Talk', command: { type: 'custom', name: 'cast/talk', with: { id: 'ava' } } },
                { id: 'drink', label: 'Drink', command: { 'inventory/use': { id: 'item:tea' } } },
                { id: 'quiet', label: 'Quiet', command: { type: 'setting', id: 'volume', to: 0 } },
              ],
              blocked: [{ when: { phase: ['night'] }, reason: 'Shut.', hide: true }],
            },
          ],
        },
        jobs: {
          jobs: [
            { id: 'barista', ranks: [{ id: 'a' }, { id: 'b', requires: { shifts: 3 } }], blocked: [{ when: { not: { kv: 'metAva' } }, reason: 'Not yet.' }] },
          ],
        },
      },
    })
  })

  it('name the first-party calls’ bare values at schema 7, and values’ arguments', () => {
    const v6 = {
      id: 'phone',
      schema: 6,
      prose: { badge: 'You have {{v:messages/unread-texts}} new and {{v:feed/unseen-social}} posts; {{v:rentDue}} due.' },
      strings: { hint: '{{v:messages/unread-post}} letters' },
      activities: [
        {
          id: 'jog',
          blocked: [
            { when: { not: { 'places/at': ['park', 'river'] } }, reason: 'Not here.' },
            { when: { 'calendar/period': 'night' }, reason: 'Too dark.' },
            { when: { custom: 'cast/here', with: { value: ['ava'] } }, reason: 'Ava is here.' },
            { when: { 'calendar/weekend': true }, reason: 'Weekend.' },
            { when: { 'cast/met': { id: 'sam' } }, reason: 'Met Sam.' },
          ],
          effects: [{ 'calendar/pass': 2 }, { kind: 'custom', name: 'places/move', with: { value: 'park' } }, { 'tides/turn': 'high' }],
        },
      ],
      data: {
        devices: {
          apps: [
            { id: 'texts', badge: { count: 'messages/unread-texts' } },
            { id: 'bank', badge: { count: 'rentDue' } },
            { id: 'news', badge: { when: { kv: 'news' } } },
          ],
        },
      },
    }
    expect(unwrap(upgradePack(v6))).toEqual({
      id: 'phone',
      schema: SCHEMA,
      prose: { badge: 'You have {{v:messages/unread channel=texts}} new and {{v:feed/unread feed=social}} posts; {{v:rentDue}} due.' },
      strings: { hint: '{{v:messages/unread channel=post}} letters' },
      activities: [
        {
          id: 'jog',
          blocked: [
            { when: { not: { 'places/at': { location: ['park', 'river'] } } }, reason: 'Not here.' },
            { when: { 'calendar/period': { period: 'night' } }, reason: 'Too dark.' },
            { when: { custom: 'cast/here', with: { character: ['ava'] } }, reason: 'Ava is here.' },
            { when: { 'calendar/weekend': true }, reason: 'Weekend.' },
            { when: { 'cast/met': { character: 'sam' } }, reason: 'Met Sam.' },
          ],
          // A call that isn't the first party's keeps its bare value, for the checker to report.
          effects: [{ 'calendar/pass': { by: 2 } }, { kind: 'custom', name: 'places/move', with: { location: 'park' } }, { 'tides/turn': 'high' }],
        },
      ],
      data: {
        devices: {
          apps: [
            { id: 'texts', badge: { value: 'messages/unread', with: { channel: 'texts' } } },
            { id: 'bank', badge: { value: 'rentDue' } },
            { id: 'news', badge: { when: { kv: 'news' } } },
          ],
        },
      },
    })
  })

  it('rename the timed-effects plugin’s calls, content and strings to the statuses plugin’s at schema 8', () => {
    const v7 = {
      id: 'colds',
      schema: 7,
      strings: { 'effects/unknown': 'No such thing.', 'quests/done': 'Done.' },
      activities: [
        {
          id: 'sneeze',
          blocked: [{ when: { 'effects/active': { effect: 'cold', stacks: { gte: 3 } } }, reason: 'Enough.' }],
          effects: [{ 'effects/apply': { effect: 'cold' } }, { kind: 'custom', name: 'effects/remove', with: { effect: 'warm', runEnd: true } }],
        },
      ],
      actions: [
        {
          id: 'cure',
          label: 'Cure',
          command: { type: 'custom', name: 'effects/remove', with: { id: 'cold' } },
          when: { custom: 'effects/active', with: { effect: 'cold' } },
        },
      ],
      data: { effects: { effects: [{ id: 'cold', label: 'A cold', turns: 3, onEnd: [{ 'effects/apply': { effect: 'tired' } }] }] }, quests: { quests: [] } },
    }
    expect(unwrap(upgradePack(v7))).toEqual({
      id: 'colds',
      schema: SCHEMA,
      strings: { 'statuses/unknown': 'No such thing.', 'quests/done': 'Done.' },
      activities: [
        {
          id: 'sneeze',
          blocked: [{ when: { 'statuses/active': { status: 'cold', stacks: { gte: 3 } } }, reason: 'Enough.' }],
          effects: [{ 'statuses/apply': { status: 'cold' } }, { kind: 'custom', name: 'statuses/remove', with: { status: 'warm', runEnd: true } }],
        },
      ],
      actions: [
        {
          id: 'cure',
          label: 'Cure',
          command: { type: 'custom', name: 'statuses/remove', with: { id: 'cold' } },
          when: { custom: 'statuses/active', with: { status: 'cold' } },
        },
      ],
      data: { quests: { quests: [] }, statuses: { statuses: [{ id: 'cold', label: 'A cold', turns: 3, onEnd: [{ 'statuses/apply': { status: 'tired' } }] }] } },
    })
  })

  it('turn an item’s and a place’s kind into a tag at schema 9, and gear into a start of one', () => {
    const v8 = {
      id: 'town',
      schema: 8,
      items: [
        { id: 'umbrella', name: 'Umbrella', desc: '', kind: 'gear' },
        { id: 'coat', name: 'Coat', desc: '', kind: 'gear', start: 0, tags: ['clothes'] },
        { id: 'bun', name: 'Bun', desc: '', kind: 'stuff' },
      ],
      data: { places: { locations: [{ id: 'park', name: 'Park', tag: 'Town', kind: 'street', exits: [], art: '', body: [] }] } },
    }
    expect(unwrap(upgradePack(v8))).toEqual({
      id: 'town',
      schema: SCHEMA,
      // And at schema 13 they are things: a start of one is the player's from the start.
      kinds: [{ id: 'item', label: 'Item', plural: 'Items', listed: false }],
      entities: [
        { id: 'umbrella', of: 'item', name: 'Umbrella', desc: '', tags: ['gear'], at: { player: 1 } },
        { id: 'coat', of: 'item', name: 'Coat', desc: '', tags: ['clothes', 'gear'] },
        { id: 'bun', of: 'item', name: 'Bun', desc: '', tags: ['stuff'] },
      ],
      data: { places: { locations: [{ id: 'park', name: 'Park', tag: 'Town', exits: [], art: '', body: [], tags: ['street'] }] } },
    })
  })

  it('write a chose key as scene#choice at schema 10, and leave prose keys alone', () => {
    const v9 = {
      id: 'letter',
      schema: 9,
      prose: { 'ch2.stairs/opened': 'You think of the postcard.' },
      scenes: [
        {
          id: 'ch2.stairs',
          body: [{ text: 'ch2.stairs/opened', when: { all: [{ chose: 'ch1.mat/open' }, { not: { chose: 'ch1.mat#shelf', gte: 2 } }] } }],
          choices: [],
        },
      ],
    }
    expect(unwrap(upgradePack(v9))).toEqual({
      id: 'letter',
      schema: SCHEMA,
      prose: { 'ch2.stairs/opened': 'You think of the postcard.' },
      scenes: [
        {
          id: 'ch2.stairs',
          body: [{ text: 'ch2.stairs/opened', when: { all: [{ chose: 'ch1.mat#open' }, { not: { chose: 'ch1.mat#shelf', gte: 2 } }] } }],
          choices: [],
        },
      ],
    })
  })

  it('fold a stat’s bands into hidden levels and tier conditions into level at schema 11', () => {
    const v10 = {
      id: 'town',
      schema: 10,
      stats: [
        { id: 'charm', label: 'Charm', bands: [10, 20, 30] },
        { id: 'cooking', label: 'Cooking', bands: [5], levels: { at: [10, 30] } },
      ],
      activities: [{ id: 'flirt', blocked: [{ when: { not: { tier: 'charm', gte: 2 } }, reason: 'Not yet.' }] }],
    }
    expect(unwrap(upgradePack(v10))).toEqual({
      id: 'town',
      schema: SCHEMA,
      stats: [
        { id: 'charm', label: 'Charm', levels: { at: [10, 20, 30], hidden: true } },
        { id: 'cooking', label: 'Cooking', levels: { at: [10, 30] } },
      ],
      activities: [{ id: 'flirt', blocked: [{ when: { not: { level: 'charm', gte: 2 } }, reason: 'Not yet.' }] }],
    })
  })

  it('call the feed’s value feed/unread at schema 12, in values and in tokens', () => {
    const v11 = {
      id: 'phone',
      schema: 11,
      prose: { badge: '{{v:feed/unseen}} new, {{v:feed/unseen feed=social}} on social; {{v:feed/unseenish}} stays.' },
      strings: { hint: '{{v:feed/unseen feed=board}} pinned' },
      stats: [{ id: 'buzz', label: 'Buzz', max: { value: 'feed/unseen' } }],
      data: {
        devices: {
          apps: [
            { id: 'social', badge: { value: 'feed/unseen', with: { feed: 'social' } } },
            { id: 'texts', badge: { value: 'messages/unread' } },
          ],
        },
      },
    }
    expect(unwrap(upgradePack(v11))).toEqual({
      id: 'phone',
      schema: SCHEMA,
      prose: { badge: '{{v:feed/unread}} new, {{v:feed/unread feed=social}} on social; {{v:feed/unseenish}} stays.' },
      strings: { hint: '{{v:feed/unread feed=board}} pinned' },
      stats: [{ id: 'buzz', label: 'Buzz', max: { value: 'feed/unread' } }],
      data: {
        devices: {
          apps: [
            { id: 'social', badge: { value: 'feed/unread', with: { feed: 'social' } } },
            { id: 'texts', badge: { value: 'messages/unread' } },
          ],
        },
      },
    })
  })

  it('install a schema 5 mod with an activity that requires, and play it as blocked', async () => {
    const file = JSON.stringify({
      ifloomMod: 1,
      id: 'naps',
      name: 'Naps',
      game: 'fixture',
      pack: {
        id: 'naps',
        schema: 5,
        activities: [{ id: 'nap', requires: [{ when: { has: 'pillow' }, reason: 'No pillow.' }], effects: [{ kind: 'setStat', key: 'coins', to: 0 }] }],
      },
    })
    const added = await mods('fixture', memoryDriver()).add(file)
    expect(added.ok && added.value.pack).toEqual({
      id: 'mod:naps',
      schema: SCHEMA,
      activities: [
        {
          id: 'nap',
          blocked: [{ when: { not: { entity: 'item:pillow', at: 'you' } }, reason: 'No pillow.' }],
          effects: [{ kind: 'stat', stat: 'coins', to: 0 }],
        },
      ],
    })
  })

  it('make the cast’s characters entities with the person trait at schema 14', () => {
    const v13 = {
      id: 'neighbours',
      schema: 13,
      entities: [{ id: 'scarf', of: 'clothing', name: 'Scarf' }],
      data: {
        cast: {
          characters: [
            {
              id: 'rosa',
              name: 'Rosa',
              fullName: 'Rosa Vale',
              role: 'Next door',
              portrait: 'art/rosa.png',
              tags: ['neighbour'],
              hue: 120,
              home: 'garden',
              schedule: [{ location: 'shop', when: { kv: 'open' } }],
              talk: 'rosa.hi',
              stats: { trust: 3 },
              kv: { mood: 'calm' },
            },
            { id: 'tom', name: 'Tom' },
          ],
        },
        places: { locations: [] },
      },
    }
    expect(unwrap(upgradePack(v13))).toEqual({
      id: 'neighbours',
      schema: SCHEMA,
      entities: [
        { id: 'scarf', of: 'clothing', name: 'Scarf' },
        {
          id: 'rosa',
          of: 'character',
          name: 'Rosa',
          desc: 'Next door',
          image: 'art/rosa.png',
          tags: ['neighbour'],
          stats: { trust: 3 },
          kv: { mood: 'calm' },
          traits: {
            'cast/person': { fullName: 'Rosa Vale', home: 'garden', schedule: [{ location: 'shop', when: { kv: 'open' } }], talk: 'rosa.hi' },
          },
          // Her colour is a hint for the UI since schema 16.
          ui: { hue: 120 },
        },
        { id: 'tom', of: 'character', name: 'Tom', traits: { 'cast/person': {} } },
      ],
      data: { places: { locations: [] } },
    })
    // A pack with no characters is left as it was.
    const plain: RawPack = { id: 'x', schema: 13, prose: { a: 'A' } }
    expect(unwrap(upgradePack(plain))).toEqual({ id: 'x', schema: SCHEMA, prose: { a: 'A' } })
  })

  it('rename a kind’s marks to flags at schema 15', () => {
    const v14 = {
      id: 'staffroom',
      schema: 14,
      kinds: [
        { id: 'staff', label: 'Staff', marks: { senior: { stat: 'skill', of: '$', gte: 4 } } },
        { id: 'photo', label: 'Photo' },
      ],
    }
    expect(unwrap(upgradePack(v14))).toEqual({
      id: 'staffroom',
      schema: SCHEMA,
      kinds: [
        { id: 'staff', label: 'Staff', flags: { senior: { stat: 'skill', of: '$', gte: 4 } } },
        { id: 'photo', label: 'Photo' },
      ],
    })
  })

  it('move presentation into ui hints at schema 16', () => {
    const v15 = {
      id: 'evening',
      schema: 15,
      scenes: [
        {
          id: 'porch',
          frame: 'talk',
          transition: { in: 'fade', ms: 500 },
          body: [
            { text: 'porch', when: { kv: 'dusk' } },
            { text: 'porch.more', reveal: { delay: 1200 } },
            { variants: 'porch.birds', reveal: {} },
          ],
          choices: [
            {
              id: 'in',
              effects: [
                { kind: 'scene', scene: null },
                { kind: 'transition', to: 'slide-up', ms: 400 },
              ],
            },
            { id: 'wait', ui: { transition: 'zoom' }, effects: [{ kind: 'transition', to: 'fade' }] },
          ],
        },
      ],
      prose: {
        porch: 'A porch.\n\n[[reveal:1500|slide-up]]\n\nA swing creaks.\n\n[[reveal]]\n\nIt stops.',
        'porch.more': 'Crickets. [[reveal]] Then quiet.',
        'porch.birds/one': 'A blackbird.\n\n[[reveal]]\n\nAnother.',
      },
      triggers: [
        {
          id: 'dusk',
          effects: [
            { kind: 'transition', to: 'fade' },
            { kind: 'kv', key: 'dusk', to: true },
          ],
        },
      ],
      stats: [{ id: 'energy', label: 'Energy', display: 'bar' }],
      kinds: [{ id: 'neighbour', label: 'Neighbour', traits: { 'cast/person': { hue: 40 } } }],
      entities: [
        { id: 'rosa', of: 'character', name: 'Rosa', traits: { 'cast/person': { hue: 120, home: 'garden' } } },
        { id: 'tom', of: 'character', name: 'Tom' },
      ],
      traits: { 'cast/person': { 'character:tom': { hue: 300, home: 'shop' }, 'character:ann': { hue: 10 } } },
      data: { places: { locations: [{ id: 'garden', name: 'Garden', transition: 'slide-left', body: [{ text: 'garden', reveal: { as: 'zoom' } }] }] } },
    }
    expect(unwrap(upgradePack(v15))).toEqual({
      id: 'evening',
      schema: SCHEMA,
      scenes: [
        {
          id: 'porch',
          ui: { transition: { in: 'fade', ms: 500 } },
          body: [
            // The prose split at its reveals: each later part a key and a block of its own, under the same `when`.
            { text: 'porch', when: { kv: 'dusk' } },
            { text: 'porch.2', when: { kv: 'dusk' }, ui: { reveal: { delay: 1500, as: 'slide-up' } } },
            { text: 'porch.3', when: { kv: 'dusk' }, ui: { reveal: {} } },
            { text: 'porch.more', ui: { reveal: { delay: 1200 } } },
            { variants: 'porch.birds', ui: { reveal: {} } },
          ],
          choices: [
            { id: 'in', effects: [{ kind: 'scene', scene: null }], ui: { transition: { in: 'slide-up', ms: 400 } } },
            // A hint the choice already has wins.
            { id: 'wait', ui: { transition: 'zoom' }, effects: [] },
          ],
        },
      ],
      prose: {
        porch: 'A porch.',
        'porch.2': 'A swing creaks.',
        'porch.3': 'It stops.',
        // Markup inside a paragraph, or in prose no block splits, is taken out.
        'porch.more': 'Crickets. Then quiet.',
        'porch.birds/one': 'A blackbird.\n\nAnother.',
      },
      triggers: [{ id: 'dusk', effects: [{ kind: 'kv', key: 'dusk', to: true }] }],
      stats: [{ id: 'energy', label: 'Energy', ui: { display: 'bar' } }],
      kinds: [{ id: 'neighbour', label: 'Neighbour', traits: { 'cast/person': {} }, ui: { hue: 40 } }],
      entities: [
        { id: 'rosa', of: 'character', name: 'Rosa', traits: { 'cast/person': { home: 'garden' } }, ui: { hue: 120 } },
        { id: 'tom', of: 'character', name: 'Tom', ui: { hue: 300 } },
      ],
      // A row's hue goes to the pack's own entity; Ann isn't one, so hers is dropped.
      traits: { 'cast/person': { 'character:tom': { home: 'shop' }, 'character:ann': {} } },
      data: {
        places: { locations: [{ id: 'garden', name: 'Garden', ui: { transition: 'slide-left' }, body: [{ text: 'garden', ui: { reveal: { as: 'zoom' } } }] }] },
      },
    })
  })

  it('make items and collections things at schema 13, wherever content names them', () => {
    const v12 = {
      id: 'town',
      schema: 12,
      items: [
        { id: 'tea', name: 'Tea', desc: 'Hot.', start: 2, use: { label: 'Drink', effects: [{ kind: 'stat', stat: 'energy', by: 5 }] } },
        { id: 'scarf', name: 'Scarf', desc: 'Wool.' },
      ],
      collections: [
        { id: 'gallery', name: 'Photos' },
        { id: 'letters', name: 'Letters', max: 5 },
      ],
      activities: [
        {
          id: 'snap',
          blocked: [{ when: { collection: 'gallery', gte: 3 }, reason: 'Full.' }],
          effects: [
            {
              kind: 'collect',
              collection: 'gallery',
              entry: { id: 'pier', title: 'The pier', text: 'photo.pier', image: 'art/pier.jpg', data: { sunny: true } },
            },
            { kind: 'collect', collection: 'letters', entry: { id: 'gran', text: 'nowhere' } },
            { kind: 'discard', collection: 'letters', entry: 'old' },
            { kind: 'item', item: 'tea', to: 0 },
          ],
        },
        {
          id: 'read',
          blocked: [{ when: { not: { collection: 'letters', entry: 'gran' } }, reason: 'No letter.' }],
          effects: [{ 'shop/sell': { vendor: 'kiosk', item: 'tea' } }, { kind: 'custom', name: 'debug/item', with: { item: 'tea', to: 1 } }],
        },
      ],
      scenes: [
        {
          id: 'shop',
          body: [{ text: 'shop', when: { 'wardrobe/wearing': { item: 'scarf' } } }],
          choices: [
            { id: 'drink', command: { type: 'use', id: 'tea' }, effects: [] },
            {
              id: 'wear',
              command: { type: 'custom', name: 'wardrobe/wear', with: { id: 'scarf' } },
              when: { custom: 'shop/inStock', with: { vendor: 'kiosk', item: 'tea' } },
              effects: [],
            },
          ],
        },
      ],
      data: {
        shop: { vendors: [{ id: 'kiosk', name: 'Kiosk', goods: [{ item: 'tea', price: { coins: 2 } }, { entity: 'food:bun' }] }] },
        wardrobe: { slots: [{ id: 'neck', label: 'Neck', start: 'scarf' }], clothes: [{ id: 'scarf', slot: 'neck' }] },
      },
      strings: { haveNone: 'No {item} on you.', 'wardrobe/haveNone': 'Not in your bag.', doesNothing: 'The {item} just sits there.' },
      prose: { 'photo.pier': 'Gulls, and the end of the pier.' },
    }
    expect(unwrap(upgradePack(v12))).toEqual({
      id: 'town',
      schema: SCHEMA,
      kinds: [
        { id: 'item', label: 'Item', plural: 'Items', listed: false },
        { id: 'photo', label: 'Photos', plural: 'Photos', listed: false },
        { id: 'letters', label: 'Letters', plural: 'Letters', listed: false },
      ],
      entities: [
        {
          id: 'tea',
          of: 'item',
          name: 'Tea',
          desc: 'Hot.',
          at: { player: 2 },
          traits: { 'inventory/usable': { label: 'Drink', effects: [{ kind: 'stat', stat: 'energy', by: 5 }] } },
        },
        { id: 'scarf', of: 'item', name: 'Scarf', desc: 'Wool.' },
      ],
      traits: { 'wardrobe/wearable': { 'item:scarf': { slot: 'neck' } } },
      activities: [
        {
          id: 'snap',
          blocked: [{ when: { count: { of: 'photo', at: 'player' }, gte: 3 }, reason: 'Full.' }],
          effects: [
            {
              kind: 'create',
              of: 'photo',
              entity: { id: 'pier', name: 'The pier', desc: 'Gulls, and the end of the pier.', image: 'art/pier.jpg', kv: { sunny: true } },
              at: 'player',
            },
            { kind: 'create', of: 'letters', entity: { id: 'gran' }, at: 'player' },
            { kind: 'remove', entity: 'letters:old' },
            { kind: 'entity', entity: 'item:tea', at: 'you', to: 0 },
          ],
        },
        {
          id: 'read',
          blocked: [{ when: { not: { entity: 'letters:gran' } }, reason: 'No letter.' }],
          effects: [{ 'shop/sell': { vendor: 'kiosk', entity: 'item:tea' } }, { kind: 'custom', name: 'debug/held', with: { entity: 'item:tea', to: 1 } }],
        },
      ],
      scenes: [
        {
          id: 'shop',
          body: [{ text: 'shop', when: { 'wardrobe/wearing': { entity: 'item:scarf' } } }],
          choices: [
            { id: 'drink', command: { 'inventory/use': { id: 'item:tea' } }, effects: [] },
            {
              id: 'wear',
              command: { type: 'custom', name: 'wardrobe/wear', with: { id: 'item:scarf' } },
              when: { custom: 'shop/inStock', with: { vendor: 'kiosk', entity: 'item:tea' } },
              effects: [],
            },
          ],
        },
      ],
      data: {
        shop: { vendors: [{ id: 'kiosk', name: 'Kiosk', goods: [{ entity: 'item:tea', price: { coins: 2 } }, { entity: 'food:bun' }] }] },
        wardrobe: { slots: [{ id: 'neck', label: 'Neck', start: 'item:scarf' }] },
      },
      strings: { 'inventory/haveNone': 'No {thing} on you.', 'wardrobe/haveNone': 'Not in your bag.', 'inventory/doesNothing': 'The {thing} just sits there.' },
      prose: { 'photo.pier': 'Gulls, and the end of the pier.' },
    })
  })

  it('upgrade an old command log’s commands as replay reads them', () => {
    // Using an item is the inventory's command since schema 13, on the thing the item became.
    expect(upgradeCommand({ type: 'use', itemId: 'tea' })).toEqual({ type: 'custom', name: 'inventory/use', with: { id: 'item:tea' } })
    expect(upgradeCommand({ type: 'custom', name: 'debug/item', with: { item: 'tea', to: 2 } })).toEqual({
      type: 'custom',
      name: 'debug/held',
      with: { entity: 'item:tea', to: 2 },
    })
    expect(upgradeCommand({ type: 'custom', name: 'shop/buy', with: { vendor: 'kiosk', item: 'paper' } })).toEqual({
      type: 'custom',
      name: 'shop/buy',
      with: { vendor: 'kiosk', entity: 'item:paper' },
    })
    expect(upgradeCommand({ type: 'setting', id: 'volume', value: 0.5 })).toEqual({ type: 'setting', id: 'volume', to: 0.5 })
    expect(upgradeCommand({ type: 'custom', name: 'places/go', with: { to: 'park' } })).toEqual({ type: 'custom', name: 'places/go', with: { id: 'park' } })
    expect(upgradeCommand({ type: 'custom', name: 'effects/apply', with: { id: 'cold' } })).toEqual({
      type: 'custom',
      name: 'statuses/apply',
      with: { id: 'cold' },
    })
    const now = { type: 'custom', name: 'inventory/use', with: { id: 'item:tea' } }
    expect(upgradeCommand(now)).toEqual(now)
  })
})
