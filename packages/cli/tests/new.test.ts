import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEMPLATES, THEMES, newGame } from '../src/index.ts'

/** The packages each template adds besides IFLoom's, in the order its package.json lists them. */
const REACT_DEPS = ['@tailwindcss/vite', '@vitejs/plugin-react', 'tailwindcss']
const FRAMEWORK_DEPS: Partial<Record<(typeof TEMPLATES)[number], string[]>> = {
  react: [...REACT_DEPS, 'typescript'],
  novel: REACT_DEPS,
  cafe: REACT_DEPS,
  town: REACT_DEPS,
  vanilla: ['typescript'],
  vue: ['vue', '@vitejs/plugin-vue', 'typescript', 'vue-tsc'],
  svelte: ['svelte', '@sveltejs/vite-plugin-svelte', 'svelte-check', 'typescript'],
}

const fresh = () => join(mkdtempSync(join(tmpdir(), 'ifloom-new-')), 'game')

describe('ifloom new', () => {
  it.each(TEMPLATES)('makes a game from the %s template, named for it', (template) => {
    const { dir, files } = newGame({ name: 'my-story', template, into: fresh() })
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-story')
    // A game lists IFLoom's packages, and the framework it draws with and that framework's Vite plugin.
    const own = FRAMEWORK_DEPS[template] ?? []
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((dep) => !dep.startsWith('@ifloom/'))).toEqual(own)
    expect(files).toEqual(expect.arrayContaining(['src/game.ts', 'index.html', 'AGENTS.md', '.gitignore', 'vite.config.ts', 'tsconfig.json']))
    expect(files.some((file) => file.startsWith('tests/') || file.startsWith('dist/') || file.startsWith('node_modules/'))).toBe(false)
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('# My Story')
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
    for (const call of ['await browserRunner(game)', "from '@ifloom/browser'", 'startAudio(runner)', 'startClock(runner)', 'startKeys(runner)', 'runner.subscribe(']) expect(runner).toContain(call)
  })

  it.each([
    ['react', 'react(), tailwindcss()', ['src/main.ts', 'src/styles.css']],
    ['vue', 'vue()', ['src/App.vue', 'src/Beat.vue', 'src/InputField.vue', 'src/Minigame.vue']],
    ['svelte', 'svelte()', ['src/App.svelte', 'src/Beat.svelte', 'src/InputField.svelte', 'src/Minigame.svelte']],
  ] as const)('gives the %s template its framework\'s Vite plugin and components', (template, plugin, components) => {
    const { dir, files } = newGame({ name: 'framed', template, into: fresh() })
    expect(readFileSync(join(dir, 'vite.config.ts'), 'utf8')).toContain(`ifloom({ vite: { plugins: [${plugin}]`)
    expect(files).toEqual(expect.arrayContaining([...components]))
  })

  it('gives the vanilla template the preset alone', () => {
    const { dir } = newGame({ name: 'plain', template: 'vanilla', into: fresh() })
    expect(readFileSync(join(dir, 'vite.config.ts'), 'utf8')).toContain('export default ifloom()')
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
