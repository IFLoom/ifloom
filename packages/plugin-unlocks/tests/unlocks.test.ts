import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  apply,
  createRunner,
  holds,
  loadGame,
  memoryDriver,
  profile,
  replay,
  startingState,
  view,
  type Content,
  type Game,
  type Pack,
} from '@ifloom/engine'
import {
  ITERATIONS,
  codeFits,
  contentScript,
  envName,
  hasUnlock,
  lockContent,
  lockedContent,
  normaliseCode,
  recordUnlock,
  startUnlocks,
  unlockDefs,
  unlockHash,
  unlockedPacks,
  unlocks,
  type LockedContent,
  type UnlockDef,
} from '../src/index.ts'

const CODE = 'BREAD-2026-KEY'
const GAME = 'unlocks-town'
// Few rounds, so the tests are quick; a real unlock leaves `iterations` out.
const FAST = 1000

async function def(extra: Partial<UnlockDef> = {}): Promise<UnlockDef> {
  const base = { id: 'supporter', label: 'Supporter edition', iterations: FAST, ...extra }
  return { ...base, hash: await unlockHash(CODE, GAME, base), ...extra }
}

/** The supporter content: one scene, with a line of prose that must never be in the build. */
const supporterPack: Pack = {
  id: 'supporter',
  schema: SCHEMA,
  scenes: [{ id: 'supporter.lounge', title: 'The back room', body: [{ text: 'supporter.lounge' }], choices: [] }],
  prose: { 'supporter.lounge': 'Behind the bakery a narrow door opens on a room that smells of cinnamon.' },
}

