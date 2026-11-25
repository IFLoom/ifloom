/**
 * The publish step of a release, which changesets/action runs once the "Version packages" pull request is merged
 * (.github/workflows/release.yml). It publishes each package whose version isn't on npm yet, in the order they use
 * each other, through `changeset publish`, which also tags each one `<name>@<version>`. Then it waits until each new
 * version's tarball can be downloaded, which can lag minutes behind the publish: a release is done when a game can
 * install it.
 *
 *   node scripts/release-publish.ts          publish
 *   node scripts/release-publish.ts --list   the packages it would publish, and their count in $GITHUB_OUTPUT
 *
 * It publishes with whatever npm is signed in as: in the workflow, the NPM_TOKEN secret if it's set, else trusted
 * publishing.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
type Manifest = { name: string; version: string; private?: boolean }

const unpublished = readdirSync(join(root, 'packages'))
  .map((dir) => JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8')) as Manifest)
  .filter((manifest) => !manifest.private && !onNpm(manifest))

// A package at 0.0.0 is a new one waiting for the changeset that releases it as 0.1.0 (scripts/new-plugin.ts writes it).
const unreleased = unpublished.filter(({ version }) => version === '0.0.0')
if (unreleased.length) {
  console.error(`Not published, as each is waiting for its first changeset: ${unreleased.map(({ name }) => name).join(', ')}`)
  if (!process.argv.includes('--list')) process.exit(1)
}

if (process.argv.includes('--list')) {
  const ready = unpublished.filter((manifest) => !unreleased.includes(manifest))
  for (const { name, version } of ready) console.log(`${name}@${version}`)
  if (!ready.length) console.log('Every package is on npm at its version.')
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `count=${ready.length}\n`)
  process.exit(0)
}

// Its output goes to the terminal as it is: changesets/action reads its `New tag:` lines.
const published = spawnSync('npx', ['changeset', 'publish'], { cwd: root, stdio: 'inherit' })
if (published.status !== 0) process.exit(published.status ?? 1)

// A tarball can 404 for minutes after its publish, so wait until each can be fetched.
const deadline = Date.now() + 15 * 60_000
for (const { name, version } of unpublished) {
  const url = `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz`
  while (
    !(await fetch(url, { method: 'HEAD' }).then(
      (answer) => answer.ok,
      () => false,
    ))
  ) {
    if (Date.now() > deadline) {
      console.error(`${name}@${version} still can't be downloaded from ${url}.`)
      process.exit(1)
    }
    await new Promise((done) => setTimeout(done, 15_000))
  }
  console.log(`${name}@${version} can be downloaded.`)
}

/** Whether npm has this version of the package. An E404 is no; any other failure to ask stops the release. */
function onNpm({ name, version }: Manifest): boolean {
  try {
    return execFileSync('npm', ['view', `${name}@${version}`, 'version'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() === version
  } catch (error) {
    const stderr = String((error as { stderr?: unknown }).stderr ?? '')
    if (/E404|404 Not Found/.test(stderr)) return false
    throw new Error(`npm view ${name}@${version} failed:\n${stderr}`)
  }
}
