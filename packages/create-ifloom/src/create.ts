/**
 * create-ifloom: what `npm create ifloom@latest my-game` runs. It makes a new
 * game in the folder `my-game` with the CLI's `newGame`, the same as `ifloom
 * new`, with the same `--template` and `--theme`, and says what to run next
 * with the package manager that ran it. It installs nothing.
 */
import { writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { TEMPLATES, THEMES, newGame, type TemplateName, type ThemeName } from '@ifloom/cli'

export const USAGE = `npm create ifloom@latest <name> -- [--template ${TEMPLATES.join('|')}] [--theme ${THEMES.join('|')}|none]`

export type Args = { name?: string; template?: string; theme?: string; help: boolean }

/** The arguments after the command: a name, and `--template` and `--theme` with a value each, as `--template vue` or `--template=vue`. */
export function parseArgs(argv: string[]): Args | { error: string } {
  const args: Args = { help: false }
  for (let at = 0; at < argv.length; at++) {
    const arg = argv[at]
    if (arg === '--help' || arg === '-h') {
      args.help = true
    } else if (arg.startsWith('--')) {
      const [flag, inline] = arg.slice(2).split(/=(.*)/s)
      if (flag !== 'template' && flag !== 'theme') return { error: `There is no option --${flag}. ${USAGE}` }
      const value = inline ?? argv[++at]
      if (!value || value.startsWith('--')) return { error: `--${flag} needs a value. ${USAGE}` }
      args[flag] = value
    } else if (args.name === undefined) {
      args.name = arg
    } else {
      return { error: `One name only: "${args.name}" or "${arg}". ${USAGE}` }
    }
  }
  return args
}

export type PackageManager = { name: 'npm' | 'pnpm' | 'yarn' | 'bun'; major: number }

/** The package manager that ran the command, from the `npm_config_user_agent` each of them sets, such as `pnpm/10.4.1 npm/? node/v24.1.0 linux x64`. npm if it's none of them. */
export function packageManager(userAgent: string | undefined): PackageManager {
  const [name, version = ''] = (userAgent ?? '').split(' ')[0].split('/')
  const major = Number.parseInt(version, 10) || 0
  return name === 'pnpm' || name === 'yarn' || name === 'bun' ? { name, major } : { name: 'npm', major }
}

/** What to type next: into the folder, install, then play the game (or test the plugin). */
export function nextSteps(pm: PackageManager['name'], folder: string, template: TemplateName): string[] {
  // `yarn check` and `bun test` are those tools' own commands, so a script always goes through `run` there.
  const run = (script: string) => (pm === 'npm' ? `npm run ${script}` : pm === 'pnpm' ? `pnpm ${script}` : `${pm} run ${script}`)
  return [...(folder === '.' ? [] : [`cd ${folder}`]), `${pm} install`, template === 'plugin' ? (pm === 'npm' ? 'npm test' : run('test')) : run('dev')]
}

export type Io = { cwd: string; userAgent: string | undefined; log: (line: string) => void; error: (line: string) => void }

/** Make the game, and print what was made and what to type next. Returns the exit code. */
export function create(argv: string[], io: Io): number {
  const args = parseArgs(argv)
  if ('error' in args) {
    io.error(args.error)
    return 1
  }
  if (args.help) {
    io.log(USAGE)
    return 0
  }
  if (!args.name) {
    io.error(`Give the new game a name: ${USAGE}`)
    return 1
  }
  const pm = packageManager(io.userAgent)
  const template = (args.template ?? 'react') as TemplateName
  try {
    const made = newGame({ name: args.name, template, theme: args.theme as ThemeName | 'none' | undefined, into: resolve(io.cwd, args.name) })
    // Yarn 2 and later install with Plug'n'Play unless told otherwise, and Vite needs a node_modules folder.
    if (pm.name === 'yarn' && pm.major >= 2) writeFileSync(join(made.dir, '.yarnrc.yml'), 'nodeLinker: node-modules\n')
    const look = made.theme ? `, with the ${made.theme} theme` : args.theme === 'none' ? ', with no theme preset' : ''
    io.log(`Made ${args.name} from the ${template} template${look}. Next:\n`)
    for (const line of nextSteps(pm.name, relative(io.cwd, made.dir) || '.', template)) io.log(`  ${line}`)
    io.log(
      template === 'plugin' ? '\nWriting a plugin: https://ifloom.dev/docs/reference/plugins' : '\nYour first story: https://ifloom.dev/docs/guide/first-story',
    )
    return 0
  } catch (error) {
    io.error((error as Error).message)
    return 1
  }
}
