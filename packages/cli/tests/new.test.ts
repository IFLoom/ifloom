import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TEMPLATES, THEMES, newGame } from '../src/index.ts'
import { BASE_COMPILER_OPTIONS, pluginNames } from '../src/new.ts'

/** The packages each template adds besides IFLoom's, in the order its package.json lists them. */
// The react template's own layout.tsx is JSX, so it lists React and React's types. A copied example lists the same.
const REACT_DEPS = ['react', 'react-dom', '@tailwindcss/vite', '@types/react', '@types/react-dom', '@vitejs/plugin-react', 'tailwindcss', 'typescript']
const FRAMEWORK_DEPS: Partial<Record<(typeof TEMPLATES)[number], string[]>> = {
  react: REACT_DEPS,
  novel: REACT_DEPS,
  cafe: REACT_DEPS,
  town: REACT_DEPS,
  vanilla: ['typescript'],
  vue: ['vue', '@vitejs/plugin-vue', 'typescript', 'vue-tsc'],
  svelte: ['svelte', '@sveltejs/vite-plugin-svelte', 'svelte-check', 'typescript'],
  next: ['next', 'react', 'react-dom', '@tailwindcss/postcss', '@types/node', '@types/react', '@types/react-dom', 'postcss', 'tailwindcss', 'typescript'],
}

/** The files a template's game has besides src/game.ts, AGENTS.md, .gitignore and tsconfig.json: a page and a Vite config, or Next's own. */
const PAGE_FILES = (template: (typeof TEMPLATES)[number]) =>
  template === 'next'
    ? ['app/layout.tsx', 'app/page.tsx', 'app/Game.tsx', 'next.config.ts', 'postcss.config.mjs', 'README.md']
    : ['index.html', 'vite.config.ts']

const fresh = () => join(mkdtempSync(join(tmpdir(), 'ifloom-new-')), 'game')

/** The templates that make a game; `plugin` makes a plugin package. */
const GAMES = TEMPLATES.filter((template) => template !== 'plugin')

