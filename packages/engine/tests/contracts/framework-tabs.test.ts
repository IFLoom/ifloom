import { describe, expect, it } from 'vitest'

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
 * Pages under `react/` document the optional React UI, so they stay React.
 * Two more pages are about one framework by design: the guide's worked
 * example of a UI in plain JS (`guide/ui-from-scratch`), whose other
 * frameworks are on `guide/frameworks`, and the Next.js recipe, since Next is React.
 */
const PAGES = import.meta.glob('../../../../site/content/docs/**/*.{md,mdx}', {
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

/** Pages that may show a UI snippet in one framework only. */
const ALLOWED = [/\/react\//, /\/guide\/ui-from-scratch\.md$/, /\/recipes\/next\.md$/]

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
}

/** The fenced code blocks of a page, with each block's tab and tab group from its meta. */
function blocksOf(source: string): Block[] {
  const lines = source.split('\n')
  const blocks: Block[] = []
  for (let at = 0; at < lines.length; at++) {
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
  const pages = Object.entries(PAGES).map(([path, source]) => ({ path: short(path), blocks: blocksOf(source) }))

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
        if (isUi(block) && !tabbed.has(block)) untabbed.push(`${page.path}:${block.line}: ${block.code.split('\n')[0]}`)
      }
    }
    expect(untabbed).toEqual([])
  })
})
