import { expect, it } from 'vitest'
import { PLUGIN_NAMES } from './first-party.ts'

/**
 * The engine names no plugin. A first-party plugin is one a game may leave out,
 * so the engine's code never asks one of its calls or queries by name (`'calendar/now'`)
 * and never reads its state by id (`plugins.shop`). Comments may name them, as
 * examples of a call's form. A plugin that wants another's answer asks it by name
 * itself, giving the answer's type.
 */
const SOURCES = import.meta.glob('../../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** The code on a line, without a comment that fills it or ends it. */
function codeOf(line: string): string {
  const trimmed = line.trim()
  if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return ''
  return line.replace(/\s\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
}

/** The ways a line of code can name a plugin: one of its calls by full name, or its state by id. */
function patternsFor(id: string): RegExp[] {
  return [
    new RegExp(`['"\`]${id}/`),
    new RegExp(`plugins\\??\\.${id}\\b`),
    new RegExp(`plugins\\??\\.?\\[['"\`]${id}['"\`]\\]`),
    new RegExp(`['"\`]${id}['"\`]\\s+in\\s+plugins\\b`),
  ]
}

it('reads the engine’s sources', () => {
  expect(Object.keys(SOURCES).length).toBeGreaterThan(50)
})

it('names no first-party plugin in the engine’s code', () => {
  const found: string[] = []
  for (const [path, source] of Object.entries(SOURCES)) {
    source.split('\n').forEach((line, index) => {
      const code = codeOf(line)
      if (!code) return
      for (const id of PLUGIN_NAMES) {
        if (patternsFor(id).some((pattern) => pattern.test(code))) found.push(`${path.replace('../../', '')}:${index + 1} names ${id}: ${line.trim()}`)
      }
    })
  }
  expect(found).toEqual([])
})
