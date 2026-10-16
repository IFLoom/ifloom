/**
 * A project as a game: its pack loaded over a base that names the title, the
 * intro scene and the plugins. The problems list and the preview both use it.
 */
import { loadGame, type Loaded, type Plugin, type Problem } from '@ifloom/engine'
import { exportPack } from './exporters.ts'
import type { Project } from './model.ts'
import { makePlugins } from './plugins.ts'

/** The game, with every problem the loader and `checkGame` found, or why the plugins couldn't be made. */
export function buildGame(project: Project, plugins?: Plugin<any>[]): Loaded | { error: string } {
  let list = plugins
  if (!list) {
    const made = makePlugins(project.preview)
    if ('error' in made) return made
    list = made.plugins
  }
  return loadGame([exportPack(project)], {
    id: project.pack.id,
    title: project.title,
    plugins: list,
    ...(project.intro ? { introScene: project.intro } : {}),
  })
}

/** Just the problems, with a plugin error as one problem of its own. */
export function problemsOf(project: Project): Problem[] {
  const built = buildGame(project)
  if ('error' in built) return [{ pack: 'preview', where: 'plugins', what: built.error }]
  return built.problems
}
