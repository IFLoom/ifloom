// Scaffolds a first-party plugin, packages/plugin-<name>, modelled on
// plugin-quests, with its code and test from the CLI's plugin template
// (packages/cli/templates/plugin), and adds it to the docs navigation (the plugins
// folder's meta.json). The root vite.config.ts finds it for npm run build and
// npm run typecheck by itself.
// What needs words (the AGENTS.md row, the plugins index, the CHANGELOG, the
// showcase) is left to you: `git grep "TODO(new-plugin)"` lists the stubs.
//
//   node scripts/new-plugin.ts <name>            make it
//   node scripts/new-plugin.ts --remove <name>   undo it, for a throwaway
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pluginNames } from '../packages/cli/src/new.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const remove = process.argv[2] === '--remove'
const name = process.argv[remove ? 3 : 2]
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Usage: node scripts/new-plugin.ts [--remove] <name>, such as shop (lower-case letters, digits and dashes)')
  process.exit(1)
}

const { camel, Pascal, title } = pluginNames(name)
const pkgDir = join(root, 'packages', `plugin-${name}`)
const at = (path: string) => relative(root, path)

/** The latest docs' plugins folder: the page goes here and its name in meta.json. */
const docsDir = join(root, 'site', 'content', 'docs', '(latest)', 'plugins')
const nav = join(docsDir, 'meta.json')
const page = join(docsDir, `${name}.md`)

function edit(path: string, change: (text: string) => string): void {
  const before = readFileSync(path, 'utf8')
  const after = change(before)
  if (after !== before) {
    writeFileSync(path, after)
    console.log(`${remove ? 'Reverted' : 'Edited'} ${at(path)}`)
  }
}

function editNav(): void {
  edit(nav, (text) => {
    const meta = JSON.parse(text) as { pages: string[] }
    meta.pages = meta.pages.filter((entry) => entry !== name)
    if (!remove) {
      const debug = meta.pages.indexOf('debug')
      meta.pages.splice(debug >= 0 ? debug : meta.pages.length, 0, name)
    }
    return `${JSON.stringify(meta, null, 2)}\n`
  })
}

if (remove) {
  rmSync(pkgDir, { recursive: true, force: true })
  rmSync(page, { force: true })
  console.log(`Removed ${at(pkgDir)} and ${at(page)}`)
  editNav()
  console.log('Run npm install to drop the workspace link.')
  process.exit(0)
}

if (existsSync(pkgDir)) {
  console.error(`${at(pkgDir)} already exists.`)
  process.exit(1)
}

/**
 * A file of `ifloom new --template plugin`, the plugin starter anyone can use,
 * filled in for this plugin: one source for the skeleton and its test. Its
 * `TODO:` stubs become `TODO(new-plugin):`, which the skill's grep finds.
 */
function fromTemplate(file: string): string {
  return readFileSync(join(root, 'packages', 'cli', 'templates', 'plugin', file), 'utf8')
    .replaceAll('{{title}}', title)
    .replaceAll('__id__', name)
    .replaceAll('__camel__', camel)
    .replaceAll('__Pascal__', Pascal)
    .replaceAll('TODO:', 'TODO(new-plugin):')
}

// The docs contract reads the page by a path relative to tests/contracts.
const pageGlob = `${relative(join(pkgDir, 'tests', 'contracts'), docsDir).replace(/[()[\]{}]/g, (c) => `\\\\${c}`)}/${name}.{md,mdx}`

const files: Record<string, string> = {
  'package.json': `${JSON.stringify(
    {
      name: `@ifloom/plugin-${name}`,
      version: '0.0.0',
      private: true,
      license: 'MIT',
      description: `TODO(new-plugin): what @ifloom/plugin-${name} adds, in one sentence.`,
      type: 'module',
      exports: { '.': { 'ifloom-source': './src/index.ts', types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' } },
      files: ['dist', 'src'],
      scripts: { build: 'tsdown' },
      peerDependencies: { '@ifloom/engine': '^0.0.0' },
    },
    null,
    2,
  )}\n`,

  'tsdown.config.ts': `import { define } from '../../tsdown.base.ts'

export default define(['src/index.ts'])
`,

  'tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
`,

  'src/index.ts': fromTemplate('src/index.ts'),

  [`tests/${name}.test.ts`]: fromTemplate('tests/plugin.test.ts'),

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

writeFileSync(
  page,
  `---\ntitle: "${title}"\ndescription: "TODO(new-plugin): what the plugin adds, in one line."\n---\n<!-- TODO(new-plugin): write this page to the ifloom-docs skill. The docs contract fails on any export it doesn't name. -->

\`@ifloom/plugin-${name}\` adds TODO(new-plugin).

\`\`\`ts
import { ${camel}, ${camel}Entries, ${camel}Marked, mark${Pascal}, mark${Pascal}Command } from '@ifloom/plugin-${name}'
import type { ${Pascal}Entry, ${Pascal}State, ${Pascal}View } from '@ifloom/plugin-${name}'
\`\`\`
`,
)
console.log(`Made ${at(page)}`)
editNav()

console.log(`
Next:
  npm install                     link the new workspace
  npx vitest run packages/plugin-${name}
  npx vp run typecheck:plugin-${name}
  git grep -n "TODO(new-plugin)"  the stubs left to write
Then work through the ifloom-plugin skill's checklist.`)
