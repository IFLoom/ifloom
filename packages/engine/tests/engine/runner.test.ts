import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { proseStore } from '../../src/prose.ts'
import { browserRunner, createRunner, replay } from '../../src/runner.ts'
import { profile } from '../../src/profile.ts'
import { saves } from '../../src/save.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { unwrap } from '../fixtures/result.ts'
import { apply } from '../../src/reduce.ts'
import { checkGame } from '../../src/check.ts'
import { SCHEMA } from '../../src/upgrade.ts'

describe('the runner', () => {
  it('runs commands and tells listeners, with nothing else on by default', () => {
    const game = fixture()
    const runner = createRunner(game, begin(game))
    const heard: string[] = []
    runner.subscribe((state) => heard.push(String(state.kv.at)))
    expect(runner.apply({ type: 'action', id: 'go-street' }).ok).toBe(true)
    expect(heard).toEqual(['street'])
    expect(runner.canUndo).toBe(false)
    expect(runner.undo()).toBe(false)
    expect(runner.backlog()).toEqual([])
  })

  it('undoes and redoes when the game turns history on, as deep as it says', () => {
    const game = fixture()
    const runner = createRunner(game, begin(game), { history: { depth: 2 } })
    runner.apply({ type: 'action', id: 'go-street' })
    runner.apply({ type: 'action', id: 'go-house' })
    runner.apply({ type: 'action', id: 'go-street' })
    expect(runner.undo()).toBe(true)
    expect(runner.undo()).toBe(true)
    expect(runner.state.kv.at).toBe('street')
    expect(runner.undo()).toBe(false)
    expect(runner.redo()).toBe(true)
    expect(runner.state.kv.at).toBe('house')
    runner.apply({ type: 'action', id: 'go-street' })
    expect(runner.canRedo).toBe(false)
  })

  it('never undoes past a barrier: a new turn, an irreversible choice, or a condition', () => {
    const game = fixture()
    const night = createRunner(game, begin(game), { history: { stopAtNewTurn: true } })
    night.apply({ type: 'action', id: 'rest' })
    expect(night.canUndo).toBe(false)

    const vow: Game = {
      ...fixture(),
      scenes: [{ id: 'vow', body: [{ text: 'vow' }], choices: [{ id: 'swear', irreversible: 'For good.', effects: [{ kind: 'scene', scene: null }] }] }],
    }
    vow.prose = proseStore(vow, { vow: 'Will you?', 'vow#swear': 'Swear it' })
    const sworn = createRunner(vow, begin(vow, { sceneId: 'vow' }), { history: true })
    sworn.apply({ type: 'choose', id: 'swear' })
    expect(sworn.canUndo).toBe(false)

    const marked = createRunner(game, begin(game), { history: { stopWhen: { kv: 'at', is: 'shop' } } })
    marked.apply({ type: 'action', id: 'go-street' })
    expect(marked.canUndo).toBe(true)
    marked.apply({ type: 'action', id: 'go-shop' })
    expect(marked.canUndo).toBe(false)
  })

  it('keeps a backlog of each scene shown, with the choice made in it', () => {
    const { game } = withCafe()
    const runner = createRunner(game, begin(game, { sceneId: 'cafe.counter' }), { backlog: { limit: 5 } })
    runner.apply({ type: 'choose', id: 'chat' })
    runner.apply({ type: 'choose', id: 'leave' })
    // The opening screen, the choice made on it; the screen it redrew to, left.
    expect(runner.backlog().map((entry) => [entry.sceneId, entry.chose])).toEqual([
      ['cafe.counter', 'Talk about the weather'],
      ['cafe.counter', 'Leave'],
    ])
    runner.apply({ type: 'action', id: 'go-street' })
    expect(runner.backlog()).toHaveLength(2)
  })

  it('logs every command, and the log replays to the same state', () => {
    const game = fixture()
    const runner = createRunner(game, begin(game))
    runner.apply({ type: 'action', id: 'go-street' })
    runner.apply({ type: 'action', id: 'wait' })
    runner.apply({ type: 'action', id: 'go-nowhere' })
    expect(runner.log().commands).toHaveLength(2)
    expect(unwrap(replay(game, runner.log()))).toEqual(runner.state)
  })

  it('autosaves only when the game asks, and loads a save back with its time played', async () => {
    const game = fixture()
    const store = saves(game, memoryDriver())
    let clock = 0
    const runner = createRunner(game, begin(game), {
      saves: store,
      autosave: { every: 'turn' },
      now: () => clock,
    })
    runner.apply({ type: 'action', id: 'go-street' })
    runner.apply({ type: 'action', id: 'go-house' })
    await runner.settled()
    expect(await store.read('auto')).toEqual({ ok: true, value: null })
    clock = 60_000
    runner.apply({ type: 'action', id: 'rest' })
    await runner.settled()
    const auto = await store.read('auto')
    expect(auto.ok && auto.value?.meta.played).toBe(60_000)

    const fresh = createRunner(game, begin(game), { saves: store, now: () => 0 })
    await fresh.load('auto')
    expect(fresh.state).toEqual(runner.state)
    expect(fresh.played()).toBe(60_000)
  })
})

