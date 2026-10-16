// Copies the docs as they are now into docs/versions/<version>/, for a release.
// The docs config then serves them at /ifloom/<version>/ and lists the version
// in the switcher.
//
//   node scripts/snapshot-docs.ts 0.1.0
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sidebar } from '../docs/.vitepress/sidebar.ts'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('Usage: node scripts/snapshot-docs.ts <version>, such as 0.1.0')
  process.exit(1)
}

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')
const target = join(docs, 'versions', version)
if (existsSync(target)) {
  console.error(`docs/versions/${version} already exists.`)
  process.exit(1)
}

// Not copied: the site's own config and theme, older snapshots, decision
// records (not on the site), and the changelog, which covers every version.
const skip = new Set(['.vitepress', 'versions', 'adr', 'public', 'changelog.md'])
for (const entry of readdirSync(docs)) {
  if (skip.has(entry)) continue
  cpSync(join(docs, entry), join(target, entry), { recursive: true })
}

// Links between pages are absolute (/guide/...), so point them into the
// snapshot. Links to the changelog keep pointing at the latest one.
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : [],
  )
}
for (const file of walk(target)) {
  const text = readFileSync(file, 'utf8')
  const moved = text
    .replace(/\]\(\/(?!changelog)/g, `](/${version}/`)
    .replace(/^(\s*link: )\/(?!changelog)/gm, `$1/${version}/`)
  writeFileSync(file, moved)
}

// The config reads each version's sidebar from this file and adds the prefix.
const sidebars = join(docs, '.vitepress', 'sidebars', 'versioned')
mkdirSync(sidebars, { recursive: true })
writeFileSync(join(sidebars, `${version}.json`), JSON.stringify(sidebar, null, 2) + '\n')

console.log(`Snapshot of the docs in ${relative(process.cwd(), target)}.`)
