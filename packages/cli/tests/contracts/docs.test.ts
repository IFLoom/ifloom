import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Everything the CLI exports, from `@ifloom/cli` and `@ifloom/cli/vite`, is on
 * its docs page. A developer learns the CLI from the docs site alone, so an
 * export the page does not name is a feature nobody can find.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const SOURCES = ['../../src/index.ts', '../../src/vite.ts'].map(read)
const PAGE = Object.values(
  import.meta.glob('../../../../site/content/docs/\\(latest\\)/cli/index.{md,mdx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
).join('\n')

function exportedNames(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export (?:type|function|const|let|class|interface) ([A-Za-z_$][\w$]*)/gm)) {
    names.add(match[1])
  }
  for (const match of source.matchAll(/export (?:type )?\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()
      if (name) names.add(name)
    }
  }
  return [...names].sort()
}

describe('the docs', () => {
  it('name every export of @ifloom/cli and @ifloom/cli/vite on its page', () => {
    const names = SOURCES.flatMap(exportedNames)
    expect(names.length).toBeGreaterThan(4)
    expect(PAGE.length).toBeGreaterThan(0)
    const missing = names.filter((name) => !new RegExp(`\\b${name}\\b`).test(PAGE))
    expect(missing).toEqual([])
  })
})