describe('the runner when saving goes wrong, or comes from elsewhere', () => {
  it('reports a failed write and keeps saving after it', async () => {
    const game = fixture()
    let fail = true
    const driver = {
      ...memoryDriver(),
      set: async (key: string, value: string) => {
        if (fail) throw new Error('disk full')
        await inner.set(key, value)
      },
    }
    const inner = memoryDriver()
    const store = saves(game, { ...driver, get: inner.get, keys: inner.keys, remove: inner.remove })
    const errors: unknown[] = []
    const runner = createRunner(game, begin(game), { saves: store, autosave: { every: 'command' }, onSaveError: (error) => errors.push(error) })
    runner.apply({ type: 'action', id: 'go-street' })
    await runner.settled()
    expect(errors).toHaveLength(1)
    fail = false
    runner.apply({ type: 'action', id: 'go-house' })
    await runner.settled()
    const auto = await store.read('auto')
    expect(auto.ok && auto.value?.state.kv.at).toBe('house')
  })

  it('autosaves after an undo, as after a command', async () => {
    const game = fixture()
    const store = saves(game, memoryDriver())
    const runner = createRunner(game, begin(game), { saves: store, history: true, autosave: { every: 'command' } })
    runner.apply({ type: 'action', id: 'go-street' })
    runner.undo()
    await runner.settled()
    const auto = await store.read('auto')
    expect(auto.ok && auto.value?.state.kv.at).toBe('house')
  })

  it('puts an imported save in play', async () => {
    const game = fixture()
    const elsewhere = saves(game, memoryDriver())
    await elsewhere.write('1', begin(game, { kv: { at: 'shop' } }), { played: 9000 })
    const imported = unwrap(elsewhere.importText((await elsewhere.exportSlot('1'))!))
    const runner = createRunner(game, begin(game), { now: () => 0 })
    runner.restore(imported)
    expect(runner.state.kv.at).toBe('shop')
    expect(runner.played()).toBe(9000)
  })

  it('starts a browser game with undo, saves and an autosave each turn, any of which a game can change', async () => {
    const game = fixture()
    const store = saves(game, memoryDriver())
    const runner = await browserRunner(game, { saves: store, profile: undefined })
    expect(runner.offers.undo).toBe(true)
    expect(runner.saves).toBe(store)
    expect(typeof runner.state.seed).toBe('number')
    const plain = await browserRunner(game, { history: false, saves: store, profile: undefined, start: { ...runner.state, seed: 7 } })
    expect(plain.offers.undo).toBe(false)
    expect(plain.state.seed).toBe(7)
  })

  it('starts a browser game with the settings in its profile', async () => {
    const game: Game = {
      ...fixture(),
      settings: [
        { id: 'hints', label: 'Hints', kind: 'toggle', default: true },
        { id: 'volume', label: 'Volume', kind: 'range', min: 0, max: 10, affects: 'ui', default: 5 },
      ],
    }
    const prof = profile(game, memoryDriver())
    await prof.set('core:settings', { hints: false, volume: 2 })
    const runner = await browserRunner(game, { saves: saves(game, memoryDriver()), profile: prof })
    expect(runner.state.settings).toEqual({ hints: false })
    expect(runner.settings()).toEqual({ hints: false, volume: 2 })
  })

  it('answers a save, a load and a missing store with a result, never a throw', async () => {
    const game = fixture()
    const bare = createRunner(game, begin(game))
    expect(await bare.save('1')).toEqual({ ok: false, reason: 'This game keeps no saves.' })
    expect(await bare.load('1')).toEqual({ ok: false, reason: 'This game keeps no saves.' })
    const runner = createRunner(game, begin(game), { saves: saves(game, memoryDriver()) })
    expect(await runner.load('1')).toEqual({ ok: false, reason: 'Nothing is saved there.' })
    const saved = await runner.save('1', 'Mine')
    expect(saved.ok && saved.value.name).toBe('Mine')
    expect((await runner.load('1')).ok).toBe(true)
    let heard: unknown
    const broken = createRunner(game, begin(game), {
      saves: { ...saves(game, memoryDriver()), write: () => Promise.reject(new Error('full')) },
      onSaveError: (error) => (heard = error),
    })
    expect(await broken.save('1')).toEqual({ ok: false, reason: 'The game could not be saved.' })
    expect(heard).toEqual(new Error('full'))
  })
})

