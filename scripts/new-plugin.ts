// Scaffolds a first-party plugin, packages/plugin-<name>, modelled on
// plugin-quests, and wires it into the root typecheck and the docs sidebar.
// What needs words (the AGENTS.md row, the plugins index, the CHANGELOG, the
// showcase) is left to you: `git grep "TODO(new-plugin)"` lists the stubs.
//
//   node scripts/new-plugin.ts <name>            make it
//   node scripts/new-plugin.ts --remove <name>   undo it, for a throwaway
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const remove = process.argv[2] === '--remove'
const name = process.argv[remove ? 3 : 2]
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Usage: node scripts/new-plugin.ts [--remove] <name>, such as shop (lower-case letters, digits and dashes)')
  process.exit(1)
}

const words = name.split('-')
const camel = words[0] + words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join('')
const Pascal = camel[0].toUpperCase() + camel.slice(1)
const title = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
const pkgDir = join(root, 'packages', `plugin-${name}`)
const at = (path: string) => relative(root, path)

/** Where the plugin docs live: the Fumadocs site once it exists, else VitePress. */
function docsLayout(): { kind: 'fumadocs' | 'vitepress'; dir: string; nav: string } {
  const site = join(root, 'site', 'content', 'docs')
  if (existsSync(site)) {
    const found = readdirSync(site, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(site, e.name, 'plugins', 'meta.json')))
      .map((e) => e.name)
    const latest = found.find((dir) => dir.includes('latest')) ?? (found.length === 1 ? found[0] : undefined)
    if (!latest) throw new Error(`Can't tell which folder under ${at(site)} holds the latest plugins docs: ${found.join(', ') || 'none has plugins/meta.json'}.`)
    const dir = join(site, latest, 'plugins')
    return { kind: 'fumadocs', dir, nav: join(dir, 'meta.json') }
  }
  return { kind: 'vitepress', dir: join(root, 'docs', 'plugins'), nav: join(root, 'docs', '.vitepress', 'sidebar.ts') }
}

const docs = docsLayout()
const page = join(docs.dir, `${name}.md`)
const pkgJson = join(root, 'package.json')
const typecheckEntry = ` && tsc --noEmit -p packages/plugin-${name}`
const sidebarLine = `        { text: '${title}', link: '/plugins/${name}' },\n`

function edit(path: string, change: (text: string) => string): void {
  const before = readFileSync(path, 'utf8')
  const after = change(before)
  if (after !== before) {
    writeFileSync(path, after)
    console.log(`${remove ? 'Reverted' : 'Edited'} ${at(path)}`)
  }
}

function editNav(): void {
  if (docs.kind === 'fumadocs') {
    edit(docs.nav, (text) => {
      const meta = JSON.parse(text) as { pages: string[] }
      meta.pages = meta.pages.filter((entry) => entry !== name)
      if (!remove) {
        const debug = meta.pages.indexOf('debug')
        meta.pages.splice(debug >= 0 ? debug : meta.pages.length, 0, name)
      }
      return `${JSON.stringify(meta, null, 2)}\n`
    })
    return
  }
  edit(docs.nav, (text) => {
    const without = text.replace(sidebarLine, '')
    if (remove) return without
    const debug = without.indexOf("        { text: 'Debug', link: '/plugins/debug' },")
    if (debug < 0) throw new Error(`No Debug entry in ${at(docs.nav)} to put ${title} before.`)
    return without.slice(0, debug) + sidebarLine + without.slice(debug)
  })
}

function editTypecheck(): void {
  edit(pkgJson, (text) => {
    const pkg = JSON.parse(text) as { scripts: Record<string, string> }
    let script = pkg.scripts.typecheck.replace(typecheckEntry, '')
    if (!remove) {
      const phone = script.indexOf(' && tsc --noEmit -p packages/phone')
      script = phone >= 0 ? script.slice(0, phone) + typecheckEntry + script.slice(phone) : script + typecheckEntry
    }
    pkg.scripts.typecheck = script
    return `${JSON.stringify(pkg, null, 2)}\n`
  })
}

