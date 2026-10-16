// Run once when the docs moved from VitePress to Fumadocs (2026-10-16). The
// pages used to sit at the site's root, /guide/…, and now sit under /docs/, so
// this points every absolute link at the new place:
//
//   [Scenes](/reference/scenes#scene)  ->  [Scenes](/docs/reference/scenes#scene)
//   [The React UI](/react/#gameshell)  ->  [The React UI](/docs/react#gameshell)
//   https://ifloom.github.io/ifloom/guide/installation  ->  …/ifloom/docs/guide/installation
//
// Fumadocs also names headings differently. VitePress wrote "1. Pick a theme"
// as #_1-pick-a-theme and "The runner's members" as #the-runner-s-members;
// Fumadocs uses GitHub's names, #1-pick-a-theme and #the-runners-members. Each
// link to a heading is pointed at the new name.
//
// It reads the docs pages and the meta.json files under site/content/docs/, and
// README.md, AGENTS.md and CHANGELOG.md for full links to the site. A link
// already under /docs/ keeps its page, so running it twice changes nothing.
//
//   node scripts/docs-links-codemod.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import GithubSlugger from 'github-slugger'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = join(root, 'site/content/docs')
const sections = 'guide|reference|plugins|react|cli|changelog'

// `](/guide/x)`, `](/plugins/)`, `](/changelog)` and `](/cli/#ifloom-new)`.
const pageLink = new RegExp(`\\]\\(/(${sections})(?=[/#)])`, 'g')
const siteLink = new RegExp(`ifloom\\.github\\.io/ifloom/(${sections})(?=[/#)\\s.,]|$)`, 'gm')
// An index page was /react/ in VitePress. It's /docs/react now.
const indexSlash = /\]\((\/docs\/[\w/-]*?)\/(?=[#)])/g

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.(md|mdx|json)$/.test(e.name) ? [join(dir, e.name)] : [],
  )
}

// VitePress's own slugify, from vitepress/src/shared/shared.ts.
function vitepressSlug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    // oxlint-disable-next-line no-control-regex -- VitePress drops control characters
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase()
}

// A heading's text as both sites read it: no Markdown, links as their words.
function headingText(line: string): string {
  return line
    .replace(/^#+\s+/, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .trim()
}

/** For one page, each heading's VitePress name mapped to its Fumadocs name. */
function renamedHeadings(text: string): Map<string, string> {
  const slugger = new GithubSlugger()
  const seen = new Map<string, number>()
  const renamed = new Map<string, string>()
  // VitePress counted the page's H1, now its front matter title, so a "## phone"
  // under "# Phone" was #phone-1.
  const title = text.match(/^title: "?(.*?)"?$/m)?.[1]
  if (title) seen.set(vitepressSlug(title), 1)
  let fenced = false
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    if (fenced || !/^#{2,6}\s/.test(line)) continue
    const words = headingText(line)
    let old = vitepressSlug(words)
    const n = seen.get(old) ?? 0
    seen.set(old, n + 1)
    if (n > 0) old = `${old}-${n}`
    const now = slugger.slug(words)
    if (old !== now) renamed.set(old, now)
  }
  return renamed
}

// The URL of each page, as links write it: /docs/guide/installation.
function urlOf(file: string): string | undefined {
  const rel = relative(content, file).replace(/\\/g, '/')
  if (!rel.startsWith('(latest)/') || !rel.endsWith('.md')) return
  return '/docs/' + rel.slice('(latest)/'.length).replace(/\.md$/, '').replace(/\/?index$/, '')
}

const pages = walk(content)
const files = [...pages, ...['README.md', 'AGENTS.md', 'CHANGELOG.md'].map((f) => join(root, f))]

// First the pages' addresses, then the headings they link to.
for (const file of files) {
  const before = readFileSync(file, 'utf8')
  const after = before
    .replace(pageLink, '](/docs/$1')
    .replace(siteLink, 'ifloom.github.io/ifloom/docs/$1')
    .replace(indexSlash, ']($1')
  if (after !== before) writeFileSync(file, after)
}

const headings = new Map<string, Map<string, string>>()
for (const file of pages) {
  const url = urlOf(file)
  if (url) headings.set(url, renamedHeadings(readFileSync(file, 'utf8')))
}

let changed = 0
for (const file of files) {
  const before = readFileSync(file, 'utf8')
  const here = urlOf(file)
  const after = before.replace(/\]\((\/docs\/[\w/.-]*)?#([^)\s]+)\)/g, (link, page: string | undefined, hash: string) => {
    const renamed = headings.get(page ?? here ?? '')?.get(hash)
    return renamed ? `](${page ?? ''}#${renamed})` : link
  })
  if (after === before) continue
  writeFileSync(file, after)
  changed++
}
console.log(`Links to headings renamed in ${changed} files.`)
