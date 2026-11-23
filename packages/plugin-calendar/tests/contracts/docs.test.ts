import { describe, expect, it } from 'vitest'

/**
 * Everything the calendar plugin exports is on its docs page, its React UI's too. A developer learns
 * the plugin from the docs site alone, so an export the page does not name is
 * a feature nobody can find.
 */
const INDEX = import.meta.glob(['../../src/index.ts', '../../src/react/index.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const PAGE = import.meta.glob('../../../../docs/content/docs/\\(latest\\)/plugins/calendar.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function exportedNames(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(/^export (?:type|function|const|let|class|interface) ([A-Za-z_$][\w$]*)/gm)) {
    names.add(match[1])
  }
  for (const match of source.matchAll(/export (?:type )?\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop()
      if (name) names.add(name)
    }
  }
  return [...names].sort()
}

describe('the docs', () => {
  it('name every export of @ifloom/plugin-calendar on its page', () => {
    const names = [...new Set(Object.values(INDEX).flatMap(exportedNames))]
    expect(names.length).toBeGreaterThan(5)
    const page = Object.values(PAGE)[0] ?? ''
    expect(page.length).toBeGreaterThan(0)
    const missing = names.filter((name) => !new RegExp(`\\b${name}\\b`).test(page))
    expect(missing).toEqual([])
  })
})
