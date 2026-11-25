import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * How the packages name each other (AGENTS.md, "How packages depend on each
 * other"): an `@ifloom/*` package is a peer of any other that uses it, never a
 * dependency, so a game has one copy of each, but for the two that run the CLI
 * on their own; a package names another by a caret range that takes its version
 * now, and an example, a template or the docs' snippets by `^` its version now. A game lists every
 * @ifloom package it needs, the ones the packages it lists require as peers
 * included, since Yarn installs no peer for it. And how each is published
 * ("Packaging"): built to dist/, public, with its folder, a README and the LICENSE.
 */
const root = fileURLToPath(new URL('../../../../', import.meta.url))

type Manifest = {
  name?: string
  version?: string
  private?: boolean
  engines?: { node?: string }
  publishConfig?: { access?: string; provenance?: boolean }
  repository?: { type?: string; url?: string; directory?: string }
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
} & Partial<Record<'dependencies' | 'devDependencies' | 'peerDependencies', Record<string, string>>>

function manifestsIn(dir: string): [string, Manifest][] {
  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, dir, entry.name, 'package.json')))
    .map((entry) => [`${dir}/${entry.name}`, JSON.parse(readFileSync(join(root, dir, entry.name, 'package.json'), 'utf8')) as Manifest])
}

const packages = manifestsIn('packages')
const everything = [
  ...packages,
  ...manifestsIn('examples'),
  ...manifestsIn('packages/cli/templates'),
  ['docs/snippets', JSON.parse(readFileSync(join(root, 'docs/snippets/package.json'), 'utf8'))] as [string, Manifest],
]
const versions = new Map(packages.map(([, pkg]) => [pkg.name!, pkg.version!]))

/** Whether a caret range takes a version, as npm reads `^0.1.2`: before 1.0, the same minor; from 1.0, the same major. */
function takes(range: string, version: string): boolean {
  const caret = range.match(/^\^(\d+)\.(\d+)\.(\d+)$/)
  if (!caret) return false
  const [low, at] = [caret.slice(1).map(Number), version.split('-')[0].split('.').map(Number)]
  const notBelow = at[0] > low[0] || (at[0] === low[0] && (at[1] > low[1] || (at[1] === low[1] && at[2] >= low[2])))
  if (low[0] > 0) return at[0] === low[0] && notBelow
  if (low[1] > 0) return at[0] === 0 && at[1] === low[1] && notBelow
  return at[0] === 0 && at[1] === 0 && at[2] === low[2]
}

