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

  // Every package it imports is one it declares, and none is a plugin: each plugin's React UI is
  // in that plugin's `/react`, built from this package's public exports, so the UI names no plugin.
  it('imports only what it declares, and no plugin at all', () => {
    const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})])
    const used = Object.entries(SOURCES).flatMap(([file, source]) =>
      [...source.matchAll(/^import( type)?[^'"]*['"]([^'"]+)['"]/gm)]
        .filter((match) => !match[2].startsWith('.'))
        .map((match) => ({ file, name: match[2].startsWith('@') ? match[2].split('/').slice(0, 2).join('/') : match[2].split('/')[0] })),
    )
    expect(used.filter((entry) => !declared.has(entry.name)).map((entry) => `${entry.file} → ${entry.name}`)).toEqual([])
    const plugins = /^@ifloom\/plugin-/
    expect(used.filter((entry) => plugins.test(entry.name)).map((entry) => `${entry.file} → ${entry.name}`)).toEqual([])
    const named = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.devDependencies }).filter((name) => plugins.test(name))
    expect(named).toEqual([])
  })
})
