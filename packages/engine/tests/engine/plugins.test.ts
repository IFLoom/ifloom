import { describe, expect, it } from 'vitest'
import { definePlugin } from '../../src/plugin.ts'
import type { Condition } from '../../src/condition.ts'
import { apply } from '../../src/reduce.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { holds } from '../../src/condition.ts'
import { whyNot } from '../../src/availability.ts'
import { view } from '../../src/view.ts'
import { saves } from '../../src/save.ts'
import { memoryDriver } from '../../src/drivers.ts'
import { SCHEMA, loadGame, type Pack } from '../../src/loader.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { fillTokens } from '../../src/prose.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'

/**
 * Shells found on the beach. Version 2 keeps which ones; version 1 only
 * counted them, so its saves are carried forward as unnamed shells.
 */
type Tally = { found: string[]; days: number }

const shells = definePlugin<Tally>({
  id: 'shells',
  version: 2,
  start: () => ({ found: [], days: 0 }),
  migrations: {
    1: (old) => {
      const count = (old as { count: number }).count
      return { found: Array.from({ length: count }, (_, i) => `old-${i}`), days: 0 }
    },
  },
  conditions: {
    has: (_state, args, { slice }) => slice.found.includes(String(args.shell)),
    atLeast: (_state, args, { slice }) => slice.found.length >= Number(args.count),
  },
  effects: {
    find: (state, args, { slice, set }) => {
      const shell = String(args.shell)
      return slice.found.includes(shell) ? state : set({ ...slice, found: [...slice.found, shell] })
    },
  },
  commands: {
    drop: {
      whyNot: (_state, args, { slice }) =>
        slice.found.includes(String(args.shell)) ? undefined : 'You do not have that shell.',
      run: (_state, args, { slice, set }) => set({ ...slice, found: slice.found.filter((shell) => shell !== args.shell) }),
    },
  },
  values: { count: (_state, _args, { slice }) => slice.found.length },
  onTurn: (_state, { slice, set }) => set({ ...slice, days: slice.days + 1 }),
  view: (_state, { slice }) => ({ count: slice.found.length }),
  references: {
    content: (game) => (game.data?.shells?.spots ?? []).map((spot) => ({ list: 'spots', id: spot.id, refs: [{ when: (spot as { id: string; when?: Condition }).when }] })),
  },
})

function withShells(): Game {
  return {
    ...fixture(),
    plugins: [shells],
    activities: [
      ...fixture().activities,
      { id: 'beachcomb', effects: [{ custom: 'shells/find', with: { shell: 'whelk' } }] },
    ],
  }
}

