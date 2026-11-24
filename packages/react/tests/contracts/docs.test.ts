import { describe, expect, it } from 'vitest'

/**
 * Everything the React UI exports, from `@ifloom/react` and `@ifloom/react/kit`, is in its docs section. A developer learns
 * the UI from the docs site alone, so an export no page of the React UI docs
 * names is a component nobody can find.
 */
const INDEX = import.meta.glob(['../../src/index.ts', '../../src/kit.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const PAGES = import.meta.glob('../../../../docs/content/docs/\\(latest\\)/react/*.{md,mdx}', {
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
  it('name every export of @ifloom/react and @ifloom/react/kit somewhere in the React UI docs', () => {
    expect(Object.keys(INDEX)).toHaveLength(2)
    const names = [...new Set(Object.values(INDEX).flatMap(exportedNames))]
    expect(names.length).toBeGreaterThan(30)
    const pages = Object.values(PAGES).join('\n')
    expect(pages.length).toBeGreaterThan(0)
    const missing = names.filter((name) => !new RegExp(`\\b${name}\\b`).test(pages))
    expect(missing).toEqual([])
  })
})
