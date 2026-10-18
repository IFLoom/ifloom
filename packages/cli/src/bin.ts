#!/usr/bin/env node
/**
 * ifloom — the command line.
 *
 *   ifloom new <name> [--template react]
 *                            a new game in games/<name>, from react, vanilla, vue, svelte, next, novel, cafe or town,
 *                            or a plugin package of its own from plugin;
 *                            --theme paper|terminal|studio|storybook picks the React UI's preset, or none for its plain look
 *   ifloom dev               the game in a browser, reloading as you edit
 *   ifloom build [--out dir] [--inline-assets]
 *                            one HTML file and its art and sound, checked to open from disk;
 *                            --inline-assets puts the art inside the file too (never sound or video)
 *   ifloom check [module]    every problem the content checker finds, and files missing from public/
 *   ifloom playtest [module] [--turns 7] [--out playtest.txt]
 *                            play it day by day; every screen to a transcript, the numbers to .metrics
 *   ifloom snapshot [module] [--out snapshots/scenes.txt] [--update]
 *                            every scene in every probe state, compared with the last run
 *   ifloom unlock-hash <unlock> [module]
 *                            the hash of an unlock's code, from IFLOOM_UNLOCK_<UNLOCK> or piped in,
 *                            to put in the unlock; the code itself is never printed
 *
 * Run from the game's folder. `check` reads `src/game.ts` unless told otherwise;
 * it exports the game as `default` or `game`. `playtest` also reads its
 * `policy` (a function that picks the next command; an explorer if absent) and
 * `start` (a state, or a function of the game); `snapshot` reads `probes`
 * (a function of the game returning `{ name, state }`s; the start if absent).
 *
 * A game with locked content keeps it in `src/unlocks/<unlock>.ts`. `build`
 * and `dev` encrypt it into the page under each unlock's code (see
 * `unlocks.ts`), and `build` refuses a page with any of it, or a code, in
 * plain text. `check` checks the game with it, passing it to the module's
 * function as `{ unlocked }`.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { startingState, type FileRef, type Game, type GameState } from '@ifloom/engine'
import { build, createServer } from 'vite'
import { buildFiles, checkBuild, inlineAssets } from './build.ts'
import { checkFiles, gameFrom } from './check.ts'
import { checkUnlocks, codesFrom, leaks, linesOf, lockedFiles, packsOf, unlocksModule } from './unlocks.ts'
import { explorer, metricsText, playtest, type Policy } from './playtest.ts'
import { snapshot, type Probe } from './snapshot.ts'
import { configLoader, sourcePlugin } from './source.ts'
import { TEMPLATES, THEMES, newGame, type TemplateName, type ThemeName } from './new.ts'

const [command = 'help', ...rest] = process.argv.slice(2)
/** The first argument that is neither a flag nor a flag's value. */
const positional = () => rest.find((arg, at) => !arg.startsWith('--') && !(at > 0 && rest[at - 1].startsWith('--') && rest[at - 1] !== '--update'))
const flag = (name: string) => {
  const at = rest.indexOf(`--${name}`)
  return at >= 0 ? rest[at + 1] : undefined
}

/** Load the game module through Vite, so TypeScript, JSX and the game's own aliases all work. */
async function withModule<T>(
  entry: string | undefined,
  use: (module: Record<string, unknown>, load: (path: string) => Promise<Record<string, unknown>>) => T | Promise<T>,
): Promise<T> {
  // A game without a Vite config (a Next app) still reads the packages' source inside the checkout.
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    configLoader: configLoader(),
    plugins: [sourcePlugin()],
  })
  try {
    const load = (path: string) => server.ssrLoadModule(path)
    return await use(await load(resolve(entry ?? 'src/game.ts')), load)
  } finally {
    await server.close()
  }
}

function write(file: string, text: string): void {
  mkdirSync(dirname(resolve(file)), { recursive: true })
  writeFileSync(file, text)
}

function startOf(module: Record<string, unknown>, game: Game): GameState {
  const start = module.start as GameState | ((game: Game) => GameState) | undefined
  return typeof start === 'function' ? start(game) : (start ?? startingState(game))
}

/** A snapshot file's renders, each from its `===` line to the next: prose has blank lines of its own. */
function renders(text: string): string[] {
  return text.split(/\n(?==== )/).map((block) => block.trimEnd())
}

/** The files src/game.ts names, to check they are in the build; undefined if there's no game or it won't load. */
async function builtFiles(): Promise<FileRef[] | undefined> {
  if (!existsSync(resolve('src/game.ts'))) return undefined
  try {
    return await withModule(undefined, (module) => gameFrom(module).files)
  } catch {
    return undefined
  }
}

