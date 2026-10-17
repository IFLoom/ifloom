import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game, SettingDef } from '../../src/game.ts'
import { definePlugin } from '../../src/plugin.ts'
import { profile } from '../../src/profile.ts'
import { startingState } from '../../src/intake.ts'
import { createRunner } from '../../src/runner.ts'
import { holds } from '../../src/condition.ts'
import { view } from '../../src/view.ts'
import { begin, fixture } from '../fixtures/town.ts'

const SETTINGS: SettingDef[] = [
  { id: 'hints', label: 'Hints', kind: 'toggle', default: true },
  {
    id: 'textSize',
    label: 'Text size',
    kind: 'choice',
    affects: 'ui',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'large', label: 'Large' },
    ],
    default: 'small',
  },
]

function game(patch: Partial<Game> = {}): Game {
  return { ...fixture(), settings: SETTINGS, ...patch }
}

describe('the profile', () => {
  it('keeps namespaces as one JSON object at the game’s key', async () => {
    const driver = memoryDriver()
    const prof = profile(game(), driver)
    expect(await prof.get('core:settings')).toBeUndefined()
    await prof.set('core:settings', { hints: false })
    await prof.set('core:finished', { at: 5 })
    expect(await prof.get('core:settings')).toEqual({ hints: false })
    expect(JSON.parse((await driver.get('fixture.profile'))!)).toEqual({ 'core:settings': { hints: false }, 'core:finished': { at: 5 } })
    // A second profile on the same driver reads what the first wrote.
    expect(await profile(game(), driver).get('core:finished')).toEqual({ at: 5 })
    await prof.set('core:finished', undefined)
    expect(await prof.get('core:finished')).toBeUndefined()
  })

  it('updates in order, and tells subscribers', async () => {
    const prof = profile(game(), memoryDriver())
    const heard: [string, unknown][] = []
    const stop = prof.subscribe((namespace, value) => heard.push([namespace, value]))
    await Promise.all([
      prof.update<number>('count', (n) => (n ?? 0) + 1),
      prof.update<number>('count', (n) => (n ?? 0) + 1),
    ])
    expect(await prof.get('count')).toBe(2)
    expect(await prof.update<number>('count', () => undefined)).toBe(2)
    stop()
    await prof.set('count', 9)
    expect(heard).toEqual([
      ['count', 1],
      ['count', 2],
    ])
  })

  it('starts again empty when what is stored is not JSON', async () => {
    const driver = memoryDriver()
    await driver.set('fixture.profile', 'not json')
    expect(await profile(game(), driver).get('core:settings')).toBeUndefined()
  })

  it('moves a profile stored before the core: and ui: prefixes, once', async () => {
    const driver = memoryDriver()
    const old = { settings: { hints: false }, finished: { at: 5 }, gate: { confirmedAt: 1 }, achievements: { earned: ['a'] } }
    await driver.set('fixture.profile', JSON.stringify(old))
    const prof = profile(game(), driver)
    expect(await prof.get('core:settings')).toEqual({ hints: false })
    expect(await prof.get('settings')).toBeUndefined()
    expect(JSON.parse((await driver.get('fixture.profile'))!)).toEqual({
      'core:settings': { hints: false },
      'core:finished': { at: 5 },
      'ui:gate': { confirmedAt: 1 },
      achievements: { earned: ['a'] },
    })
  })
})