describe('plugins', () => {
  it('start with their own state in a new game', () => {
    const game = withShells()
    expect(startingState(game).plugins.shells).toEqual({ version: 2, state: { found: [], days: 0 } })
  })

  it('are called from content by name, with the plugin id in front', () => {
    const game = withShells()
    const after = apply(begin(game), game, { type: 'activity', id: 'beachcomb' })
    expect(after.ok).toBe(true)
    expect(shells.read(after.state, game).found).toEqual(['whelk'])
    expect(holds(after.state, { custom: 'shells/has', with: { shell: 'whelk' } }, game)).toBe(true)
    expect(holds(after.state, { custom: 'shells/has', with: { shell: 'conch' } }, game)).toBe(false)
  })

  it('apply their effects in order, each on the state the one before left', () => {
    const game = withShells()
    const both = [
      { custom: 'shells/find', with: { shell: 'whelk' } },
      { custom: 'shells/find', with: { shell: 'conch' } },
    ]
    const after = apply(begin(game), game, { type: 'activity', id: 'beachcomb' })
    const twice = apply(after.state, { ...game, activities: [{ id: 'two', effects: both }] }, { type: 'activity', id: 'two' })
    expect(shells.read(twice.state, game).found).toEqual(['whelk', 'conch'])
  })

  it('refuse their commands with the player-facing line whyNot gives', () => {
    const game = withShells()
    const drop = { type: 'custom' as const, name: 'shells/drop', with: { shell: 'whelk' } }
    expect(whyNot(begin(game), game, drop)).toBe('You do not have that shell.')
    const refused = apply(begin(game), game, drop)
    expect(refused).toMatchObject({ ok: false, refused: 'You do not have that shell.' })
    const found = apply(begin(game), game, { type: 'activity', id: 'beachcomb' }).state
    expect(shells.read(apply(found, game, drop).state, game).found).toEqual([])
    expect(whyNot(begin(game), game, { type: 'custom', name: 'shells/juggle' })).toBe('There is no such thing to do.')
  })

  it('refuse a state their plugin cannot read', () => {
    const game = withShells()
    const newer = { ...begin(game), plugins: { shells: { version: 3, state: { weird: true } } } }
    expect(loadState(newer, game)).toBe('That save was made with a newer version of shells.')
  })

  it('can be stopped by a lock, one command or the whole plugin', () => {
    const drop = { type: 'custom' as const, name: 'shells/drop', with: { shell: 'whelk' } }
    const found = (game: Game) => apply(begin(game), game, { type: 'activity', id: 'beachcomb' }).state
    for (const deny of [['shells/drop'], ['shells/*'], ['custom']] as const) {
      const game = { ...withShells(), rules: { locks: [{ when: { all: [] }, deny, reason: 'Not now.' }] } }
      expect(whyNot(found(game), game, drop)).toBe('Not now.')
    }
    const other = { ...withShells(), rules: { locks: [{ when: { all: [] }, deny: ['kites/*' as const], reason: 'Not now.' }] } }
    expect(whyNot(found(other), other, drop)).toBeUndefined()
  })

  it('print their values in prose by full name', () => {
    const game = withShells()
    const found = apply(begin(game), game, { type: 'activity', id: 'beachcomb' }).state
    expect(fillTokens('Shells: {{v:shells/count}}.', found, game)).toBe('Shells: 1.')
  })

  it('run their hooks after the game’s own, and show in the view', () => {
    const game = withShells()
    const night = apply(begin(game), game, { type: 'activity', id: 'rest' })
    expect(shells.read(night.state, game).days).toBe(1)
    expect(view(night.state, game).plugins).toEqual({ shells: { count: 0 } })
  })

  it('carry an older save’s state forward, and refuse one from a newer plugin', async () => {
    const game = withShells()
    const store = saves(game, memoryDriver())
    const old = { ...begin(game), plugins: { shells: { version: 1, state: { count: 2 } } } }
    await store.write('1', old)
    const back = await store.read('1')
    expect(back && typeof back !== 'string' && back.state.plugins.shells).toEqual({
      version: 2,
      state: { found: ['old-0', 'old-1'], days: 0 },
    })
    await store.write('2', { ...begin(game), plugins: { shells: { version: 3, state: {} } } })
    expect(await store.read('2')).toBe('That save was made with a newer version of shells.')
  })

  it('report a save made with a plugin the game no longer has, and keep its state', async () => {
    const game = withShells()
    const text = JSON.stringify({
      ifloom: 1,
      meta: { game: game.id, packs: [], plugins: { shells: 2, kites: 1 } },
      state: { ...begin(game), plugins: { kites: { version: 1, state: { flown: 3 } } } },
    })
    const back = saves(game, memoryDriver()).importText(text)
    expect(back && typeof back !== 'string' && back.missingPlugins).toEqual(['kites'])
    expect(back && typeof back !== 'string' && back.state.plugins.kites).toEqual({ version: 1, state: { flown: 3 } })
  })

  it('take content from packs, merged by id, and check it', () => {
    const { scenes: _s, introScene: _in, items: _i, storylines: _t, activities: _a, stats: _st, actions: _ac, ...base } = withShells()
    const beach: Pack = {
      id: 'beach',
      schema: SCHEMA,
      data: { shells: { spots: [{ id: 'rockpool', when: { storyline: 'tides' } }] } },
    }
    const kites: Pack = { id: 'kites', schema: SCHEMA, data: { kites: { kites: [{ id: 'red' }] } } }
    const { game, problems } = loadGame([beach, kites], base)
    expect(game.data?.shells?.spots).toEqual([{ id: 'rockpool', when: { storyline: 'tides' } }])
    expect(problems).toEqual([
      { pack: 'kites', where: 'data kites', what: 'the game has no plugin named "kites"' },
      { pack: 'beach', where: 'spots rockpool', what: 'unknown storyline "tides"' },
    ])
  })

  it('have their conditions, effects and commands checked like the game’s own', () => {
    const game = {
      ...withShells(),
      actions: [{ id: 'drop', label: 'Drop', command: { type: 'custom' as const, name: 'shells/fling' } }],
    }
    expect(problemsOf(game)).toContain('action drop: no plugin command named "shells/fling"')
    const items = { ...withShells(), items: [{ id: 'cloth', name: 'cloth', desc: '', kind: 'stuff' as const, use: { label: 'Polish', effects: [{ kind: 'custom' as const, name: 'shells/polish' }] } }] }
    expect(problemsOf(items)).toContain('item cloth: no plugin effect named "shells/polish"')
  })
})

