/**
 * Locked content: the packs an unlock opens, kept in `src/unlocks/<unlock>.ts`
 * (each exporting a pack, or a list of packs, as `default`). The page never
 * imports them. `ifloom build` and `ifloom dev` encrypt each one under its
 * unlock's code, read from the environment (`IFLOOM_UNLOCK_<UNLOCK>`, or a
 * `.env` file), and put the result in the page's head, where the unlocks
 * plugin finds it. `ifloom check` checks the game with them.
 *
 * The CLI peers only on the engine, so the unlocks plugin's own code (the
 * hash, the encryption) is loaded from the game's dependencies, as the game
 * module is: what the build writes is exactly what the game reads.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, extname, join, resolve, sep } from 'node:path'
import type { Game, Pack } from '@ifloom/engine'
import { gameFrom } from './check.ts'
import { loadEnv } from 'vite'
import { buildFiles } from './build.ts'

/** Where locked content lives, from the game's folder. */
export const UNLOCKS_DIR = 'src/unlocks'

const EXTENSIONS = new Set(['.ts', '.mts', '.js', '.mjs', '.json'])

/** What the CLI uses of `@ifloom/plugin-unlocks`, typed here because the CLI doesn't depend on it. */
export type UnlocksModule = {
  unlockDefs(game: Game): UnlockDefLike[]
  envName(unlock: string): string
  normaliseCode(code: string): string
  unlockHash(code: string, game: string, def: { id: string; salt?: string; iterations?: number }): Promise<string>
  codeFits(code: string, game: string, def: UnlockDefLike): Promise<boolean>
  lockContent(code: string, game: string, def: UnlockDefLike, packs: readonly Pack[]): Promise<{ unlock: string }>
  contentScript(locked: readonly { unlock: string }[]): string
}

type UnlockDefLike = { id: string; label: string; hash: string; salt?: string; iterations?: number }

/** One file of locked content: the unlock it belongs to (its name), where it is, and its packs once loaded. */
export type LockedFile = { unlock: string; file: string }

/** The files of locked content in a game's folder, by unlock; none if it has no `src/unlocks/`. */
export function lockedFiles(root: string): LockedFile[] {
  const dir = resolve(root, UNLOCKS_DIR)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => EXTENSIONS.has(extname(name)) && !name.endsWith('.d.ts') && !name.includes('.test.'))
    .sort()
    .map((name) => ({ unlock: basename(name, extname(name)), file: join(dir, name) }))
}

/** Whether a module id is a file of locked content, which the page must never import. */
export function isLockedModule(root: string, id: string): boolean {
  const path = resolve(id.split('?')[0])
  return path.startsWith(resolve(root, UNLOCKS_DIR) + sep)
}

/** A locked file's packs: its default export, a pack or a list of them. */
export function packsOf(module: Record<string, unknown>, file: string): Pack[] {
  const found = module.default
  const packs = Array.isArray(found) ? found : found ? [found] : []
  if (!packs.length || packs.some((pack) => !pack || typeof pack !== 'object' || typeof (pack as Pack).id !== 'string')) {
    throw new Error(`${file} must export a pack, or a list of packs, as default.`)
  }
  return packs as Pack[]
}

/** The unlocks plugin, from the game's own dependencies, loaded with `load` (Vite's SSR loader). */
export async function unlocksModule(root: string, load: (path: string) => Promise<Record<string, unknown>>): Promise<UnlocksModule> {
  let path: string
  try {
    path = createRequire(join(resolve(root), 'package.json')).resolve('@ifloom/plugin-unlocks')
  } catch {
    throw new Error(`${UNLOCKS_DIR}/ has locked content, but the game doesn't depend on @ifloom/plugin-unlocks, which opens it.`)
  }
  return (await load(path)) as unknown as UnlocksModule
}

/** The codes the environment and the game's `.env` files give, by variable name. Never printed. */
export function codesFrom(root: string, mode: string): Record<string, string> {
  return loadEnv(mode, root, 'IFLOOM_UNLOCK_')
}

/**
 * The script with every unlock's content, encrypted, for the page's head; and
 * what stopped any of it. `strict` (a build) makes a missing code a problem;
 * otherwise (dev) that unlock is left out and noted.
 */
