import { describe, expect, it } from 'vitest'

const SOURCES = import.meta.glob(['../../src/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('the devices plugin', () => {
  // A plugin proves the plugin API only if it uses nothing else: the engine's
  // front door, and its own files.
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
})
