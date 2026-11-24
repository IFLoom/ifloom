/**
 * The unlocks plugin, which checks codes the player enters to unlock things, such as the codes a game's supporters get.
 *
 * An unlock can open a cheat or a scene through the `unlocks/has` condition. It can also carry packs of its own, which
 * `ifloom build` encrypts with a key only the code can make, so the shipped game can't be read or patched open
 * without it.
 *
 * The game ships no codes, only a slow hash of each. The player's profile remembers a code that works as a proof made
 * from it, never the code, so it outlives saves. The save records the unlock through the `unlocks/record` command, so
 * a replay plays the same. The plugin requires no other plugin.
 */
import { stringOf, upgradePack, type CommandRef, type Condition, type Game, type Pack, type Profile, type Result, type Runner } from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type PluginProblem,
} from '@ifloom/engine/plugin'
import { ITERATIONS, fromHex, hashOfProof, normaliseCode, proofOf, saltOf, seal, toHex, unseal } from './crypto.ts'
import { CONTENT_VERSION, contentMigrations } from './upgrade.ts'

export { ITERATIONS, normaliseCode } from './crypto.ts'

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    unlocks: UnlocksView
  }
  interface HelperRegistry {
    unlocks: UnlockStatus
  }
}

const ID = 'unlocks'

/** The plugin's one list, `unlocks`, as content writes it in `data.unlocks.unlocks` (a plugin's `data` holds its lists by name), with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, { unlocks: list<UnlockDef>({ noun: 'unlock', words: { name: true, description: true } }) })

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** The unlock is recorded in this save. */
    has: { unlock: arg.entry(DATA.unlocks) },
  },
  commands: {
    /** Record the unlock in this save. */
    record: { id: arg.entry(DATA.unlocks) },
  },
})

/** Where the page keeps the encrypted content `ifloom build` puts in it. */
const GLOBAL = '__ifloomUnlocks'

/** An unlock the game declares in `data.unlocks.unlocks`. It holds the code's hash, never the code. */
export type UnlockDef = {
  /** The unlock's id. */
  id: string
  /** The unlock's name, such as "Supporter edition". */
  name: string
  /** The unlock's description, a line for the list of unlocks. */
  description?: string
  /** The code's hash in hex, as `ifloom unlock-hash` prints it. */
  hash: string
  /** The unlock's extra salt, mixed in after the game's and the unlock's ids. Changing it changes the hash without changing the code. */
  salt?: string
  /** The number of PBKDF2 rounds for this code. 600,000 if left out, and fewer only in tests. */
  iterations?: number
}

/** The unlocks a save keeps. Unlocks themselves are read from content. */
export type UnlocksState = {
  /** The ids of the unlocks recorded in this save, in the order they were recorded. */
  unlocked: string[]
}

/** The record the plugin keeps in the player's profile, under `unlocks`. It never holds a code. */
export type UnlocksProfile = {
  /** The proof made from each code that worked, in hex, by unlock id. */
  unlocked: Record<string, { proof: string }>
}

/** An unlock's encrypted packs as `ifloom build` writes them into the page. */
export type LockedContent = {
  /** The format of this record, 1. */
  ifloomUnlock: 1
  /** The game's id. */
  game: string
  /** The unlock's id. */
  unlock: string
  /** The AES-GCM nonce, in base64. */
  iv: string
  /** The packs as JSON, encrypted, in base64. */
  data: string
}

/** An unlock as the player sees it, in `view.plugins.unlocks.unlocks`. */
export type UnlockView = {
  /** The unlock's id. */
  id: string
  /** The unlock's name. */
  name: string
  /** The unlock's description, or `''` when it has none. */
  description: string
  /** True when this save records the unlock. */
  unlocked: boolean
}

/** The unlocks as the player sees them, in `view.plugins.unlocks`. */
export type UnlocksView = {
  /** The game's unlocks, in the order the game declares them. */
  unlocks: UnlockView[]
  /** The number of unlocks this save records. */
  unlocked: number
  /** The number of unlocks the game declares. */
  total: number
}

/** The unlock a code opened, as `enterCode` returns it. */
export type Entered = {
  /** The unlock's id. */
  unlock: string
  /** The unlock's name. */
  name: string
  /** True when the unlock was open already, so the code worked and changed nothing. */
  already: boolean
  /** True when the unlock has packs the game in play doesn't have yet. Reloading the page builds the game again with them. */
  restart: boolean
}

/** The state of code entry that `startUnlocks` reports in the runner's snapshot, at `snapshot.helpers.unlocks`. */
export type UnlockStatus = {
  /**
   * The state of code entry, `checking`, `wrong`, `unlocked` or `idle`. It's `wrong` when the last code didn't work and
   * `unlocked` when it did.
   *
   * It's `checking` while a code is checked, slowly on purpose, and while the profile's remembered codes are checked
   * at start.
   */
  status: 'idle' | 'checking' | 'wrong' | 'unlocked'
  /** The reason the last code didn't work while `status` is `wrong`, else null. */
  reason: string | null
  /** The unlock the last code opened while `status` is `unlocked`, else null. */
  entered: Entered | null
}

