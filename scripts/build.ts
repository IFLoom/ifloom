/**
 * Build every package in packages/ into its dist/ (tsdown, see
 * tsdown.base.ts), one at a time, each after the @ifloom packages it uses.
 * Nothing in this checkout needs it to develop: the repo's tools read src/
 * through the `ifloom-source` condition (ADR 0012). A game beside the checkout,
 * and anything that reads the packages as their users will, needs it first.
 *
 *   npm run build                every package
 *   npm run build -- engine cli  only these (and nothing they use)
 *   npm run pack                 every package, then each packed as npm would
 *                                publish it, into packs/ (or --pack <folder>),
 *                                for a game beside the checkout to install
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = join(import.meta.dirname, '..')
type Manifest = { name: string; scripts?: Record<string, string> } & Partial<Record<'peerDependencies' | 'devDependencies', Record<string, string>>>

const packages = new Map<string, { dir: string; manifest: Manifest }>()
for (const dir of readdirSync(join(root, 'packages')).sort()) {
  const manifest = JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8')) as Manifest
  if (manifest.scripts?.build) packages.set(manifest.name, { dir, manifest })
}

/** Each package after every @ifloom package it peers on or develops against. */
const order: string[] = []
const visit = (name: string, path: string[] = []) => {
  if (order.includes(name) || !packages.has(name)) return
  if (path.includes(name)) throw new Error(`The packages use each other in a circle: ${[...path, name].join(' > ')}`)
  const { manifest } = packages.get(name)!
  for (const used of Object.keys({ ...manifest.peerDependencies, ...manifest.devDependencies })) visit(used, [...path, name])
  order.push(name)
}
for (const name of packages.keys()) visit(name)

const args = process.argv.slice(2)
const packAt = args.indexOf('--pack')
const packs = packAt < 0 ? undefined : resolve(args[packAt + 1] ?? join(root, 'packs'))
const only = packAt < 0 ? args : args.slice(0, packAt)
for (const name of order) {
  const { dir } = packages.get(name)!
  if (only.length && !only.includes(dir)) continue
  console.log(`\n== ${name}`)
  execFileSync('npm', ['run', 'build', '--silent'], { cwd: join(root, 'packages', dir), stdio: 'inherit' })
}

if (packs) {
  mkdirSync(packs, { recursive: true })
  const workspaces = order.filter((name) => !only.length || only.includes(packages.get(name)!.dir)).flatMap((name) => ['-w', name])
  execFileSync('npm', ['pack', ...workspaces, '--pack-destination', packs, '--silent'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
  console.log(`\nPacked into ${packs}: ${readdirSync(packs).filter((file) => file.endsWith('.tgz')).join(', ')}`)
}
