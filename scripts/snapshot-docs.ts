// Copies the latest docs into a folder of their own, for a release:
//
//   node scripts/snapshot-docs.ts 0.1.0
//
// The latest docs are docs/content/docs/(latest)/, served at /docs/….
// The copy goes to docs/content/docs/<version>/ and is served at
// /docs/<version>/…. Its meta.json makes it a version root titled
// <version>, so it shows in the docs' version dropdown next to the latest.
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { codeOf, includesOf } from '../docs/lib/snippets.ts'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('Usage: node scripts/snapshot-docs.ts <version>, such as 0.1.0')
  process.exit(1)
}

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'content', 'docs')
const latest = join(docs, '(latest)')
const target = join(docs, version)
if (existsSync(target)) {
  console.error(`docs/content/docs/${version} already exists.`)
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

// Links between pages are absolute (/docs/how-to/...), so point them into the
// snapshot. Links to the changelog keep pointing at the latest one.
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.(md|mdx|json)$/.test(e.name) ? [join(dir, e.name)] : [],
  )
}
// The snippets a page includes from docs/snippets/ go on changing with the
// latest docs, so the copy gets them written into the page as they are now.
const snippets = join(docs, '..', '..', 'snippets')
function inlineSnippets(text: string, file: string): string {
  const lines = text.split('\n')
  for (const include of includesOf(text)) {
    const at = fileURLToPath(new URL(include.path, pathToFileURL(file)))
    if (!at.startsWith(snippets)) continue
    const code = codeOf(include, existsSync(at) ? readFileSync(at, 'utf8') : undefined)
    if (!code.ok) throw new Error(`${relative(process.cwd(), file)}:${include.line}: ${code.reason}`)
    let fence = '```'
    while (code.code.includes(fence)) fence += '`'
    lines[include.line - 1] = `${fence}${include.lang}${include.meta ? ` ${include.meta}` : ''}\n${code.code}\n${fence}`
  }
  return lines.join('\n')
}
for (const file of walk(target)) {
  const text = file.endsWith('.json') ? readFileSync(file, 'utf8') : inlineSnippets(readFileSync(file, 'utf8'), file)
  writeFileSync(file, text.replace(/\]\(\/docs\/(?!changelog\b)/g, `](/docs/${version}/`))
}

console.log(`Snapshot of the docs in ${relative(process.cwd(), target)}.`)
