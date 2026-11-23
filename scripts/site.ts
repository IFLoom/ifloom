// Runs a script of the website (the ifloom-site repo) against this checkout's docs:
//
//   node scripts/site.ts dev     the site at http://localhost:3000/, reloading as docs/ changes
//   node scripts/site.ts links   the docs' link and include check
//   node scripts/site.ts check   lint, typecheck, the link check and a build
//
// The site's code lives in its own repo; the pages it shows are docs/ and
// CHANGELOG.md here. It looks for the site in $IFLOOM_SITE, else beside this
// checkout (../ifloom-site), installs it if it has never been installed, and
// passes this checkout to it as ENGINE_DIR, so it reads docs/ as it is now,
// uncommitted edits and all.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const script = process.argv[2]
if (!script || !['dev', 'links', 'check'].includes(script)) {
  console.error('Usage: node scripts/site.ts dev | links | check')
  process.exit(1)
}

const site = resolve(process.env.IFLOOM_SITE ?? join(root, '..', 'ifloom-site'))
if (!existsSync(join(site, 'package.json'))) {
  console.error(`No website checkout at ${site}.`)
  console.error('Clone it beside this one (git clone https://github.com/IFLoom/ifloom-site.git ../ifloom-site), or set IFLOOM_SITE.')
  process.exit(1)
}

// The site is no workspace of this checkout, so it has its own node_modules, and
// none of this checkout's Node options: it reads no @ifloom package's source.
const env = { ...process.env, ENGINE_DIR: root, NODE_OPTIONS: '' }
const run = (args: string[]) => {
  const result = spawnSync('npm', args, { cwd: site, env, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!existsSync(join(site, 'node_modules'))) run(['ci'])
run(['run', script])