function build(unlockDefs: UnlockDef[], packs: Pack[] = []): Game {
  const town: Content = {
    scenes: [{ id: 'intro', body: [], choices: [] }],
    activities: [{ id: 'rest', effects: [{ kind: 'turn' }] }],
    data: { unlocks: { unlocks: unlockDefs } },
  }
  const loaded = loadGame([town], { id: GAME, title: 'Unlocks town', plugins: [unlocks()] }, { packs })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

function runnerFor(game: Game, driver = memoryDriver()) {
  return createRunner(game, { ...startingState(game, { seed: 1 }), sceneId: null }, { history: true, profile: profile(game, driver) })
}

describe('codes and hashes', () => {
  it('normalises a code: case, spaces and hyphens do not matter', () => {
    expect(normaliseCode(' bread-2026 key ')).toBe('BREAD2026KEY')
    expect(normaliseCode('Bread 2026—Key')).toBe('BREAD2026KEY')
  })

  it('hashes a code for one game and one unlock, and checks codes against it', async () => {
    const supporter = await def()
    expect(supporter.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(await codeFits(CODE, GAME, supporter)).toBe(true)
    expect(await codeFits('bread 2026 key', GAME, supporter)).toBe(true)
    expect(await codeFits('BREAD-2027-KEY', GAME, supporter)).toBe(false)
    // The same code hashes differently in another game, another unlock, or with a salt.
    expect(await unlockHash(CODE, 'other-game', supporter)).not.toBe(supporter.hash)
    expect(await unlockHash(CODE, GAME, { ...supporter, id: 'patron' })).not.toBe(supporter.hash)
    expect(await unlockHash(CODE, GAME, { ...supporter, salt: '2' })).not.toBe(supporter.hash)
    expect(supporter.hash).not.toContain(normaliseCode(CODE))
  })

  it('uses 600,000 rounds unless an unlock says otherwise', async () => {
    expect(ITERATIONS).toBe(600_000)
    const slow = await unlockHash(CODE, GAME, { id: 'supporter' })
    expect(slow).not.toBe((await def()).hash)
  })

  it('names the environment variable a code is read from', () => {
    expect(envName('supporter')).toBe('IFLOOM_UNLOCK_SUPPORTER')
    expect(envName('early-access.v2')).toBe('IFLOOM_UNLOCK_EARLY_ACCESS_V2')
  })
})

describe('the plugin', () => {
  it('records an unlock through its command, and unlocks/has reads the save', async () => {
    const g = build([await def()])
    const fresh = { ...startingState(g), sceneId: null }
    expect(holds(fresh, hasUnlock('supporter'), g)).toBe(false)
    const recorded = apply(fresh, g, recordUnlock('supporter'))
    expect(recorded.reason).toBeUndefined()
    expect(holds(recorded.state, hasUnlock('supporter'), g)).toBe(true)
    expect(unlocks().viewIn(view(recorded.state, g))).toEqual({
      unlocks: [{ id: 'supporter', label: 'Supporter edition', description: '', unlocked: true }],
      unlocked: 1,
      total: 1,
    })
    expect(apply(recorded.state, g, recordUnlock('supporter')).reason).toBe('That’s unlocked already.')
    expect(apply(fresh, g, recordUnlock('patron')).reason).toBe('There’s no such unlock.')
  })

  it('records through a lock, as moving day would deny everything', async () => {
    const town: Content = { scenes: [{ id: 'intro', body: [], choices: [] }], data: { unlocks: { unlocks: [await def()] } } }
    const { game: g } = loadGame([{ name: 'base', locks: [{ when: { not: { phase: ['never'] } }, deny: ['*'], reason: 'Not now.' }] }, town], {
      id: GAME,
      title: 't',
      plugins: [unlocks()],
    })
    expect(apply({ ...startingState(g), sceneId: null }, g, recordUnlock('supporter')).reason).toBeUndefined()
  })

  it('reports an unlock content names that the game lacks, and a bad entry', async () => {
    const supporter = await def()
    const loaded = loadGame(
      [
        {
          activities: [{ id: 'lounge', blocked: [{ when: { not: hasUnlock('patron') }, reason: 'For patrons.' }], effects: [] }],
          data: { unlocks: { unlocks: [supporter, { ...supporter, id: 'bad', label: ' ', hash: 'BREAD-2026-KEY', iterations: 0 }] } },
        },
      ],
      { id: GAME, title: 't', plugins: [unlocks()] },
    )
    expect(loaded.problems.map((problem) => problem.what)).toEqual([
      'unknown unlock "patron"',
      'has no label',
      'its hash isn’t one ifloom unlock-hash printed (64 hex digits)',
      'iterations must be a whole number above 0',
    ])
    expect(unlockDefs(loaded.game).map((entry) => entry.id)).toEqual(['supporter', 'bad'])
  })
})

describe('entering a code', () => {
  it('refuses a wrong code and an empty one, and remembers nothing', async () => {
    const g = build([await def()])
    const driver = memoryDriver()
    const runner = runnerFor(g, driver)
    const codes = startUnlocks(runner, { content: {} })
    await codes.ready
    expect(await codes.enter('BREAD-2027-KEY')).toEqual({ ok: false, reason: 'That code doesn’t unlock anything.' })
    expect(await codes.enter('  -  ')).toEqual({ ok: false, reason: 'Type a code first.' })
    expect(holds(runner.state, hasUnlock('supporter'), g)).toBe(false)
    expect(await runner.profile!.get('unlocks')).toBeUndefined()
  })

  it('unlocks with the right code, remembers a proof and never the code, and records it in the save', async () => {
    const g = build([await def()])
    const driver = memoryDriver()
    const runner = runnerFor(g, driver)
    const codes = startUnlocks(runner, { content: {} })
    const entered = await codes.enter('bread 2026 key')
    expect(entered).toEqual({ ok: true, value: { unlock: 'supporter', label: 'Supporter edition', already: false, restart: false } })
    expect(holds(runner.state, hasUnlock('supporter'), g)).toBe(true)
    await runner.settled()
    const stored = (await driver.get(`${GAME}.profile`))!
    expect(stored).toMatch(/"proof":"[0-9a-f]{64}"/)
    for (const form of [CODE, normaliseCode(CODE), 'bread']) expect(stored.toLowerCase()).not.toContain(form.toLowerCase())
    // Entered again, it works and changes nothing.
    expect(await codes.enter(CODE)).toEqual({ ok: true, value: { unlock: 'supporter', label: 'Supporter edition', already: true, restart: false } })
    expect(runner.log().commands).toEqual([{ type: 'custom', name: 'unlocks/record', with: { id: 'supporter' } }])
  })

  it('replays exactly: the unlock is a command in the log', async () => {
    const g = build([await def()])
    const runner = runnerFor(g)
    const codes = startUnlocks(runner, { content: {} })
    runner.apply({ type: 'activity', id: 'rest' })
    await codes.enter(CODE)
    runner.apply({ type: 'activity', id: 'rest' })
    const played = replay(g, runner.log())
    expect(played.ok && played.value).toEqual(runner.state)
  })

  it('records a remembered unlock in every new game, loaded save and later launch', async () => {
    const g = build([await def()])
    const driver = memoryDriver()
    const first = runnerFor(g, driver)
    await startUnlocks(first, { content: {} }).enter(CODE)
    await first.settled()

    // The next launch: a new runner on the same profile records it as soon as the profile is read.
    const next = runnerFor(g, driver)
    const codes = startUnlocks(next, { content: {} })
    expect(holds(next.state, hasUnlock('supporter'), g)).toBe(false)
    await codes.ready
    expect(holds(next.state, hasUnlock('supporter'), g)).toBe(true)
    await next.newGame({ seed: 2 })
    expect(holds(next.state, hasUnlock('supporter'), g)).toBe(true)
    codes.stop()
    await next.newGame({ seed: 3 })
    expect(holds(next.state, hasUnlock('supporter'), g)).toBe(false)
  })

  it('forgets a remembered unlock once its code has changed: a new release, new codes', async () => {
    const driver = memoryDriver()
    const first = runnerFor(build([await def()]), driver)
    await startUnlocks(first, { content: {} }).enter(CODE)
    await first.settled()
    const rotated = build([await def({ salt: 'release-2' })])
    const next = runnerFor(rotated, driver)
    await startUnlocks(next, { content: {} }).ready
    expect(holds(next.state, hasUnlock('supporter'), rotated)).toBe(false)
  })

  it('needs a profile to remember the code', async () => {
    const g = build([await def()])
    const runner = createRunner(g, startingState(g))
    expect(await startUnlocks(runner, { content: {} }).enter(CODE)).toEqual({ ok: false, reason: 'This game can’t remember codes here.' })
  })
})

describe('locked content', () => {
  async function locked(): Promise<{ supporter: UnlockDef; content: Record<string, LockedContent> }> {
    const supporter = await def()
    return { supporter, content: { supporter: await lockContent(CODE, GAME, supporter, [supporterPack]) } }
  }

  it('encrypts the packs: neither the prose nor the code is in what ships', async () => {
    const { content } = await locked()
    const script = contentScript(Object.values(content))
    expect(script).toMatch(
      /^<script>window\.__ifloomUnlocks=\{"supporter":\{"ifloomUnlock":1,"game":"unlocks-town","unlock":"supporter","iv":"[^"]+","data":"[^"]+"\}\}<\/script>$/,
    )
    for (const secret of ['cinnamon', 'narrow door', 'supporter.lounge', 'BREAD', 'bread']) expect(script).not.toContain(secret)
  })

  it('refuses to lock with a code that is not the unlock’s, or packs that are not data', async () => {
    const supporter = await def()
    await expect(lockContent('WRONG', GAME, supporter, [supporterPack])).rejects.toThrow(/isn't the one unlock "supporter" has the hash of/)
    const coded = { ...supporterPack, custom: { conditions: { open: () => true } } } as unknown as Pack
    await expect(lockContent(CODE, GAME, supporter, [coded])).rejects.toThrow('packs[0].custom.conditions.open is a function')
  })

  it('opens the content for a profile that holds the code’s proof, and the game takes it as a pack', async () => {
    const { supporter, content } = await locked()
    const driver = memoryDriver()
    const runner = runnerFor(build([supporter]), driver)
    const entered = await startUnlocks(runner, { content }).enter(CODE)
    expect(entered.ok && entered.value.restart).toBe(true)
    await runner.settled()

    // The next launch: the packs come out of the page before the game is built.
    const opened = await unlockedPacks(GAME, profile({ id: GAME }, driver), content)
    expect(opened.problems).toEqual([])
    expect(opened.packs).toEqual([supporterPack])
    const full = build([supporter], opened.packs)
    expect(full.scenes.map((scene) => scene.id)).toContain('supporter.lounge')
    // With the content loaded, entering the code again needs no restart.
    const again = await startUnlocks(runnerFor(full, driver), { content }).enter(CODE)
    expect(again.ok && again.value.restart).toBe(false)
  })

  it('opens nothing without the proof', async () => {
    const { content } = await locked()
    expect(await unlockedPacks(GAME, profile({ id: GAME }, memoryDriver()), content)).toEqual({ packs: [], problems: [] })
  })

  it('fails cleanly on tampered content, content for another game, or a code that has changed', async () => {
    const { supporter, content } = await locked()
    const driver = memoryDriver()
    await startUnlocks(runnerFor(build([supporter]), driver), { content }).enter(CODE)
    const stored = profile({ id: GAME }, driver)
    const data = content.supporter.data
    const flipped = data[10] === 'A' ? 'B' : 'A'
    const tampered = { supporter: { ...content.supporter, data: data.slice(0, 10) + flipped + data.slice(11) } }
    const problem = ['unlock:supporter · its code has changed since it was entered; enter the new one']
    expect(await unlockedPacks(GAME, stored, tampered)).toEqual({ packs: [], problems: problem })
    expect(await unlockedPacks(GAME, stored, { supporter: { ...content.supporter, iv: 'not base64!' } })).toEqual({ packs: [], problems: problem })
    expect(await unlockedPacks(GAME, stored, { supporter: { ...content.supporter, game: 'other-game' } })).toEqual({ packs: [], problems: problem })
    const rotated = await def({ salt: 'release-2' })
    const relocked = { supporter: await lockContent(CODE, GAME, rotated, [supporterPack]) }
    expect(await unlockedPacks(GAME, stored, relocked)).toEqual({ packs: [], problems: problem })
  })

  it('reads the page’s content from where the build puts it', async () => {
    const { content } = await locked()
    expect(lockedContent()).toEqual({})
    const global = globalThis as Record<string, unknown>
    global.__ifloomUnlocks = content
    try {
      expect(lockedContent()).toBe(content)
    } finally {
      delete global.__ifloomUnlocks
    }
  })
})
