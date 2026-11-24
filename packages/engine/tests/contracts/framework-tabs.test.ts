import { describe, expect, it } from 'vitest'
import { codeOf, includesOf } from '../../../../docs/lib/snippets.ts'

/**
 * The engine is framework-neutral, so the docs are too. A code block that
 * draws a game is shown for every framework the templates cover, as one group
 * of tabs in a fixed order, and the reader's pick follows them from page to
 * page (`tab-group="framework"`, which Fumadocs stores in localStorage).
 *
 * A UI snippet, for this test, is a fenced code block that:
 * - imports from `@ifloom/react`, `react`, `react-dom`, `vue` or `svelte` (or a path under one), or
 * - calls `mountGame(`, or
 * - makes or finds an element: `document.createElement`, `document.querySelector`, `document.getElementById`, or
 * - is a `vue` or `svelte` block.
 *
 * A block can be written in the page or included from a file with
 * `::include[path]{meta='tab="React" tab-group="framework"'}` (see
 * `docs/lib/snippets.ts`); an include counts as the code block it becomes.
 *
 * Every feature that puts something in front of the player has a `##`
 * section on one of the `how-to/render/` pages: at least one full group of
 * tabs, and every UI block in it included from `docs/snippets/`, which is
 * type-checked and tested, never pasted.
 *
 * A plugin page's `## React UI` section documents the React UI's default for
 * the plugin (its `/react` subpath), so its React-only blocks may stand
 * outside a group.
 *
 * Pages under `reference/react/` and `how-to/react/` document the optional
 * React UI, so they stay React.
 * One more page is about one framework by design: `how-to/build-with-next`,
 * since Next is React.
 */
