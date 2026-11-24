/**
 * `@ifloom/engine/testing`: helpers for a plugin's or a game's tests. They
 * name no test runner: each returns a value or throws a plain `Error`, so they
 * work the same under Vitest, `node:test` or any other.
 *
 * - `loadChecked` loads a game and throws on any problem the content checker finds.
 * - `freshState` is a new game with no scene open, where a plugin's buttons are.
 * - `play` applies commands in turn and throws on the first one refused, with its reason.
 * - `partnerCases` lists a plugin alone and with each plugin it cooperates with.
 * - `boundaryProblems` and `undocumentedExports` read a plugin package's source as text,
 *   for the contract tests that hold it to the plugin rules and to its docs.
 */
import { apply, describeProblem, loadGame, startingState } from './index.ts'
import type { CommandRef, Content, Game, GameBase, GameState, LoadOptions, StartOptions } from './index.ts'
import type { Plugin } from './plugin-api.ts'

/** `loadGame`, for a test: the game, or an `Error` listing every problem the content checker found. */
export function loadChecked(content: readonly Content[], base: GameBase, options: LoadOptions = {}): Game {
  const { game, problems } = loadGame(content, base, options)
  if (problems.length > 0)
    throw new Error(`The game has ${problems.length} content problem(s):\n${problems.map((problem) => `  ${describeProblem(problem)}`).join('\n')}`)
  return game
}

/** A new game, as `startingState` makes it, with no scene open: the room, where a plugin's actions and panels are. */
export function freshState(game: Game, options: StartOptions = {}): GameState {
  return { ...startingState(game, options), sceneId: null }
}

/** The state after each command in turn. Throws on the first one refused, naming it and its reason. */
export function play(state: GameState, game: Game, ...commands: readonly CommandRef[]): GameState {
  for (const [index, command] of commands.entries()) {
    const out = apply(state, game, command)
    if (!out.ok) throw new Error(`Command ${index + 1}, ${JSON.stringify(command)}, was refused: ${out.reason}`)
    state = out.state
  }
  return state
}

/** One way to load a plugin for a test: alone, or with one of the plugins it cooperates with. */
export type PartnerCase = {
  /** `alone`, or `with <id>`, for a test's name. */
  name: string
  /** The partner's id, or `null` alone. */
  partner: string | null
  /** The plugins to load: the partner, if any, then the plugin under test. */
  plugins: Plugin[]
  /** Whether this case loads the plugin `id`: the plugin under test or the partner. */
  has: (id: string) => boolean
}

/**
 * The plugin alone, then with each partner in turn, for a test to run a block
 * in each. Every partner must be in the plugin's `cooperates`, since a plugin
 * reaches no other; one that isn't, or is listed twice, throws.
 */
export function partnerCases(plugin: Plugin, partners: readonly Plugin[]): PartnerCase[] {
  const cooperates = new Set(plugin.cooperates ?? [])
  const seen = new Set<string>()
  for (const partner of partners) {
    if (!cooperates.has(partner.id)) throw new Error(`${plugin.id} doesn't cooperate with ${partner.id}: add it to cooperates, or leave it out`)
    if (seen.has(partner.id)) throw new Error(`${partner.id} is listed twice`)
    seen.add(partner.id)
  }
  const make = (partner: Plugin | null): PartnerCase => {
    const plugins = partner ? [partner, plugin] : [plugin]
    return { name: partner ? `with ${partner.id}` : 'alone', partner: partner?.id ?? null, plugins, has: (id) => plugins.some((each) => each.id === id) }
  }
  return [make(null), ...partners.map(make)]
}

/** Each `import … from` and `export … from` a source names, as written. */
function importsOf(source: string): string[] {
  return [...source.matchAll(/^(?:import|export)[^'"]*\sfrom\s['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]/gm)].map((match) => match[1] ?? match[2])
}

/** A source with its strings and comments blanked, so a page's script written as text isn't code. */
function codeOf(source: string): string {
  return source.replace(/`[^`]*`|'[^'\n]*'|"[^"\n]*"|\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
}

/**
 * What breaks the plugin rules in a plugin package's source, given as each
 * file's text by its path (any path with `src/` in it, such as a glob's keys):
 * one line for each, or none.
 *
 * - The main entry, everything in `src/` but `src/react/`, imports only
 *   `@ifloom/engine`, `@ifloom/engine/plugin` and its own files beside it,
 *   never its React UI.
 * - It uses no browser global (`window.`, `document.`) outside strings and comments.
 * - `src/react/`, the `/react` subpath, imports only the engine's main
 *   entry, `react`, `react-dom`, `@ifloom/react` and `@ifloom/react/kit`,
 *   its own files and `../index.ts`.
 */
export function boundaryProblems(sources: Readonly<Record<string, string>>): string[] {
  const files = Object.entries(sources)
  if (files.length === 0) return ['no source files to check']
  const ui = (file: string) => `/${file}`.includes('/src/react/')
  const allowedUi = new Set(['@ifloom/engine', '@ifloom/react', '@ifloom/react/kit', 'react', 'react-dom'])
  const allowedEngine = new Set(['@ifloom/engine', '@ifloom/engine/plugin'])
  const problems: string[] = []
  for (const [file, source] of files) {
    for (const spec of importsOf(source)) {
      const fine = ui(file)
        ? spec.startsWith('./') || spec === '../index.ts' || allowedUi.has(spec)
        : (spec.startsWith('./') && !spec.startsWith('./react/')) || allowedEngine.has(spec)
      if (!fine) problems.push(`${file} → ${spec}`)
    }
    if (!ui(file) && /\b(window|document)\./.test(codeOf(source))) problems.push(`${file}: uses a browser global outside src/react/`)
  }
  return problems
}

/** Every name a source exports, sorted: its `export function`, `const`, `type` and the rest, and each name in an export list. */
export function exportedNames(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export (?:type|function|const|let|class|interface) ([A-Za-z_$][\w$]*)/gm)) names.add(match[1])
  for (const match of source.matchAll(/export (?:type )?\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop()
      if (name) names.add(name)
    }
  }
  return [...names].sort()
}

/** Each name the entries' sources export that the page never mentions as a word, sorted. */
export function undocumentedExports(sources: readonly string[], page: string): string[] {
  const names = new Set(sources.flatMap(exportedNames))
  return [...names].filter((name) => !new RegExp(`\\b${name}\\b`).test(page)).sort()
}
