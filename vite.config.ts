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

type Manifest = { name: string; scripts?: Record<string, string> } & Partial<
  Record<'dependencies' | 'peerDependencies' | 'devDependencies', Record<string, string>>
>
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
tasks['typecheck:site'] = {
  command: 'npm run typecheck --silent',
  cwd: 'site',
  cache: { input: [{ auto: true }, '!site/.next/**', '!site/.source/**', '!site/next-env.d.ts', '!site/**/*.tsbuildinfo'], output: [] },
}
tasks['typecheck:all'] = { command: 'echo "Every project type-checks."', dependsOn: Object.keys(tasks).filter((name) => name.startsWith('typecheck:')) }

// The docs site: the link check, then `next build`. Both are cached by the files the site can read, listed by hand
// because Next's workers and Turbopack read far more than the build depends on. That's site/ but for what it writes,
// the source of each @ifloom package the site depends on (and those packages' own @ifloom peers,
// as the React UI's on audio and browser), the changelog the docs include, and the root files that pick dependencies.
// So an edit to the CLI, a test, an example or a template skips it.
// Vercel doesn't use these tasks: it runs `next build` in site/ after a clean install.
const siteManifest = read('site')
const siteUses = new Set<string>()
const addUses = (names: string[]) => {
  for (const name of names) {
    const dir = dirOf.get(name)
    if (!dir || siteUses.has(dir)) continue
    siteUses.add(dir)
    addUses(Object.keys(packages.find((one) => one.dir === dir)?.manifest.peerDependencies ?? {}))
  }
}
addUses(Object.keys({ ...siteManifest.dependencies, ...siteManifest.devDependencies }))
const siteInput = [
  'site/**',
  '!site/node_modules/**',
  '!site/.next/**',
  '!site/.source/**',
  '!site/next-env.d.ts',
  '!site/**/*.tsbuildinfo',
  ...[...siteUses].sort().flatMap((dir) => [`packages/${dir}/src/**`, `packages/${dir}/package.json`]),
  'CHANGELOG.md',
  'package.json',
  'package-lock.json',
  '.npmrc',
]
tasks['site:links'] = { command: 'npm run links --silent', cwd: 'site', cache: { input: siteInput, output: [] } }
// A hit puts back the built site (all `next start` needs) and the MDX collections fumadocs-mdx generates, but not
// Next's own build cache in .next/cache, which only speeds up the next real build.
// Built with webpack (build:lean): Turbopack's compile takes most of a 15 GB machine. Vercel builds with Turbopack.
tasks['site:build'] = {
  command: 'npm run build:lean --silent',
  cwd: 'site',
  dependsOn: ['site:links'],
  cache: { input: siteInput, output: ['site/.next/**', '!site/.next/cache/**', 'site/.source/**', 'site/next-env.d.ts'] },
}

// Test: one Vitest run over every package and example (vitest.config.ts).
tasks['test:all'] = {
  command: 'vitest run',
  cache: { input: [{ auto: true }, '!**/dist/**', '!node_modules/.vite/**', '!node_modules/.vite-temp/**', '!node_modules/.vitest-cache/**'], output: [] },
}

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
    // Type-aware rules (tsgolint, on TypeScript 7's checker). tsc on TypeScript 6 stays the typecheck (`vp run typecheck:all`),
    // so no `typeCheck` here. Any warning fails `vp check`.
    options: { typeAware: true, denyWarnings: true },
    // The templates are copied into a new game, with packages the checkout doesn't install for them.
    ignorePatterns: ['packages/cli/templates/**'],
    rules: {
      // Plugins turn content's `with` arguments (`unknown`) into ids with String() on purpose; argProblems catches a wrong shape.
      'typescript/no-base-to-string': 'off',
      // Without noUncheckedIndexedAccess an index read never looks undefined, so a default on one (`const [a, b = 0] = ...`) looks useless.
      'typescript/no-useless-default-assignment': 'off',
      // mountGame is a page's entry: a failure to mount shows in the console as it is, so its promise is left on its own.
      'typescript/no-floating-promises': ['warn', { allowForKnownSafeCalls: [{ from: 'file', name: 'mountGame', path: 'packages/react/src/game/mount.tsx' }] }],
      // On top of tsgolint's defaults, the rules that find real mistakes here and say nothing false.
      // An async handler on a JSX attribute is fine: React ignores what it returns, and each one catches its own failure.
      'typescript/no-misused-promises': ['warn', { checksVoidReturn: { attributes: false } }],
      'typescript/await-thenable': 'warn',
      'typescript/no-deprecated': 'warn',
      'typescript/no-for-in-array': 'warn',
      'typescript/no-array-delete': 'warn',
      'typescript/no-misused-spread': 'warn',
      'typescript/no-meaningless-void-operator': 'warn',
      'typescript/no-unsafe-unary-minus': 'warn',
      'typescript/no-unsafe-enum-comparison': 'warn',
      'typescript/only-throw-error': 'warn',
      'typescript/restrict-plus-operands': 'warn',
      'typescript/restrict-template-expressions': 'warn',
      'typescript/return-await': 'warn',
      'typescript/use-unknown-in-catch-callback-variable': 'warn',
      'typescript/no-unnecessary-template-expression': 'warn',
      'typescript/prefer-includes': 'warn',
      'typescript/prefer-find': 'warn',
      'typescript/prefer-optional-chain': 'warn',
      // Left off, as noise for this code:
      // no-unsafe-*: the upgrade, intake and editor code reads untrusted JSON through Array.isArray and JSON.parse, which the lib types as any.
      // no-unnecessary-type-conversion: for the same reason, it calls Boolean(record[key]) a no-op when the key may be missing.
      // no-unnecessary-condition, strict-boolean-expressions: content comes from games in plain JS too, so the engine checks what its types promise.
      // no-unnecessary-type-assertion: it flags the `as unknown as` steps and import.meta.glob casts that tsc on TypeScript 6 needs.
      // switch-exhaustiveness-check: each switch over a union that skips cases has a deliberate `default`.
      // prefer-nullish-coalescing: `||` on '' and 0 is meant where it's used; `??` would change behaviour.
      // prefer-promise-reject-errors: IndexedDB rejects with `request.error`, typed `DOMException | null`.
      // no-confusing-void-expression, require-await, consistent-return: style the repo doesn't follow.
    },
    overrides: [
      {
        // A test passes a spy to expect() and never calls it, so its `this` can't be lost.
        files: ['**/tests/**'],
        rules: { 'typescript/unbound-method': 'off' },
      },
    ],
  },
})
