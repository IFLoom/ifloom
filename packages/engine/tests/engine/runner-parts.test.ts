import { describe, expect, it } from 'vitest'
import { memoryDriver } from '../../src/drivers.ts'
import type { Game, SettingDef } from '../../src/game.ts'
import { startingState } from '../../src/intake.ts'
import { definePlugin } from '../../src/plugin.ts'
import { profile } from '../../src/profile.ts'
import { profileKeeper } from '../../src/runner/profile.ts'
import { settingsKeeper } from '../../src/runner/settings.ts'
import { fixture } from '../fixtures/town.ts'

/**
 * The runner's settings and profile, each on its own: no history, backlog or
 * saves, only a game, a profile and what they tell.
 */

const SETTINGS: SettingDef[] = [
  { id: 'hints', label: 'Hints', type: 'toggle', default: true },
  { id: 'volume', label: 'Volume', type: 'range', min: 0, max: 10, default: 5, affects: 'ui' },
]

function game(patch: Partial<Game> = {}): Game {
  return { ...fixture(), settings: SETTINGS, ...patch }
}

describe('the runner’s settings', () => {
  it('reads play settings from the state and ui settings from the profile, once it’s read', async () => {
    const played = game()
    const stored = profile(played, memoryDriver())
    await stored.set('core:settings', { volume: 8, hints: false })
    const kept = profileKeeper(played, { profile: stored, now: () => 0, onShown: () => {} })
    let told = 0
    const settings = settingsKeeper(played, kept, () => (told += 1))
    const state = startingState(played)
    expect(settings.values(state)).toEqual({ hints: true, volume: 5 })
    await kept.settled()
    expect(told).toBe(1)
    // The state keeps the play setting; the profile only the ui one, and the play one for the next game.
    expect(settings.values(state)).toEqual({ hints: true, volume: 8 })
    expect(settings.stored()).toEqual({ volume: 8, hints: false })
    expect(settings.values(state)).toBe(settings.values(state))
  })

  it('sends a play setting as a command, writes a ui one to the profile, and refuses what doesn’t fit', async () => {
    const played = game()
    const stored = profile(played, memoryDriver())
    const kept = profileKeeper(played, { profile: stored, now: () => 0, onShown: () => {} })
    let told = 0
    const settings = settingsKeeper(played, kept, () => (told += 1))
    expect(settings.change('hints', false)).toEqual({ command: { type: 'setting', id: 'hints', to: false } })
    expect(settings.change('volume', 3)).toEqual({ ok: true, value: 3 })
    expect(told).toBe(1)
    expect(settings.values(startingState(played)).volume).toBe(3)
    await kept.settled()
    expect(await stored.get('core:settings')).toEqual({ volume: 3 })
    expect(settings.change('volume', 30)).toMatchObject({ ok: false })
    expect(settings.change('nope', 1)).toMatchObject({ ok: false })
  })

  it('without a profile, reads every ui setting as its default and refuses to change one', () => {
    const played = game()
    const settings = settingsKeeper(played, profileKeeper(played, { now: () => 0, onShown: () => {} }), () => {})
    expect(settings.values(startingState(played))).toEqual({ hints: true, volume: 5 })
    expect(settings.change('volume', 3)).toEqual({ ok: false, reason: expect.any(String) })
    expect(settings.stored()).toBeUndefined()
  })
})

describe('the runner’s profile', () => {
  const lamp = definePlugin<{ lit: boolean }>({
    id: 'lamp',
    version: 1,
    start: () => ({ lit: false }),
    view: (_state, { profile: seen }) => ({ times: (seen as { times?: number } | undefined)?.times ?? 0 }),
    profile: (_after, _before, stored) => ({ times: ((stored as { times?: number } | undefined)?.times ?? 0) + 1 }),
  })

  it('shows each plugin with a view its namespace, frozen, and says when it reads differently', async () => {
    const played = game({ plugins: [lamp] })
    const stored = profile(played, memoryDriver())
    await stored.set('lamp', { times: 2 })
    const shown: string[] = []
    const kept = profileKeeper(played, { profile: stored, now: () => 0, onShown: (plugin) => shown.push(plugin.id) })
    expect(kept.shown()).toEqual({})
    await kept.settled()
    expect(kept.shown()).toEqual({ lamp: { times: 2 } })
    expect(Object.isFrozen(kept.shown().lamp)).toBe(true)
    await stored.set('lamp', { times: 2 })
    expect(shown).toEqual(['lamp'])
  })

  it('records a command in each plugin’s namespace and the game’s finish, once', async () => {
    const played = game({ plugins: [lamp], finished: { kv: 'done' } })
    const stored = profile(played, memoryDriver())
    const kept = profileKeeper(played, { profile: stored, now: () => 42, onShown: () => {} })
    const before = startingState(played)
    const after = { ...before, kv: { ...before.kv, done: true } }
    kept.record(before, after, { type: 'action', id: 'wait' })
    kept.record(after, after, { type: 'action', id: 'wait' })
    await kept.settled()
    expect(await stored.get('lamp')).toEqual({ times: 2 })
    expect(await stored.get('core:finished')).toEqual({ at: 42 })
  })

  it('follows a namespace: what it holds once read, then every write, a write while reading being newer', async () => {
    const played = game()
    const stored = profile(played, memoryDriver())
    await stored.set('core:settings', { volume: 1 })
    const kept = profileKeeper(played, { profile: stored, now: () => 0, onShown: () => {} })
    const heard: unknown[] = []
    kept.follow('core:settings', (value) => heard.push(value))
    void stored.set('core:settings', { volume: 9 })
    await kept.settled()
    expect(heard).toEqual([{ volume: 9 }])
  })
})