if (remove) {
  rmSync(pkgDir, { recursive: true, force: true })
  rmSync(page, { force: true })
  console.log(`Removed ${at(pkgDir)} and ${at(page)}`)
  editNav()
  editTypecheck()
  console.log('Run npm install to drop the workspace link.')
  process.exit(0)
}

if (existsSync(pkgDir)) {
  console.error(`${at(pkgDir)} already exists.`)
  process.exit(1)
}

// The docs contract reads the page by a path relative to tests/contracts.
const pageGlob =
  docs.kind === 'fumadocs'
    ? `${relative(join(pkgDir, 'tests', 'contracts'), docs.dir).replace(/[()[\]{}]/g, (c) => `\\\\${c}`)}/${name}.{md,mdx}`
    : `../../../../docs/plugins/${name}.md`

const files: Record<string, string> = {
  'package.json': `${JSON.stringify(
    {
      name: `@ifloom/plugin-${name}`,
      version: '0.0.0',
      private: true,
      license: 'MIT',
      description: `TODO(new-plugin): what @ifloom/plugin-${name} adds, in one sentence.`,
      type: 'module',
      exports: { '.': './src/index.ts' },
      files: ['src'],
      peerDependencies: { '@ifloom/engine': '0.0.0' },
    },
    null,
    2,
  )}\n`,

  'tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
`,

  'src/index.ts': `/**
 * @ifloom/plugin-${name}: TODO(new-plugin) what it adds, in a sentence or two.
 *
 * Imports only @ifloom/engine and requires no other plugin (ADR 0003). To
 * work with one the game may have, list it in \`cooperates\` and ask it
 * through conditions, effects and \`query\`.
 */
import { definePlugin, say, type Command, type Condition, type EffectRef, type Game, type PluginProblem } from '@ifloom/engine'

const ID = '${name}'

/** One entry of the plugin's content, from a pack's \`data.${name}.entries\`. TODO(new-plugin): the real fields. */
export type ${Pascal}Entry = {
  id: string
  label: string
}

/** What the plugin keeps in a save. Bump \`version\` and add a migration when this changes shape. */
export type ${Pascal}State = {
  /** Entries marked, with the turn each was marked on. */
  marked: Record<string, number>
}

/** What the UI reads at \`view.plugins.${name}\`. */
export type ${Pascal}View = {
  entries: { id: string; label: string; marked: boolean }[]
}

/** The game's entries: \`data.${name}.entries\`, from its packs. */
export function ${camel}Entries(game: Game): ${Pascal}Entry[] {
  return (game.data?.[ID]?.entries ?? []) as ${Pascal}Entry[]
}

function entryId(args: Record<string, unknown>): string {
  return String(args.entry ?? '')
}

/** The plugin. Add it to the game's \`plugins\`, and put entries in a pack's \`data.${name}.entries\`. */
export function ${camel}() {
  return definePlugin<${Pascal}State>({
    id: ID,
    version: 1,
    start: () => ({ marked: {} }),
    strings: { noSuchEntry: 'There is nothing like that.' },
    conditions: {
      /** \`{ custom: '${name}/marked', with: { entry } }\`: the entry has been marked. */
      marked: (_state, args, { slice }) => slice.marked[entryId(args)] !== undefined,
    },
    effects: {
      /** \`{ custom: '${name}/mark', with: { entry } }\`: mark the entry now. */
      mark: (state, args, { slice, set, game }) => {
        const id = entryId(args)
        if (slice.marked[id] !== undefined || !${camel}Entries(game).some((entry) => entry.id === id)) return state
        return set({ ...slice, marked: { ...slice.marked, [id]: state.turn } })
      },
    },
    commands: {
      /** \`{ type: 'custom', name: '${name}/mark', with: { entry } }\`. */
      mark: {
        whyNot: (_state, args, { game }) => (${camel}Entries(game).some((entry) => entry.id === entryId(args)) ? undefined : say(game, '${name}/noSuchEntry')),
        run: (state, args, { slice, set }) => set({ ...slice, marked: { ...slice.marked, [entryId(args)]: state.turn } }),
      },
    },
    view: (_state, { slice, game }): ${Pascal}View => ({
      entries: ${camel}Entries(game).map((entry) => ({ id: entry.id, label: entry.label, marked: slice.marked[entry.id] !== undefined })),
    }),
    references: {
      // The entry a condition, effect or command names, for the content checker.
      calls: (_kind, _name, args) => (args.entry === undefined ? [] : [{ entry: entryId(args), plugin: ID, list: 'entries', noun: 'entry' }]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const seen = new Set<string>()
      for (const entry of ${camel}Entries(game)) {
        if (seen.has(entry.id)) problems.push({ list: 'entries', id: entry.id, what: 'two entries share this id' })
        seen.add(entry.id)
      }
      return problems
    },
  })
}

/** A condition: the entry has been marked. */
export const ${camel}Marked = (entry: string): Condition => ({ custom: '${name}/marked', with: { entry } })
/** An effect: mark the entry. */
export const mark${Pascal} = (entry: string): EffectRef => ({ custom: '${name}/mark', with: { entry } })
/** A command: mark the entry. */
export const mark${Pascal}Command = (entry: string): Command => ({ type: 'custom', name: '${name}/mark', with: { entry } })
`,

  [`tests/${name}.test.ts`]: `import { describe, expect, it } from 'vitest'
import { SCHEMA, apply, checkGame, holds, loadGame, startingState, view, type Game, type Pack } from '@ifloom/engine'
import { ${camel}, ${camel}Marked, mark${Pascal}, mark${Pascal}Command, type ${Pascal}Entry, type ${Pascal}View } from '../src/index.ts'

const entries: ${Pascal}Entry[] = [
  { id: 'bread', label: 'A loaf of bread' },
  { id: 'milk', label: 'A pint of milk' },
]

function game(extra: Partial<Pack> = {}): Game {
  const town: Pack = {
    id: 'town',
    schema: SCHEMA,
    activities: [{ id: 'shop', effects: [mark${Pascal}('bread')] }],
    data: { ${JSON.stringify(name)}: { entries } },
    ...extra,
  }
  const loaded = loadGame([town], { id: '${name}-town', title: '${title} town', plugins: [${camel}()] })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const shown = (g: Game, state = startingState(g)) => view(state, g).plugins[${JSON.stringify(name)}] as ${Pascal}View

// TODO(new-plugin): replace these with the plugin's real behaviour, and add a describe block
// for each plugin it cooperates with: the game with the partner, and without it.
describe('${name}', () => {
  it('marks an entry through its effect and its command, and shows it', () => {
    const g = game()
    const fresh = { ...startingState(g), sceneId: null }
    expect(shown(g, fresh).entries.map((entry) => entry.marked)).toEqual([false, false])
    const shopped = apply(fresh, g, { type: 'activity', id: 'shop' })
    expect(shopped.refused).toBeUndefined()
    expect(holds(shopped.state, ${camel}Marked('bread'), g)).toBe(true)
    const milk = apply(shopped.state, g, mark${Pascal}Command('milk'))
    expect(shown(g, milk.state).entries.map((entry) => entry.marked)).toEqual([true, true])
  })

  it('refuses to mark what is not there', () => {
    const g = game()
    expect(apply({ ...startingState(g), sceneId: null }, g, mark${Pascal}Command('cheese')).refused).toBe('There is nothing like that.')
  })

  it('reports an entry content names that the game lacks', () => {
    const loaded = loadGame(
      [{ id: 'town', schema: SCHEMA, activities: [{ id: 'shop', effects: [mark${Pascal}('cheese')] }], data: { ${JSON.stringify(name)}: { entries } } }],
      { id: '${name}-town', title: '${title} town', plugins: [${camel}()] },
    )
    expect(loaded.problems.map((problem) => problem.what)).toEqual(['unknown entry "cheese"'])
  })

  it('reports two entries with one id in a hand-built game (packs merge by id, so a loaded one has none)', () => {
    const g = game()
    const doubled = { ...g, data: { ${JSON.stringify(name)}: { entries: [...entries, entries[0]] } } }
    expect(checkGame(doubled).problems.map((problem) => problem.what)).toContain('two entries share this id')
  })
})
`,

  'tests/contracts/boundary.test.ts': `import { describe, expect, it } from 'vitest'

const SOURCES = import.meta.glob(['../../src/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('the ${name} plugin', () => {
  // A plugin proves the plugin API only if it uses nothing else: the engine's
  // front door, and its own files.
  it('imports only @ifloom/engine and its own files', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(0)
    const outside = Object.entries(SOURCES).flatMap(([file, source]) =>
      [...source.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)]
        .map((match) => match[1])
        .filter((spec) => !spec.startsWith('./') && spec !== '@ifloom/engine')
        .map((spec) => \`\${file} → \${spec}\`),
    )
    expect(outside).toEqual([])
  })
})
`,

  'tests/contracts/docs.test.ts': `import { describe, expect, it } from 'vitest'

/**
 * Everything the ${name} plugin exports is on its docs page. A developer learns
 * the plugin from the docs site alone, so an export the page does not name is
 * a feature nobody can find.
 */
const INDEX = import.meta.glob('../../src/index.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const PAGE = import.meta.glob('${pageGlob}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function exportedNames(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export (?:type|function|const|let|class|interface) ([A-Za-z_$][\\w$]*)/gm)) {
    names.add(match[1])
  }
  for (const match of source.matchAll(/export (?:type )?\\{([^}]*)\\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().replace(/^type\\s+/, '').split(/\\s+as\\s+/).pop()
      if (name) names.add(name)
    }
  }
  return [...names].sort()
}

describe('the docs', () => {
  it('name every export of @ifloom/plugin-${name} on its page', () => {
    const names = exportedNames(Object.values(INDEX)[0])
    expect(names.length).toBeGreaterThan(0)
    const page = Object.values(PAGE)[0] ?? ''
    expect(page.length).toBeGreaterThan(0)
    const missing = names.filter((name) => !new RegExp(\`\\\\b\${name}\\\\b\`).test(page))
    expect(missing).toEqual([])
  })
})
`,
}

for (const [file, text] of Object.entries(files)) {
  const path = join(pkgDir, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}
console.log(`Made ${at(pkgDir)}: ${Object.keys(files).join(', ')}`)

const heading = docs.kind === 'fumadocs' ? `---\ntitle: "${title}"\n---\n` : `# ${title}\n\n`
writeFileSync(
  page,
  `${heading}<!-- TODO(new-plugin): write this page to the ifloom-docs skill. The docs contract fails on any export it doesn't name. -->

\`@ifloom/plugin-${name}\` adds TODO(new-plugin).

\`\`\`ts
import { ${camel}, ${camel}Entries, ${camel}Marked, mark${Pascal}, mark${Pascal}Command } from '@ifloom/plugin-${name}'
import type { ${Pascal}Entry, ${Pascal}State, ${Pascal}View } from '@ifloom/plugin-${name}'
\`\`\`
`,
)
console.log(`Made ${at(page)} (${docs.kind})`)
editNav()
editTypecheck()

console.log(`
Next:
  npm install                     link the new workspace
  npx vitest run packages/plugin-${name}
  tsc --noEmit -p packages/plugin-${name}
  git grep -n "TODO(new-plugin)"  the stubs left to write
Then work through the ifloom-plugin skill's checklist.`)
