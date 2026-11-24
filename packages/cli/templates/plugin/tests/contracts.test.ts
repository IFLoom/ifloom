/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { boundaryProblems, undocumentedExports } from '@ifloom/engine/testing'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')

/** Every source file's text, by its path from the package's folder: `src/index.ts`, `src/react/index.tsx`. */
const sources = Object.fromEntries(
  readdirSync(new URL('src/', root), { recursive: true, encoding: 'utf8' })
    .filter((path) => /\.tsx?$/.test(path))
    .map((path) => [`src/${path.replaceAll('\\', '/')}`, read(`src/${path}`)]),
)

// The rules a plugin keeps to be listed on Community plugins, read from the source as written.
describe('the plugin package', () => {
  // It imports only @ifloom/engine and its own files, uses no browser global outside its React UI, and its React UI
  // (src/react/, the /react subpath) imports only the engine, React, @ifloom/react's front door and its own files.
  it('keeps to the plugin boundary', () => {
    expect(boundaryProblems(sources)).toEqual([])
  })

  // A game author learns the plugin from its README, so an export the README doesn't name is one nobody finds.
  it('names every export, its React UI’s too, in the README', () => {
    expect(undocumentedExports([read('src/index.ts'), read('src/react/index.tsx')], read('README.md'))).toEqual([])
  })
})