describe('the runner and the profile', () => {
  it('writes a play setting to the profile when the setting command takes', async () => {
    const g = game()
    const prof = profile(g, memoryDriver())
    const runner = createRunner(g, begin(g), { profile: prof })
    expect(runner.profile).toBe(prof)
    runner.apply({ type: 'setting', id: 'hints', to: false })
    runner.apply({ type: 'setting', id: 'hints', to: 'maybe' })
    await runner.settled()
    expect(await prof.get('core:settings')).toEqual({ hints: false })
  })

  it('writes a ui setting to the profile only, and refuses one it cannot take', async () => {
    const g = game()
    const prof = profile(g, memoryDriver())
    const runner = createRunner(g, begin(g), { profile: prof })
    const before = runner.state
    expect(runner.setUiSetting('textSize', 'large')).toBeUndefined()
    expect(runner.setUiSetting('textSize', 'huge')).toBe('That is not one of the options.')
    expect(runner.setUiSetting('hints', false)).toBe('That setting changes the game, so it is set with a command.')
    await runner.settled()
    expect(await prof.get('core:settings')).toEqual({ textSize: 'large' })
    expect(runner.state).toBe(before)
    expect(runner.log().commands).toEqual([])
    expect(() => createRunner(g, begin(g)).setUiSetting('textSize', 'large')).toThrow()
  })

  it('records finished once, the first time it holds', async () => {
    const g = game({ finished: { stat: 'intelligence', gte: 9 } })
    const prof = profile(g, memoryDriver())
    let clock = 100
    const runner = createRunner(g, begin(g), { profile: prof, now: () => clock })
    runner.apply({ type: 'activity', id: 'read' })
    await runner.settled()
    expect(await prof.get('core:finished')).toBeUndefined()
    clock = 200
    runner.apply({ type: 'activity', id: 'read' })
    clock = 300
    runner.apply({ type: 'activity', id: 'read' })
    await runner.settled()
    expect(await prof.get('core:finished')).toEqual({ at: 200 })
    // A later runner, a later game: still the first time.
    const again = createRunner(g, startingState(g, { carry: runner.state }), { profile: prof, now: () => 999 })
    again.apply({ type: 'activity', id: 'read' })
    again.apply({ type: 'activity', id: 'read' })
    await again.settled()
    expect(await prof.get('core:finished')).toEqual({ at: 200 })
  })

  it('starts a new game with the profile’s settings, fresh log and history', async () => {
    const g = game()
    const prof = profile(g, memoryDriver())
    await prof.set('core:settings', { hints: false, textSize: 'large' })
    const runner = createRunner(g, begin(g), { profile: prof, history: true })
    runner.apply({ type: 'activity', id: 'read' })
    const fresh = await runner.newGame({ seed: 7 })
    expect(fresh.settings).toEqual({ hints: false })
    expect(fresh.seed).toBe(7)
    expect(runner.state).toBe(fresh)
    expect(runner.log().commands).toEqual([])
    expect(runner.canUndo).toBe(false)
    expect((await runner.newGame({ settings: { hints: true } })).settings).toEqual({ hints: true })
  })

  it('lets a plugin keep its own namespace, written after each command that took', async () => {
    const reading = definePlugin({
      id: 'reading',
      version: 1,
      profile: (state, previous, stored) => {
        const books = (stored as string[] | undefined) ?? []
        if (state.stats.intelligence > previous.stats.intelligence && !books.includes(`turn${state.turn}`)) return [...books, `turn${state.turn}`]
        return undefined
      },
    })
    const g = game({ plugins: [reading] })
    const prof = profile(g, memoryDriver())
    await prof.set('reading', ['old'])
    const runner = createRunner(g, begin(g), { profile: prof })
    runner.apply({ type: 'activity', id: 'read' })
    runner.apply({ type: 'activity', id: 'wait' })
    runner.apply({ type: 'activity', id: 'rest' })
    runner.apply({ type: 'activity', id: 'read' })
    runner.apply({ type: 'activity', id: 'nowhere' })
    await runner.settled()
    expect(await prof.get('reading')).toEqual(['old', 'turn2', 'turn3'])
  })

  it('shows a plugin’s view its own namespace, read-only, and nothing else of the profile', async () => {
    const seen: Record<string, unknown> = {}
    const shelf = definePlugin({
      id: 'shelf',
      version: 1,
      conditions: { remembers: (_state, _args, context) => ((seen.condition = context.profile), false) },
      view: (_state, context) => ({ books: context.profile ?? null }),
    })
    const g = game({ plugins: [shelf] })
    const prof = profile(g, memoryDriver())
    await prof.set('shelf', ['atlas'])
    await prof.set('core:settings', { hints: false })
    const runner = createRunner(g, begin(g), { profile: prof })
    // Read when the runner starts: the view built before then has none.
    expect(runner.view().plugins.shelf).toEqual({ books: null })
    await runner.settled()
    const books = (runner.view().plugins.shelf as { books: string[] }).books
    expect(books).toEqual(['atlas'])
    expect(Object.isFrozen(books)).toBe(true)
    expect(() => books.push('novel')).toThrow()
    expect(await prof.get('shelf')).toEqual(['atlas'])
    // Conditions never see it, and nor does a view built without the runner.
    holds(runner.state, { custom: 'shelf/remembers' }, g)
    expect(seen.condition).toBeUndefined()
    expect(view(runner.state, g).plugins.shelf).toEqual({ books: null })
    // A write is followed: a new view of the same state, and listeners told.
    let told = 0
    runner.subscribe(() => told++)
    const before = runner.view()
    await prof.set('shelf', ['atlas', 'novel'])
    expect(told).toBe(1)
    expect(runner.view()).not.toBe(before)
    expect(runner.view().plugins.shelf).toEqual({ books: ['atlas', 'novel'] })
    // Another namespace changing tells nobody.
    await prof.set('core:settings', { hints: true })
    expect(told).toBe(1)
  })

  it('reports a profile that fails to write, and carries on', async () => {
    const g = game()
    const broken = { ...memoryDriver(), set: async () => Promise.reject(new Error('full')) }
    const errors: unknown[] = []
    const runner = createRunner(g, begin(g), { profile: profile(g, broken), onSaveError: (error) => errors.push(error) })
    runner.apply({ type: 'setting', id: 'hints', to: false })
    await runner.settled()
    expect(errors).toHaveLength(1)
    expect(runner.state.settings.hints).toBe(false)
  })
})
