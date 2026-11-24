import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { checkGame as checkContent, describeProblem, type FileRef, type Game, type Pack } from '@ifloom/engine'
import { isGameModule, type GameModule } from './module.ts'

/** How to write a game module, for a module that isn't one. */
export const GAME_MODULE_HELP = `Export the game with defineGame:

  import { loadGame } from '@ifloom/engine'
  import { defineGame } from '@ifloom/cli/game'

  export default defineGame({
    build: ({ unlocked }) => loadGame(content, { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
  })

See https://ifloom.dev/docs/cli#the-game-module`

/** A game module the CLI can't read: the command line prints its message alone, with no stack. */
export class GameModuleError extends Error {
  override name = 'GameModuleError'
}

/** The module `defineGame` made, from a game module's default export; an error saying how to write one if it isn't. */
export function gameModule(module: Record<string, unknown>): GameModule {
  if (isGameModule(module.default)) return module.default
  throw new GameModuleError(`The game module's default export isn't made with defineGame. ${GAME_MODULE_HELP}`)
}

/**
 * Returns the game a game module builds, with its problems and warnings as sentences and the files its content names.
 * It throws when the module's default export isn't made with `defineGame`.
 *
 * The problems are the loader's and the warnings the content checker's, each worded by `describeProblem`. `unlocked`
 * packs go to the module's `build` as `{ unlocked }`.
 */
export function gameFrom(module: Record<string, unknown>, unlocked: Pack[] = []): { game: Game; problems: string[]; warnings: string[]; files: FileRef[] } {
  const { game, problems } = gameModule(module).build({ unlocked })
  const checked = checkContent(game)
  return { game, problems: problems.map(describeProblem), warnings: checked.warnings.map(describeProblem), files: checked.files }
}

/**
 * Returns a line for each file in `files` that isn't in `dir`, as `<where>: no file <dir>/<path>`. An empty list means
 * every file is there.
 *
 * The files are the content checker's (`checkGame(game).files`), with their paths as the page requests them, so `dir`
 * is `public/` before a build and `dist/` after one. Paths in `inlined` are inside the page after `--inline-assets`,
 * and count as there.
 */
export function checkFiles(files: readonly FileRef[], dir: string, inlined: ReadonlySet<string> = new Set()): string[] {
  const out = new Set<string>()
  for (const file of files) {
    if (!inlined.has(file.path) && !existsSync(join(dir, file.path))) out.add(`${file.where}: no file ${join(dir, file.path)}`)
  }
  return [...out]
}

/**
 * Returns a line for each problem with a game module's game, the loader's problems first. Given the game's public
 * folder, it adds each sound, picture and video file that isn't in it.
 */
export function checkGame(module: Record<string, unknown>, publicDir?: string): string[] {
  const { problems, files } = gameFrom(module)
  return [...problems, ...(publicDir === undefined ? [] : checkFiles(files, publicDir))]
}
