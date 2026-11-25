/**
 * The version step of a release: what the "Version packages" pull request holds. The release workflow
 * (.github/workflows/release.yml) runs it through changesets/action while changesets are waiting, and it runs
 * locally too, to see what a release would do (discard what it writes afterwards).
 *
 *   npm run release:version
 *
 * In order:
 * 1. Each package whose coming release takes it out of a range another package of ours names, as a peer or a
 *    dependency, makes that package break for its users: a plugin that needs `@ifloom/engine` 0.2 can't go to a game
 *    on 0.1. Changesets would give it a patch; before 1.0 it needs a minor (a major from 1.0). So the dependent gets a
 *    changeset of its own saying so, `.changeset/needs-<package>.md`, until no more do.
 * 2. When the engine goes up a minor or a major, the latest docs are kept as the engine's outgoing version
 *    (`scripts/snapshot-docs.ts`), before they move on.
 * 3. The root CHANGELOG.md, the changelog on the docs site, gets a section for the release: the versions it publishes,
 *    then each changeset's summary under Added, Changed, Removed or Fixed, by its first word.
 * 4. `changeset version` sets the versions, the ranges between packages and each package's own CHANGELOG.md.
 * 5. What Changesets doesn't manage names each package at `^` its new version: the CLI's templates, the tests'
 *    fixtures, and the latest docs' lines that print a range or a tarball.
 * 6. npm install, so package-lock.json matches.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

const root = join(import.meta.dirname, '..')

type Bump = 'none' | 'patch' | 'minor' | 'major'
type Manifest = { name: string; version: string; private?: boolean } & Partial<
  Record<'dependencies' | 'devDependencies' | 'peerDependencies', Record<string, string>>
>
type Plan = {
  changesets: { id: string; summary: string; releases: { name: string; type: Bump }[] }[]
  releases: { name: string; type: Bump; oldVersion: string; newVersion: string; changesets: string[] }[]
}

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Manifest
const dirs = (dir: string) =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(root, dir, entry.name, 'package.json')))
        .map((entry) => join(root, dir, entry.name))
    : []
const packages = () => dirs('packages').map((dir) => ({ dir, manifest: read(join(dir, 'package.json')) }))
const changeset = (...args: string[]) => execFileSync('npx', ['changeset', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })

/** The release Changesets would make from the changesets waiting now. */
function plan(): Plan {
  const dir = mkdtempSync(join(tmpdir(), 'ifloom-release-'))
  try {
    changeset('status', `--output=${join(dir, 'plan.json')}`)
    return JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8')) as Plan
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const parse = (version: string) => version.split('-')[0].split('.').map(Number) as [number, number, number]

/** Whether a caret range, `^0.1.2`, takes a version. Every range between our packages is one (the packages contract test). */
function takes(range: string, version: string): boolean {
  if (!range.startsWith('^')) return true
  const [lowMajor, lowMinor, lowPatch] = parse(range.slice(1))
  const [major, minor, patch] = parse(version)
  if (lowMajor > 0) return major === lowMajor && (minor > lowMinor || (minor === lowMinor && patch >= lowPatch))
  if (lowMinor > 0) return major === 0 && minor === lowMinor && patch >= lowPatch
  return major === 0 && minor === 0 && patch === lowPatch
}

/** The bump that breaks a package's users: a minor before 1.0, a major from 1.0. */
const breaking = (version: string): Bump => (parse(version)[0] === 0 ? 'minor' : 'major')
const rank: Record<Bump, number> = { none: 0, patch: 1, minor: 2, major: 3 }

// 1. Each package another one's coming release leaves behind gets a breaking bump of its own.
for (let round = 0; ; round += 1) {
  if (round > 20) throw new Error('The packages keep pushing each other out of range.')
  const coming = plan()
  const next = new Map(coming.releases.map((release) => [release.name, release]))
  const added: string[] = []
  for (const { manifest } of packages()) {
    if (manifest.private) continue
    const own = next.get(manifest.name)
    const needs = breaking(manifest.version)
    if (own && rank[own.type] >= rank[needs]) continue
    // A dev dependency isn't the user's, so only peers and dependencies count.
    const left = Object.entries({ ...manifest.peerDependencies, ...manifest.dependencies }).filter(([name, range]) => {
      const release = next.get(name)
      return release && release.type !== 'none' && !takes(range, release.newVersion)
    })
    if (!left.length) continue
    const file = join(root, '.changeset', `needs-${manifest.name.replace(/^@/, '').replace(/\//g, '-')}.md`)
    const what = left.map(([name]) => `\`${name}\` ${next.get(name)!.newVersion}`).join(' and ')
    writeFileSync(file, `---\n"${manifest.name}": ${needs}\n---\n\nChanged: \`${manifest.name}\` needs ${what}.\n`)
    added.push(`${manifest.name} (${needs}, for ${left.map(([name]) => name).join(', ')})`)
  }
  if (!added.length) break
  console.log(`Breaking bumps for the packages left out of range: ${added.join('; ')}`)
}

const release = plan()
if (!release.releases.some((entry) => entry.type !== 'none')) {
  console.log('No changesets are waiting, so there is nothing to version.')
  process.exit(0)
}

// 2. The engine's outgoing docs, kept before a breaking release moves them on.
const engine = release.releases.find((entry) => entry.name === '@ifloom/engine')
if (engine && rank[engine.type] >= rank[breaking(engine.oldVersion)]) {
  console.log(`The engine goes from ${engine.oldVersion} to ${engine.newVersion}: keeping the docs as ${engine.oldVersion}.`)
  execFileSync('node', ['scripts/snapshot-docs.ts', engine.oldVersion], { cwd: root, stdio: 'inherit' })
}

// 3. The release's section of the root changelog.
const date = new Date().toISOString().slice(0, 10)
const published = release.releases.filter((entry) => entry.type !== 'none').sort((a, b) => a.name.localeCompare(b.name))
const headings = ['Added', 'Changed', 'Removed', 'Fixed'] as const
const lines = new Map<string, string[]>(headings.map((heading) => [heading, []]))
// The changesets step 1 wrote say the same of many packages, so they're one line for each version they need.
const needed = new Map<string, string[]>()
for (const entry of release.changesets.filter((each) => each.id.startsWith('needs-'))) {
  const match = entry.summary.match(/^Changed: `([^`]+)` needs (.+)\.\s*$/)
  if (!match) continue
  needed.set(match[2], [...(needed.get(match[2]) ?? []), `\`${match[1]}\``])
}
for (const entry of release.changesets.filter((each) => !each.id.startsWith('needs-'))) {
  const match = entry.summary.trim().match(/^(Added|Changed|Removed|Fixed):\s*([\s\S]*)$/)
  const heading = match?.[1] ?? 'Changed'
  const words = (match?.[2] ?? entry.summary.trim()).replace(/\n+/g, ' ')
  const text = words.charAt(0).toUpperCase() + words.slice(1)
  const names = entry.releases.filter((each) => each.type !== 'none').map((each) => `\`${each.name}\``)
  lines.get(heading)!.push(`- ${text}${names.length ? ` (${names.join(', ')})` : ''}`)
}
// After the changes they follow from.
for (const [what, names] of needed)
  lines.get('Changed')!.push(`- ${names.length === 1 ? `${names[0]} needs` : 'These need'} ${what}, so each has a new version too: ${names.join(', ')}.`)