/** Returns the game's unlocks, from `data.unlocks.unlocks` in its content and packs. */
export function unlocksOf(game: Game): UnlockDef[] {
  return DATA.unlocks.all(game)
}

/** Returns the name of the environment variable `ifloom build` reads an unlock's code from, such as `IFLOOM_UNLOCK_SUPPORTER` for `supporter`. */
export function envName(unlock: string): string {
  return `IFLOOM_UNLOCK_${unlock.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
}

function iterationsOf(def: Pick<UnlockDef, 'iterations'>): number {
  return def.iterations ?? ITERATIONS
}

/** The proof a code makes for an unlock, if it is that unlock's code. */
async function proofFor(code: string, game: string, def: UnlockDef): Promise<Uint8Array | undefined> {
  const proof = await proofOf(code, saltOf(game, def.id, def.salt), iterationsOf(def))
  return (await hashOfProof(proof)) === def.hash.toLowerCase() ? proof : undefined
}

/**
 * Returns the hash of a code for an unlock, in hex, the value for the unlock's `hash`. `ifloom unlock-hash` prints
 * it, so you never write the code into the game.
 */
export async function unlockHash(code: string, game: string, def: Pick<UnlockDef, 'id' | 'salt' | 'iterations'>): Promise<string> {
  return hashOfProof(await proofOf(code, saltOf(game, def.id, def.salt), iterationsOf(def)))
}

/** Returns true when the code is the unlock's code. */
export async function codeFits(code: string, game: string, def: UnlockDef): Promise<boolean> {
  return (await proofFor(code, game, def)) !== undefined
}

/**
 * Returns an unlock's packs encrypted under its code, for the page, as `ifloom build` does with each file in
 * `src/unlocks/`. The packs must be data, as a mod's are.
 *
 * It throws when the code isn't the unlock's, so a build can't ship content no code opens, and when a pack holds a
 * function.
 */
export async function lockContent(code: string, game: string, def: UnlockDef, packs: readonly Pack[]): Promise<LockedContent> {
  const proof = await proofFor(code, game, def)
  if (!proof)
    throw new Error(
      `The code in ${envName(def.id)} isn't the one unlock "${def.id}" has the hash of. Run ifloom unlock-hash ${def.id} and put the hash it prints in the unlock.`,
    )
  const fn = functionIn(packs)
  if (fn) throw new Error(`Unlock "${def.id}"'s packs must be data, as a mod's are, but ${fn} is a function.`)
  const text = JSON.stringify(packs)
  return { ifloomUnlock: 1, game, unlock: def.id, ...(await seal(proof, text, `${game}:${def.id}`)) }
}

/** Where in a value a function is, as a path, or undefined if it is all data. */
function functionIn(value: unknown, at = 'packs'): string | undefined {
  if (typeof value === 'function') return at
  if (!value || typeof value !== 'object') return undefined
  for (const [key, inner] of Object.entries(value)) {
    const found = functionIn(inner, Array.isArray(value) ? `${at}[${key}]` : `${at}.${key}`)
    if (found) return found
  }
  return undefined
}

/** Returns the script `ifloom build` puts in the page's head, which holds the encrypted content by unlock. */
export function contentScript(locked: readonly LockedContent[]): string {
  const map = Object.fromEntries(locked.map((entry) => [entry.unlock, entry]))
  return `<script>window.${GLOBAL}=${JSON.stringify(map).replace(/</g, '\\u003c')}</script>`
}

/** Returns the encrypted content `ifloom build` put in the page, by unlock. Returns an empty record in a page without any. */
export function lockedContent(): Readonly<Record<string, LockedContent>> {
  const found = (globalThis as Record<string, unknown>)[GLOBAL]
  return found && typeof found === 'object' ? (found as Record<string, LockedContent>) : {}
}

/** The packs inside one locked entry, opened with a proof: undefined if the proof doesn't open it. */
async function openContent(proof: Uint8Array, game: string, locked: LockedContent): Promise<Pack[] | undefined> {
  if (locked.game !== game) return undefined
  const text = await unseal(proof, locked, `${game}:${locked.unlock}`)
  if (text === undefined) return undefined
  try {
    const packs = JSON.parse(text) as unknown
    return Array.isArray(packs) ? (packs as Pack[]) : undefined
  } catch {
    return undefined
  }
}

