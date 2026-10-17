import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadGame, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { memoryDriver } from '../../src/drivers.ts'
import { mods, readMod } from '../../src/mods.ts'
import { PACK_STEPS, SCHEMA, upgradeCommand, upgradePack, type RawPack } from '../../src/upgrade.ts'
import { withCafe } from '../fixtures/cafe.ts'

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
  const { scenes, items, storylines, activities, stats, packs: _p, ...base } = game
  const own: Pack = { id: 'town', schema: SCHEMA, scenes, items, storylines, activities, stats, prose: { 'cafe.counter': 'Rosa wipes the counter.' } }
  return { base, own }
}

const oldPack = { id: 'evening', schema: OLD, lines: { 'cafe.counter': 'Lanterns over the counter tonight.' } }

describe('content migrations', () => {
  it('bring an old pack up to this schema, step by step, without changing it', () => {
    const upgraded = upgradePack(oldPack)
    expect(typeof upgraded !== 'string' && upgraded.schema).toBe(SCHEMA)
    expect(typeof upgraded !== 'string' && upgraded.prose).toEqual(oldPack.lines)
    expect(oldPack.schema).toBe(OLD)
  })

  it('leave a pack at this schema as it is', () => {
    const pack: Pack = { id: 'now', schema: SCHEMA, prose: { a: 'A.' } }
    expect(upgradePack(pack)).toBe(pack)
  })

  it('refuse a pack from a newer engine, or one older than any step', () => {
    expect(upgradePack({ schema: SCHEMA + 1 })).toBe(`written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}`)
    expect(upgradePack({ schema: OLD - 1 })).toBe(`written for schema ${OLD - 1}, too old for this engine to read (it reads ${SCHEMA})`)
  })

  it('let loadGame load an old pack, and skip a newer one with a problem', () => {
    const { base, own } = cafe()
    const future = { id: 'future', schema: SCHEMA + 1, prose: { 'cafe.counter': 'From the future.' } } as Pack
    const { game, problems } = loadGame([own, oldPack as unknown as Pack, future], base)
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
    expect(problems.filter((problem) => problem.pack !== 'town').map(describeProblem)).toEqual([`future · pack · written for schema ${SCHEMA + 1}, this engine reads ${SCHEMA}`])
  })

  it('let a player install an old mod, kept at this schema', async () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'evening', name: 'Evening', game: 'fixture', pack: oldPack })
    const store = mods('fixture', memoryDriver())
    const added = await store.add(file)
    expect(typeof added !== 'string' && added.pack).toMatchObject({ id: 'mod:evening', schema: SCHEMA, prose: oldPack.lines })
    const { base, own } = cafe()
    const { game, problems } = loadGame([own, ...(await store.packs())], base)
    expect(problems.filter((problem) => problem.pack === 'mod:evening')).toEqual([])
    expect(game.prose?.line('cafe.counter')).toBe('Lanterns over the counter tonight.')
  })

  it('refuse a mod from a newer engine', () => {
    const file = JSON.stringify({ ifloomMod: 1, id: 'later', name: 'Later', game: 'fixture', pack: { id: 'later', schema: SCHEMA + 1 } })
    expect(readMod(file, 'fixture')).toBe(`That mod was written for a version this game cannot read (schema ${SCHEMA + 1}).`)
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
    const pack = upgradePack(v4) as unknown as Record<string, unknown>
    expect(pack).toEqual({
      id: 'evening',
      schema: SCHEMA,
      prose: { flag: 'A prose key called flag stays as it is.' },
      inputs: [{ id: 'name', label: 'Name', kind: 'text', key: 'playerName', when: { not: { kv: 'playerName' } } }],
      entities: [{ id: 'ana', of: 'staff', name: 'Ana', kv: { role: 'cook' } }],
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
      data: { cast: { characters: [{ id: 'rosa', name: 'Rosa', kv: { mood: 'calm' } }] } },
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
    expect(typeof added !== 'string' && added.pack).toEqual({
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
        { id: 'nap', requires: [{ when: { not: { kv: 'napped' } }, reason: 'Once a day.' }, { when: { stat: 'energy', lt: 50 }, reason: 'Not tired.' }] },
        { id: 'jog', blocked: [{ when: { kv: 'raining' }, reason: 'Wet.' }], requires: [{ when: { 'places/at': ['park'] }, reason: 'Not here.' }] },
      ],
      items: [{ id: 'tea', name: 'Tea', desc: '', kind: 'stuff', use: { label: 'Drink', effects: [{ kind: 'setStat', key: 'energy', to: 100, of: 'staff:ana' }] } }],
      triggers: [
        {
          id: 'late',
          when: { all: [{ turn: true, gte: 3 }, { has: 'tea' }, { counter: { storyline: 'rosa', key: 'visits' }, gte: 2 }, { storylineKv: { storyline: 'rosa', key: 'met', is: true } }] },
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
        jobs: { jobs: [{ id: 'barista', requires: [{ when: { kv: 'metAva' }, reason: 'Not yet.' }], ranks: [{ id: 'a' }, { id: 'b', requires: { shifts: 3 } }] }] },
      },
    }
    expect(upgradePack(v5)).toEqual({
      id: 'evening',
      schema: SCHEMA,
      prose: { has: 'Words are left alone.' },
      activities: [
        { id: 'nap', blocked: [{ when: { kv: 'napped' }, reason: 'Once a day.' }, { when: { not: { stat: 'energy', lt: 50 } }, reason: 'Not tired.' }] },
        { id: 'jog', blocked: [{ when: { kv: 'raining' }, reason: 'Wet.' }, { when: { not: { 'places/at': { location: ['park'] } } }, reason: 'Not here.' }] },
      ],
      items: [{ id: 'tea', name: 'Tea', desc: '', tags: ['stuff'], use: { label: 'Drink', effects: [{ kind: 'stat', stat: 'energy', to: 100, of: 'staff:ana' }] } }],
      triggers: [
        {
          id: 'late',
          when: { all: [{ turn: { gte: 3 } }, { item: 'tea' }, { storylineKv: { storyline: 'rosa', key: 'visits' }, gte: 2 }, { storylineKv: { storyline: 'rosa', key: 'met' }, is: true }] },
          effects: [
            { kind: 'stat', stat: 'coins', by: -2 },
            { kind: 'item', item: 'tea', by: 1 },
            { kind: 'phase', to: 'night' },
            { kind: 'scene', scene: null },
            { kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' },
            { kind: 'storylineKv', storyline: 'rosa', key: 'met', to: true },
            { kind: 'closeStoryline', storyline: 'rosa', turns: 2 },
            { kind: 'collect', collection: 'notes', entry: { id: 'n1' } },
            { kind: 'discard', collection: 'notes', entry: 'n1' },
            { kind: 'each', of: 'staff', where: { collection: 'notes', entry: 'n1' }, effects: [{ kind: 'remove', entity: '$' }] },
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
                { id: 'drink', label: 'Drink', command: { type: 'use', id: 'tea' } },
                { id: 'quiet', label: 'Quiet', command: { type: 'setting', id: 'volume', to: 0 } },
              ],
              blocked: [{ when: { phase: ['night'] }, reason: 'Shut.', hide: true }],
            },
          ],
        },
        jobs: { jobs: [{ id: 'barista', ranks: [{ id: 'a' }, { id: 'b', requires: { shifts: 3 } }], blocked: [{ when: { not: { kv: 'metAva' } }, reason: 'Not yet.' }] }] },
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
    expect(upgradePack(v6)).toEqual({
      id: 'phone',
      schema: SCHEMA,
      prose: { badge: 'You have {{v:messages/unread channel=texts}} new and {{v:feed/unseen feed=social}} posts; {{v:rentDue}} due.' },
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
      actions: [{ id: 'cure', label: 'Cure', command: { type: 'custom', name: 'effects/remove', with: { id: 'cold' } }, when: { custom: 'effects/active', with: { effect: 'cold' } } }],
      data: { effects: { effects: [{ id: 'cold', label: 'A cold', turns: 3, onEnd: [{ 'effects/apply': { effect: 'tired' } }] }] }, quests: { quests: [] } },
    }
    expect(upgradePack(v7)).toEqual({
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
      actions: [{ id: 'cure', label: 'Cure', command: { type: 'custom', name: 'statuses/remove', with: { id: 'cold' } }, when: { custom: 'statuses/active', with: { status: 'cold' } } }],
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
    expect(upgradePack(v8)).toEqual({
      id: 'town',
      schema: SCHEMA,
      items: [
        { id: 'umbrella', name: 'Umbrella', desc: '', tags: ['gear'], start: 1 },
        { id: 'coat', name: 'Coat', desc: '', start: 0, tags: ['clothes', 'gear'] },
        { id: 'bun', name: 'Bun', desc: '', tags: ['stuff'] },
      ],
      data: { places: { locations: [{ id: 'park', name: 'Park', tag: 'Town', exits: [], art: '', body: [], tags: ['street'] }] } },
    })
  })

  it('install a schema 5 mod with an activity that requires, and play it as blocked', async () => {
    const file = JSON.stringify({
      ifloomMod: 1,
      id: 'naps',
      name: 'Naps',
      game: 'fixture',
      pack: { id: 'naps', schema: 5, activities: [{ id: 'nap', requires: [{ when: { has: 'pillow' }, reason: 'No pillow.' }], effects: [{ kind: 'setStat', key: 'coins', to: 0 }] }] },
    })
    const added = await mods('fixture', memoryDriver()).add(file)
    expect(typeof added !== 'string' && added.pack).toEqual({
      id: 'mod:naps',
      schema: SCHEMA,
      activities: [{ id: 'nap', blocked: [{ when: { not: { item: 'pillow' } }, reason: 'No pillow.' }], effects: [{ kind: 'stat', stat: 'coins', to: 0 }] }],
    })
  })

  it('upgrade an old command log’s commands as replay reads them', () => {
    expect(upgradeCommand({ type: 'use', itemId: 'tea' })).toEqual({ type: 'use', id: 'tea' })
    expect(upgradeCommand({ type: 'setting', id: 'volume', value: 0.5 })).toEqual({ type: 'setting', id: 'volume', to: 0.5 })
    expect(upgradeCommand({ type: 'custom', name: 'places/go', with: { to: 'park' } })).toEqual({ type: 'custom', name: 'places/go', with: { id: 'park' } })
    expect(upgradeCommand({ type: 'custom', name: 'effects/apply', with: { id: 'cold' } })).toEqual({ type: 'custom', name: 'statuses/apply', with: { id: 'cold' } })
    const now = { type: 'use', id: 'tea' }
    expect(upgradeCommand(now)).toEqual(now)
  })
})
