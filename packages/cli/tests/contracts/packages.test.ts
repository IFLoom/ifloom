import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * How the packages name each other (AGENTS.md, "How packages depend on each
 * other"): an `@ifloom/*` package is a peer of any other that uses it, never a
 * dependency, so a game has one copy of each; and every reference to one, in a
 * package, an example, a template or the site, is the caret range of its version.
 */
const root = fileURLToPath(new URL('../../../../', import.meta.url))

type Manifest = { name?: string; version?: string } & Partial<Record<'dependencies' | 'devDependencies' | 'peerDependencies', Record<string, string>>>

function manifestsIn(dir: string): [string, Manifest][] {
  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, dir, entry.name, 'package.json')))
    .map((entry) => [`${dir}/${entry.name}`, JSON.parse(readFileSync(join(root, dir, entry.name, 'package.json'), 'utf8')) as Manifest])
}

const packages = manifestsIn('packages')
const everything = [...packages, ...manifestsIn('examples'), ...manifestsIn('packages/cli/templates'), ['site', JSON.parse(readFileSync(join(root, 'site/package.json'), 'utf8'))] as [string, Manifest]]
const versions = new Map(packages.map(([, pkg]) => [pkg.name!, pkg.version!]))

describe('how the packages depend on each other', () => {
  it('finds the packages', () => {
    expect(versions.get('@ifloom/engine')).toBeDefined()
    expect(everything.length).toBeGreaterThan(packages.length + 5)
  })

  it('makes an @ifloom package a peer of the package that uses it, never a dependency', () => {
    const hard = packages.flatMap(([dir, pkg]) => Object.keys(pkg.dependencies ?? {}).filter((name) => name.startsWith('@ifloom/')).map((name) => `${dir} depends on ${name}`))
    expect(hard).toEqual([])
  })

  it('names every @ifloom package by the caret range of its version', () => {
    const wrong = everything.flatMap(([dir, pkg]) =>
      (['dependencies', 'devDependencies', 'peerDependencies'] as const).flatMap((field) =>
        Object.entries(pkg[field] ?? {})
          .filter(([name, range]) => name.startsWith('@ifloom/') && versions.has(name) && range !== `^${versions.get(name)}`)
          .map(([name, range]) => `${dir} ${field} ${name}: ${range}`),
      ),
    )
    expect(wrong).toEqual([])
  })
})
