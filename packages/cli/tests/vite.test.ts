import type { Plugin, PluginOption } from 'vite'
import { describe, expect, it } from 'vitest'
import { ifloom } from '../src/vite.ts'

function names(plugins: PluginOption[] | undefined): string[] {
  return (plugins ?? []).flat(Infinity as 1).flatMap((plugin) => (plugin && typeof plugin === 'object' && 'name' in plugin ? [(plugin as Plugin).name] : []))
}

describe('the Vite preset', () => {
  it('knows no framework: one HTML file with relative paths, and nothing else', () => {
    const config = ifloom()
    expect(config.base).toBe('./')
    expect(names(config.plugins)).toEqual(['vite:singlefile'])
    expect(config.resolve).toBeUndefined()
  })

  it("puts the game's own plugins first, and keeps the rest of its config", () => {
    const own: Plugin = { name: 'my-framework' }
    const config = ifloom({ vite: { plugins: [own], resolve: { dedupe: ['react'] } } })
    expect(names(config.plugins)).toEqual(['my-framework', 'vite:singlefile'])
    expect(config.resolve?.dedupe).toEqual(['react'])
  })

  it('leaves the JS and CSS beside the page when asked', () => {
    expect(names(ifloom({ singleFile: false }).plugins)).toEqual([])
  })
})
