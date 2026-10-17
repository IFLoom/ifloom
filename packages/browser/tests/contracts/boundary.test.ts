import { describe, expect, it } from 'vitest'

const SOURCES = import.meta.glob(['../../src/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('the browser helpers', () => {
  // They work with any UI, so they use nothing but the engine's front door and its own files.
  it('imports only @ifloom/engine and its own files', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(0)
    const outside = Object.entries(SOURCES).flatMap(([file, source]) =>
      [...source.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)]
        .map((match) => match[1])
        .filter((spec) => !spec.startsWith('./') && spec !== '@ifloom/engine')
        .map((spec) => `${file} → ${spec}`),
    )
    expect(outside).toEqual([])
  })

  // A built game opens from disk: nothing is fetched or imported.
  it('never fetches or imports at runtime', () => {
    const offenders = Object.entries(SOURCES).flatMap(([file, source]) => [
      ...(/\bfetch\(/.test(source) ? [`${file}: fetch()`] : []),
      ...[...source.matchAll(/\bimport\(/g)].map(() => `${file}: import()`),
    ])
    expect(offenders).toEqual([])
  })
})