function proofsIn(stored: unknown): Record<string, Uint8Array> {
  const unlocked = (stored as UnlocksProfile | undefined)?.unlocked
  const out: Record<string, Uint8Array> = {}
  if (!unlocked || typeof unlocked !== 'object') return out
  for (const [id, entry] of Object.entries(unlocked)) {
    if (typeof entry?.proof === 'string' && /^[0-9a-f]{64}$/.test(entry.proof)) out[id] = fromHex(entry.proof)
  }
  return out
}

/**
 * Returns the packs of every unlock the profile remembers, decrypted and checked that this engine can read them. Call
 * it before building the game, and pass them as `loadGame(content, base, { packs: unlocked.packs })`.
 *
 * An unlock whose code has changed since it was entered, as in a new release with new codes, can't be opened and is
 * listed in `problems`. The player then enters the new code.
 */
export async function unlockedPacks(
  game: string,
  profile: Profile,
  content: Readonly<Record<string, LockedContent>> = lockedContent(),
): Promise<{ packs: Pack[]; problems: string[] }> {
  const proofs = proofsIn(await profile.get(ID).catch(() => undefined))
  const packs: Pack[] = []
  const problems: string[] = []
  for (const [id, locked] of Object.entries(content)) {
    const proof = proofs[id]
    if (!proof) continue
    const opened = await openContent(proof, game, locked)
    if (!opened) {
      problems.push(`unlock:${id} · its code has changed since it was entered; enter the new one`)
      continue
    }
    for (const pack of opened) {
      // Only checked here: `loadGame` upgrades it, with the game's plugins' steps.
      const readable = upgradePack(pack, [])
      if (readable.ok) packs.push(pack)
      else problems.push(`unlock:${id} · ${readable.reason}`)
    }
  }
  return { packs, problems }
}

/** The codes started on each runner, for `enterCode`. */
const started = new WeakMap<Runner, (code: string) => Promise<Result<Entered>>>()

/**
 * Starts code entry on a runner and returns the function that stops it. Start it once per runner, which needs a
 * `profile`.
 *
 * It records every unlock the profile remembers into the game in play, each new game and each loaded save, so a
 * supporter enters a code once, and `enterCode` checks the codes the player enters. It reports an
 * {@link UnlockStatus} at `snapshot.helpers.unlocks`. Pass `content` only in tests, since it reads the page's own
 * otherwise.
 */
export function startUnlocks(runner: Runner, options: { content?: Readonly<Record<string, LockedContent>> } = {}): () => void {
  const game = runner.game
  // Its own state, read through the plugin so a save with none yet reads as its start.
  const plugin = unlocksPlugin()
  const content = options.content ?? lockedContent()
  const defs = () => unlocksOf(game)
  // The unlocks this player has, checked against this release's hashes.
  const known = new Set<string>()
  let recording = false
  let stopped = false
  // How many codes are being checked now, the remembered ones included.
  let checking = 0
  let last: Pick<UnlockStatus, 'status' | 'reason' | 'entered'> = { status: 'idle', reason: null, entered: null }

  const report = () => {
    if (stopped) return
    runner.setHelper(ID, checking > 0 ? { status: 'checking', reason: null, entered: null } : last)
  }

  function record(): void {
    if (recording || stopped) return
    recording = true
    try {
      const has = plugin.read(runner.state, game).unlocked
      for (const id of known) if (!has.includes(id)) runner.apply(recordUnlock(id))
    } finally {
      recording = false
    }
  }

  const unsubscribe = runner.subscribe(record)
  checking += 1
  report()
  const ready = (async () => {
    try {
      const proofs = proofsIn(await runner.profile?.get(ID).catch(() => undefined))
      for (const def of defs()) {
        const proof = proofs[def.id]
        if (proof && (await hashOfProof(proof)) === def.hash.toLowerCase()) known.add(def.id)
      }
    } finally {
      checking -= 1
    }
    record()
    report()
  })()

  async function check(code: string): Promise<Result<Entered>> {
    if (!normaliseCode(code)) return { ok: false, reason: stringOf(game, 'unlocks/empty') }
    const profile = runner.profile
    if (!profile) return { ok: false, reason: stringOf(game, 'unlocks/noProfile') }
    for (const def of defs()) {
      const proof = await proofFor(code, game.id, def)
      if (!proof) continue
      const already = known.has(def.id)
      try {
        await profile.update<UnlocksProfile>(ID, (stored) => ({ unlocked: { ...stored?.unlocked, [def.id]: { proof: toHex(proof) } } }))
      } catch {
        return { ok: false, reason: stringOf(game, 'unlocks/notSaved') }
      }
      known.add(def.id)
      await ready
      record()
      const locked = content[def.id]
      const opened = locked ? await openContent(proof, game.id, locked) : undefined
      const restart = Boolean(opened?.some((pack) => !(game.packs ?? []).includes(pack.id)))
      return { ok: true, value: { unlock: def.id, name: def.name, already, restart } }
    }
    return { ok: false, reason: stringOf(game, 'unlocks/wrong') }
  }

  const enter = async (code: string): Promise<Result<Entered>> => {
    checking += 1
    report()
    try {
      const result = await check(code)
      last = result.ok ? { status: 'unlocked', reason: null, entered: result.value } : { status: 'wrong', reason: result.reason, entered: null }
      return result
    } finally {
      checking -= 1
      report()
    }
  }
  started.set(runner, enter)

  return () => {
    stopped = true
    unsubscribe()
    if (started.get(runner) === enter) started.delete(runner)
    runner.setHelper(ID, undefined)
  }
}

