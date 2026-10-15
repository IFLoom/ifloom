import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Plugin, PluginOption } from 'vite'
import { describe, expect, it } from 'vitest'
import { ifloom } from '../src/vite.ts'

/** A game folder whose package.json depends on these. */
function gameDir(dependencies: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'ifloom-preset-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'game', dependencies }))
  return dir
}

function names(plugins: PluginOption[] | undefined): string[] {
  return (plugins ?? []).flat(Infinity as 1).flatMap((plugin) => (plugin && typeof plugin === 'object' && 'name' in plugin ? [(plugin as Plugin).name] : []))
}

describe('the Vite preset', () => {
  it('adds React and Tailwind for a game on the React UI', () => {
    const config = ifloom({ vite: { root: gameDir({ '@ifloom/engine': '0.0.0', '@ifloom/react': '0.0.0' }) } })
    expect(names(config.plugins).some((name) => name.includes('react'))).toBe(true)
    expect(names(config.plugins).some((name) => name.includes('tailwind'))).toBe(true)
    expect(config.resolve?.dedupe).toEqual(['react', 'react-dom'])
  })

  it('adds neither for a game on the engine alone', () => {
    const config = ifloom({ vite: { root: gameDir({ '@ifloom/engine': '0.0.0' }) } })
    expect(names(config.plugins).some((name) => name.includes('react') || name.includes('tailwind'))).toBe(false)
    expect(config.resolve?.dedupe).toEqual([])
    expect(config.base).toBe('./')
  })

  it('lets the game say otherwise, and adds its own plugins last', () => {
    const own: Plugin = { name: 'my-framework' }
    const config = ifloom({ react: false, tailwind: true, vite: { root: gameDir({ '@ifloom/react': '0.0.0' }), plugins: [own] } })
    const listed = names(config.plugins)
    expect(listed.some((name) => name.includes('react'))).toBe(false)
    expect(listed.some((name) => name.includes('tailwind'))).toBe(true)
    expect(listed.at(-1)).toBe('my-framework')
  })
})
