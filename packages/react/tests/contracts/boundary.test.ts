import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'

const SOURCES = import.meta.glob(['../../src/**/*.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('the React UI', () => {
  // A built game opens from disk: nothing may be fetched or imported while it runs.
  it('never loads anything at runtime', () => {
    const offenders = Object.entries(SOURCES).flatMap(([file, source]) => {
      const found: string[] = []
      if (/\bfetch\(/.test(source)) found.push(`${file}: fetch()`)
      for (const match of source.matchAll(/\bimport\(([^)]*)\)(\.[A-Za-z_]+)?/g)) {
        if (!(match[2] && /^\.[A-Z]/.test(match[2]))) found.push(`${file}: import(${match[1]})`)
      }
      return found
    })
    expect(offenders).toEqual([])
  })

  // Every package it imports is one it declares, and no plugin package: it reads plugins' views by shape.
  it('imports only what it declares, and no plugin', () => {
    const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})])
    const used = Object.entries(SOURCES).flatMap(([file, source]) =>
      [...source.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)]
        .map((match) => match[1])
        .filter((spec) => !spec.startsWith('.'))
        .map((spec) => ({ file, name: spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0] })),
    )
    expect(used.filter((entry) => !declared.has(entry.name)).map((entry) => `${entry.file} → ${entry.name}`)).toEqual([])
  })
})
