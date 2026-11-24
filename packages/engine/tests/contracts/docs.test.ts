import { describe, expect, it } from 'vitest'
import { exportedNames, undocumentedExports } from '../../src/testing.ts'

/**
 * Everything the engine exports is in the reference, `@ifloom/engine/testing`'s too. A developer learns the
 * engine from the docs site alone, so an export no page names is a feature
 * nobody can find.
 */
const INDEX = import.meta.glob(['../../src/index.ts', '../../src/testing.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const REFERENCE = import.meta.glob('../../../../docs/content/docs/\\(latest\\)/reference/*.{md,mdx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('the docs', () => {
  it('name every export of @ifloom/engine and @ifloom/engine/testing somewhere in the reference', () => {
    expect(Object.keys(INDEX)).toHaveLength(2)
    expect(Object.values(INDEX).flatMap(exportedNames).length).toBeGreaterThan(30)
    expect(undocumentedExports(Object.values(INDEX), Object.values(REFERENCE).join('\n'))).toEqual([])
  })
})