const section = [
  `## ${date}`,
  '',
  published.map((entry) => `\`${entry.name}\` ${entry.newVersion}`).join(', ') + '.',
  ...headings.flatMap((heading) => (lines.get(heading)!.length ? ['', `### ${heading}`, '', ...lines.get(heading)!] : [])),
  '',
  '',
].join('\n')
const changelogFile = join(root, 'CHANGELOG.md')
const changelog = readFileSync(changelogFile, 'utf8').replace(/## \[Unreleased\]\n+/, '')
const first = changelog.indexOf('\n## ')
writeFileSync(changelogFile, first < 0 ? `${changelog}\n${section}` : `${changelog.slice(0, first + 1)}${section}${changelog.slice(first + 1)}`)

// 4. The versions, the ranges between packages, and each package's own changelog.
const outgoing = new Map(packages().map(({ manifest }) => [manifest.name, manifest.version]))
changeset('version')

// 5. What Changesets doesn't manage: each package named at `^` its new version.
const versions = new Map(packages().map(({ manifest }) => [manifest.name, manifest.version]))
const changed: string[] = []
const write = (file: string, before: string, after: string) => {
  if (after === before) return
  writeFileSync(file, after)
  changed.push(relative(root, file))
}
function walk(dir: string, keep: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return ['node_modules', 'dist'].includes(entry.name) ? [] : walk(join(dir, entry.name), keep)
    return keep(entry.name) ? [join(dir, entry.name)] : []
  })
}
const manifests = [
  ...dirs('packages/cli/templates').map((dir) => join(dir, 'package.json')),
  ...dirs('packages').flatMap((dir) => walk(join(dir, 'tests/fixtures'), (name) => name === 'package.json')),
]
for (const file of manifests) {
  const before = readFileSync(file, 'utf8')
  const pkg = JSON.parse(before) as Manifest
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies'] as const)
    for (const name of Object.keys(pkg[field] ?? {})) if (versions.has(name)) pkg[field]![name] = `^${versions.get(name)}`
  write(file, before, `${JSON.stringify(pkg, null, 2)}\n`)
}
// In the docs, a range or a tarball of a package's outgoing version moves to its new one. Any other is an example, such
// as an upgrade to a later version, and is left as written.
const tarballOf = (name: string) => `${name.replace(/^@/, '').replace('/', '-')}-`
const pages = [
  ...walk(join(root, 'docs/content/docs/(latest)'), (name) => /\.mdx?$/.test(name)),
  ...walk(join(root, 'docs/snippets'), (name) => /\.(ts|tsx|vue|svelte|md)$/.test(name)),
]
for (const file of pages) {
  const before = readFileSync(file, 'utf8')
  let after = before.replace(/"(@ifloom\/[a-z-]+)":(\s*)"\^([0-9A-Za-z.-]+)"/g, (whole, name: string, space: string, range: string) => {
    const version = versions.get(name)
    return version && range === outgoing.get(name) ? `"${name}":${space}"^${version}"` : whole
  })
  // A tarball's name is the package's without the @, its / a -: ifloom-engine-0.1.2.tgz. Nothing may come before it
  // but a separator, so ifloom's own doesn't match inside create-ifloom's.
  for (const [name, version] of versions) {
    const prefix = tarballOf(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const old = (outgoing.get(name) ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (old) after = after.replace(new RegExp(`(?<![A-Za-z0-9-])${prefix}${old}\\.tgz`, 'g'), `${tarballOf(name)}${version}.tgz`)
  }
  write(file, before, after)
}
if (changed.length) console.log(`Ranges set to each package's version in:\n${changed.map((file) => `  ${file}`).join('\n')}`)

// 6. The lockfile.
execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: root, stdio: 'inherit' })
console.log(`Versioned: ${published.map((entry) => `${entry.name} ${entry.oldVersion} -> ${entry.newVersion}`).join(', ')}`)
