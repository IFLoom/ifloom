import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, PluginOption } from 'vite'
import { describe, expect, it } from 'vitest'
import { ifloom } from '../src/vite.ts'
import { inCheckout, sourcePlugin } from '../src/source.ts'

function names(plugins: PluginOption[] | undefined): string[] {
  return (plugins ?? []).flat(Infinity as 1).flatMap((plugin) => (plugin && typeof plugin === 'object' && 'name' in plugin ? [(plugin as Plugin).name] : []))
}

describe('the Vite preset', () => {
  it('knows no framework: one HTML file with relative paths, its locked content, and nothing else', () => {
    const config = ifloom()
    expect(config.base).toBe('./')
    expect(names(config.plugins)).toEqual(['ifloom:source', 'ifloom:unlocks', 'vite:singlefile'])
    expect(config.resolve).toBeUndefined()
  })

  it("puts the game's own plugins first, and keeps the rest of its config", () => {
    const own: Plugin = { name: 'my-framework' }
    const config = ifloom({ vite: { plugins: [own], resolve: { dedupe: ['react'] } } })
    expect(names(config.plugins)).toEqual(['my-framework', 'ifloom:source', 'ifloom:unlocks', 'vite:singlefile'])
    expect(config.resolve?.dedupe).toEqual(['react'])
  })

  it('leaves the JS and CSS beside the page when asked', () => {
    expect(names(ifloom({ singleFile: false }).plugins)).toEqual(['ifloom:source', 'ifloom:unlocks'])
  })
})

describe('the source condition', () => {
  const checkout = fileURLToPath(new URL('../../../', import.meta.url))
  const conditions = (root: string) => {
    const hook = sourcePlugin().config as (config: {
      root: string
    }) => { resolve?: { conditions?: string[] }; ssr?: { resolve?: { conditions?: string[] } } } | undefined
    const made = hook({ root })
    return [made?.resolve?.conditions?.[0], made?.ssr?.resolve?.conditions?.[0]]
  }

  it("reads the packages' source for a game inside the checkout", () => {
    expect(inCheckout(join(checkout, 'examples/showcase'))).toBe(true)
    expect(conditions(join(checkout, 'games/my-story'))).toEqual(['ifloom-source', 'ifloom-source'])
  })

  it('leaves a game beside the checkout on the built packages', () => {
    expect(inCheckout(join(checkout, '../my-story'))).toBe(false)
    expect(conditions(join(checkout, '../my-story'))).toEqual([undefined, undefined])
  })
})
