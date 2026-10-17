import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHOICE, ID, PROSE_KEY } from '../../../engine/tests/contracts/ids-rule.ts'

/**
 * The templates' games, by folder, read as text: they hold the `{{name}}` and
 * `{{title}}` placeholders `ifloom new` fills in, which stand for a game's id here.
 */
const DIR = new URL('../../templates/', import.meta.url)
const GAMES: Record<string, string> = Object.fromEntries(
  readdirSync(DIR)
    .map((name) => [name, new URL(`${name}/src/game.ts`, DIR)] as const)
    .filter(([, file]) => existsSync(file))
    .map(([name, file]) => [name, readFileSync(file, 'utf8').replace(/\{\{\w+\}\}/g, 'game')]),
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
