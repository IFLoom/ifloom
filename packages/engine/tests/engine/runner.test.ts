import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { proseStore } from '../../src/prose.ts'
import { browserRunner, createRunner, replay } from '../../src/runner.ts'
import { saves } from '../../src/save.ts'
import { withCafe } from '../fixtures/cafe.ts'
import { begin, fixture } from '../fixtures/town.ts'

describe('the runner', () => {
  it('runs commands and tells listeners, with nothing else on by default', () => {
    const game = fixture()
    const runner = createRunner(game, begin(game))
    const heard: string[] = []
    runner.subscribe((state) => heard.push(String(state.flags.at)))
    expect(runner.apply({ type: 'activity', id: 'go-street' }).ok).toBe(true)
    expect(heard).toEqual(['street'])
    expect(runner.canUndo).toBe(false)
    expect(runner.undo()).toBe(false)
    expect(runner.backlog()).toEqual([])
  })

  it('undoes and redoes when the game turns history on, as deep as it says', () => {
    const game = fixture()
    const runner = createRunner(game, begin(game), { history: { depth: 2 } })
    runner.apply({ type: 'activity', id: 'go-street' })
    runner.apply({ type: 'activity', id: 'go-house' })
    runner.apply({ type: 'activity', id: 'go-street' })
    expect(runner.undo()).toBe(true)
    expect(runner.undo()).toBe(true)
    expect(runner.state.flags.at).toBe('street')
    expect(runner.undo()).toBe(false)
    expect(runner.redo()).toBe(true)
    expect(runner.state.flags.at).toBe('house')
    runner.apply({ type: 'activity', id: 'go-street' })
    expect(runner.canRedo).toBe(false)
  })

  it('never undoes past a barrier: a new turn, an irreversible choice, or a condition', () => {
    const game = fixture()
    const night = createRunner(game, begin(game), { history: { stopAtNewTurn: true } })
    night.apply({ type: 'activity', id: 'rest' })
    expect(night.canUndo).toBe(false)

    const vow: Game = {
      ...fixture(),
      scenes: [{ id: 'vow', body: [{ text: 'vow' }], choices: [{ id: 'swear', irreversible: 'For good.', effects: [{ kind: 'scene', id: null }] }] }],
    }
    vow.prose = proseStore(vow, { vow: 'Will you?', 'vow#swear': 'Swear it' })
    const sworn = createRunner(vow, begin(vow, { sceneId: 'vow' }), { history: true })
    sworn.apply({ type: 'choose', id: 'swear' })
    expect(sworn.canUndo).toBe(false)

    const marked = createRunner(game, begin(game), { history: { stopWhen: { flag: 'at', is: 'shop' } } })
    marked.apply({ type: 'activity', id: 'go-street' })
    expect(marked.canUndo).toBe(true)
    marked.apply({ type: 'activity', id: 'go-shop' })
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
    runner.apply({ type: 'activity', id: 'go-street' })
    expect(runner.backlog()).toHaveLength(2)
  })

  it('logs every command, and the log replays to the same state', () => {
    const game = fixture()
    const runner = createRunner(game, begin(game))
    runner.apply({ type: 'activity', id: 'go-street' })
    runner.apply({ type: 'activity', id: 'wait' })
    runner.apply({ type: 'activity', id: 'go-nowhere' })
    expect(runner.log().commands).toHaveLength(2)
    expect(replay(game, runner.log())).toEqual(runner.state)
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
    runner.apply({ type: 'activity', id: 'go-street' })
    runner.apply({ type: 'activity', id: 'go-house' })
    await runner.settled()
    expect(await store.read('auto')).toBeNull()
    clock = 60_000
    runner.apply({ type: 'activity', id: 'rest' })
    await runner.settled()
    const auto = await store.read('auto')
    expect(auto && typeof auto !== 'string' && auto.meta.played).toBe(60_000)

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
    const driver = { ...memoryDriver(), set: async (key: string, value: string) => { if (fail) throw new Error('disk full'); await inner.set(key, value) } }
    const inner = memoryDriver()
    const store = saves(game, { ...driver, get: inner.get, keys: inner.keys, remove: inner.remove })
    const errors: unknown[] = []
    const runner = createRunner(game, begin(game), { saves: store, autosave: { every: 'command' }, onSaveError: (error) => errors.push(error) })
    runner.apply({ type: 'activity', id: 'go-street' })
    await runner.settled()
    expect(errors).toHaveLength(1)
    fail = false
    runner.apply({ type: 'activity', id: 'go-house' })
    await runner.settled()
    const auto = await store.read('auto')
    expect(auto && typeof auto !== 'string' && auto.state.flags.at).toBe('house')
  })

  it('autosaves after an undo, as after a command', async () => {
    const game = fixture()
    const store = saves(game, memoryDriver())
    const runner = createRunner(game, begin(game), { saves: store, history: true, autosave: { every: 'command' } })
    runner.apply({ type: 'activity', id: 'go-street' })
    runner.undo()
    await runner.settled()
    const auto = await store.read('auto')
    expect(auto && typeof auto !== 'string' && auto.state.flags.at).toBe('house')
  })

  it('puts an imported save in play', async () => {
    const game = fixture()
    const elsewhere = saves(game, memoryDriver())
    await elsewhere.write('1', begin(game, { flags: { at: 'shop' } }), { played: 9000 })
    const imported = elsewhere.importText((await elsewhere.exportSlot('1'))!)
    if (typeof imported === 'string') throw new Error(imported)
    const runner = createRunner(game, begin(game), { now: () => 0 })
    runner.restore(imported)
    expect(runner.state.flags.at).toBe('shop')
    expect(runner.played()).toBe(9000)
  })

  it('starts a browser game with undo, saves and an autosave each turn, any of which a game can change', async () => {
    const game = fixture()
    const store = saves(game, memoryDriver())
    const runner = browserRunner(game, { saves: store })
    expect(runner.offers.undo).toBe(true)
    expect(runner.saves).toBe(store)
    expect(typeof runner.state.seed).toBe('number')
    const plain = browserRunner(game, { history: false, saves: store, start: { ...runner.state, seed: 7 } })
    expect(plain.offers.undo).toBe(false)
    expect(plain.state.seed).toBe(7)
  })
})
