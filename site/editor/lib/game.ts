/**
 * A project as a game: its pack loaded over a base that names the title, the
 * intro scene and the plugins. The problems list and the preview both use it.
 */
import { loadGame, type Loaded, type Plugin, type Problem } from '@ifloom/engine'
import { exportPack, fromJson } from './exporters.ts'
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

/**
 * Import a JSON file as a new project and keep it with `keep`. It answers
 * what to tell the player, and never throws: a file that can't be read, a pack
 * that won't open and a draft the browser won't keep each end as a message.
 */
export async function importJson(file: Pick<File, 'name' | 'text'>, keep: (project: Project) => Promise<void>): Promise<string> {
  try {
    const result = fromJson(await file.text())
    if ('error' in result) return `${file.name}: ${result.error}`
    await keep(result.project)
    const count = problemsOf(result.project).length
    return count ? `Imported ${file.name}. checkGame found ${count} problem${count === 1 ? '' : 's'}: see Problems.` : `Imported ${file.name}.`
  } catch (error) {
    return `${file.name} couldn't be imported: ${error instanceof Error ? error.message : String(error)}`
  }
}
