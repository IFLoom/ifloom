import { describe, expect, it } from 'vitest'
import { apiDocs, committedApiDocs } from '../../../scripts/api-docs.ts'

/**
 * The API pages (docs/content/docs/(latest)/api/) are generated from the packages' source and its TSDoc by
 * `scripts/api-docs.ts`. They are made again here, in memory, and must be the committed pages exactly: a change to an
 * export, a field or a comment changes them, so the change is committed with its pages.
 */
describe('the API pages', () => {
  const { files, exports } = apiDocs()
  const committed = committedApiDocs()

  it('list every export', () => {
    expect(files.size).toBeGreaterThan(20)
    expect(exports).toBeGreaterThan(800)
  })

  it('are what the source makes now (run `npm run api-docs` if not)', () => {
    const stale = [...new Set([...files.keys(), ...committed.keys()])].filter((name) => files.get(name) !== committed.get(name)).sort()
    expect(stale, 'These API pages differ from the source: run `npm run api-docs` and commit the pages.').toEqual([])
  })
})
