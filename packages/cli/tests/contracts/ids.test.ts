import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHOICE, ID, PROSE_KEY } from '../../../engine/tests/contracts/ids-rule.ts'

/**
 * The templates' games, by file, read as text: `src/game.ts` and the packs in
 * `src/world/` and `src/story/`. They hold the `{{name}}` and `{{title}}`
 * placeholders `ifloom new` fills in, which stand for a game's id here.
 */
const DIR = new URL('../../templates/', import.meta.url)
const filesIn = (dir: URL, at: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? filesIn(new URL(`${entry.name}/`, dir), `${at}/${entry.name}`) : entry.name.endsWith('.ts') ? [`${at}/${entry.name}`] : [],
      )
    : []
const GAMES: Record<string, string> = Object.fromEntries(
  readdirSync(DIR).flatMap((name) =>
    ['src/game.ts', ...filesIn(new URL(`${name}/src/world/`, DIR), 'src/world'), ...filesIn(new URL(`${name}/src/story/`, DIR), 'src/story')]
      .map((file) => [`${name}/${file}`, new URL(`${name}/${file}`, DIR)] as const)
      .filter(([, file]) => existsSync(file))
      .map(([key, file]) => [key, readFileSync(file, 'utf8').replace(/\{\{\w+\}\}/g, 'game')]),
  ),
)

describe('the templates’ ids (ADR 0010)', () => {
  it('follow the separator rule', () => {
    expect(Object.keys(GAMES).length).toBeGreaterThan(0)
    const wrong = Object.entries(GAMES).flatMap(([name, source]) => [
      ...[...source.matchAll(/chose: '([^']+)'/g)].filter((m) => !CHOICE.test(m[1])).map((m) => `${name}: chose "${m[1]}"`),
      ...[...source.matchAll(/(?:text|id|scene): '([^']+)'/g)].filter((m) => !ID.test(m[1])).map((m) => `${name}: "${m[1]}"`),
      ...[...source.matchAll(/^\s+'([^']+)': '/gm)].filter((m) => !PROSE_KEY.test(m[1])).map((m) => `${name}: prose key "${m[1]}"`),
    ])
    expect(wrong).toEqual([])
  })
})
