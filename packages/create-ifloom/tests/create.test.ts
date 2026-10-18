import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { newGame } from '@ifloom/cli'
import { create, nextSteps, packageManager, parseArgs, type Io } from '../src/create.ts'

const fresh = () => mkdtempSync(join(tmpdir(), 'create-ifloom-'))

/** Run the command in a folder, keeping what it printed. */
function run(argv: string[], userAgent?: string) {
  const cwd = fresh()
  const out: string[] = []
  const err: string[] = []
  const io: Io = { cwd, userAgent, log: (line) => out.push(line), error: (line) => err.push(line) }
  return { code: create(argv, io), cwd, out: out.join('\n'), err: err.join('\n') }
}

/** Every file under a folder, with its contents. */
function tree(dir: string, base = dir): Record<string, string> {
  return Object.fromEntries(
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? Object.entries(tree(path, base)) : [[relative(base, path), readFileSync(path, 'utf8')]]
    }),
  )
}

describe('the arguments', () => {
  it('takes a name, and --template and --theme with a value each', () => {
    expect(parseArgs(['my-game'])).toEqual({ name: 'my-game', help: false })
    expect(parseArgs(['my-game', '--template', 'vue'])).toEqual({ name: 'my-game', template: 'vue', help: false })
    expect(parseArgs(['--theme=paper', 'my-game', '--template=cafe'])).toEqual({ name: 'my-game', template: 'cafe', theme: 'paper', help: false })
    expect(parseArgs(['--help'])).toMatchObject({ help: true })
    expect(parseArgs([])).toEqual({ help: false })
  })

  it('refuses an unknown option, a flag without a value and a second name', () => {
    expect(parseArgs(['my-game', '--colour', 'red'])).toMatchObject({ error: expect.stringMatching(/no option --colour/) })
    expect(parseArgs(['my-game', '--template'])).toMatchObject({ error: expect.stringMatching(/--template needs a value/) })
    expect(parseArgs(['my-game', '--template', '--theme', 'paper'])).toMatchObject({ error: expect.stringMatching(/--template needs a value/) })
    expect(parseArgs(['my-game', 'other'])).toMatchObject({ error: expect.stringMatching(/One name only/) })
  })
})

describe('the package manager', () => {
  it('is read from npm_config_user_agent, and npm otherwise', () => {
    expect(packageManager('pnpm/10.4.1 npm/? node/v24.1.0 linux x64')).toEqual({ name: 'pnpm', major: 10 })
    expect(packageManager('yarn/1.22.22 npm/? node/v24.1.0 linux x64')).toEqual({ name: 'yarn', major: 1 })
    expect(packageManager('bun/1.2.5 npm/? node/v24.1.0 linux x64')).toEqual({ name: 'bun', major: 1 })
    expect(packageManager('npm/11.0.0 node/v24.1.0 linux x64 workspaces/false')).toEqual({ name: 'npm', major: 11 })
    expect(packageManager(undefined)).toEqual({ name: 'npm', major: 0 })
  })

  it('names the next steps in its own words', () => {
    expect(nextSteps('npm', 'my-game', 'react')).toEqual(['cd my-game', 'npm install', 'npm run dev'])
    expect(nextSteps('pnpm', 'my-game', 'vue')).toEqual(['cd my-game', 'pnpm install', 'pnpm dev'])
    expect(nextSteps('yarn', 'my-game', 'react')).toEqual(['cd my-game', 'yarn install', 'yarn run dev'])
    expect(nextSteps('bun', 'my-game', 'react')).toEqual(['cd my-game', 'bun install', 'bun run dev'])
    expect(nextSteps('npm', 'weather', 'plugin')).toEqual(['cd weather', 'npm install', 'npm test'])
    expect(nextSteps('bun', 'weather', 'plugin')).toEqual(['cd weather', 'bun install', 'bun run test'])
  })
})

describe('create-ifloom', () => {
  it.each(['react', 'vanilla', 'vue', 'svelte', 'next', 'novel', 'plugin'] as const)(
    'makes the same %s game as ifloom new, in a folder named for it',
    (template) => {
      const name = template === 'plugin' ? 'ifloom-plugin-weather' : 'my-game'
      const made = run([name, '--template', template, '--theme', 'paper'])
      expect(made.err).toBe('')
      expect(made.code).toBe(0)
      const into = join(fresh(), name)
      newGame({ name, template, theme: 'paper', into })
      expect(tree(join(made.cwd, name))).toEqual(tree(into))
    },
  )

  it('writes the dependencies as caret ranges, and a tsconfig that stands alone', () => {
    const { cwd } = run(['my-game', '--template', 'vue'])
    const pkg = JSON.parse(readFileSync(join(cwd, 'my-game/package.json'), 'utf8'))
    const ifloom = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).filter(([dep]) => dep.startsWith('@ifloom/'))
    expect(ifloom.length).toBeGreaterThan(2)
    for (const [, range] of ifloom) expect(range).toBe('^0.0.0')
    expect(JSON.parse(readFileSync(join(cwd, 'my-game/tsconfig.json'), 'utf8')).extends).toBeUndefined()
  })

  it('says what it made and what to run next with the package manager that ran it', () => {
    const npm = run(['my-game', '--theme', 'studio'])
    expect(npm.out).toContain('Made my-game from the react template, with the studio theme.')
    expect(npm.out).toContain('  cd my-game\n  npm install\n  npm run dev')
    expect(run(['my-game', '--template', 'svelte'], 'pnpm/10.4.1 npm/? node/v24.1.0 linux x64').out).toContain('  cd my-game\n  pnpm install\n  pnpm dev')
  })

  it('sets yarn 2 and later to install into node_modules', () => {
    const berry = run(['my-game', '--template', 'vanilla'], 'yarn/4.6.0 npm/? node/v24.1.0 linux x64')
    expect(readFileSync(join(berry.cwd, 'my-game/.yarnrc.yml'), 'utf8')).toBe('nodeLinker: node-modules\n')
    const classic = run(['my-game', '--template', 'vanilla'], 'yarn/1.22.22 npm/? node/v24.1.0 linux x64')
    expect(readdirSync(join(classic.cwd, 'my-game'))).not.toContain('.yarnrc.yml')
  })

  it('refuses no name, a bad template and a bad theme, and makes nothing', () => {
    expect(run([])).toMatchObject({ code: 1, err: expect.stringMatching(/Give the new game a name/) })
    const bad = run(['my-game', '--template', 'epic'])
    expect(bad).toMatchObject({ code: 1, err: expect.stringMatching(/no template "epic"/) })
    expect(readdirSync(bad.cwd)).toEqual([])
    expect(run(['my-game', '--theme', 'neon'])).toMatchObject({ code: 1, err: expect.stringMatching(/no theme "neon"/) })
  })
})