describe('ifloom new', () => {
  it.each(GAMES)('makes a game from the %s template, named for it', (template) => {
    const { dir, files } = newGame({ name: 'my-story', template, into: fresh() })
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-story')
    // A game lists IFLoom's packages, and the framework it draws with and that framework's Vite plugin.
    const own = FRAMEWORK_DEPS[template] ?? []
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((dep) => !dep.startsWith('@ifloom/'))).toEqual(own)
    expect(files).toEqual(expect.arrayContaining(['src/game.ts', 'AGENTS.md', '.gitignore', 'tsconfig.json', ...PAGE_FILES(template)]))
    expect(files).not.toContain('gitignore')
    expect(files.some((file) => file.startsWith('tests/') || file.startsWith('dist/') || file.startsWith('node_modules/'))).toBe(false)
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('# My Story')
  })

  it.each(GAMES)('lays the %s game out as world/ and story/ packs that game.ts assembles', (template) => {
    const { dir, files } = newGame({ name: 'my-story', template, into: fresh() })
    expect(files.some((file) => file.startsWith('src/world/'))).toBe(true)
    expect(files.some((file) => file.startsWith('src/story/'))).toBe(true)
    expect(readFileSync(join(dir, 'src/world/stats.ts'), 'utf8')).toContain("id: 'world.stats'")
    // The templates of our own start with one area of story; the examples have their own.
    if (!['novel', 'cafe', 'town'].includes(template)) {
      expect(readFileSync(join(dir, 'src/game.ts'), 'utf8')).toContain('loadGame([stats, opening]')
      expect(readFileSync(join(dir, 'src/story/opening.ts'), 'utf8')).toContain("id: 'story.opening'")
    }
  })

  it.each(GAMES)('writes the %s game a tsconfig that works outside the checkout, and a typecheck script', (template) => {
    const { dir } = newGame({ name: 'my-story', template, into: fresh() })
    const tsconfig = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'))
    expect(tsconfig.extends).toBeUndefined()
    expect(tsconfig.compilerOptions.customConditions).toBeUndefined()
    if (template !== 'next') expect(tsconfig.compilerOptions).toMatchObject({ ...BASE_COMPILER_OPTIONS, lib: expect.arrayContaining(['DOM']) })
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts.typecheck).toBeDefined()
  })

  it("keeps the checkout's tsconfig.base.json for a game inside the checkout, by its path from there", () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url))
    const scratch = join(root, 'node_modules/.cache', `ifloom-new-${process.pid}`)
    mkdirSync(scratch, { recursive: true })
    try {
      const { dir } = newGame({ name: 'inside', into: join(scratch, 'inside') })
      expect(JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8')).extends).toBe('../../../../tsconfig.base.json')
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  })

  it("writes out the checkout's base settings, without its source condition", () => {
    const base = JSON.parse(readFileSync(new URL('../../../tsconfig.base.json', import.meta.url), 'utf8'))
    delete base.compilerOptions.customConditions
    expect(BASE_COMPILER_OPTIONS).toEqual(base.compilerOptions)
  })

  it('fills in the react game with its name and title', () => {
    const { dir } = newGame({ name: 'the-door', into: fresh() })
    expect(readFileSync(join(dir, 'src/game.ts'), 'utf8')).toContain("{ id: 'the-door', title: 'The Door', introScene: 'start' }")
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain('<title>The Door</title>')
  })

  it('starts a game with the theme asked for, a random one for a react game, and an example with its own', () => {
    for (const theme of THEMES) {
      const { dir, theme: got } = newGame({ name: 'styled', theme, into: fresh() })
      expect(got).toBe(theme)
      const css = readFileSync(join(dir, 'src/styles.css'), 'utf8')
      expect(css.match(/@ifloom\/react\/themes\//g)).toHaveLength(1)
      expect(css).toContain(`@import "@ifloom/react/themes/${theme}.css";`)
    }
    expect(THEMES).toContain(newGame({ name: 'any', into: fresh() }).theme)
    expect(newGame({ name: 'letter', template: 'novel', into: fresh() }).theme).toBe('paper')
    expect(newGame({ name: 'letter', template: 'novel', theme: 'terminal', into: fresh() }).theme).toBe('terminal')
    expect(newGame({ name: 'plain', template: 'vanilla', theme: 'paper', into: fresh() }).theme).toBeNull()
    expect(() => newGame({ name: 'odd', theme: 'neon' as never, into: fresh() })).toThrow(/no theme "neon"/)
  })

  it.each(['react', 'novel'] as const)('leaves the preset out of the %s template with theme none', (template) => {
    const { dir, theme } = newGame({ name: 'plain-look', template, theme: 'none', into: fresh() })
    expect(theme).toBeNull()
    const css = readFileSync(join(dir, 'src/styles.css'), 'utf8')
    expect(css).toContain('@import "@ifloom/react/styles.css";')
    expect(css).not.toMatch(/@ifloom\/react\/themes\//)
  })

  it.each(['vanilla', 'vue', 'svelte'] as const)('uses no React in the %s template, and draws the plain game', (template) => {
    const { dir, files, theme } = newGame({ name: 'the-door', template, into: fresh() })
    expect(theme).toBeNull()
    const pkg = readFileSync(join(dir, 'package.json'), 'utf8')
    expect(pkg).not.toMatch(/react/)
    expect(pkg).toContain('@ifloom/audio')
    expect(pkg).toContain('@ifloom/browser')
    expect(files).toEqual(expect.arrayContaining(['src/main.ts', 'src/game.ts', 'src/styles.css']))
    expect(files).not.toContain('src/minigame.ts')
    expect(readFileSync(join(dir, 'src/game.ts'), 'utf8')).toContain("{ id: 'the-door', title: 'The Door', introScene: 'start' }")
    // Each starts the audio player and the minigame clock beside its runner.
    const runner = readFileSync(join(dir, template === 'vanilla' ? 'src/main.ts' : 'src/runner.ts'), 'utf8')
    for (const call of [
      'await browserRunner(game)',
      "from '@ifloom/browser'",
      'startAudio(runner)',
      'startClock(runner)',
      'startKeys(runner)',
      'runner.subscribe(',
    ])
      expect(runner).toContain(call)
  })

  it.each([
    ['react', 'react(), tailwindcss()', ['src/main.ts', 'src/layout.tsx', 'src/styles.css']],
    ['vue', 'vue()', ['src/App.vue', 'src/Layout.vue', 'src/Beat.vue', 'src/InputField.vue', 'src/Minigame.vue', 'src/Panel.vue']],
    ['svelte', 'svelte()', ['src/App.svelte', 'src/Layout.svelte', 'src/Beat.svelte', 'src/InputField.svelte', 'src/Minigame.svelte', 'src/Panel.svelte']],
  ] as const)("gives the %s template its framework's Vite plugin and components", (template, plugin, components) => {
    const { dir, files } = newGame({ name: 'framed', template, into: fresh() })
    expect(readFileSync(join(dir, 'vite.config.ts'), 'utf8')).toContain(`ifloom({ vite: { plugins: [${plugin}]`)
    expect(files).toEqual(expect.arrayContaining([...components]))
  })

  it('makes the next template a Next app that draws the game with the React UI, and has no Vite config', () => {
    const { dir, files, theme } = newGame({ name: 'the-door', template: 'next', into: fresh() })
    expect(THEMES).toContain(theme)
    expect(files).not.toContain('vite.config.ts')
    expect(files).not.toContain('index.html')
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    expect(pkg.scripts).toMatchObject({ dev: 'next dev', build: 'next build', check: 'ifloom check', typecheck: 'next typegen && tsc --noEmit' })
    expect(pkg.scripts.playtest).toMatch(/^ifloom playtest/)
    expect(readFileSync(join(dir, 'next.config.ts'), 'utf8')).not.toContain('transpilePackages')
    expect(readFileSync(join(dir, 'app/Game.tsx'), 'utf8')).toMatch(/^'use client'/)
    expect(readFileSync(join(dir, 'app/Game.tsx'), 'utf8')).toContain('browserRunner(loaded.game)')
    expect(readFileSync(join(dir, 'app/Game.tsx'), 'utf8')).toContain('layout={Layout}')
    expect(readFileSync(join(dir, 'src/layout.tsx'), 'utf8')).toContain('<Sidebar>')
    expect(readFileSync(join(dir, 'app/layout.tsx'), 'utf8')).toContain("title: 'The Door'")
    expect(readFileSync(join(dir, 'src/game.ts'), 'utf8')).toContain("{ id: 'the-door', title: 'The Door', introScene: 'start' }")
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toContain('# The Door')
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toContain('.next')
  })

  it('gives the vanilla template the preset alone', () => {
    const { dir, files } = newGame({ name: 'plain', template: 'vanilla', into: fresh() })
    expect(readFileSync(join(dir, 'vite.config.ts'), 'utf8')).toContain('export default ifloom()')
    expect(files).toContain('src/layout.ts')
  })

  it('makes a plugin package from the plugin template, named for the plugin', () => {
    const { dir, files, theme } = newGame({ name: 'ifloom-plugin-rainy-day', template: 'plugin', into: fresh() })
    expect(theme).toBeNull()
    expect(files.sort()).toEqual(['.gitignore', 'README.md', 'package.json', 'src/index.ts', 'tests/rainy-day.test.ts', 'tsconfig.json', 'tsdown.config.ts'])
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    expect(pkg).toMatchObject({
      name: 'ifloom-plugin-rainy-day',
      description: 'Rainy Day: a plugin for IFLoom.',
      license: 'MIT',
      // Published compiled: ES modules and their types, built into dist/ before it's packed.
      exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
      files: ['dist'],
      scripts: { build: 'tsdown', test: 'vitest run', typecheck: 'tsc --noEmit', prepublishOnly: 'npm run build' },
      // The engine is the game's: a caret peer, and a dev dependency for the plugin's own tests.
      peerDependencies: { '@ifloom/engine': '^0.0.0' },
    })
    expect(pkg.private).toBeUndefined()
    expect(pkg.dependencies).toBeUndefined()
    expect(Object.keys(pkg.devDependencies)).toEqual(['@ifloom/engine', 'tsdown', 'typescript', 'vitest'])
    // Standalone: the tsconfig extends nothing in the checkout.
    expect(JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8')).extends).toBeUndefined()
    const source = readFileSync(join(dir, 'src/index.ts'), 'utf8')
    for (const name of [
      "const ID = 'rainy-day'",
      'export function rainyDay(): DefinedPlugin<RainyDayState, RainyDayView>',
      'definePlugin<RainyDayState, RainyDayView>',
      'conditions: {',
      'effects: {',
      'commands: {',
      'view: (',
      'export const markRainyDayCommand',
    ]) {
      expect(source).toContain(name)
    }
    expect(readFileSync(join(dir, 'tests/rainy-day.test.ts'), 'utf8')).toContain("from '../src/index.ts'")
    const readme = readFileSync(join(dir, 'README.md'), 'utf8')
    expect(readme).toContain('# Rainy Day')
    expect(readme).toContain('npm install ifloom-plugin-rainy-day')
    expect(readme).toContain('## Getting it listed')
    // Nothing is left to fill in but the TODOs.
    for (const file of files) expect(readFileSync(join(dir, file), 'utf8')).not.toMatch(/\{\{\w+\}\}|__(?:id|camel|Pascal)__/)
  })

  it("takes a plugin's id from its package name, and refuses one that can't be an id", () => {
    expect(pluginNames('weather')).toEqual({ id: 'weather', camel: 'weather', Pascal: 'Weather', title: 'Weather' })
    expect(pluginNames('plugin-bus-stops')).toEqual({ id: 'bus-stops', camel: 'busStops', Pascal: 'BusStops', title: 'Bus Stops' })
    expect(pluginNames('ifloom-plugin-tide')).toMatchObject({ id: 'tide' })
    expect(() => newGame({ name: 'ifloom-plugin-2d', template: 'plugin', into: fresh() })).toThrow(/can't be a plugin's id/)
    expect(() => newGame({ name: 'tide.chart', template: 'plugin', into: fresh() })).toThrow(/can't be a plugin's id/)
  })

  it('refuses a bad name, an unknown template, and a folder already in use', () => {
    expect(() => newGame({ name: 'My Story', into: fresh() })).toThrow(/package name/)
    expect(() => newGame({ name: 'ok', template: 'epic' as never, into: fresh() })).toThrow(/no template "epic"/)
    const into = fresh()
    newGame({ name: 'ok', into })
    writeFileSync(join(into, 'notes.txt'), 'mine')
    expect(() => newGame({ name: 'ok', into })).toThrow(/isn't empty/)
    expect(existsSync(join(into, 'notes.txt'))).toBe(true)
  })
})
