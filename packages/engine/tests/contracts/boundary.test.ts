import { describe, expect, it } from 'vitest'

/** Where a relative import from `file` lands, as a path like the glob's keys: `../../src/types.ts`. */
function landsAt(file: string, spec: string): string {
  const parts = file.split('/').slice(0, -1)
  for (const part of spec.split('/')) {
    if (part === '..' && parts.length && parts.at(-1) !== '..') parts.pop()
    else if (part === '..') parts.push('..')
    else if (part !== '.') parts.push(part)
  }
  return parts.join('/')
}

const SOURCES = import.meta.glob(['../../src/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('the engine stands alone', () => {
  // No relative path out of the package, and no package of any kind: the
  // engine runs in a browser opened from disk and in Node, and depends on
  // nothing but the language. A feature in `src/features/` reaches the rest
  // of `src/` with `../`.
  it('imports nothing from outside its own folder', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(10)
    const outside = Object.entries(SOURCES).flatMap(([file, source]) =>
      [...source.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)]
        .map((match) => match[1])
        .filter((spec) => !spec.startsWith('.') || !landsAt(file, spec).startsWith('../../src/'))
        .map((spec) => `${file} → ${spec}`),
    )
    expect(outside).toEqual([])
  })

  // A built game opens from disk, where the browser refuses to fetch a
  // neighbouring file or import a module from one. Everything a game needs is
  // bundled when it is built, so nothing may go looking for it while it runs.
  // `import('x').Type` in a type position is erased at build time and is fine.
  it('never loads anything at runtime', () => {
    const offenders = Object.entries(SOURCES).flatMap(([file, source]) => {
      const found: string[] = []
      if (/\bfetch\(/.test(source)) found.push(`${file}: fetch()`)
      for (const match of source.matchAll(/\bimport\(([^)]*)\)(\.[A-Za-z_]+)?/g)) {
        const typeOnly = match[2] && /^\.[A-Z]/.test(match[2])
        if (!typeOnly) found.push(`${file}: import(${match[1]})`)
      }
      return found
    })
    expect(offenders).toEqual([])
  })
})
