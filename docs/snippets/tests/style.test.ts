import { describe, expect, it } from 'vitest'
import { checkComment, checkPage, checkPages, checkTsdoc, DONE, report } from '../../lib/check-style.ts'

/**
 * The docs follow the voice rules a script can check (`docs/lib/check-style.ts` lists them): the TSDoc of every
 * export, field and helper the API pages print, and the pages in its DONE list, which grows as pages are rewritten.
 * `node docs/lib/check-style.ts` prints the same problems, grouped by rule and counted.
 */
describe('the docs style', () => {
  it('holds every TSDoc comment the API pages print to the voice rules', async () => {
    const problems = await checkTsdoc()
    expect(problems.length, report(problems, 'TSDoc')).toBe(0)
  }, 120_000)

  it('holds the rewritten pages to the voice rules', () => {
    const problems = checkPages(DONE)
    expect(problems.length, report(problems, 'Pages')).toBe(0)
  })

  it('catches text that breaks a rule', () => {
    const rules = (problems: { rule: string }[]) => problems.map((problem) => problem.rule)
    expect(rules(checkComment('a', ''))).toEqual(['no description'])
    expect(rules(checkComment('a', 'Whether the door is open.'))).toEqual(['first sentence opens with "Whether"'])
    expect(rules(checkComment('a', 'Is the door open?'))).toEqual(['first sentence opens with "Is"', 'first sentence is a question'])
    expect(rules(checkComment('a', 'Run a command: the next state.'))).toEqual(['colon in the first sentence'])
    expect(rules(checkComment('a', 'Runs a command. It returns two things: a state, and then: a reason.'))).toEqual(['more than one colon in the summary'])
    expect(rules(checkComment('a', 'The stat, as content declares it.'))).toEqual(['says "as content declares it"'])
    expect(rules(checkComment('a', `The stat's id. ${'word '.repeat(40)}`))).toEqual(['summary of 43 words (35 at most)'])
    // Code spans and links count toward no rule, and a second paragraph is not the summary.
    expect(checkComment('a', 'Runs `a: b: c` and links [it](https://ifloom.dev).\n\nMore: detail: here.')).toEqual([])

    const page = [
      '---',
      'title: "Writing Your First Scene"',
      'description: "A page: with: colons."',
      '---',
      'A sentence with one colon: fine.',
      'This one has two: here, and: here.',
      '',
      '## Stats kept on entities',
      '',
      '## Entity Stats And More',
      '',
      '## Use `SaveDriver` with React and IFLoom',
      '',
      '```ts',
      'const a = { b: 1, c: 2 }: x',
      '```',
      '',
      '- **Term**: a list item with one colon: fine.',
      '| `a: b: c` | words, in short |',
    ].join('\n')
    expect(checkPage('wrong.md', page).map((problem) => `${problem.where} ${problem.rule}`)).toEqual([
      'wrong.md:2 title in Title Case',
      'wrong.md:5 two colons in a sentence',
      'wrong.md:10 heading in Title Case',
      'wrong.md:19 says "in short"',
    ])
  })
})