async function check(entry?: string): Promise<number> {
  return withModule(entry, async (module, load) => {
    const base = gameFrom(module)
    let checked = base
    const problems: string[] = []
    const notes: string[] = []
    if (lockedFiles('.').length) {
      // The game with its locked content, read from source: what a player with every code plays.
      const unlocks = await checkUnlocks({ root: '.', mode: 'production', game: base.game, load })
      problems.push(...unlocks.problems)
      notes.push(...unlocks.notes)
      checked = gameFrom(module, unlocks.packs)
      const left = unlocks.packs.filter((pack) => !(checked.game.packs ?? []).includes(pack.id)).map((pack) => pack.id)
      if (left.length)
        problems.push(
          `the game module left out the locked packs ${left.join(', ')}: export a function that takes { unlocked } and loads them after the game's own`,
        )
      // What the game without them lacks is what its unlocks bring: fine while it's reached only behind unlocks/has.
      const without = base.problems.filter((problem) => !checked.problems.includes(problem))
      if (without.length) {
        notes.push(
          `Without its unlocks the game has ${without.length} reference${without.length === 1 ? '' : 's'} into locked content, skipped here. Reach ${without.length === 1 ? 'it' : 'them'} only behind unlocks/has:`,
        )
        notes.push(...without.map((problem) => `  ${problem}`))
      }
    }
    problems.push(...checked.problems, ...checkFiles(checked.files, 'public'))
    for (const problem of problems) console.log(problem)
    for (const note of notes) console.log(note)
    console.log(problems.length ? `${problems.length} problem${problems.length === 1 ? '' : 's'}.` : 'No problems.')
    return problems.length ? 1 : 0
  })
}

/** What a built folder must not have in plain text: the codes, and the lines of the locked packs the game has nowhere else. */
async function secrets(): Promise<Parameters<typeof leaks>[1] | undefined> {
  const files = lockedFiles('.')
  if (!files.length) return undefined
  return withModule(undefined, async (module, load) => {
    const plugin = await unlocksModule('.', load)
    const codes = Object.values(codesFrom('.', 'production'))
    const packs = (await Promise.all(files.map(async ({ file }) => packsOf(await load(file), file)))).flat()
    return { codes: [...codes, ...codes.map(plugin.normaliseCode)], packs, shared: linesOf(gameFrom(module).game) }
  })
}

/** The hash of an unlock's code, for its `hash`: the code from the environment, or piped in. */
async function unlockHash(unlock: string | undefined, entry?: string): Promise<number> {
  if (!unlock) {
    console.error('Name the unlock: ifloom unlock-hash supporter')
    return 1
  }
  return withModule(entry, async (module, load) => {
    const plugin = await unlocksModule('.', load)
    const { game } = gameFrom(module)
    const name = plugin.envName(unlock)
    let code = codesFrom('.', 'production')[name]
    if (!code && !process.stdin.isTTY) {
      const chunks: Buffer[] = []
      for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
      code = Buffer.concat(chunks).toString('utf8').trim()
    }
    if (!code) {
      console.error(`Give the code in ${name} (in the environment or .env.local), or pipe it in. It is never printed.`)
      return 1
    }
    const def = plugin.unlockDefs(game).find((entry) => entry.id === unlock) ?? { id: unlock }
    const hash = await plugin.unlockHash(code, game.id, def)
    console.log(`The hash of ${name} for unlock "${unlock}" in ${game.id}:\n`)
    console.log(`  hash: '${hash}',`)
    if ('hash' in def) console.log(def.hash === hash ? '\nThe unlock has this hash already.' : '\nThe unlock has a different hash: put this one in its place.')
    return 0
  })
}

async function play(entry?: string): Promise<number> {
  return withModule(entry, (module) => {
    const { game } = gameFrom(module)
    const policy = (module.policy as Policy | undefined) ?? explorer()
    const turns = Number(flag('turns') ?? 7)
    if (!Number.isInteger(turns) || turns < 1) {
      console.error('--turns takes a whole number of turns, 1 or more.')
      return 1
    }
    const result = playtest(game, startOf(module, game), policy, { turns })
    const out = flag('out') ?? 'playtest.txt'
    write(out, result.transcript + '\n')
    write(`${out}.metrics`, metricsText(result.turns) + '\n')
    console.log(metricsText(result.turns))
    for (const refusal of result.refusals) console.log(`turn ${refusal.turn}: refused ${JSON.stringify(refusal.command)}: ${refusal.reason}`)
    console.log(`Transcript in ${out}, numbers in ${out}.metrics.`)
    // A refusal is a button the game offered and then wouldn't do, or a policy asking for what isn't there: worth failing CI on.
    return result.refusals.length ? 1 : 0
  })
}