export async function lockedScript(options: {
  root: string
  mode: string
  load: (path: string) => Promise<Record<string, unknown>>
  strict: boolean
}): Promise<{ script: string; problems: string[]; notes: string[]; secrets: { codes: string[]; packs: Pack[] } }> {
  const { root, mode, load, strict } = options
  const files = lockedFiles(root)
  const out = { script: '', problems: [] as string[], notes: [] as string[], secrets: { codes: [] as string[], packs: [] as Pack[] } }
  if (!files.length) return out
  const plugin = await unlocksModule(root, load)
  const { game } = gameFrom(await load(resolve(root, 'src/game.ts')))
  const defs = plugin.unlockDefs(game)
  const codes = codesFrom(root, mode)
  const locked: { unlock: string }[] = []
  for (const { unlock, file } of files) {
    const def = defs.find((entry) => entry.id === unlock)
    if (!def) {
      out.problems.push(`${UNLOCKS_DIR}/${basename(file)}: the game has no unlock "${unlock}" in data.unlocks.unlocks`)
      continue
    }
    const packs = packsOf(await load(file), file)
    out.secrets.packs.push(...packs)
    const name = plugin.envName(unlock)
    const code = codes[name]
    if (!code) {
      ;(strict ? out.problems : out.notes).push(
        `${name} isn't set, so unlock "${unlock}"'s content can't be encrypted${strict ? '' : ' and is left out'}. Put the code in .env.local.`,
      )
      continue
    }
    out.secrets.codes.push(code, plugin.normaliseCode(code))
    try {
      locked.push(await plugin.lockContent(code, game.id, def, packs))
    } catch (error) {
      out.problems.push((error as Error).message)
    }
  }
  if (locked.length) out.script = plugin.contentScript(locked)
  return out
}

/**
 * Every run of text in a value long enough to be a line of the game (prose,
 * titles), for searching a build. Split where a bundle would escape a
 * character (a newline, a quote), so a leaked line is found as the bundle wrote it.
 */
export function linesOf(value: unknown, into: Set<string> = new Set(), seen: WeakSet<object> = new WeakSet()): Set<string> {
  if (typeof value === 'string') {
    for (const piece of value.split(/[\n\r"'`\\]/)) if (piece.trim().length >= 16) into.add(piece.trim())
  } else if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value)
    for (const inner of Object.values(value)) linesOf(inner, into, seen)
  }
  return into
}

/**
 * What of the locked content is in a built folder in plain text: any code,
 * and any line of the locked packs' prose and titles that the game doesn't
 * have elsewhere (`shared`, from `linesOf(game)`). A build with any is
 * refused, so a release can't leak what it encrypts.
 */
export function leaks(dir: string, secrets: { codes: readonly string[]; packs: readonly Pack[]; shared?: ReadonlySet<string> }): string[] {
  const codes = [...new Set(secrets.codes.filter((code) => code.length >= 4))]
  // A line the game has outside the locked packs too (an unlock's own label, say) is no leak.
  const lines = [...linesOf(secrets.packs)].filter((line) => !secrets.shared?.has(line))
  if (!codes.length && !lines.length) return []
  const problems: string[] = []
  for (const { file } of buildFiles(dir)) {
    const text = readFileSync(join(dir, file), 'utf8')
    if (codes.some((code) => text.includes(code))) problems.push(`${file} has an unlock code in it`)
    const line = lines.find((entry) => text.includes(entry))
    if (line) problems.push(`${file} has locked content in it in plain text: "${line.slice(0, 40)}…"`)
  }
  return problems
}

/**
 * What `ifloom check` needs for a game with locked content: the locked packs,
 * to check the game with them, and what's wrong with the files and codes. A
 * code that's set is checked against its unlock's hash; one that isn't is a
 * note, since checking reads the packs from source and needs no code.
 */
export async function checkUnlocks(options: {
  root: string
  mode: string
  game: Game
  load: (path: string) => Promise<Record<string, unknown>>
}): Promise<{ packs: Pack[]; problems: string[]; notes: string[] }> {
  const { root, mode, game, load } = options
  const out = { packs: [] as Pack[], problems: [] as string[], notes: [] as string[] }
  const files = lockedFiles(root)
  if (!files.length) return out
  const plugin = await unlocksModule(root, load)
  const defs = plugin.unlockDefs(game)
  const codes = codesFrom(root, mode)
  for (const { unlock, file } of files) {
    const where = `${UNLOCKS_DIR}/${basename(file)}`
    const def = defs.find((entry) => entry.id === unlock)
    if (!def) {
      out.problems.push(`${where}: the game has no unlock "${unlock}" in data.unlocks.unlocks`)
      continue
    }
    try {
      out.packs.push(...packsOf(await load(file), where))
    } catch (error) {
      out.problems.push((error as Error).message)
    }
    const name = plugin.envName(unlock)
    const code = codes[name]
    if (!code) out.notes.push(`${name} isn't set: unlock "${unlock}"'s content was checked from source, but ifloom build needs the code to encrypt it.`)
    else if (!(await plugin.codeFits(code, game.id, def)))
      out.problems.push(`${name} isn't unlock "${unlock}"'s code: its hash differs. Run ifloom unlock-hash ${unlock} and put the hash it prints in the unlock.`)
  }
  return out
}