/**
 * Returns the unlock a code opens, checked against every unlock on a runner `startUnlocks` was started on, or the
 * reason it opens none. It never throws.
 *
 * The profile remembers a code that works, and the game in play records its unlock. The runner's snapshot reports the
 * check at `helpers.unlocks` while it runs and after.
 */
export function enterCode(runner: Runner, code: string): Promise<Result<Entered>> {
  const enter = started.get(runner)
  return enter ? enter(code) : Promise.resolve({ ok: false, reason: stringOf(runner.game, 'unlocks/notStarted') })
}

/**
 * Returns the unlocks plugin for the game's `plugins`. The game declares its unlocks in `data.unlocks.unlocks`, and
 * `startUnlocks` starts code entry.
 */
function unlocksPlugin(): DefinedPlugin<UnlocksState, UnlocksView> {
  return definePlugin<UnlocksState, UnlocksView, typeof CALLS>({
    id: ID,
    calls: CALLS,
    data: DATA,
    version: 1,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    start: () => ({ unlocked: [] }),
    strings: {
      wrong: 'That code doesn’t unlock anything.',
      empty: 'Type a code first.',
      noProfile: 'This game can’t remember codes here.',
      notSaved: 'The code worked, but it couldn’t be remembered. Try again.',
      unknown: 'There’s no such unlock.',
      already: 'That’s unlocked already.',
      notStarted: 'Codes can’t be entered here.',
    },
    conditions: {
      /** `{ 'unlocks/has': { unlock } }`: the unlock is recorded in this save. */
      has: (_state, { unlock }, { slice }) => slice.unlocked.includes(unlock),
    },
    commands: {
      /**
       * `{ 'unlocks/record': { id } }`: record the unlock in this save.
       * `startUnlocks` sends it once a code has worked; it checks no code
       * itself, so it is a door that only deters (see the docs).
       */
      record: {
        ignoresLocks: true,
        whyNot: (_state, { id }, { game, slice }) => {
          if (!DATA.unlocks.get(game, id)) return stringOf(game, 'unlocks/unknown')
          return slice.unlocked.includes(id) ? stringOf(game, 'unlocks/already') : undefined
        },
        run: (_state, { id }, { slice, set }) => set({ unlocked: [...slice.unlocked, id] }),
      },
    },
    view: (_state, { slice, game }): UnlocksView => {
      const list = unlocksOf(game).map((def) => ({
        id: def.id,
        name: def.name,
        description: def.description ?? '',
        unlocked: slice.unlocked.includes(def.id),
      }))
      return { unlocks: list, unlocked: list.filter((entry) => entry.unlocked).length, total: list.length }
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const seen = new Set<string>()
      for (const def of unlocksOf(game)) {
        const problem = (what: string) => problems.push(DATA.unlocks.problem(def.id, what))
        if (seen.has(def.id)) problem('two unlocks share this id')
        seen.add(def.id)
        if (typeof def.name !== 'string' || !def.name.trim()) problem('has no name')
        if (typeof def.hash !== 'string' || !/^[0-9a-f]{64}$/i.test(def.hash)) problem('its hash isn’t one ifloom unlock-hash printed (64 hex digits)')
        if (def.iterations !== undefined && !(Number.isInteger(def.iterations) && def.iterations > 0)) problem('iterations must be a whole number above 0')
      }
      return problems
    },
  })
}

/** Returns the `unlocks/has` condition, which holds once this save records the unlock. */
const hasUnlock = (unlock: string): Condition => CALLS.conditions.has({ unlock })
/** Returns the `unlocks/record` command, which records the unlock in this save. `startUnlocks` sends it, so a game seldom needs it. */
const recordUnlock = (unlock: string): CommandRef => CALLS.commands.record({ id: unlock })

/**
 * The unlocks plugin's factory, with its helpers as properties. `unlocks()` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `unlocks.has('supporter')`.
 */
export const unlocks = Object.assign(unlocksPlugin, {
  /** Returns the `unlocks/has` condition, which holds once this save records the unlock. */
  has: hasUnlock,
  /** Returns the `unlocks/record` command, which records the unlock in this save. `startUnlocks` sends it. */
  record: recordUnlock,
})