async function snap(entry?: string): Promise<number> {
  return withModule(entry, (module) => {
    const { game } = gameFrom(module)
    const probes = (module.probes as ((game: Game) => Probe[]) | undefined)?.(game) ?? [{ name: 'start', state: startOf(module, game) }]
    const text = snapshot(game, probes)
    const out = flag('out') ?? 'snapshots/scenes.txt'
    const before = existsSync(out) ? readFileSync(out, 'utf8') : null
    if (before === null || rest.includes('--update')) {
      write(out, text)
      console.log(`${before === null ? 'Wrote' : 'Updated'} ${out}.`)
      return 0
    }
    if (before === text) {
      console.log('Every scene reads as it did.')
      return 0
    }
    const old = new Map(renders(before).map((block) => [block.split('\n')[0], block]))
    const now = renders(text)
    const heads = new Set(now.map((block) => block.split('\n')[0]))
    const changed = [
      ...now.filter((block) => old.get(block.split('\n')[0]) !== block).map((block) => block.split('\n')[0]),
      ...[...old.keys()].filter((head) => !heads.has(head)).map((head) => `${head} (gone)`),
    ]
    for (const head of changed) console.log(`changed: ${head.replace(/^=== /, '')}`)
    console.log(`${changed.length} scene render${changed.length === 1 ? '' : 's'} changed. If you meant it, run again with --update.`)
    return 1
  })
}

/** A new game in games/<name>, and what to type next. */
function create(name: string | undefined, template: string | undefined, theme: string | undefined): number {
  if (!name) {
    console.error(`Give the new game a name: ifloom new my-story [--template ${TEMPLATES.join('|')}]`)
    return 1
  }
  try {
    const made = newGame({ name, template: template as TemplateName | undefined, theme: theme as ThemeName | 'none' | undefined })
    const look = made.theme ? `, with the ${made.theme} theme` : theme === 'none' ? ', with no theme preset' : ''
    console.log(`Made ${name} in ${relative(process.cwd(), made.dir) || '.'} from the ${template ?? 'react'} template${look}. Next:\n`)
    console.log('  npm install')
    if (template === 'plugin') {
      console.log(`  npm test -w ${name}`)
    } else {
      console.log(`  npm run dev -w ${name}`)
    }
    return 0
  } catch (error) {
    console.error((error as Error).message)
    return 1
  }
}

async function main(): Promise<number> {
  switch (command) {
    case 'dev': {
      const server = await createServer({ configLoader: configLoader() })
      await server.listen()
      server.printUrls()
      return new Promise(() => {})
    }
    case 'build': {
      const out = flag('out') ?? 'dist'
      await build({ configLoader: configLoader(), build: { outDir: out, emptyOutDir: true } })
      if (rest.includes('--inline-assets')) {
        const inlined = inlineAssets(out)
        console.log(`Put ${inlined.files} file${inlined.files === 1 ? '' : 's'} from art/ into index.html.`)
        if (inlined.videos)
          console.log(`Left ${inlined.videos} video${inlined.videos === 1 ? '' : 's'} in art/ beside it: video is too big to put in the page.`)
        if (existsSync(resolve(out, 'audio'))) console.log('Left audio/ beside it: sound is too big to put in the page.')
      }
      const problems = checkBuild(out, await builtFiles())
      // Locked content goes in encrypted: refuse a page with any of it, or a code, in plain text.
      const locked = await secrets()
      if (locked) problems.push(...leaks(out, locked))
      for (const file of buildFiles(out).slice(0, 5)) console.log(`${file.file}  ${(file.bytes / 1024).toFixed(1)} kB`)
      for (const problem of problems) console.error(problem)
      return problems.length ? 1 : 0
    }
    case 'check':
      return check(positional())
    case 'playtest':
      return play(positional())
    case 'snapshot':
      return snap(positional())
    case 'new':
      return create(positional(), flag('template'), flag('theme'))
    case 'unlock-hash':
      return unlockHash(rest.filter((arg) => !arg.startsWith('--'))[0], rest.filter((arg) => !arg.startsWith('--'))[1])
    default:
      console.log(
        `ifloom new <name> [--template ${TEMPLATES.join('|')}] [--theme ${THEMES.join('|')}|none] | dev | build [--out dir] [--inline-assets] | check [module] | playtest [module] [--turns n] [--out file] | snapshot [module] [--out file] [--update] | unlock-hash <unlock> [module]`,
      )
      return command === 'help' ? 0 : 1
  }
}

process.exitCode = await main()
