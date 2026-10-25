import { describe, expect, it } from 'vitest'

/**
 * Everything the engine exports is in the reference. A developer learns the
 * engine from the docs site alone, so an export no page names is a feature
 * nobody can find.
 */
const INDEX = import.meta.glob(['../../src/index.ts', '../../src/flow.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const REFERENCE = import.meta.glob('../../../../site/content/docs/\\(latest\\)/reference/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function exportedNames(source: string): string[] {
  const names = new Set<string>()
  // `export function name` and `export type name =`, as `@ifloom/engine/flow` writes its builders.
  for (const match of source.matchAll(/^export (?:function|type|const) ([A-Za-z_]\w*)/gm)) names.add(match[1])
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
  it('name every export of @ifloom/engine and @ifloom/engine/flow somewhere in the reference', () => {
    const names = Object.values(INDEX).flatMap(exportedNames)
    expect(names.length).toBeGreaterThan(30)
    const reference = Object.values(REFERENCE).join('\n')
    const missing = names.filter((name) => !new RegExp(`\\b${name}\\b`).test(reference))
    expect(missing).toEqual([])
  })
})
