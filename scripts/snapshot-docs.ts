// Copies the latest docs into a folder of their own, for a release:
//
//   node scripts/snapshot-docs.ts 0.1.0
//
// The latest docs are site/content/docs/(latest)/, served at /docs/….
// The copy goes to site/content/docs/<version>/ and is served at
// /docs/<version>/…. Its meta.json makes it a version root titled
// <version>, so it shows in the docs' version dropdown next to the latest.
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('Usage: node scripts/snapshot-docs.ts <version>, such as 0.1.0')
  process.exit(1)
}

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'site', 'content', 'docs')
const latest = join(docs, '(latest)')
const target = join(docs, version)
if (existsSync(target)) {
  console.error(`site/content/docs/${version} already exists.`)
  process.exit(1)
}

// Not copied: the changelog, which covers every version and stays with the latest.
const skip = new Set(['changelog.md'])
for (const entry of readdirSync(latest)) {
  if (skip.has(entry)) continue
  cpSync(join(latest, entry), join(target, entry), { recursive: true })
}

// The version root: titled with the version, and without the changelog.
const metaFile = join(target, 'meta.json')
const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as { title: string; root: string; pages?: string[] }
meta.title = version
meta.pages = meta.pages?.filter((page) => page !== 'changelog')
writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n')

// Links between pages are absolute (/docs/guide/...), so point them into the
// snapshot. Links to the changelog keep pointing at the latest one.
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.(md|mdx|json)$/.test(e.name) ? [join(dir, e.name)] : [],
  )
}
for (const file of walk(target)) {
  const text = readFileSync(file, 'utf8')
  writeFileSync(file, text.replace(/\]\(\/docs\/(?!changelog\b)/g, `](/docs/${version}/`))
}

console.log(`Snapshot of the docs in ${relative(process.cwd(), target)}.`)
