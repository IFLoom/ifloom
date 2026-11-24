/**
 * Publishes every package in packages/ to npm, each after the packages it
 * uses, as the release workflow (.github/workflows/release.yml) runs it once
 * `npm run build` has made each dist/. A version already on npm is skipped,
 * so a run that failed half way can be run again.
 *
 *   node scripts/publish.ts             publish
 *   node scripts/publish.ts --dry-run   npm publish --dry-run, which prints each tarball's files
 *
 * It publishes with whatever npm is signed in as: in the workflow, the
 * NPM_TOKEN secret if it's set, else trusted publishing. A prerelease
 * version (`0.2.0-beta.1`) goes out under the `next` tag, so `latest` stays.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const dryRun = process.argv.includes('--dry-run')

type Manifest = { name: string; version: string; private?: boolean; bin?: unknown } & Partial<
  Record<'dependencies' | 'devDependencies' | 'peerDependencies', Record<string, string>>
>
const read = (dir: string) => JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8')) as Manifest
const packages = readdirSync(join(root, 'packages'))
  .sort()
  .map((dir) => ({ dir: `packages/${dir}`, manifest: read(`packages/${dir}`) }))
const byName = new Map(packages.map((pkg) => [pkg.manifest.name, pkg]))

/** The packages of this checkout that one uses: its peers, its dependencies, and what it's built against. */
const uses = (manifest: Manifest) =>
  Object.keys({ ...manifest.peerDependencies, ...manifest.dependencies, ...manifest.devDependencies }).filter((name) => byName.has(name))

// Every package has the checkout's version (the packages contract test holds it), which is what the tag names.
const { version } = read('.')
const off = packages.filter(({ manifest }) => manifest.version !== version || manifest.private)
if (off.length)
  fail(`Not publishable at ${version}: ${off.map(({ dir, manifest }) => `${dir} (${manifest.private ? 'private' : manifest.version})`).join(', ')}`)

// Each after what it uses. Among those ready, a library before a command, then by name: the engine, the
// browser packages, the React UI and the plugins, then the CLI, `ifloom` and create-ifloom.
const order: string[] = []
const left = new Set(byName.keys())
while (left.size) {
  const ready = [...left].filter((name) => uses(byName.get(name)!.manifest).every((used) => order.includes(used)))
  if (!ready.length) fail(`The packages use each other in a circle: ${[...left].join(', ')}`)
  ready.sort((a, b) => Number(Boolean(byName.get(a)!.manifest.bin)) - Number(Boolean(byName.get(b)!.manifest.bin)) || a.localeCompare(b))
  order.push(ready[0])
  left.delete(ready[0])
}
for (const [at, name] of order.entries()) {
  const late = uses(byName.get(name)!.manifest).filter((used) => order.indexOf(used) > at)
  if (late.length) fail(`${name} would be published before ${late.join(', ')}`)
}
if (order[0] !== '@ifloom/engine') fail(`The engine isn't first: ${order.join(', ')}`)

const tag = version.includes('-') ? ['--tag', 'next'] : []
console.log(`${dryRun ? 'Dry run: ' : ''}${version}${tag.length ? ' (tag next)' : ''}, in this order: ${order.join(', ')}\n`)

const skipped: string[] = []
for (const name of order) {
  const { dir } = byName.get(name)!
  const on = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { cwd: root, encoding: 'utf8' })
  if (on.status === 0 && on.stdout.trim() === version) {
    console.log(`== ${name}@${version} is on npm already; skipped`)
    skipped.push(name)
    continue
  }
  // npm view answers E404 for a package or version that isn't there; anything else is a failure to ask.
  if (on.status !== 0 && !/E404|404 Not Found/.test(on.stderr)) fail(`npm view ${name}@${version} failed:\n${on.stderr}`)
  console.log(`== ${dryRun ? 'npm publish --dry-run' : 'npm publish'} ${name}@${version}`)
  const published = spawnSync('npm', ['publish', '-w', dir, ...tag, ...(dryRun ? ['--dry-run'] : [])], { cwd: root, stdio: 'inherit' })
  if (published.status !== 0) fail(`npm publish failed for ${name}`)
}
console.log(
  `\n${dryRun ? 'Would publish' : 'Published'} ${order.length - skipped.length} of ${order.length}${skipped.length ? `; on npm already: ${skipped.join(', ')}` : ''}.`,
)

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}
