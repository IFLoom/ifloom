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
 * The game a game module builds, with its loader's problems in
 * `describeProblem`'s words and the files it names. `unlocked` packs go to
 * its `build` as `{ unlocked }`.
 */
export function gameFrom(module: Record<string, unknown>, unlocked: Pack[] = []): { game: Game; problems: string[]; files: FileRef[] } {
  const { game, problems } = gameModule(module).build({ unlocked })
  return { game, problems: problems.map(describeProblem), files: checkContent(game).files }
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
