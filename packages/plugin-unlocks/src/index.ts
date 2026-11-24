/**
 * The unlocks plugin: codes the player enters to unlock things, such as the codes a game's supporters get, and cheats
 * the player uses from a panel, such as "+20 coins" or "skip to chapter 3".
 *
 * An unlock opens a cheat or a scene through the `unlocks/has` condition. It can also carry packs of its own, which
 * `ifloom build` encrypts with a key only the code can make, so the shipped game can't be read or patched open
 * without it. The game ships no codes, only a slow hash of each. The player's profile remembers a code that works as a
 * proof made from it, never the code, so it outlives saves. The save records the unlock through the `unlocks/record`
 * command, so a replay plays the same.
 *
 * A cheat runs its effects at once, in any scene and through any lock, costs nothing and ends no turn unless its
 * effects say so. It's offered to everyone, or refused with a reason (or hidden) while one of its `blocked` conditions
 * holds: an unlock, a finished game or a kv key the game sets. A game can have cheats and no codes. The save keeps a
 * log of the cheats used and on which turn, so a replay shows them and content can ask `unlocks/cheated`.
 *
 * Unlike `@ifloom/plugin-debug`, which is for the developer and left out of a release build, this is part of the game
 * the player gets. The plugin requires no other plugin.
 */
import {
  holds,
  reasonOf,
  stringOf,
  upgradePack,
  type Blocked,
  type CommandRef,
  type Condition,
  type EffectRef,
  type Game,
  type GameState,
  type Once,
  type Pack,
  type Profile,
  type RenderedChoice,
  type Result,
  type Runner,
} from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  renderAction,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type PluginContext,
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

/**
 * The plugin's two lists, as content writes them in `data.unlocks` (a plugin's `data` holds its lists by name):
 * `unlocks` and `cheats`, with the words a player reads in each, for a translation's `words` table.
 */
