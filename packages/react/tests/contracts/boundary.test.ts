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

  // Every package it imports is one it declares. A plugin it takes only the view's types from, with
  // `import type`, so nothing of the plugin is bundled, and as an optional peer: a game without it still works.
  it('imports only what it declares, and plugins only as optional peers, for their types', () => {
    const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})])
    const optional = (pkg as { peerDependenciesMeta?: Record<string, { optional?: boolean }> }).peerDependenciesMeta ?? {}
    const used = Object.entries(SOURCES).flatMap(([file, source]) =>
      [...source.matchAll(/^import( type)?[^'"]*['"]([^'"]+)['"]/gm)]
        .filter((match) => !match[2].startsWith('.'))
        .map((match) => ({
          file,
          typeOnly: Boolean(match[1]),
          name: match[2].startsWith('@') ? match[2].split('/').slice(0, 2).join('/') : match[2].split('/')[0],
        })),
    )
    expect(used.filter((entry) => !declared.has(entry.name)).map((entry) => `${entry.file} → ${entry.name}`)).toEqual([])
    const plugins = used.filter((entry) => /^@ifloom\/(plugin-|phone$)/.test(entry.name))
    expect(plugins.length).toBeGreaterThan(0)
    expect(plugins.filter((entry) => !entry.typeOnly).map((entry) => `${entry.file} → ${entry.name}`)).toEqual([])
    expect(plugins.filter((entry) => !optional[entry.name]?.optional).map((entry) => `${entry.name} is not an optional peer`)).toEqual([])
    expect(Object.keys(pkg.dependencies ?? {}).filter((name) => name.startsWith('@ifloom/plugin-'))).toEqual([])
  })
})