describe('how the packages depend on each other', () => {
  it('keeps each fixed group of .changeset/config.json on one version, the CLI and the two that run it', () => {
    const config = JSON.parse(readFileSync(join(root, '.changeset/config.json'), 'utf8')) as { fixed: string[][] }
    expect(config.fixed).toContainEqual(['@ifloom/cli', 'create-ifloom', 'ifloom'])
    for (const group of config.fixed) expect(new Set(group.map((name) => versions.get(name))).size, group.join(', ')).toBe(1)
  })

  it('finds the packages', () => {
    expect(versions.get('@ifloom/engine')).toBeDefined()
    expect(everything.length).toBeGreaterThan(packages.length + 5)
  })

  it('makes an @ifloom package a peer of the package that uses it, but for the two that run the CLI on their own', () => {
    // create-ifloom bundles the CLI's newGame at build time, and `ifloom` runs the CLI's bin for npx.
    const unpeered = packages.flatMap(([dir, pkg]) =>
      (['dependencies', 'devDependencies'] as const).flatMap((field) =>
        Object.keys(pkg[field] ?? {})
          .filter((name) => versions.has(name) && !pkg.peerDependencies?.[name])
          .map((name) => `${dir} ${field} ${name}`),
      ),
    )
    expect(unpeered.sort()).toEqual(['packages/create-ifloom devDependencies @ifloom/cli', 'packages/ifloom dependencies @ifloom/cli'])
  })

  it('names an @ifloom package from another by a caret range that takes its version now', () => {
    // The oldest version it works with: a plugin may keep ^0.1.0 while the engine is at 0.1.5, and scripts/release-version.ts
    // moves a range only when a release leaves it behind.
    const wrong = packages.flatMap(([dir, pkg]) =>
      (['dependencies', 'devDependencies', 'peerDependencies'] as const).flatMap((field) =>
        Object.entries(pkg[field] ?? {})
          .filter(([name, range]) => versions.has(name) && !takes(range, versions.get(name)!))
          .map(([name, range]) => `${dir} ${field} ${name}: ${range}, at ${versions.get(name)}`),
      ),
    )
    expect(wrong).toEqual([])
  })

  it('names each @ifloom package at its version now in the templates, the examples and the docs’ snippets', () => {
    // So a new game, and what the docs show, get the latest of each.
    const wrong = everything
      .filter(([dir]) => !dir.startsWith('packages/') || dir.startsWith('packages/cli/templates/'))
      .flatMap(([dir, pkg]) =>
        (['dependencies', 'devDependencies', 'peerDependencies'] as const).flatMap((field) =>
          Object.entries(pkg[field] ?? {})
            .filter(([name, range]) => versions.has(name) && range !== `^${versions.get(name)}`)
            .map(([name, range]) => `${dir} ${field} ${name}: ${range}, not ^${versions.get(name)}`),
        ),
      )
    expect(wrong).toEqual([])
  })

  it('has every template and example list the @ifloom peers its packages require, which Yarn leaves out', () => {
    const manifest = new Map(packages.map(([, pkg]) => [pkg.name!, pkg]))
    // The required @ifloom peers of a package, and theirs in turn.
    const required = (name: string, seen = new Set<string>()): Set<string> => {
      const pkg = manifest.get(name)
      for (const [peer] of Object.entries(pkg?.peerDependencies ?? {}))
        if (versions.has(peer) && !pkg?.peerDependenciesMeta?.[peer]?.optional && !seen.has(peer)) {
          seen.add(peer)
          required(peer, seen)
        }
      return seen
    }
    const games = [...manifestsIn('examples'), ...manifestsIn('packages/cli/templates')]
    const missing = games.flatMap(([dir, pkg]) => {
      const listed = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }))
      return [...listed]
        .filter((name) => versions.has(name))
        .flatMap((name) => [...required(name)].filter((peer) => !listed.has(peer)).map((peer) => `${dir} needs ${peer}, for ${name}`))
    })
    expect([...new Set(missing)].sort()).toEqual([])
  })

  it('builds each package to dist/, and names its source by the ifloom-source condition (ADR 0012)', () => {
    const wrong = packages.flatMap(([dir, pkg]) => {
      const manifest = pkg as Manifest & { exports?: Record<string, unknown>; files?: string[]; scripts?: Record<string, string> }
      // `ifloom` is a bin.js that runs @ifloom/cli's, with nothing to build.
      if (dir === 'packages/ifloom') return JSON.stringify(manifest.files) === '["bin.js"]' && !manifest.exports ? [] : [`${dir} publishes more than bin.js`]
      const problems: string[] = []
      if (manifest.scripts?.build !== 'tsdown') problems.push(`${dir} doesn't build with tsdown`)
      if (!existsSync(join(root, dir, 'tsdown.config.ts'))) problems.push(`${dir} has no tsdown.config.ts`)
      if (!['dist', 'src'].every((folder) => manifest.files?.includes(folder))) problems.push(`${dir} doesn't publish dist and src`)
      for (const [key, target] of Object.entries(manifest.exports ?? {})) {
        // Stylesheets are files, and @ifloom/cli/client is types only.
        if (typeof target === 'string' || !('import' in (target as object))) continue
        const source = (target as Record<string, string>)['ifloom-source']
        const built = source?.replace(/^\.\/src\//, './dist/').replace(/\.tsx?$/, '')
        const expected = { 'ifloom-source': source, types: `${built}.d.ts`, import: `${built}.js`, default: `${built}.js` }
        if (!source?.startsWith('./src/') || JSON.stringify(target) !== JSON.stringify(expected))
          problems.push(`${dir} exports ${key} as ${JSON.stringify(target)}`)
      }
      return problems
    })
    expect(wrong).toEqual([])
  })

  it('publishes each package publicly from its folder, with a README, the LICENSE and the Node it needs', () => {
    const license = readFileSync(join(root, 'LICENSE'), 'utf8')
    const wrong = packages.flatMap(([dir, pkg]) => {
      const problems: string[] = []
      if (pkg.private !== undefined) problems.push(`${dir} is private`)
      if (pkg.publishConfig?.access !== 'public') problems.push(`${dir} isn't published with public access`)
      if (pkg.repository?.url !== 'git+https://github.com/IFLoom/ifloom.git' || pkg.repository.directory !== dir)
        problems.push(`${dir} names its repository as ${JSON.stringify(pkg.repository)}`)
      if (!existsSync(join(root, dir, 'README.md'))) problems.push(`${dir} has no README.md`)
      if (!existsSync(join(root, dir, 'LICENSE')) || readFileSync(join(root, dir, 'LICENSE'), 'utf8') !== license)
        problems.push(`${dir}'s LICENSE isn't the root's`)
      if (!pkg.engines?.node) problems.push(`${dir} doesn't say which Node it needs`)
      return problems
    })
    expect(wrong).toEqual([])
  })
})