const DATA = defineData(ID, {
  unlocks: list<UnlockDef>({ noun: 'unlock', words: { name: true, description: true } }),
  cheats: list<CheatDef>({ noun: 'cheat', words: { name: true, description: true, blocked: [{ reason: true }], effects: 'effects' } }),
})

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** The unlock is recorded in this save. */
    has: { unlock: arg.entry(DATA.unlocks) },
    /** This save has used the cheat, or any cheat when `cheat` is left out. */
    cheated: { cheat: arg.entry(DATA.cheats).optional() },
  },
  commands: {
    /** Record the unlock in this save. */
    record: { id: arg.entry(DATA.unlocks) },
    /** Use the cheat `id`. */
    cheat: { id: arg.entry(DATA.cheats) },
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

/**
 * A cheat the game declares in `data.unlocks.cheats`. Using it runs its effects at once, in any scene and through any
 * lock, and ends no turn unless its effects do.
 */
export type CheatDef = {
  /** The cheat's id, unique among the game's cheats. */
  id: string
  /** The cheat's name, which its button shows, such as "+20 coins". */
  name: string
  /** The cheat's line in the cheats panel. */
  description?: string
  /** The cheat's effects, run in order. It must have at least one. */
  effects: EffectRef[]
  /**
   * The cheat's refusals. The first entry whose `when` holds refuses the button with its reason, or leaves the cheat
   * out of the view with `hide`.
   *
   * A supporter-only cheat is `{ when: { not: { 'unlocks/has': { unlock: 'supporter' } } }, reason: 'For supporters' }`.
   */
  blocked?: Blocked[]
  /** The heading the cheat is listed under in the panel. Cheats with none come first. */
  group?: string
  /**
   * The cheat's limit, once in a save (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), as a choice's `once` is.
   *
   * `reason` is the refusal once it's used. The `unlocks/usedOnce` string, "Already used.", if left out.
   */
  once?: Once
}

/** A use of a cheat, one entry of `UnlocksState.cheated`. */
export type CheatUse = {
  /** The id of the cheat used. */
  cheat: string
  /** The turn the cheat was used on. */
  turn: number
}

/** The unlocks and cheat uses a save keeps. The plugin reads the unlocks and cheats themselves from content. */
export type UnlocksState = {
  /** The ids of the unlocks recorded in this save, in the order they were recorded. */
  unlocked: string[]
  /** The save's uses of cheats, oldest first. */
  cheated: CheatUse[]
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

/** A cheat as the player sees it, in `view.plugins.unlocks.cheats`. */
export type CheatView = {
  /** The cheat's id. */
  id: string
  /** The cheat's name. */
  name: string
  /** The cheat's description, or `''` when it has none. */
  description: string
  /** The heading the cheat goes under, or null when it has none. */
  group: string | null
  /** The cheat's `once` limit, `'game'` or `'turn'`, or null when it can be used any number of times. */
  once: 'game' | 'turn' | null
  /** The number of times this save has used the cheat. */
  used: number
  /** The cheat's button. It's refused with its reason while a `blocked` entry holds, or once a `once` cheat is used. */
  button: RenderedChoice
}

/** The unlocks and cheats as the player sees them, in `view.plugins.unlocks`. */
export type UnlocksView = {
  /** The game's unlocks, in the order the game declares them. */
  unlocks: UnlockView[]
  /** The number of unlocks this save records. */
  unlocked: number
  /** The number of unlocks the game declares. */
  total: number
  /** The cheats the player can see, in the order the game declares them. A cheat refused by an entry with `hide` is left out. */
  cheats: CheatView[]
  /** The number of cheat uses in this save, counting every cheat. */
  cheated: number
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

/** Returns the game's cheats, `data.unlocks.cheats` from its content and packs, in declared order. */
export function cheatsOf(game: Game): CheatDef[] {
  return DATA.cheats.all(game)
}

/** Returns the game's cheat with the id `id`, or undefined when there is none. */
export function cheatOf(game: Game, id: string): CheatDef | undefined {
  return DATA.cheats.get(game, id)
}

function timesUsed(slice: UnlocksState, cheat?: string): number {
  return cheat === undefined ? slice.cheated.length : slice.cheated.filter((use) => use.cheat === cheat).length
}

/** Has a cheat with `once` been used as often as it can: ever, or this turn? */
function spent(state: GameState, slice: UnlocksState, cheat: CheatDef): boolean {
  return slice.cheated.some((use) => use.cheat === cheat.id && (cheat.once?.per !== 'turn' || use.turn === state.turn))
}

/** The first `blocked` entry of a cheat that holds now, or undefined. */
function blockedBy(cheat: CheatDef, state: GameState, game: Game): Blocked | undefined {
  return (cheat.blocked ?? []).find((entry) => holds(state, game, entry.when))
}

/** Why the player can't use the cheat now, or undefined. */
function cantCheat(state: GameState, { id }: { id: string }, context: PluginContext<UnlocksState>): string | undefined {
  const { game, slice } = context
  const cheat = cheatOf(game, id)
  if (!cheat) return stringOf(game, 'unlocks/noCheat')
  const blocked = blockedBy(cheat, state, game)
  if (blocked) return reasonOf(game, blocked.reason)
  if (cheat.once && spent(state, slice, cheat)) return reasonOf(game, cheat.once.reason ?? { string: 'unlocks/usedOnce' })
  return undefined
}

/** The cheats the player can see, each with its button. */
function cheatViews(state: GameState, { game, slice }: PluginContext<UnlocksState>): CheatView[] {
  return cheatsOf(game)
    .filter((cheat) => !blockedBy(cheat, state, game)?.hide)
    .map((cheat) => ({
      id: cheat.id,
      name: cheat.name,
      description: cheat.description ?? '',
      group: cheat.group ?? null,
      once: cheat.once?.per ?? null,
      used: timesUsed(slice, cheat.id),
      button: renderAction(state, game, { id: `cheat.${cheat.id}`, label: cheat.name, command: cheatCommand(cheat.id) }),
    }))
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
 * Returns the unlocks plugin for the game's `plugins`. The game declares its unlocks in `data.unlocks.unlocks` and its
 * cheats in `data.unlocks.cheats`, and `startUnlocks` starts code entry.
 */
function unlocksPlugin(): DefinedPlugin<UnlocksState, UnlocksView> {
  return definePlugin<UnlocksState, UnlocksView, typeof CALLS>({
    id: ID,
    calls: CALLS,
    data: DATA,
    version: 2,
    // 1 → 2: the plugin keeps the log of cheat uses too.
    migrations: { 1: (old) => ({ ...(old as Omit<UnlocksState, 'cheated'>), cheated: [] }) },
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    start: () => ({ unlocked: [], cheated: [] }),
    strings: {
      wrong: 'That code doesn’t unlock anything.',
      empty: 'Type a code first.',
      noProfile: 'This game can’t remember codes here.',
      notSaved: 'The code worked, but it couldn’t be remembered. Try again.',
      unknown: 'There’s no such unlock.',
      already: 'That’s unlocked already.',
      notStarted: 'Codes can’t be entered here.',
      noCheat: 'There’s no such cheat.',
      usedOnce: 'Already used.',
    },
    conditions: {
      /** `{ 'unlocks/has': { unlock } }`: the unlock is recorded in this save. */
      has: (_state, { unlock }, { slice }) => slice.unlocked.includes(unlock),
      /** `{ 'unlocks/cheated': { cheat? } }`: this save has used the cheat, or any cheat when `cheat` is left out. */
      cheated: (_state, { cheat }, { slice }) => timesUsed(slice, cheat) > 0,
    },
    values: {
      /** `{{unlocks/cheated}}`: how many times this save has used a cheat; with `cheat`, that one. */
      cheated: (_state, args, { slice }) => timesUsed(slice, typeof args.cheat === 'string' ? args.cheat : undefined),
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
        run: (_state, { id }, { slice, set }) => set({ ...slice, unlocked: [...slice.unlocked, id] }),
      },
      /**
       * `{ 'unlocks/cheat': { id } }`: use the cheat `id`. Works in any scene and through any lock, costs nothing, and
       * ends no turn unless its effects do.
       */
      cheat: {
        ignoresLocks: true,
        whyNot: cantCheat,
        run: (state, { id }, context) => {
          const cheat = cheatOf(context.game, id)!
          const next = context.apply(cheat.effects ?? [], state)
          const slice = context.get(next)
          return context.set({ ...slice, cheated: [...slice.cheated, { cheat: cheat.id, turn: state.turn }] }, next)
        },
      },
    },
    view: (state, context): UnlocksView => {
      const { slice, game } = context
      const list = unlocksOf(game).map((def) => ({
        id: def.id,
        name: def.name,
        description: def.description ?? '',
        unlocked: slice.unlocked.includes(def.id),
      }))
      return {
        unlocks: list,
        unlocked: list.filter((entry) => entry.unlocked).length,
        total: list.length,
        cheats: cheatViews(state, context),
        cheated: slice.cheated.length,
      }
    },
    references: {
      content: (game) =>
        DATA.cheats.content(game, (cheat) => [
          { effects: cheat.effects },
          { reason: cheat.once?.reason },
          ...(cheat.blocked ?? []).map((entry) => ({ within: 'blocked', refs: [{ when: entry.when }, { reason: entry.reason }] })),
        ]),
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
      const cheats = new Set<string>()
      for (const cheat of cheatsOf(game)) {
        const problem = (what: string) => problems.push(DATA.cheats.problem(cheat.id, what))
        if (cheats.has(cheat.id)) problem('two cheats share this id')
        cheats.add(cheat.id)
        if (typeof cheat.name !== 'string' || !cheat.name.trim()) problem('has no name')
        if (!Array.isArray(cheat.effects) || !cheat.effects.length) problem('has no effects')
        for (const entry of cheat.blocked ?? [])
          if (typeof entry.reason === 'string' ? !entry.reason.trim() : typeof entry.reason?.string !== 'string') problem('a blocked entry has no reason')
      }
      return problems
    },
  })
}

/** Returns the `unlocks/has` condition, which holds once this save records the unlock. */
const hasUnlock = (unlock: string): Condition => CALLS.conditions.has({ unlock })
/** Returns the `unlocks/record` command, which records the unlock in this save. `startUnlocks` sends it, so a game seldom needs it. */
const recordUnlock = (unlock: string): CommandRef => CALLS.commands.record({ id: unlock })
/** Returns the `unlocks/cheat` command, which uses the cheat. */
const cheatCommand = (cheat: string): CommandRef => CALLS.commands.cheat({ id: cheat })
/** Returns the `unlocks/cheated` condition, which holds once this save has used the cheat, or any cheat when none is named. */
const cheated = (cheat?: string): Condition => CALLS.conditions.cheated(cheat === undefined ? undefined : { cheat })

/**
 * The unlocks plugin's factory, with its helpers as properties. `unlocks()` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `unlocks.has('supporter')` and `unlocks.cheat('rich')`.
 */
export const unlocks = Object.assign(unlocksPlugin, {
  /** Returns the `unlocks/has` condition, which holds once this save records the unlock. */
  has: hasUnlock,
  /** Returns the `unlocks/record` command, which records the unlock in this save. `startUnlocks` sends it. */
  record: recordUnlock,
  /** Returns the `unlocks/cheat` command, which runs the cheat's effects through any lock and logs the use. */
  cheat: cheatCommand,
  /** Returns the `unlocks/cheated` condition, which holds once this save has used the cheat, or any cheat when none is named. */
  cheated,
})
