import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEMPLATES, THEMES, newGame } from '../src/index.ts'

const fresh = () => join(mkdtempSync(join(tmpdir(), 'ifloom-new-')), 'game')

describe('ifloom new', () => {
  it.each(TEMPLATES)('makes a game from the %s template, named for it', (template) => {
    const { dir, files } = newGame({ name: 'my-story', template, into: fresh() })
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-story')
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).every((dep) => dep.startsWith('@ifloom/'))).toBe(true)
    expect(files).toEqual(expect.arrayContaining(['src/game.ts', 'index.html', 'AGENTS.md', '.gitignore', 'vite.config.ts', 'tsconfig.json']))
    expect(files.some((file) => file.startsWith('tests/') || file.startsWith('dist/') || file.startsWith('node_modules/'))).toBe(false)
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('# My Story')
  })

  it('fills in the blank game with its name and title', () => {
    const { dir } = newGame({ name: 'the-door', into: fresh() })
    expect(readFileSync(join(dir, 'src/game.ts'), 'utf8')).toContain("{ id: 'the-door', title: 'The Door', introScene: 'start' }")
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain('<title>The Door</title>')
  })

  it('starts a game with the theme asked for, a random one for a blank game, and an example with its own', () => {
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

  it('uses no React in the vanilla template', () => {
    const { dir } = newGame({ name: 'plain', template: 'vanilla', into: fresh() })
    expect(readFileSync(join(dir, 'package.json'), 'utf8')).not.toContain('@ifloom/react')
    expect(readFileSync(join(dir, 'src/main.ts'), 'utf8')).not.toContain('react')
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
