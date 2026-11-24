import { describe, expect, it } from 'vitest'
import { boundaryProblems, exportedNames, undocumentedExports } from '../../src/testing.ts'
import { PLUGIN_NAMES, factoryOf } from './first-party.ts'

/**
 * Every first-party plugin package, found by glob, held to the plugin rules
 * and to its docs page. One suite for all of them: a package
 * `scripts/new-plugin.ts` makes is checked here with nothing to copy, and
 * fails until it has what it needs. The plugin shape and the naming rule are
 * `plugin-shape.test.ts` and `naming.test.ts`, which read the same list.
 */
const SOURCES = import.meta.glob('../../../plugin-*/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const PAGES = import.meta.glob('../../../../docs/content/docs/\\(latest\\)/reference/plugins/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** The plugins' tests, by path: only which files there are. */
const TESTS = Object.keys(import.meta.glob('../../../plugin-*/tests/*.test.{ts,tsx}'))

/**
 * How many exports each plugin has at least, from its main entry and its React
 * UI: a floor under the docs check, so an entry the glob misses can't pass it
 * by exporting nothing. A plugin not listed needs at least one.
 */
const MIN_EXPORTS: Record<string, number> = {
  achievements: 11,
  calendar: 6,
  cast: 6,
  debug: 6,
  devices: 11,
  feed: 11,
  generators: 6,
  jobs: 11,
  messages: 11,
  places: 6,
  quests: 11,
  shop: 11,
  statuses: 11,
  wardrobe: 6,
}

/** One plugin's source files, by path. */
function sourcesOf(name: string): Record<string, string> {
  const prefix = `../../../plugin-${name}/src/`
  return Object.fromEntries(Object.entries(SOURCES).filter(([path]) => path.startsWith(prefix)))
}

const pageOf = (name: string) =>
  PAGES[`../../../../docs/content/docs/(latest)/reference/plugins/${name}.md`] ?? PAGES[`../../../../docs/content/docs/(latest)/reference/plugins/${name}.mdx`]

it('finds every first-party plugin', () => {
  expect(PLUGIN_NAMES.length).toBeGreaterThanOrEqual(17)
})

describe.each(PLUGIN_NAMES)('plugin-%s', (name) => {
  const sources = sourcesOf(name)
  const index = sources[`../../../plugin-${name}/src/index.ts`]
  const ui = sources[`../../../plugin-${name}/src/react/index.tsx`]

  it('has a main entry that exports its factory, and a test that plays it', () => {
    expect(index, 'src/index.ts').toBeDefined()
    expect(factoryOf(name), 'a factory exported under the plugin’s camel-cased name').toBeDefined()
    expect(TESTS.filter((path) => path.startsWith(`../../../plugin-${name}/tests/`)).length, 'a test in tests/').toBeGreaterThan(0)
  })

  // A plugin proves the plugin API only if it uses nothing else: the engine's front door and its own files. The engine side runs
  // anywhere, so it never reaches for a page. Its React UI, the `/react` subpath, is built only from the kit, `@ifloom/react`'s
  // front door, as a game's own UI is: never a deep path, and never another plugin.
  it('imports only @ifloom/engine and its own files, with React kept to src/react/', () => {
    expect(boundaryProblems(sources)).toEqual([])
  })

  // A developer learns the plugin from the docs site alone, so an export the page doesn't name is a feature nobody can find.
  it(`names every export of @ifloom/plugin-${name}, its React UI's too, on its docs page`, () => {
    const entries = [index, ui].filter((source): source is string => source !== undefined)
    expect(new Set(entries.flatMap(exportedNames)).size, `MIN_EXPORTS.${name}`).toBeGreaterThanOrEqual(MIN_EXPORTS[name] ?? 1)
    const page = pageOf(name) ?? ''
    expect(page.length, `docs/content/docs/(latest)/reference/plugins/${name}.md`).toBeGreaterThan(0)
    expect(undocumentedExports(entries, page)).toEqual([])
  })
})
