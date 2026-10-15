/**
 * `ifloom new`: a new game from a template, ready to run. The blank templates
 * live beside this file; the others are the example games, copied from the
 * checkout so there is only one of each to keep working.
 */
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const TEMPLATES = ['blank', 'vanilla', 'novel', 'cafe', 'town'] as const
export type TemplateName = (typeof TEMPLATES)[number]

export type NewGameOptions = {
  /** The game's package name, which is also its folder's: `my-story`. */
  name: string
  /** What to start from. `blank` if left out. */
  template?: TemplateName
  /** Where to put it. `games/<name>` in the IFLoom checkout if left out. */
  into?: string
}

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/** Where each template's files come from. The blank ones add the shared files; the examples bring their own. */
const SOURCES: Record<TemplateName, { dir: string; shared: string[] }> = {
  blank: { dir: here('../templates/blank-react'), shared: ['AGENTS.md', 'gitignore', 'tsconfig.json', 'vite.config.ts', 'index.html'] },
  vanilla: { dir: here('../templates/blank-vanilla'), shared: ['AGENTS.md', 'gitignore', 'tsconfig.json', 'vite.config.ts', 'index.html'] },
  novel: { dir: here('../../../examples/novel'), shared: ['AGENTS.md', 'gitignore'] },
  cafe: { dir: here('../../../examples/cafe'), shared: ['AGENTS.md', 'gitignore'] },
  town: { dir: here('../../../examples/showcase'), shared: ['AGENTS.md', 'gitignore'] },
}

/** What an example has that a new game should not: its build, its tests, its recorded runs. */
const LEFT_OUT = new Set(['node_modules', 'dist', 'dist-one', 'tests', 'snapshots', 'playtest', 'mods'])

const VALID_NAME = /^[a-z0-9][a-z0-9._~-]*$/

/** `my-story` as a title: `My Story`. */
function titleOf(name: string): string {
  return name
    .split(/[-._~]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

/** Every file under a folder, as paths relative to it. */
function filesUnder(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name), base) : [relative(base, join(dir, entry.name))],
  )
}

/** Make a new game. Returns its folder and the files written there. Installs nothing. */
export function newGame(options: NewGameOptions): { dir: string; files: string[] } {
  const { name, template = 'blank' } = options
  if (!VALID_NAME.test(name) || name.length > 214) {
    throw new Error(`"${name}" can't be a package name: use lower-case letters, digits and dashes, like my-story.`)
  }
  const source = SOURCES[template]
  if (!source) throw new Error(`There is no template "${template}". Pick one of: ${TEMPLATES.join(', ')}.`)
  const dir = options.into ?? here(`../../../games/${name}`)
  if (existsSync(dir) && readdirSync(dir).length > 0) throw new Error(`${dir} already exists and isn't empty.`)

  cpSync(source.dir, dir, { recursive: true, filter: (path) => !LEFT_OUT.has(relative(source.dir, path).split(/[\\/]/)[0]) })
  for (const file of source.shared) {
    cpSync(here(`../templates/shared/${file}`), join(dir, file === 'gitignore' ? '.gitignore' : file))
  }

  const title = titleOf(name)
  const files = filesUnder(dir)
  for (const file of files.filter((path) => /\.(ts|tsx|json|html|md|css)$/.test(path))) {
    const path = join(dir, file)
    const text = readFileSync(path, 'utf8')
    const filled = text.replaceAll('{{name}}', name).replaceAll('{{title}}', title)
    if (filled !== text) writeFileSync(path, filled)
  }

  // An example keeps its own title, but the package is the new game's.
  const pkgPath = join(dir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>
  pkg.name = name
  delete pkg.description
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

  return { dir, files }
}