describe('the game’s say in saving', () => {
  // No saving in Rosa's scene: the reason is the player's to read.
  const policed = (): Game => ({
    ...fixture(),
    saveable: [
      { when: { scene: ['rosa.hello'] }, reason: 'Finish talking to Rosa first.' },
      { when: { kv: 'at', is: 'shop' }, reason: 'Not in the shop.', hide: true },
    ],
  })

  it('refuses a save with the reason, and shows it in the view first', async () => {
    const game = policed()
    const store = saves(game, memoryDriver())
    const runner = createRunner(game, begin(game, { sceneId: 'rosa.hello' }), { saves: store })
    expect(runner.view().saving).toEqual({ allowed: false, reason: 'Finish talking to Rosa first.', visible: true })
    expect(await runner.save('one')).toEqual({ ok: false, reason: 'Finish talking to Rosa first.' })
    expect(await store.read('one')).toEqual({ ok: true, value: null })
    runner.apply({ type: 'choose', id: 'bye' })
    expect(runner.view().saving).toEqual({ allowed: true, reason: null, visible: true })
    expect((await runner.save('one')).ok).toBe(true)
    runner.apply({ type: 'action', id: 'go-shop' })
    expect(runner.view().saving).toEqual({ allowed: false, reason: 'Not in the shop.', visible: false })
  })

  it('skips an autosave while saving is refused, and saves at the next one due', async () => {
    const game = policed()
    const store = saves(game, memoryDriver())
    const runner = createRunner(game, begin(game), { saves: store, autosave: { every: 'command' } })
    runner.apply({ type: 'scene', id: 'rosa.hello' })
    await runner.settled()
    expect(await store.read('auto')).toEqual({ ok: true, value: null })
    runner.apply({ type: 'choose', id: 'bye' })
    await runner.settled()
    const auto = await store.read('auto')
    expect(auto.ok && auto.value?.state.sceneId).toBe(null)
  })

  it('reports a condition in saveable that names what the game does not have', () => {
    const game: Game = { ...fixture(), saveable: [{ when: { seen: 'nowhere' }, reason: 'No.' }] }
    expect(checkGame(game).problems.map((problem) => `${problem.where}: ${problem.what}`)).toContain('saveable: gated on unknown scene "nowhere"')
  })
})

describe('starting over from content', () => {
  // The end: a choice that starts a new game, after an effect that would otherwise apply.
  const ending = (): Game => {
    const game: Game = {
      ...fixture(),
      scenes: [
        ...fixture().scenes,
        { id: 'end', body: [{ text: 'end' }], choices: [{ id: 'again', command: { type: 'newGame' }, effects: [{ kind: 'kv', key: 'after', to: true }] }] },
      ],
    }
    game.prose = proseStore(game, { end: 'The end.', 'end#again': 'Play again' })
    return game
  }

  it('starts a new game in a runner, from a choice or on its own, keeping the settings and a fresh log', async () => {
    const game = ending()
    const runner = createRunner(game, begin(game, { sceneId: 'end', turn: 9 }), { history: true, backlog: true })
    expect(runner.view().scene.choices[0]).toMatchObject({ label: 'Play again', disabled: undefined })
    const started = runner.apply({ type: 'choose', id: 'again' })
    expect(started.ok).toBe(true)
    expect(runner.state).toMatchObject({ turn: 0, sceneId: 'start' })
    expect(runner.state.kv.after).toBeUndefined()
    expect(runner.log()).toEqual({ game: game.id, start: runner.state, commands: [], schema: SCHEMA, plugins: {} })
    expect(runner.canUndo).toBe(false)
    expect(runner.backlog()).toEqual([])
    runner.apply({ type: 'action', id: 'read' })
    expect(runner.apply({ type: 'newGame' }).ok).toBe(true)
    expect(runner.state.stats.intelligence).toBe(5)
  })

  it('makes the new game itself in apply, the same each time, and says so', () => {
    const game = ending()
    const at = begin(game, { sceneId: 'end', turn: 9 })
    const first = apply(at, game, { type: 'choose', id: 'again' })
    expect(first).toMatchObject({ ok: true, newGame: true, state: { turn: 0, sceneId: 'start' } })
    expect(first.state.seen).toEqual({ start: { n: 1, first: 0, last: 0 } })
    expect(apply(at, game, { type: 'choose', id: 'again' }).state).toEqual(first.state)
    expect(first.state.seed).not.toBe(at.seed)
  })
})
