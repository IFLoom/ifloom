/**
 * The checkout's own tools, through Vite+ (`vp`): the task runner with its
 * cache (`vp run`), and the formatter and linter (`vp check`). Only this
 * repo's development uses it. A game, a template and the packages' users
 * never see it, and the CLI builds games with plain Vite.
 *
 *   npm run build      every package's dist/, each after the @ifloom packages it uses
 *   npm run typecheck  tsc on each package, example and the site, from src/
 *   npx vp run build:engine          one package (and what it uses)
 *   npx vp run typecheck:plugin-shop one project
 *
 * Each task is cached in node_modules/.vite/task-cache by the files it read,
 * found by watching it run, so a task runs again only when one of them
 * changes (`npx vp cache clean` empties it). A cached build restores dist/.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite-plus'

type Manifest = { name: string; scripts?: Record<string, string> } & Partial<Record<'peerDependencies' | 'devDependencies', Record<string, string>>>
type Task = NonNullable<NonNullable<Parameters<typeof defineConfig>[0]['run']>['tasks']>[string]

const root = import.meta.dirname
const read = (dir: string) => JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8')) as Manifest
const packages = readdirSync(join(root, 'packages'))
  .sort()
  .map((dir) => ({ dir, manifest: read(`packages/${dir}`) }))
const dirOf = new Map(packages.map(({ dir, manifest }) => [manifest.name, dir]))

const tasks: Record<string, Task> = {}

// Build: tsdown in each package, after the @ifloom packages it peers on or develops against.
const built = packages.filter(({ manifest }) => manifest.scripts?.build)
for (const { dir, manifest } of built) {
  const uses = Object.keys({ ...manifest.peerDependencies, ...manifest.devDependencies }).flatMap((name) => {
    const used = dirOf.get(name)
    return used && built.some((other) => other.dir === used) ? [`build:${used}`] : []
  })
  tasks[`build:${dir}`] = {
    command: 'tsdown',
    cwd: `packages/${dir}`,
    dependsOn: uses,
    // dist/ is only ever output: the React UI's CSS step and the CLI's bin read back what they wrote.
    cache: { input: [{ auto: true }, `!packages/${dir}/dist/**`], output: [`packages/${dir}/dist/**`] },
  }
}
tasks['build:all'] = { command: 'echo "Built every package."', dependsOn: built.map(({ dir }) => `build:${dir}`) }

// Typecheck: each project with its own tsconfig, which reads the packages' src/ through `ifloom-source`.
const projects = [...packages.map(({ dir }) => `packages/${dir}`), ...['showcase', 'novel', 'cafe'].map((name) => `examples/${name}`)]
for (const project of projects) {
  tasks[`typecheck:${project.split('/')[1]}`] = { command: `tsc --noEmit -p ${project}`, cache: { input: [{ auto: true }, '!**/dist/**'], output: [] } }
}
// The site generates its MDX collections and Next's route types first.
tasks['typecheck:site'] = { command: 'npm run typecheck --silent', cwd: 'site', cache: { input: [{ auto: true }, '!site/.next/**', '!site/.source/**', '!site/next-env.d.ts', '!site/**/*.tsbuildinfo'], output: [] } }
tasks['typecheck:all'] = { command: 'echo "Every project type-checks."', dependsOn: Object.keys(tasks).filter((name) => name.startsWith('typecheck:')) }

// Test: one Vitest run over every package, example and the site's editor (vitest.config.ts).
tasks['test:all'] = { command: 'vitest run', cache: { input: [{ auto: true }, '!**/dist/**', '!node_modules/.vite/**', '!node_modules/.vite-temp/**'], output: [] } }

export default defineConfig({
  run: { tasks },
  // Oxfmt, for the code only: the docs' prose, JSON fixtures, stylesheets and HTML fixtures keep their hand-made shape.
  fmt: {
    printWidth: 160,
    semi: false,
    singleQuote: true,
    // Keep keys quoted as written: the plugin template's '__id__' is replaced by a name that may hold a dash.
    quoteProps: 'preserve',
    sortPackageJson: false,
    ignorePatterns: ['**/*.md', '**/*.mdx', '**/*.json', '**/*.css', '**/*.html', '**/*.yml', '**/*.yaml', 'site/content/**'],
  },
  lint: {
    plugins: ['typescript', 'oxc'],
  },
})
