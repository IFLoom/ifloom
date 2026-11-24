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
  type Runner,
} from '@ifloom/engine'
import { freshState, loadChecked } from '@ifloom/engine/testing'
import {
  ITERATIONS,
  codeFits,
  contentScript,
  envName,
  lockContent,
  lockedContent,
  normaliseCode,
  enterCode,
  startUnlocks,
  unlocksOf,
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
  const base = { id: 'supporter', name: 'Supporter edition', iterations: FAST, ...extra }
  return { ...base, hash: await unlockHash(CODE, GAME, base), ...extra }
}

/** The supporter content: one scene, with a line of prose that must never be in the build. */
const supporterPack: Pack = {
  id: 'supporter',
  schema: SCHEMA,
  scenes: [{ id: 'supporter.lounge', title: 'The back room', body: [{ prose: 'supporter.lounge' }], choices: [] }],
  prose: { 'supporter.lounge': 'Behind the bakery a narrow door opens on a room that smells of cinnamon.' },
}

function build(unlocksOf: UnlockDef[], packs: Pack[] = []): Game {
  const town: Content = {
    scenes: [{ id: 'intro', body: [], choices: [] }],
    actions: [{ id: 'rest', effects: [{ turn: true }] }],
    data: { unlocks: { unlocks: unlocksOf } },
  }
  return loadChecked([town], { id: GAME, title: 'Unlocks town', plugins: [unlocks()] }, { packs })
}

function runnerFor(game: Game, driver = memoryDriver()) {
  return createRunner(game, freshState(game, { seed: 1 }), { history: true, profile: profile(game, driver) })
}

/** Settles once the codes started on the runner have checked the ones the profile remembers. */
function ready(runner: Runner): Promise<void> {
  const done = () => runner.snapshot().helpers.unlocks?.status !== 'checking'
  return new Promise((resolve) => {
    if (done()) return resolve()
    const stop = runner.subscribe(() => {
      if (!done()) return
      stop()
      resolve()
    })
  })
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
    const fresh = freshState(g)
    expect(holds(fresh, g, unlocks.has('supporter'))).toBe(false)
    const recorded = apply(fresh, g, unlocks.record('supporter'))
    expect(recorded.reason).toBeUndefined()
    expect(holds(recorded.state, g, unlocks.has('supporter'))).toBe(true)
    expect(unlocks().viewIn(view(recorded.state, g))).toEqual({
      unlocks: [{ id: 'supporter', name: 'Supporter edition', description: '', unlocked: true }],
      unlocked: 1,
      total: 1,
    })
    expect(apply(recorded.state, g, unlocks.record('supporter')).reason).toBe('That’s unlocked already.')
    expect(apply(fresh, g, unlocks.record('patron')).reason).toBe('There’s no such unlock.')
  })

  it('records through a lock, as moving day would deny everything', async () => {
    const town: Content = { scenes: [{ id: 'intro', body: [], choices: [] }], data: { unlocks: { unlocks: [await def()] } } }
    const { game: g } = loadGame([{ name: 'base', locks: [{ when: { not: { kv: 'phase', is: ['never'] } }, deny: ['*'], reason: 'Not now.' }] }, town], {
      id: GAME,
      title: 't',
      plugins: [unlocks()],
    })
    expect(apply(freshState(g), g, unlocks.record('supporter')).reason).toBeUndefined()
  })

  it('reports an unlock content names that the game lacks, and a bad entry', async () => {
    const supporter = await def()
    const loaded = loadGame(
      [
        {
          actions: [{ id: 'lounge', blocked: [{ when: { not: unlocks.has('patron') }, reason: 'For patrons.' }], effects: [] }],
          data: { unlocks: { unlocks: [supporter, { ...supporter, id: 'bad', name: ' ', hash: 'BREAD-2026-KEY', iterations: 0 }] } },
        },
      ],
      { id: GAME, title: 't', plugins: [unlocks()] },
    )
    expect(loaded.problems.map((problem) => problem.what)).toEqual([
      'unknown unlock "patron"',
      'has no name',
      'its hash isn’t one ifloom unlock-hash printed (64 hex digits)',
      'iterations must be a whole number above 0',
    ])
    expect(unlocksOf(loaded.game).map((entry) => entry.id)).toEqual(['supporter', 'bad'])
  })
})

