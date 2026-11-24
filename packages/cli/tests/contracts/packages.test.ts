import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * How the packages name each other (AGENTS.md, "How packages depend on each
 * other"): an `@ifloom/*` package is a peer of any other that uses it, never a
 * dependency, so a game has one copy of each, but for the two that run the CLI
 * on their own; and every reference to one, in a package, an example, a template
 * or the docs' snippets, is the caret range of its version. A game lists every
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

describe('how the packages depend on each other', () => {
  it('gives every package the version of the checkout, which a release tag names', () => {
    const version = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Manifest).version
    expect(packages.filter(([, pkg]) => pkg.version !== version).map(([dir, pkg]) => `${dir} ${pkg.version}`)).toEqual([])
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

  it('names every @ifloom package by the caret range of its version', () => {
    const wrong = everything.flatMap(([dir, pkg]) =>
      (['dependencies', 'devDependencies', 'peerDependencies'] as const).flatMap((field) =>
        Object.entries(pkg[field] ?? {})
          .filter(([name, range]) => versions.has(name) && range !== `^${versions.get(name)}`)
          .map(([name, range]) => `${dir} ${field} ${name}: ${range}`),
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
