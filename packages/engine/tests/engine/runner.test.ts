import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game } from '../../src/game.ts'
import { proseStore } from '../../src/prose.ts'
import { createRunner, replay } from '../../src/runner.ts'
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
    runner.subscribe(({ state }) => heard.push(String(state.kv.at)))
    expect(runner.apply({ type: 'action', id: 'go-street' }).ok).toBe(true)
    expect(heard).toEqual(['street'])
    expect(runner.snapshot().canUndo).toBe(false)
    expect(runner.undo()).toBe(false)
    expect(runner.snapshot().backlog).toEqual([])
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
    expect(runner.snapshot().canRedo).toBe(false)
  })

  it('never undoes past a barrier: a new turn, an irreversible choice, or a condition', () => {
    const game = fixture()
    const night = createRunner(game, begin(game), { history: { stopAtNewTurn: true } })
    night.apply({ type: 'action', id: 'rest' })
    expect(night.snapshot().canUndo).toBe(false)

    const vow: Game = {
      ...fixture(),
      scenes: [{ id: 'vow', body: [{ prose: 'vow' }], choices: [{ id: 'swear', label: 'Swear it', irreversible: 'For good.', effects: [{ scene: null }] }] }],
    }
    vow.prose = proseStore(vow, { vow: 'Will you?' })
    const sworn = createRunner(vow, begin(vow, { sceneId: 'vow' }), { history: true })
    sworn.apply({ type: 'choose', id: 'swear' })
    expect(sworn.snapshot().canUndo).toBe(false)

    const marked = createRunner(game, begin(game), { history: { stopWhen: { kv: 'at', is: 'shop' } } })
    marked.apply({ type: 'action', id: 'go-street' })
    expect(marked.snapshot().canUndo).toBe(true)
    marked.apply({ type: 'action', id: 'go-shop' })
    expect(marked.snapshot().canUndo).toBe(false)
  })

  it('keeps a backlog of each scene shown, with the choice made in it', () => {
    const { game } = withCafe()
    const runner = createRunner(game, begin(game, { sceneId: 'cafe.counter' }), { backlog: { limit: 5 } })
    runner.apply({ type: 'choose', id: 'chat' })
    runner.apply({ type: 'choose', id: 'leave' })
    // The opening screen, the choice made on it; the screen it redrew to, left.
    expect(runner.snapshot().backlog.map((entry) => [entry.sceneId, entry.chose])).toEqual([
      ['cafe.counter', 'Talk about the weather'],
      ['cafe.counter', 'Leave'],
    ])
    runner.apply({ type: 'action', id: 'go-street' })
    expect(runner.snapshot().backlog).toHaveLength(2)
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

describe('the runner snapshot', () => {
  it('is one value with everything a UI draws, the same object until a part of it changes', () => {
    const game = fixture()
    const runner = createRunner(game, begin(game), { history: true, backlog: true })
    const first = runner.snapshot()
    expect(runner.snapshot()).toBe(first)
    expect(first.view).toBe(runner.view())
    expect(first.state).toBe(runner.state)
    expect(first).toMatchObject({ canUndo: false, canRedo: false, saves: [], helpers: {} })
    const heard: unknown[] = []
    runner.subscribe((snapshot) => heard.push(snapshot))
    runner.apply({ type: 'action', id: 'go-street' })
    const next = runner.snapshot()
    expect(next).not.toBe(first)
    expect(heard).toEqual([next])
    expect(next.canUndo).toBe(true)
    expect(next.view).toBe(runner.view())
    runner.undo()
    expect(runner.snapshot()).toMatchObject({ canUndo: false, canRedo: true })
    expect(Object.isFrozen(runner.snapshot())).toBe(true)
  })

  it('lists the saves once read, and follows every save, autosave and removal', async () => {
    const game = fixture()
    const store = saves(game, memoryDriver())
    await store.write('old', begin(game), { savedAt: 1 })
    const runner = createRunner(game, begin(game), { saves: store, autosave: { every: 'command' } })
    expect(runner.snapshot().saves).toEqual([])
    await runner.settled()
    expect(runner.snapshot().saves.map((entry) => entry.slot)).toEqual(['old'])
    runner.apply({ type: 'action', id: 'go-street' })
    await runner.settled()
    expect(runner.snapshot().saves.map((entry) => entry.slot)).toEqual(['auto', 'old'])
    unwrap(await runner.save('1', 'Mine'))
    expect(runner.snapshot().saves.map((entry) => entry.slot)).toEqual(['1', 'auto', 'old'])
    const before = runner.snapshot()
    await runner.saves!.remove('old')
    expect(runner.snapshot()).not.toBe(before)
    expect(runner.snapshot().saves.map((entry) => entry.slot)).toEqual(['1', 'auto'])
  })

  it('says which choice led to the screen on show, kept while the screen stays, and none after an undo', () => {
    const { game } = withCafe()
    const counter = game.scenes!.find((scene) => scene.id === 'cafe.counter')!
    counter.choices = counter.choices!.map((choice) => (choice.id === 'leave' ? { ...choice, ui: { transition: 'fade' } } : choice))
    const runner = createRunner(game, begin(game, { sceneId: 'cafe.counter' }), { history: true })
    runner.subscribe(() => {})
    expect(runner.snapshot()).toMatchObject({ pressed: null, fresh: false })
    // A choice that keeps the screen leads nowhere new.
    runner.apply({ type: 'choose', id: 'chat' })
    expect(runner.snapshot()).toMatchObject({ pressed: null, fresh: true })
    runner.apply({ type: 'choose', id: 'leave' })
    expect(runner.snapshot().pressed).toMatchObject({ id: 'leave', command: { type: 'choose', id: 'leave' }, ui: { transition: 'fade' } })
    // A command on the same screen keeps what led to it.
    runner.apply({ type: 'action', id: 'wait' })
    expect(runner.snapshot().pressed?.id).toBe('leave')
    runner.undo()
    runner.undo()
    expect(runner.snapshot()).toMatchObject({ pressed: null, fresh: false })
  })

  it('carries what helpers report, by id, and tells listeners only when it changes', () => {
    const game = fixture()
    const runner = createRunner(game, begin(game))
    let told = 0
    runner.subscribe(() => (told += 1))
    const status = { busy: true }
    runner.setHelper('lamp', status)
    runner.setHelper('lamp', status)
    expect(runner.snapshot().helpers).toEqual({ lamp: { busy: true } })
    runner.setHelper('lamp', undefined)
    runner.setHelper('lamp', undefined)
    expect(runner.snapshot().helpers).toEqual({})
    expect(told).toBe(2)
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
        {
          id: 'end',
          body: [{ prose: 'end' }],
          choices: [{ id: 'again', label: 'Play again', command: { type: 'newGame' }, effects: [{ kv: 'after', to: true }] }],
        },
      ],
    }
    game.prose = proseStore(game, { end: 'The end.' })
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
    expect(runner.snapshot().canUndo).toBe(false)
    expect(runner.snapshot().backlog).toEqual([])
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
