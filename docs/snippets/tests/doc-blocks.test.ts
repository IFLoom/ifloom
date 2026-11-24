import { describe, expect, it } from 'vitest'
import { blocksOf, checkBlocks, docBlocks } from '../../lib/check-blocks.ts'

/**
 * Every TypeScript block the latest docs write in the page compiles against the
 * packages as they are, and every block that shows a type's or function's shape
 * matches the real export, field by field. A block is skipped only when its
 * fence says so (`fragment`). `docs/lib/check-blocks.ts` explains the markers.
 */

/** A page of blocks that are each wrong in one way, checked with the docs so the checker is seen to catch them. */
const WRONG = blocksOf(
  [
    '```ts',
    "import { createRunner } from '@ifloom/engine'",
    'createRunner(game)',
    '```',
    '```ts',
    "import { noSuchThing } from '@ifloom/engine'",
    '```',
    '```ts shape',
    'type RunnerOptions = {',
    '  saves?: Saves',
    '}',
    '```',
    '```ts shape',
    'type BacklogOptions = {',
    '  limit: number',
    '  everything?: boolean',
    '  // …',
    '}',
    '```',
    '```ts shape',
    'function startingState(game: Game, options: StartOptions): GameState',
    '```',
    '```ts shape',
    'function useless(): void',
    '```',
    '```ts fragment',
    '{ stat: 1 }',
    '```',
    '```ts continues',
    'runner.nothing()',
    '```',
  ].join('\n'),
  'wrong.md',
)

describe('the docs code blocks', () => {
  const blocks = docBlocks()
  const problems = checkBlocks([...blocks, ...WRONG])
  const at = (page: string) => problems.filter((problem) => problem.page === page)

  it('are all read', () => {
    expect(blocks.length).toBeGreaterThan(1000)
  })

  it('compile, and each shape is its export', () => {
    expect(problems.filter((problem) => problem.page !== 'wrong.md').map((problem) => `${problem.page}:${problem.line}: ${problem.message}`)).toEqual([])
  })

  it('catch a block that is wrong', () => {
    const lines = (line: number) =>
      at('wrong.md')
        .filter((problem) => problem.line === line)
        .map((problem) => problem.message)
    expect(lines(3).join()).toMatch(/Expected 2-3 arguments/)
    expect(lines(6).join()).toMatch(/no exported member 'noSuchThing'/)
    // A field that isn't there, and the fields it leaves out.
    expect(lines(9).join('\n')).toMatch(/has no `saves`|also has/)
    // `limit` is optional, `everything` isn't a field, and `// …` lets it show only some.
    expect(lines(14).join('\n')).toMatch(/`limit` is optional/)
    expect(lines(14).join('\n')).toMatch(/has no `everything`/)
    expect(lines(14).join('\n')).not.toMatch(/also has/)
    expect(lines(21).join()).toMatch(/startingState doesn't match/)
    expect(lines(24).join()).toMatch(/useless is not exported/)
    // The fragment is skipped, and the block that continues it goes on from the first block.
    expect(lines(27)).toEqual([])
    expect(lines(30).join()).toMatch(/Property 'nothing' does not exist/)
  })
})
