import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { build, createServer } from 'vite'
import { createRunner, memoryDriver, profile, startingState, type Pack } from '@ifloom/engine'
import { startUnlocks, unlockedPacks, type LockedContent } from '@ifloom/plugin-unlocks'
import { checkUnlocks, isLockedModule, leaks, linesOf, lockedFiles, lockedScript } from '../src/unlocks.ts'
import fixtureGame from './fixtures/locked/src/game.ts'
import supporter from './fixtures/locked/src/unlocks/supporter.ts'

/** A tiny game with one locked pack, its code in its .env (FIXTURE-CODE-1234). */
const ROOT = new URL('./fixtures/locked/', import.meta.url).pathname
const CODE = 'FIXTURE-CODE-1234'
const PROSE = 'Behind the fountain a gate opens on a walled garden full of quinces.'
const ENV = 'IFLOOM_UNLOCK_SUPPORTER'

const made: string[] = []
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
  delete process.env[ENV]
})

function outDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ifloom-locked-'))
  made.push(dir)
  return dir
}

/** Every file of a built folder, as text. */
function everything(dir: string): string {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'))
    .join('\n')
}

async function buildFixture(input = 'index.html'): Promise<string> {
  const dir = outDir()
  await build({ root: ROOT, configLoader: 'native', logLevel: 'silent', build: { outDir: dir, emptyOutDir: true, rollupOptions: { input: join(ROOT, input) } } })
  return dir
}

/** The encrypted content a built page holds, read as the plugin reads it. */
function contentIn(html: string): Record<string, LockedContent> {
  const found = html.match(/<script>window\.__ifloomUnlocks=([\s\S]*?)<\/script>/)
  expect(found, 'the page has the locked content').not.toBeNull()
  return JSON.parse(found![1].replace(/\\u003c/g, '<')) as Record<string, LockedContent>
}

describe('locked content in a build', () => {
  it('finds the locked files, and knows a module of one', () => {
    expect(lockedFiles(ROOT).map((file) => file.unlock)).toEqual(['supporter'])
    expect(isLockedModule(ROOT, join(ROOT, 'src/unlocks/supporter.ts?import'))).toBe(true)
    expect(isLockedModule(ROOT, join(ROOT, 'src/game.ts'))).toBe(false)
    expect(lockedFiles(outDir())).toEqual([])
  })

  it('encrypts it into the page: the built folder has neither the code nor a line of it, and the code opens it', async () => {
    const dir = await buildFixture()
    const all = everything(dir)
    for (const secret of [CODE, 'FIXTURECODE1234', PROSE, 'walled garden', 'quinces', 'The walled garden']) expect(all).not.toContain(secret)
    expect(leaks(dir, { codes: [CODE, 'FIXTURECODE1234'], packs: [supporter], shared: linesOf(fixtureGame().game) })).toEqual([])

    // A player enters the code in the built game's runner, and next launch the content opens.
    const content = contentIn(readFileSync(join(dir, 'index.html'), 'utf8'))
    const driver = memoryDriver()
    const { game } = fixtureGame()
    const runner = createRunner(game, startingState(game), { profile: profile(game, driver) })
    const codes = startUnlocks(runner, { content })
    expect((await codes.enter('wrong code')).ok).toBe(false)
    const entered = await codes.enter(CODE.toLowerCase())
    expect(entered.ok && entered.value).toEqual({ unlock: 'supporter', label: 'Supporter edition', already: false, restart: true })
    await runner.settled()
    const opened = await unlockedPacks(game.id, profile(game, driver), content)
    expect(opened).toEqual({ packs: [supporter], problems: [] })
    expect(fixtureGame({ unlocked: opened.packs }).game.scenes.map((scene) => scene.id)).toEqual(['intro', 'garden'])
  })

  it('refuses a page that imports locked content', async () => {
    await expect(buildFixture('leaky.html')).rejects.toThrow(/is locked content \(src\/unlocks\/\), which the page must never import/)
  })

  it('refuses to build without the code, or with the wrong one', async () => {
    process.env[ENV] = 'NOT-THE-CODE'
    await expect(buildFixture()).rejects.toThrow(/IFLOOM_UNLOCK_SUPPORTER isn't the one unlock "supporter" has the hash of/)
    process.env[ENV] = ''
    await expect(buildFixture()).rejects.toThrow(/IFLOOM_UNLOCK_SUPPORTER isn't set, so unlock "supporter"'s content can't be encrypted/)
  })

  it('leaves the content out in dev without a code, and says so', async () => {
    const server = await createServer({ root: ROOT, configLoader: 'native', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
    try {
      const load = (path: string) => server.ssrLoadModule(path)
      const html = await server.transformIndexHtml('/index.html', readFileSync(join(ROOT, 'index.html'), 'utf8'))
      expect(html).toContain('window.__ifloomUnlocks=')
      process.env[ENV] = ''
      const without = await lockedScript({ root: ROOT, mode: 'development', load, strict: false })
      expect(without).toMatchObject({ script: '', problems: [], notes: ['IFLOOM_UNLOCK_SUPPORTER isn\'t set, so unlock "supporter"\'s content can\'t be encrypted and is left out. Put the code in .env.local.'] })
    } finally {
      await server.close()
    }
  })

  it('finds a code or a line of locked content left in a build, but not a line the game has anyway', () => {
    const dir = outDir()
    mkdirSync(join(dir, 'assets'))
    writeFileSync(join(dir, 'index.html'), `<script>const code = "${CODE}"</script>`)
    writeFileSync(join(dir, 'assets', 'story.js'), `const s = ${JSON.stringify(PROSE)}; const t = "Supporter edition and more"`)
    const secrets = { codes: [CODE], packs: [{ ...supporter, strings: { label: 'Supporter edition and more' } } as Pack] }
    expect(leaks(dir, secrets).sort()).toEqual([
      `${join('assets', 'story.js')} has locked content in it in plain text: "Behind the fountain a gate opens on a wa…"`,
      'index.html has an unlock code in it',
    ])
    expect(leaks(dir, { ...secrets, shared: new Set(['Supporter edition and more', PROSE]) })).toEqual(['index.html has an unlock code in it'])
  })
})

describe('checking a game with locked content', () => {
  async function checked() {
    const server = await createServer({ root: ROOT, configLoader: 'native', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
    try {
      return await checkUnlocks({ root: ROOT, mode: 'production', game: fixtureGame().game, load: (path) => server.ssrLoadModule(path) })
    } finally {
      await server.close()
    }
  }

  it('gives the locked packs, and checks the code against the hash', async () => {
    expect(await checked()).toEqual({ packs: [supporter], problems: [], notes: [] })
    process.env[ENV] = ''
    expect(await checked()).toEqual({
      packs: [supporter],
      problems: [],
      notes: ['IFLOOM_UNLOCK_SUPPORTER isn\'t set: unlock "supporter"\'s content was checked from source, but ifloom build needs the code to encrypt it.'],
    })
    process.env[ENV] = 'NOT-THE-CODE'
    expect((await checked()).problems).toEqual([
      'IFLOOM_UNLOCK_SUPPORTER isn\'t unlock "supporter"\'s code: its hash differs. Run ifloom unlock-hash supporter and put the hash it prints in the unlock.',
    ])
  })
})
