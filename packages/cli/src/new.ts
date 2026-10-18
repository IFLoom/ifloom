/**
 * `ifloom new`: a new game from a template, ready to run. The `react`,
 * `vanilla`, `vue`, `svelte` and `next` templates live beside this file; the others are the example games, copied from the
 * checkout so there is only one of each to keep working. The `plugin` template
 * is not a game: it's a plugin package of its own, with a test, to publish on npm.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const TEMPLATES = ['react', 'vanilla', 'vue', 'svelte', 'next', 'novel', 'cafe', 'town', 'plugin'] as const
export type TemplateName = (typeof TEMPLATES)[number]

/** The React UI's theme presets, which `@ifloom/react/themes/<name>.css` provides. */
export const THEMES = ['paper', 'terminal', 'studio', 'storybook'] as const
export type ThemeName = (typeof THEMES)[number]

export type NewGameOptions = {
  /**
   * The game's package name, which is also its folder's: `my-story`. For the
   * `plugin` template it's the plugin's package name, such as
   * `ifloom-plugin-weather`, and the plugin's id is the name without
   * `ifloom-plugin-` or `plugin-` in front: `weather`.
   */
  name: string
  /** What to start from. `react` if left out. */
  template?: TemplateName
  /** Where to put it. Left out, `games/<name>` in the IFLoom checkout, or a folder named `<name>` in the current folder anywhere else. */
  into?: string
  /**
   * The React UI preset to start from. Left out, a `react` or `next` game gets one at
   * random, so two new games don't start out looking alike, and a copied
   * example keeps its own. `'none'` leaves the preset out, for the React UI's
   * plain default look. The vanilla, vue and svelte templates have no React UI and ignore it.
   */
  theme?: ThemeName | 'none'
}

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/**
 * Where the templates and the example games are. In the CLI's package the
 * templates are `templates/` beside `src/` and `dist/`, and the examples are in
 * the IFLoom checkout. create-ifloom bundles this module into its `dist/`
 * with copies of both beside it, so it looks there first.
 */
const TEMPLATE_DIR = [here('./templates'), here('../templates')].find((dir) => existsSync(dir)) ?? here('../templates')
const EXAMPLE_DIR = [here('./examples'), here('../../../examples')].find((dir) => existsSync(dir))

/** The IFLoom checkout this module is in, if it is: the root with `tsconfig.base.json`, which a game inside it extends. */
const CHECKOUT = [here('../../../')].find((dir) => existsSync(join(dir, 'tsconfig.base.json')) && existsSync(join(dir, 'packages/cli/package.json')))

/**
 * The checkout's `tsconfig.base.json` without its `ifloom-source` condition: what a
 * game outside the checkout gets in its `tsconfig.json` in place of `extends`.
 * A test holds it to the file.
 */
export const BASE_COMPILER_OPTIONS = {
  target: 'es2023',
  lib: ['ES2023'],
  module: 'esnext',
  moduleResolution: 'bundler',
  allowImportingTsExtensions: true,
  verbatimModuleSyntax: true,
  moduleDetection: 'force',
  erasableSyntaxOnly: true,
  noEmit: true,
  strict: true,
  skipLibCheck: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noFallthroughCasesInSwitch: true,
}

/** The files every template of our own takes from `templates/shared/`. */
const BASE = ['AGENTS.md', 'gitignore', 'tsconfig.json', 'index.html']
/** The game itself, the same in every template: `game.ts` assembles the packs in `world/` and `story/`. */
const GAME = ['src/game.ts', 'src/world/stats.ts', 'src/story/opening.ts']
/** What the templates without React share: the game and the plain stylesheet. The minigame clock and keys come from `@ifloom/browser`. */
const PLAIN = [...BASE, ...GAME, 'src/styles.css']

/** Where each template's files come from, under the templates' folder or the examples'. Ours add the shared files; the examples bring their own. */
const SOURCES: Record<TemplateName, { dir: string; example?: true; shared: string[] }> = {
  // React, Vue and Svelte bring their own vite.config.ts, which adds the framework's plugin.
  react: { dir: 'react', shared: [...BASE, ...GAME] },
  vanilla: { dir: 'vanilla', shared: [...PLAIN, 'vite.config.ts'] },
  vue: { dir: 'vue', shared: PLAIN },
  svelte: { dir: 'svelte', shared: PLAIN },
  // A Next app: its own config, tsconfig, AGENTS.md and .gitignore, and no index.html or Vite config.
  next: { dir: 'next', shared: GAME },
  novel: { dir: 'novel', example: true, shared: ['AGENTS.md', 'gitignore'] },
  cafe: { dir: 'cafe', example: true, shared: ['AGENTS.md', 'gitignore'] },
  town: { dir: 'showcase', example: true, shared: ['AGENTS.md', 'gitignore'] },
  // A plugin package: its own tsconfig, test and README, and no page.
  plugin: { dir: 'plugin', shared: [] },
}

