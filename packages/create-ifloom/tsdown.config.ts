import { cpSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { define } from '../../tsdown.base.ts'

/**
 * One file, dist/bin.js, with the CLI's `newGame` bundled in, so `npm create
 * ifloom` installs nothing but this package. Only new.ts is kept: nothing in it
 * has side effects, so the rest of the CLI (and Vite) is left out. Beside it go
 * copies of the templates and the example games, where `newGame` looks first.
 */
const here = import.meta.dirname
const templates = join(here, '../cli/templates')
const examples = join(here, '../../examples')
// What `newGame` itself leaves out of a template, and of an example.
const BUILT = new Set(['node_modules', 'dist'])
const LEFT_OUT = new Set([...BUILT, 'dist-one', 'tests', 'snapshots', 'playtest', 'mods'])

/** A folder copied without any folder of those names in it. */
function copy(from: string, to: string, skip: Set<string>): void {
  rmSync(to, { recursive: true, force: true })
  cpSync(from, to, {
    recursive: true,
    filter: (path) =>
      !relative(from, path)
        .split(/[\\/]/)
        .some((part) => skip.has(part)),
  })
}

export default define(['src/bin.ts'], {
  platform: 'node',
  unbundle: false,
  dts: false,
  treeshake: { moduleSideEffects: false },
  hooks: {
    'build:done': () => {
      copy(templates, join(here, 'dist/templates'), BUILT)
      for (const example of ['novel', 'cafe', 'showcase']) copy(join(examples, example), join(here, 'dist/examples', example), LEFT_OUT)
    },
  },
})
