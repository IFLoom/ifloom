import type { Plugin } from '../../src/plugin.ts'

/**
 * Every first-party plugin, found by glob: each `packages/plugin-<name>` with a
 * `package.json`. A plugin `scripts/new-plugin.ts` makes is here with nothing
 * to add, so the contracts that read this list hold it too.
 */
const PACKAGES = import.meta.glob('../../../plugin-*/package.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Each plugin's main entry, as a module. */
const ENTRIES = import.meta.glob('../../../plugin-*/src/index.ts', { eager: true }) as Record<string, Record<string, unknown>>

/** `bus-stops` → `busStops`: the factory a plugin's main entry exports. */
const camel = (name: string) => name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())

/** Each first-party plugin's folder name, `plugin-<name>` without `plugin-`, sorted. */
export const PLUGIN_NAMES: string[] = Object.keys(PACKAGES)
  .map((path) =>
    path
      .split('/')
      .at(-2)!
      .replace(/^plugin-/, ''),
  )
  .sort()

/** The factory each plugin's main entry exports under its camel-cased name, or undefined where it doesn't. */
export function factoryOf(name: string): ((...args: never[]) => Plugin) | undefined {
  const factory = ENTRIES[`../../../plugin-${name}/src/index.ts`]?.[camel(name)]
  return typeof factory === 'function' ? (factory as (...args: never[]) => Plugin) : undefined
}

/** Every first-party plugin, made with its factory and no options. Throws on a package with no factory, which the packages contract reports. */
export function firstPartyPlugins(): Plugin[] {
  return PLUGIN_NAMES.map((name) => {
    const factory = factoryOf(name) as (() => Plugin) | undefined
    if (!factory) throw new Error(`plugin-${name}'s src/index.ts exports no factory named ${camel(name)}`)
    return factory()
  })
}