/** What an example has that a new game should not: its build, its tests, its recorded runs. */
const LEFT_OUT = new Set(['node_modules', 'dist', 'dist-one', 'tests', 'snapshots', 'playtest', 'mods'])

/** What any template may have lying around that is never copied. */
const BUILT = new Set(['node_modules', 'dist'])

/** The templates that draw the game without the React UI, and so take no theme. */
const NO_REACT = new Set<TemplateName>(['vanilla', 'vue', 'svelte', 'plugin'])

const VALID_NAME = /^[a-z0-9][a-z0-9._~-]*$/

/** `my-story` as a title: `My Story`. */
function titleOf(name: string): string {
  return name
    .split(/[-._~]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * The plugin template's names, from its package name: the plugin's id
 * (`weather`), and that id as code names (`weather`, `Weather`) and a title.
 * Its code holds `__id__`, `__camel__` and `__Pascal__`, which TypeScript reads
 * as names, so the template still parses.
 */
export function pluginNames(name: string): { id: string; camel: string; Pascal: string; title: string } {
  const id = name.replace(/^(?:ifloom-)?plugin-/, '')
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error(`"${id}" can't be a plugin's id: start with a letter and use lower-case letters, digits and dashes, like ifloom-plugin-weather.`)
  }
  const words = id.split('-').filter(Boolean)
  const camel =
    words[0] +
    words
      .slice(1)
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join('')
  return { id, camel, Pascal: camel[0].toUpperCase() + camel.slice(1), title: titleOf(id) }
}

/** Every file under a folder, as paths relative to it. */
function filesUnder(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name), base) : [relative(base, join(dir, entry.name))],
  )
}

type Manifest = { name?: string; description?: string; license?: string } & Partial<
  Record<'scripts' | 'dependencies' | 'devDependencies', Record<string, string>>
>

/**
 * An example in the checkout leans on the workspace for React, its types and
 * TypeScript. As a game of its own it lists them as the `react` template does,
 * with the same versions, and gets the template's `typecheck` script.
 */
function withReactTemplate(pkg: Manifest): void {
  const react = JSON.parse(readFileSync(join(TEMPLATE_DIR, 'react/package.json'), 'utf8')) as Manifest
  const sorted = (deps: Record<string, string>) => Object.fromEntries(Object.entries(deps).sort(([a], [b]) => (a < b ? -1 : 1)))
  const missing = (field: 'dependencies' | 'devDependencies') =>
    Object.fromEntries(Object.entries(react[field] ?? {}).filter(([dep]) => !dep.startsWith('@ifloom/') && !pkg[field]?.[dep]))
  pkg.scripts = { ...pkg.scripts, typecheck: pkg.scripts?.typecheck ?? react.scripts!.typecheck }
  pkg.dependencies = sorted({ ...pkg.dependencies, ...missing('dependencies') })
  pkg.devDependencies = sorted({ ...pkg.devDependencies, ...missing('devDependencies') })
}

/**
 * A template's tsconfig extends the checkout's `tsconfig.base.json`. Inside
 * the checkout it keeps that, by the right path from the game's folder; anywhere
 * else the settings are written out in full, without the checkout's condition.
 */
/** Whether a folder is inside the IFLoom checkout this module is in. */
export function inCheckout(dir: string): boolean {
  return CHECKOUT !== undefined && (resolve(dir) + sep).startsWith(resolve(CHECKOUT) + sep)
}

function standaloneTsconfig(dir: string): void {
  const path = join(dir, 'tsconfig.json')
  if (!existsSync(path)) return
  const tsconfig = JSON.parse(readFileSync(path, 'utf8')) as { extends?: string; compilerOptions?: Record<string, unknown> }
  if (tsconfig.extends !== '../../tsconfig.base.json') return
  if (CHECKOUT && inCheckout(dir)) {
    tsconfig.extends = relative(dir, join(CHECKOUT, 'tsconfig.base.json')).split(sep).join('/')
  } else {
    delete tsconfig.extends
    tsconfig.compilerOptions = { ...BASE_COMPILER_OPTIONS, ...tsconfig.compilerOptions }
  }
  writeFileSync(path, `${JSON.stringify(tsconfig, null, 2)}\n`)
}

