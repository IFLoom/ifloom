import { describe, expect, it } from 'vitest'

/**
 * Everything the effects plugin exports is on its docs page. A developer learns
 * the plugin from the docs site alone, so an export the page does not name is
 * a feature nobody can find.
 */
const INDEX = import.meta.glob('../../src/index.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const PAGE = import.meta.glob('../../../../site/content/docs/\\(latest\\)/plugins/effects.{md,mdx}', {
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
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()
      if (name) names.add(name)
    }
  }
  return [...names].sort()
}

describe('the docs', () => {
  it('name every export of @ifloom/plugin-effects on its page', () => {
    const names = exportedNames(Object.values(INDEX)[0])
    expect(names.length).toBeGreaterThan(10)
    const page = Object.values(PAGE)[0] ?? ''
    expect(page.length).toBeGreaterThan(0)
    const missing = names.filter((name) => !new RegExp(`\\b${name}\\b`).test(page))
    expect(missing).toEqual([])
  })
})
