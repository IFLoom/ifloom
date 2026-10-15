import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { checkGame as checkContent, describeProblem, type FileRef, type Game, type Problem } from '@ifloom/engine'

/** What a game module can export: a game, `{ game, problems }`, or a function that returns either. */
type Exported = Game | { game: Game; problems?: unknown[] } | (() => Game | { game: Game; problems?: unknown[] })

/**
 * The game a module exports, as `default` or `game`, with its content
 * checker's problems and the files it names. A loaded game comes with its
 * problems, since `loadGame` ran the checker; a hand-built one is checked
 * here. Either way each problem is listed once.
 */
export function gameFrom(module: Record<string, unknown>): { game: Game; problems: string[]; files: FileRef[] } {
  let found = (module.default ?? module.game) as Exported | undefined
  if (typeof found === 'function') found = found()
  if (!found) throw new Error('The game module exports no game: export it as `default` or `game`.')
  if ('game' in found && typeof found.game === 'object' && Array.isArray(found.problems)) {
    return { game: found.game, problems: found.problems.map(asText), files: checkContent(found.game).files }
  }
  const game = ('game' in found && typeof found.game === 'object' ? found.game : found) as Game
  const checked = checkContent(game)
  return { game, problems: checked.problems.map(describeProblem), files: checked.files }
}

/** A problem as `describeProblem` words it; anything else as a string. */
function asText(problem: unknown): string {
  return typeof problem === 'object' && problem !== null && 'what' in problem ? describeProblem(problem as Problem) : String(problem)
}

/**
 * Every file in `files` that isn't in `dir`, as `<where>: no file <dir>/<path>`.
 * The files are the content checker's (`checkGame(game).files`), with their
 * paths as the page asks for them, so `public/` before a build and `dist/`
 * after one. `inlined` lists files that are in the page itself, after
 * `--inline-assets`, which count as there.
 */
export function checkFiles(files: readonly FileRef[], dir: string, inlined: ReadonlySet<string> = new Set()): string[] {
  const out = new Set<string>()
  for (const file of files) {
    if (!inlined.has(file.path) && !existsSync(join(dir, file.path))) out.add(`${file.where}: no file ${join(dir, file.path)}`)
  }
  return [...out]
}

/**
 * Everything wrong with a game: the engine's content checker's problems,
 * once, then, given the game's public folder, every sound, picture and video
 * file that isn't in it.
 */
export function checkGame(module: Record<string, unknown>, publicDir?: string): string[] {
  const { problems, files } = gameFrom(module)
  return [...problems, ...(publicDir === undefined ? [] : checkFiles(files, publicDir))]
}