describe('entering a code', () => {
  it('refuses a wrong code and an empty one, and remembers nothing', async () => {
    const g = build([await def()])
    const driver = memoryDriver()
    const runner = runnerFor(g, driver)
    startUnlocks(runner, { content: {} })
    await ready(runner)
    expect(await enterCode(runner, 'BREAD-2027-KEY')).toEqual({ ok: false, reason: 'That code doesn’t unlock anything.' })
    expect(await enterCode(runner, '  -  ')).toEqual({ ok: false, reason: 'Type a code first.' })
    expect(holds(runner.state, g, unlocks.has('supporter'))).toBe(false)
    expect(await runner.profile!.get('unlocks')).toBeUndefined()
  })

  it('unlocks with the right code, remembers a proof and never the code, and records it in the save', async () => {
    const g = build([await def()])
    const driver = memoryDriver()
    const runner = runnerFor(g, driver)
    startUnlocks(runner, { content: {} })
    const entered = await enterCode(runner, 'bread 2026 key')
    expect(entered).toEqual({ ok: true, value: { unlock: 'supporter', name: 'Supporter edition', already: false, restart: false } })
    expect(holds(runner.state, g, unlocks.has('supporter'))).toBe(true)
    await runner.settled()
    const stored = (await driver.get(`${GAME}.profile`))!
    expect(stored).toMatch(/"proof":"[0-9a-f]{64}"/)
    for (const form of [CODE, normaliseCode(CODE), 'bread']) expect(stored.toLowerCase()).not.toContain(form.toLowerCase())
    // Entered again, it works and changes nothing.
    expect(await enterCode(runner, CODE)).toEqual({ ok: true, value: { unlock: 'supporter', name: 'Supporter edition', already: true, restart: false } })
    expect(runner.log().commands).toEqual([{ type: 'custom', name: 'unlocks/record', with: { id: 'supporter' } }])
  })

  it('replays exactly: the unlock is a command in the log', async () => {
    const g = build([await def()])
    const runner = runnerFor(g)
    startUnlocks(runner, { content: {} })
    runner.apply({ type: 'action', id: 'rest' })
    await enterCode(runner, CODE)
    runner.apply({ type: 'action', id: 'rest' })
    const played = replay(g, runner.log())
    expect(played.ok && played.value).toEqual(runner.state)
  })

  it('records a remembered unlock in every new game, loaded save and later launch', async () => {
    const g = build([await def()])
    const driver = memoryDriver()
    const first = runnerFor(g, driver)
    startUnlocks(first, { content: {} })
    await enterCode(first, CODE)
    await first.settled()

    // The next launch: a new runner on the same profile records it as soon as the profile is read.
    const next = runnerFor(g, driver)
    const codes = startUnlocks(next, { content: {} })
    expect(holds(next.state, g, unlocks.has('supporter'))).toBe(false)
    await ready(next)
    expect(holds(next.state, g, unlocks.has('supporter'))).toBe(true)
    await next.newGame({ seed: 2 })
    expect(holds(next.state, g, unlocks.has('supporter'))).toBe(true)
    codes()
    await next.newGame({ seed: 3 })
    expect(holds(next.state, g, unlocks.has('supporter'))).toBe(false)
  })

  it('forgets a remembered unlock once its code has changed: a new release, new codes', async () => {
    const driver = memoryDriver()
    const first = runnerFor(build([await def()]), driver)
    startUnlocks(first, { content: {} })
    await enterCode(first, CODE)
    await first.settled()
    const rotated = build([await def({ salt: 'release-2' })])
    const next = runnerFor(rotated, driver)
    startUnlocks(next, { content: {} })
    await ready(next)
    expect(holds(next.state, rotated, unlocks.has('supporter'))).toBe(false)
  })

  it('says where it stands in the runner snapshot: checking, wrong, unlocked, and gone once stopped', async () => {
    const g = build([await def()])
    const runner = runnerFor(g)
    expect(runner.snapshot().helpers.unlocks).toBeUndefined()
    const stop = startUnlocks(runner, { content: {} })
    expect(runner.snapshot().helpers.unlocks).toEqual({ status: 'checking', reason: null, entered: null })
    await ready(runner)
    expect(runner.snapshot().helpers.unlocks).toEqual({ status: 'idle', reason: null, entered: null })
    const heard: string[] = []
    runner.subscribe((snapshot) => heard.push(snapshot.helpers.unlocks?.status ?? 'none'))
    await enterCode(runner, 'nope')
    expect(runner.snapshot().helpers.unlocks).toEqual({ status: 'wrong', reason: 'That code doesn’t unlock anything.', entered: null })
    await enterCode(runner, CODE)
    expect(runner.snapshot().helpers.unlocks?.status).toBe('unlocked')
    expect(runner.snapshot().helpers.unlocks?.entered?.name).toBe('Supporter edition')
    expect(heard[0]).toBe('checking')
    expect(heard).toContain('wrong')
    stop()
    expect(runner.snapshot().helpers.unlocks).toBeUndefined()
    expect(await enterCode(runner, CODE)).toEqual({ ok: false, reason: 'Codes can’t be entered here.' })
  })

  it('needs a profile to remember the code', async () => {
    const g = build([await def()])
    const runner = createRunner(g, startingState(g))
    startUnlocks(runner, { content: {} })
    expect(await enterCode(runner, CODE)).toEqual({ ok: false, reason: 'This game can’t remember codes here.' })
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
    startUnlocks(runner, { content })
    const entered = await enterCode(runner, CODE)
    expect(entered.ok && entered.value.restart).toBe(true)
    await runner.settled()

    // The next launch: the packs come out of the page before the game is built.
    const opened = await unlockedPacks(GAME, profile({ id: GAME }, driver), content)
    expect(opened.problems).toEqual([])
    expect(opened.packs).toEqual([supporterPack])
    const full = build([supporter], opened.packs)
    expect(full.scenes.map((scene) => scene.id)).toContain('supporter.lounge')
    // With the content loaded, entering the code again needs no restart.
    const later = runnerFor(full, driver)
    startUnlocks(later, { content })
    const again = await enterCode(later, CODE)
    expect(again.ok && again.value.restart).toBe(false)
  })

  it('opens nothing without the proof', async () => {
    const { content } = await locked()
    expect(await unlockedPacks(GAME, profile({ id: GAME }, memoryDriver()), content)).toEqual({ packs: [], problems: [] })
  })

  it('fails cleanly on tampered content, content for another game, or a code that has changed', async () => {
    const { supporter, content } = await locked()
    const driver = memoryDriver()
    const later = runnerFor(build([supporter]), driver)
    startUnlocks(later, { content })
    await enterCode(later, CODE)
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
