/**
 * Sets the version for a release: every package's own, and every reference to
 * one as `^<version>`, so they move together (AGENTS.md, "How packages depend
 * on each other"; the packages contract test holds them to it). Then it runs
 * npm install, so package-lock.json matches.
 *
 *   node scripts/version.ts 0.1.0
 *
 * It changes:
 * - the version of each package in packages/, and of the checkout's root
 *   package.json, which a release's tag names (`v0.1.0`);
 * - the range of each of those packages wherever a manifest names it: the
 *   packages, the examples, the CLI's templates, the docs' snippets and the
 *   tests' fixtures;
 * - in the latest docs and the docs' snippets, each line that names an
 *   IFLoom package and prints the old range (`^0.0.0`) or a tarball of the
 *   old version (`ifloom-engine-0.0.0.tgz`). Released docs keep theirs.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = join(import.meta.dirname, '..')
const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('Usage: node scripts/version.ts <version>, such as 0.1.0')
  process.exit(1)
}

type Manifest = { name: string; version?: string } & Partial<Record<'dependencies' | 'devDependencies' | 'peerDependencies', Record<string, string>>>
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Manifest
const dirs = (dir: string) =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(root, dir, entry.name, 'package.json')))
        .map((entry) => join(root, dir, entry.name))
    : []

/** Every file under a folder whose name passes, leaving out installed and built folders. */
function walk(dir: string, keep: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return ['node_modules', 'dist'].includes(entry.name) ? [] : walk(join(dir, entry.name), keep)
    return keep(entry.name) ? [join(dir, entry.name)] : []
  })
}

const packages = dirs('packages')
const names = new Set(packages.map((dir) => read(join(dir, 'package.json')).name))
const old = read(join(root, 'packages/engine/package.json')).version!
const changed: string[] = []

function write(file: string, before: string, after: string): void {
  if (after === before) return
  writeFileSync(file, after)
  changed.push(relative(root, file))
}

// The manifests: each package's version, and every range that names one.
const manifests = [root, ...packages, ...dirs('examples'), ...dirs('packages/cli/templates'), join(root, 'docs/snippets')].map((dir) =>
  join(dir, 'package.json'),
)
const fixtures = packages.flatMap((dir) => walk(join(dir, 'tests/fixtures'), (name) => name === 'package.json'))
for (const file of [...manifests, ...fixtures]) {
  const before = readFileSync(file, 'utf8')
  const pkg = JSON.parse(before) as Manifest
  if ([root, ...packages].some((dir) => join(dir, 'package.json') === file)) pkg.version = version
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies'] as const)
    for (const name of Object.keys(pkg[field] ?? {})) if (names.has(name)) pkg[field]![name] = `^${version}`
  write(file, before, `${JSON.stringify(pkg, null, 2)}\n`)
}

// The docs: a line that names a package and prints the old range or tarball.
const escaped = old.replaceAll('.', '\\.')
const range = new RegExp(`\\^${escaped}(?![\\d.]*\\d)`, 'g')
const tarball = new RegExp(`-${escaped}\\.tgz`, 'g')
const pages = [
  ...walk(join(root, 'docs/content/docs/(latest)'), (name) => /\.mdx?$/.test(name)),
  ...walk(join(root, 'docs/snippets'), (name) => /\.(ts|tsx|vue|svelte|md)$/.test(name)),
]
for (const file of pages) {
  const before = readFileSync(file, 'utf8')
  const after = before
    .split('\n')
    .map((line) => (/ifloom/i.test(line) ? line.replace(range, `^${version}`).replace(tarball, `-${version}.tgz`) : line))
    .join('\n')
  write(file, before, after)
}

console.log(`${old} -> ${version}: ${changed.length} files\n${changed.map((file) => `  ${file}`).join('\n')}`)
execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: root, stdio: 'inherit' })