describe('plugins working together', () => {
  // A tide table other plugins can ask, and a beach that asks it when it is there.
  const tides = definePlugin<{ high: boolean }>({
    id: 'tides',
    version: 1,
    start: () => ({ high: false }),
    conditions: { high: (_state, _args, { slice }) => slice.high },
    effects: { turn: (_state, _args, { slice, set }) => set({ high: !slice.high }) },
    queries: { next: (_state, args, { slice }) => (slice.high ? 'low' : 'high') + String(args.suffix ?? '') },
  })
  const beach = definePlugin<null>({
    id: 'beach',
    version: 1,
    cooperates: ['tides'],
    view: (_state, { query }) => ({ next: query<string>('tides/next', { suffix: ' tide' }) ?? 'no tides here' }),
  })
  const pack: Pack = {
    id: 'shore',
    schema: SCHEMA,
    activities: [
      { id: 'wade', blocked: [{ when: { not: { 'tides/high': true } }, reason: 'The tide is out.' }], effects: [{ 'tides/turn': true }] },
      { id: 'swim', effects: [{ 'tides/turn': {} }] },
    ],
  }
  const { id, title } = fixture()

  it('call each other in short, and answer queries', () => {
    const { game, problems } = loadGame([pack], { id, title, plugins: [tides, beach] })
    expect(problems).toEqual([])
    const state = startingState(game)
    expect(holds(state, { 'tides/high': true }, game)).toBe(false)
    expect(view(state, game).plugins.beach).toEqual({ next: 'high tide' })
    const swum = apply({ ...state, sceneId: null }, game, { type: 'activity', id: 'swim' }).state
    expect(holds(swum, { 'tides/high': true }, game)).toBe(true)
    expect(holds(swum, { custom: 'tides/high' }, game)).toBe(true)
  })

  it('let content name a partner the game does not have: the loader passes it, and it is not there', () => {
    const { game, problems } = loadGame([pack], { id, title, plugins: [beach] })
    expect(problems).toEqual([])
    const state = { ...startingState(game), sceneId: null }
    expect(view(state, game).plugins.beach).toEqual({ next: 'no tides here' })
    expect(holds(state, { 'tides/high': true }, game)).toBe(false)
    expect(apply(state, game, { type: 'activity', id: 'swim' }).state.plugins).toEqual(state.plugins)
  })

  it('still report a plugin nobody cooperates with', () => {
    const { problems } = loadGame([pack], { id, title })
    expect(problems.map((problem) => problem.what)).toContain('no custom condition named "tides/high"')
    expect(problems.map((problem) => problem.what)).toContain('no custom effect named "tides/turn"')
  })
})

describe('plugins that bring entities and speakers', () => {
  // A choir: its singers are entities of a kind it brings, made from its own content, and it says who is singing.
  const choir = definePlugin<null>({
    id: 'choir',
    version: 1,
    kinds: [{ id: 'singer', label: 'Singer', plural: 'Choir' }],
    entities: (game) =>
      ((game.data?.choir?.singers ?? []) as unknown as { id: string; name: string }[]).map((singer) => ({ id: singer.id, of: 'singer', name: singer.name })),
    speaker: (id, _state, { game }) => {
      const singer = ((game.data?.choir?.singers ?? []) as unknown as { id: string; name: string }[]).find((entry) => entry.id === id)
      return singer ? { id, name: singer.name, hue: 280, portrait: null } : undefined
    },
  })
  const hall: Pack = {
    id: 'hall',
    schema: SCHEMA,
    stats: [{ id: 'voice', label: 'Voice', of: 'singer', start: 3 }],
    entities: [{ id: 'bea', of: 'singer', name: 'Bea the soloist', stats: { voice: 9 } }],
    scenes: [{ id: 'hymn', speaker: 'ann', body: [{ text: 'hymn' }], choices: [] }],
    prose: { hymn: 'A long note.' },
    data: { choir: { singers: [{ id: 'ann', name: 'Ann' }, { id: 'bea', name: 'Bea' }] } },
  }

  it('start with the plugin’s kinds and entities, a game’s own declaration winning', () => {
    const { game, problems } = loadGame([hall], { id: 'hall', title: 'Hall', introScene: 'hymn', plugins: [choir] })
    expect(problems).toEqual([])
    const state = startingState(game)
    expect(state.entities.singer).toEqual({
      bea: { name: 'Bea the soloist', stats: { voice: 9 }, kv: {} },
      ann: { name: 'Ann', stats: { voice: 3 }, kv: {} },
    })
    expect(view(state, game).entities.singer.plural).toBe('Choir')
  })

  it('say who is speaking', () => {
    const { game } = loadGame([hall], { id: 'hall', title: 'Hall', introScene: 'hymn', plugins: [choir] })
    expect(view(startingState(game), game).scene.speaker).toEqual({ id: 'ann', name: 'Ann', hue: 280, portrait: null })
    const { game: plain } = loadGame([hall], { id: 'hall', title: 'Hall', introScene: 'hymn', plugins: [] })
    expect(view(startingState(plain), plain).scene.speaker).toBeNull()
  })
})