/** Make a new game. Returns its folder and the files written there. Installs nothing. */
export function newGame(options: NewGameOptions): { dir: string; files: string[]; theme: ThemeName | null } {
  const { name, template = 'react' } = options
  if (!VALID_NAME.test(name) || name.length > 214) {
    throw new Error(`"${name}" can't be a package name: use lower-case letters, digits and dashes, like my-story.`)
  }
  const source = SOURCES[template]
  if (!source) throw new Error(`There is no template "${template}". Pick one of: ${TEMPLATES.join(', ')}.`)
  if (options.theme && options.theme !== 'none' && !THEMES.includes(options.theme)) {
    throw new Error(`There is no theme "${options.theme}". Pick one of: ${THEMES.join(', ')}, or none.`)
  }
  const dir = resolve(options.into ?? (CHECKOUT ? join(CHECKOUT, 'games', name) : name))
  if (existsSync(dir) && readdirSync(dir).length > 0) throw new Error(`${dir} already exists and isn't empty.`)

  const plugin = template === 'plugin' ? pluginNames(name) : null
  const example = source.example === true
  if (example && !EXAMPLE_DIR) throw new Error(`The ${template} template copies an example from the IFLoom repository. Use npm create ifloom to start from it.`)
  const from = join(example ? EXAMPLE_DIR! : TEMPLATE_DIR, source.dir)
  cpSync(from, dir, { recursive: true, filter: (path) => !(example ? LEFT_OUT : BUILT).has(relative(from, path).split(/[\\/]/)[0]) })
  for (const file of source.shared) {
    mkdirSync(dirname(join(dir, file)), { recursive: true })
    cpSync(join(TEMPLATE_DIR, 'shared', file), join(dir, file === 'gitignore' ? '.gitignore' : file))
  }
  // npm leaves a .gitignore out of a published package, so a template keeps its own as `gitignore`.
  if (existsSync(join(dir, 'gitignore'))) renameSync(join(dir, 'gitignore'), join(dir, '.gitignore'))

  // The plugin's test is named for it.
  if (plugin) renameSync(join(dir, 'tests/plugin.test.ts'), join(dir, `tests/${plugin.id}.test.ts`))

  const title = plugin?.title ?? titleOf(name)
  const files = filesUnder(dir)
  for (const file of files.filter((path) => /\.(ts|tsx|json|html|md|css)$/.test(path))) {
    const path = join(dir, file)
    const text = readFileSync(path, 'utf8')
    let filled = text.replaceAll('{{name}}', name).replaceAll('{{title}}', title)
    if (plugin) filled = filled.replaceAll('__id__', plugin.id).replaceAll('__camel__', plugin.camel).replaceAll('__Pascal__', plugin.Pascal)
    if (filled !== text) writeFileSync(path, filled)
  }

  // An example keeps its own title, but the package is the new game's.
  const pkgPath = join(dir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Manifest
  pkg.name = name
  if (example) {
    delete pkg.description
    delete pkg.license
    withReactTemplate(pkg)
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  standaloneTsconfig(dir)

  // The preset: the one asked for (none takes it out), a random one for a `react` game, or the example's own.
  const styles = join(dir, 'src/styles.css')
  let theme: ThemeName | null = null
  if (!NO_REACT.has(template) && existsSync(styles)) {
    const css = readFileSync(styles, 'utf8')
    const chosen = options.theme ?? (template === 'react' || template === 'next' ? THEMES[Math.floor(Math.random() * THEMES.length)] : undefined)
    if (chosen === 'none') {
      writeFileSync(styles, css.replace(/@import "@ifloom\/react\/themes\/[\w-]+\.css";\n?/, ''))
    } else if (chosen) {
      const line = `@import "@ifloom/react/themes/${chosen}.css";`
      const withTheme = /@import "@ifloom\/react\/themes\/[\w-]+\.css";/.test(css)
        ? css.replace(/@import "@ifloom\/react\/themes\/[\w-]+\.css";/, line)
        : css.replace('@import "@ifloom/react/styles.css";', `@import "@ifloom/react/styles.css";\n${line}`)
      writeFileSync(styles, withTheme)
      theme = chosen
    } else {
      theme = (css.match(/@ifloom\/react\/themes\/([\w-]+)\.css/)?.[1] as ThemeName | undefined) ?? null
    }
  }

  return { dir, files, theme }
}