/** What a page can include: the snippets, by their URL. */
const SNIPPET_FILES = import.meta.glob('../../../../docs/snippets/**/*.{ts,tsx,vue}', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>
const SNIPPETS = '../../../../docs/snippets/'

/** `path` relative to the file `from`, both as the globs write them (this test has no URL or path module). */
function beside(from: string, path: string): string {
  const parts = from.split('/').slice(0, -1)
  for (const part of path.split('/')) {
    if (part === '..' && parts.length && parts.at(-1) !== '..') parts.pop()
    else if (part !== '.') parts.push(part)
  }
  return parts.join('/')
}

const PAGES = import.meta.glob('../../../../docs/content/docs/**/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * The tabs a UI snippet needs, in this order. Svelte tabs are being dropped
 * from the docs (React first, then Vue; Svelte only if there's demand), so a
 * group may end after Vue; one that has Svelte keeps it last.
 */
const TABS = ['Plain JS', 'React', 'Vue', 'Svelte']
const REQUIRED = ['Plain JS', 'React', 'Vue']
const GROUP = 'framework'
/** The sections whose React-only blocks document the React UI's default: a plugin page's `## React UI`. */
const DRAWING = ['React UI']

/** Pages that may show a UI snippet in one framework only. */
const ALLOWED = [/\/(?:reference|how-to)\/react\//, /\/how-to\/build-with-next\.md$/, /\/api\//]

const IMPORTS_UI = /from\s+['"](?:@ifloom\/react|react|react-dom|vue|svelte)(?:\/[^'"]*)?['"]/
const CALLS_UI = /\bmountGame\(|\bdocument\.(?:createElement|querySelector|getElementById)\b/

type Block = {
  line: number
  lang: string
  tab: string | null
  group: string | null
  code: string
  end: number
  /** Only blank lines between it and the next block. */
  adjacentToNext: boolean
  /** Under a `## React UI` heading, whose React-only blocks document the React UI's default. */
  drawing: boolean
  /** The `##` heading it's under, or '' before the first. */
  section: string
  /** Included from a file rather than written in the page. */
  included: string | null
}

/** The fenced code blocks of a page, and its includes, with each block's tab and tab group from its meta. */
function blocksOf(source: string, page: string): Block[] {
  // `page` is the page's path as the glob writes it, which an include's path is relative to.
  const lines = source.split('\n')
  const blocks: Block[] = []
  // The `##` heading each line is under, outside code.
  const section: string[] = []
  let heading = ''
  let fenced = false
  for (const line of lines) {
    if (/^ {0,3}`{3,}/.test(line)) fenced = !fenced
    else if (!fenced && line.startsWith('## ')) heading = line.slice(3).trim()
    section.push(heading)
  }
  const includes = new Map(includesOf(source).map((include) => [include.line - 1, include]))
  for (let at = 0; at < lines.length; at++) {
    const include = includes.get(at)
    // An included Markdown file, such as the changelog, is part of the page, not a code block.
    if (include?.markdown) continue
    if (include) {
      const file = beside(page, include.path)
      const code = codeOf(include, SNIPPET_FILES[file])
      blocks.push({
        line: at + 1,
        lang: include.lang,
        tab: /\btab="([^"]*)"/.exec(include.meta)?.[1] ?? null,
        group: /\btab-group="([^"]*)"/.exec(include.meta)?.[1] ?? null,
        code: code.ok ? code.code : '',
        end: at,
        adjacentToNext: false,
        drawing: DRAWING.includes(section[at]),
        section: section[at],
        included: file,
      })
      continue
    }
    const open = /^ {0,3}(`{3,})(\S*)(.*)$/.exec(lines[at])
    if (!open) continue
    const fence = open[1]
    let end = at + 1
    while (end < lines.length && !new RegExp(`^ {0,3}${fence}\`*\\s*$`).test(lines[end])) end++
    const meta = open[3]
    blocks.push({
      line: at + 1,
      lang: open[2],
      tab: /\btab="([^"]*)"/.exec(meta)?.[1] ?? null,
      group: /\btab-group="([^"]*)"/.exec(meta)?.[1] ?? null,
      code: lines.slice(at + 1, end).join('\n'),
      end,
      adjacentToNext: false,
      drawing: DRAWING.includes(section[at]),
      section: section[at],
      included: null,
    })
    at = end
  }
  blocks.forEach((block, index) => {
    const next = blocks[index + 1]
    block.adjacentToNext =
      next !== undefined &&
      lines
        .slice(block.end + 1, next.line - 1)
        .join('')
        .trim() === ''
  })
  return blocks
}

function isUi(block: Block): boolean {
  return block.lang === 'vue' || block.lang === 'svelte' || IMPORTS_UI.test(block.code) || CALLS_UI.test(block.code)
}

/** Runs of framework-tabbed blocks with nothing but blank lines between them: one group of tabs each. */
function groupsOf(blocks: Block[]): Block[][] {
  const groups: Block[][] = []
  let run: Block[] = []
  blocks.forEach((block, index) => {
    const tabbed = block.tab !== null && TABS.includes(block.tab)
    if (!tabbed) {
      if (run.length) groups.push(run)
      run = []
      return
    }
    run.push(block)
    const next = blocks[index + 1]
    if (!block.adjacentToNext || !next || next.tab === null || !TABS.includes(next.tab)) {
      groups.push(run)
      run = []
    }
  })
  return groups
}

/** What's wrong with a group, or null. Several blocks may share a tab, one after another. */
function groupProblem(group: Block[]): string | null {
  const names: string[] = []
  for (const block of group) if (names.at(-1) !== block.tab) names.push(block.tab!)
  if (names.join('|') !== TABS.join('|') && names.join('|') !== REQUIRED.join('|')) return `tabs ${names.join(', ')}, not ${TABS.join(', ')} (Svelte optional)`
  const ungrouped = group.find((block) => block.group !== GROUP)
  if (ungrouped) return `the ${ungrouped.tab} block at line ${ungrouped.line} has no tab-group="${GROUP}"`
  return null
}

const short = (path: string) => path.replace(/^.*site\/content\/docs\//, '')

describe('the docs', () => {
  const pages = Object.entries(PAGES).map(([path, source]) => {
    return { path: short(path), file: path, source, blocks: blocksOf(source, path) }
  })

  it('are all read', () => {
    expect(pages.length).toBeGreaterThan(50)
  })

  it('show every framework group of tabs in full: Plain JS, React, Vue (then Svelte, if any), persisted as one group', () => {
    const problems: string[] = []
    let groups = 0
    for (const page of pages) {
      for (const group of groupsOf(page.blocks)) {
        groups++
        const problem = groupProblem(group)
        if (problem) problems.push(`${page.path}:${group[0].line}: ${problem}`)
      }
    }
    expect(groups).toBeGreaterThan(30)
    expect(problems).toEqual([])
  })

  it('show every UI snippet in a group of framework tabs, outside the React UI pages', () => {
    const untabbed: string[] = []
    for (const page of pages) {
      if (ALLOWED.some((pattern) => pattern.test(`/${page.path}`))) continue
      const tabbed = new Set(
        groupsOf(page.blocks)
          .filter((group) => !groupProblem(group))
          .flat(),
      )
      for (const block of page.blocks) {
        if (isUi(block) && !tabbed.has(block) && !block.drawing) untabbed.push(`${page.path}:${block.line}: ${block.code.split('\n')[0]}`)
      }
    }
    expect(untabbed).toEqual([])
  })

  it('include only snippets, files and regions that are there', () => {
    const missing = pages.flatMap((page) =>
      includesOf(page.source)
        .filter((include) => !include.markdown)
        .flatMap((include) => {
          const code = codeOf(include, SNIPPET_FILES[beside(page.file, include.path)])
          return code.ok ? [] : [`${page.path}:${include.line}: ${code.reason} under docs/snippets/`]
        }),
    )
    expect(missing).toEqual([])
  })

  it('render each feature in a section of a how-to/render/ page: a full group of tabs, every UI block from docs/snippets/', () => {
    const problems: string[] = []
    let sections = 0
    for (const page of pages) {
      // Only the latest docs include their code from docs/snippets/: a released version's copy has it written in (scripts/snapshot-docs.ts).
      if (!page.path.includes('/(latest)/how-to/render/')) continue
      // The page's `##` headings, outside code.
      const headings: string[] = []
      let fenced = false
      for (const line of page.source.split('\n')) {
        if (/^ {0,3}`{3,}/.test(line)) fenced = !fenced
        else if (!fenced && line.startsWith('## ')) headings.push(line.slice(3).trim())
      }
      for (const heading of headings) {
        sections++
        const blocks = page.blocks.filter((block) => block.section === heading)
        if (!groupsOf(blocks).some((group) => !groupProblem(group))) problems.push(`${page.path}: "${heading}" has no full group of framework tabs`)
        for (const block of blocks) {
          if ((isUi(block) || TABS.includes(block.tab ?? '')) && !block.included?.startsWith(SNIPPETS))
            problems.push(`${page.path}:${block.line}: written in the page, not included from docs/snippets/`)
        }
      }
    }
    expect(sections).toBeGreaterThanOrEqual(10)
    expect(problems).toEqual([])
  })
})
