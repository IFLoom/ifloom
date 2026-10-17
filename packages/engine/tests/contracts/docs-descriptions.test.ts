import { describe, expect, it } from 'vitest'

/**
 * Every page of the latest docs has a one-line `description` in its front
 * matter. llms.txt and the MCP server's list_pages show it beside the link,
 * and it's how an agent picks which page to fetch without reading them all.
 */
const ALL = import.meta.glob('../../../../site/content/docs/**/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// The glob can't name the `(latest)` folder, so filter for it. Released versions keep the words they shipped with.
const PAGES = Object.fromEntries(Object.entries(ALL).filter(([path]) => path.includes('/(latest)/')))

function frontMatter(text: string): string {
  const match = /^---\n([\s\S]*?)\n---/.exec(text)
  return match?.[1] ?? ''
}

describe('docs descriptions', () => {
  it('finds the pages', () => {
    expect(Object.keys(PAGES).length).toBeGreaterThan(50)
  })

  it('gives every latest page a description', () => {
    const missing = Object.entries(PAGES)
      .filter(([, text]) => !/^description:\s*\S/m.test(frontMatter(text)))
      .map(([path]) => path.replace(/^.*\/content\/docs\//, ''))
    expect(missing).toEqual([])
  })
})
