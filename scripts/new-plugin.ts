// Scaffolds a first-party plugin, packages/plugin-<name>, modelled on
// plugin-quests, with its code, its React UI (the /react subpath) and their
// tests from the CLI's plugin template
// (packages/cli/templates/plugin), and adds it to the docs navigation (the plugins
// folder's meta.json). The root vite.config.ts finds it for npm run build and
// npm run typecheck by itself, and the engine's contracts find it by glob
// (packages/engine/tests/contracts/plugin-packages.test.ts holds it to the
// plugin boundary and its docs page; plugin-shape and naming read it too).
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

const { camel, Pascal, CONSTANT, title } = pluginNames(name)
const pkgDir = join(root, 'packages', `plugin-${name}`)
const at = (path: string) => relative(root, path)

/** The latest docs' plugins folder: the page goes here and its name in meta.json. */
const docsDir = join(root, 'docs', 'content', 'docs', '(latest)', 'reference', 'plugins')
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
    .replaceAll('{{name}}', `@ifloom/plugin-${name}`)
    .replaceAll('__id__', name)
    .replaceAll('__camel__', camel)
    .replaceAll('__Pascal__', Pascal)
    .replaceAll('__CONSTANT__', CONSTANT)
    .replaceAll('TODO:', 'TODO(new-plugin):')
}

/** Every @ifloom package has the engine's version, and names another by its caret range. */
const { version } = JSON.parse(readFileSync(join(root, 'packages', 'engine', 'package.json'), 'utf8')) as { version: string }
const range = `^${version}`

const files: Record<string, string> = {
  'package.json': `${JSON.stringify(
    {
      name: `@ifloom/plugin-${name}`,
      version,
      license: 'MIT',
      description: `TODO(new-plugin): what @ifloom/plugin-${name} adds, in one sentence.`,
      keywords: ['ifloom', 'interactive-fiction', 'plugin', name],
      homepage: `https://ifloom.dev/docs/reference/plugins/${name}`,
      bugs: { url: 'https://github.com/IFLoom/ifloom/issues' },
      repository: { type: 'git', url: 'git+https://github.com/IFLoom/ifloom.git', directory: `packages/plugin-${name}` },
      type: 'module',
      exports: {
        '.': { 'ifloom-source': './src/index.ts', types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' },
        './react': {
          'ifloom-source': './src/react/index.tsx',
          types: './dist/react/index.d.ts',
          import: './dist/react/index.js',
          default: './dist/react/index.js',
        },
      },
      files: ['dist', 'src'],
      scripts: { build: 'tsdown' },
      engines: JSON.parse(readFileSync(join(root, 'packages', 'cli', 'package.json'), 'utf8')).engines as unknown,
      publishConfig: { access: 'public', provenance: true },
      peerDependencies: { '@ifloom/engine': range, '@ifloom/react': range, react: '^19.0.0', 'react-dom': '^19.0.0', '@types/react': '^19.0.0' },
      peerDependenciesMeta: Object.fromEntries(['@ifloom/react', 'react', 'react-dom', '@types/react'].map((peer) => [peer, { optional: true }])),
      devDependencies: { '@ifloom/react': range, '@types/react': '^19.3.0' },
    },
    null,
    2,
  )}\n`,

  'tsdown.config.ts': `import { define } from '../../tsdown.base.ts'

export default define(['src/index.ts', 'src/react/index.tsx'])
`,

  'tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
`,

  'src/index.ts': fromTemplate('src/index.ts'),

  [`tests/${name}.test.ts`]: fromTemplate('tests/plugin.test.ts'),

  'src/react/index.tsx': fromTemplate('src/react/index.tsx'),

  'tests/react.test.tsx': fromTemplate('tests/react.test.tsx'),

  'README.md': `# @ifloom/plugin-${name}

TODO(new-plugin): what it adds, in one sentence. It is part of [IFLoom](https://ifloom.dev), an interactive fiction engine whose games build to one HTML file that opens from disk.

## Install

\`\`\`sh
npm install @ifloom/plugin-${name}
\`\`\`

It needs \`@ifloom/engine\` as a peer, which npm 7 and later installs for you. Its React UI is the \`@ifloom/plugin-${name}/react\` subpath, for a game that renders with \`@ifloom/react\`.

## Docs

- [${title}](https://ifloom.dev/docs/reference/plugins/${name}) explains the plugin, its content and its view.
- [API](https://ifloom.dev/docs/api/plugin-${name}) lists every export with its signature and fields.

## Licence

MIT. See [LICENSE](./LICENSE).
`,

  LICENSE: readFileSync(join(root, 'LICENSE'), 'utf8'),
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
import { ${camel}, entriesOf, entryOf } from '@ifloom/plugin-${name}'
import type { ${Pascal}Entry, ${Pascal}State, ${Pascal}View } from '@ifloom/plugin-${name}'
import { ${camel}Ui, use${Pascal}, ${Pascal}List, ${Pascal}Section, ${CONSTANT}_WORDS } from '@ifloom/plugin-${name}/react'
import type { ${Pascal}Controls } from '@ifloom/plugin-${name}/react'
\`\`\`

## ${camel}

TODO(new-plugin): the factory and its options.

## Content

### ${Pascal}Entry

TODO(new-plugin): one entry per list of its \`data\`, linking \`/docs/api/plugin-${name}#${Pascal.toLowerCase()}entry\`.

## Conditions

## Effects

## Commands

## State

### ${Pascal}State

## View

### ${Pascal}View

TODO(new-plugin): end with a link to its section on a \`how-to/render/\` page.

## React UI

The React UI is optional: the \`@ifloom/plugin-${name}/react\` subpath renders the plugin for a game that uses [\`@ifloom/react\`](/docs/reference/react).

### ${camel}Ui

### ${Pascal}List

### ${Pascal}Section

### use${Pascal}

### ${Pascal}Controls

### ${CONSTANT}_WORDS

## Functions

### entriesOf

### entryOf

## Checks

## Strings
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
