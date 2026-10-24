import { describe, expect, it } from 'vitest'

const SOURCES = import.meta.glob(['../../src/**/*.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Each file's imports, from the source as written. */
const IMPORTS = Object.entries(SOURCES).map(([file, source]) => ({
  file,
  source,
  ui: file.includes('/src/react/'),
  specs: [...source.matchAll(/^(?:import|export)[^'"]*\sfrom\s['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]/gm)].map((match) => match[1] ?? match[2]),
}))

describe('the calendar plugin', () => {
  // A plugin proves the plugin API only if it uses nothing else: the engine's
  // front door, and its own files.
  it('imports only @ifloom/engine and its own files', () => {
    expect(IMPORTS.length).toBeGreaterThan(0)
    const outside = IMPORTS.filter((entry) => !entry.ui).flatMap(({ file, specs }) =>
      specs.filter((spec) => !(spec.startsWith('./') && !spec.startsWith('./react/')) && spec !== '@ifloom/engine').map((spec) => `${file} → ${spec}`),
    )
    expect(outside).toEqual([])
  })

  // The engine side runs anywhere, so it never reaches for a page.
  it('uses no browser globals outside its React UI', () => {
    // Strings and comments aside: a plugin may write a page's script as text, as unlocks does.
    const code = (source: string) => source.replace(/`[^`]*`|'[^'\n]*'|"[^"\n]*"|\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    const found = IMPORTS.filter((entry) => !entry.ui && /\b(window|document)\./.test(code(entry.source))).map((entry) => entry.file)
    expect(found).toEqual([])
  })

  // Its React UI is the `/react` subpath. It's built only from the kit, `@ifloom/react`'s
  // front door, as a game's own UI is: never a deep path, and never another plugin.
  it('keeps React to src/react/, which imports only the engine, React, @ifloom/react and its own files', () => {
    const allowed = new Set(['@ifloom/engine', '@ifloom/react', 'react', 'react-dom'])
    const outside = IMPORTS.filter((entry) => entry.ui).flatMap(({ file, specs }) =>
      specs.filter((spec) => !spec.startsWith('./') && spec !== '../index.ts' && !allowed.has(spec)).map((spec) => `${file} → ${spec}`),
    )
    expect(outside).toEqual([])
  })
})
