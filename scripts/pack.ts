/**
 * Build every package (`vp run build:all`, see vite.config.ts), then pack each
 * as npm would publish it into packs/, for a game beside the checkout to
 * install. Nothing in this checkout needs it to develop: the repo's tools read
 * src/ through the `ifloom-source` condition (ADR 0012).
 *
 *   npm run pack                 into packs/
 *   node scripts/pack.ts <dir>   into another folder
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = join(import.meta.dirname, '..')
const packs = resolve(process.argv[2] ?? join(root, 'packs'))

// vp reads every workspace's vite.config.ts to know the tasks, and the examples' import `@ifloom/cli/vite`.
// With no dist/ yet (a fresh clone), that resolves only through the source condition, which npm adds from
// .npmrc to its scripts but plain `node scripts/pack.ts` (as try-templates.sh runs it) doesn't have.
const conditions = '--conditions=ifloom-source'
const nodeOptions = process.env.NODE_OPTIONS?.includes(conditions) ? process.env.NODE_OPTIONS : `${process.env.NODE_OPTIONS ?? ''} ${conditions}`.trim()
execFileSync(join(root, 'node_modules/.bin/vp'), ['run', 'build:all'], { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: nodeOptions } })

const workspaces = readdirSync(join(root, 'packages'))
  .sort()
  .map((dir) => JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8')) as { name: string; scripts?: Record<string, string> })
  .filter((manifest) => manifest.scripts?.build)
  .flatMap((manifest) => ['-w', manifest.name])
mkdirSync(packs, { recursive: true })
execFileSync('npm', ['pack', ...workspaces, '--pack-destination', packs, '--silent'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
console.log(
  `\nPacked into ${packs}: ${readdirSync(packs)
    .filter((file) => file.endsWith('.tgz'))
    .join(', ')}`,
)
