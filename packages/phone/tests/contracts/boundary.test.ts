import { describe, expect, it } from 'vitest'

const SOURCES = import.meta.glob(['../../src/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const ALLOWED = ['@ifloom/engine', '@ifloom/plugin-devices', '@ifloom/plugin-feed', '@ifloom/plugin-messages']

describe('the phone bundle', () => {
  // A bundle wires plugins together; it adds no system of its own.
  it('imports only the engine and the plugins it bundles', () => {
    const outside = Object.entries(SOURCES).flatMap(([file, source]) =>
      [...source.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)]
        .map((match) => match[1])
        .filter((spec) => !spec.startsWith('./') && !ALLOWED.includes(spec))
        .map((spec) => `${file} → ${spec}`),
    )
    expect(outside).toEqual([])
  })
})
