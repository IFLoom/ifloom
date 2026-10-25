import { describe, expect, it } from 'vitest'
import type { PluginUi } from '../../src/index.ts'

/**
 * Every first-party plugin with something for the player ships its own React
 * UI, in its `/react` subpath (`@ifloom/plugin-shop/react`): a `<id>Ui` module
 * a game lists in `plugins`, a default component a game gets without writing
 * any UI, and a hook that gives the same data and actions with no markup, for
 * a game that draws its own. A plugin "has something for the player" when it
 * puts a slice in the view (a `view` provider). The few that do and still
 * want no UI are listed in NO_UI with the reason.
 *
 * Nothing about a shop or a job board is drawn by itself: content opens them
 * (`shop.open`, `jobs.open`), so their UI draws a panel by that name, which
 * `PanelHost` draws. `panel` names it.
 */
const DEFAULTS: Record<string, { component: string; hook: string; panel?: string }> = {
  calendar: { component: 'CalendarClock', hook: 'useCalendar' },
  places: { component: 'LocationCard', hook: 'usePlaces' },
  cast: { component: 'PeopleHere', hook: 'usePeople' },
  quests: { component: 'QuestLog', hook: 'useQuests' },
  statuses: { component: 'StatusList', hook: 'useStatuses' },
  achievements: { component: 'AchievementList', hook: 'useAchievements' },
  cheats: { component: 'CheatPanel', hook: 'useCheats' },
  unlocks: { component: 'UnlocksPanel', hook: 'useUnlocks' },
  shop: { component: 'ShopCounter', hook: 'useShop', panel: 'shop' },
  jobs: { component: 'JobBoard', hook: 'useJobs', panel: 'jobs' },
  wardrobe: { component: 'WardrobeCard', hook: 'useWardrobe' },
  inventory: { component: 'InventoryCard', hook: 'useInventory' },
  messages: { component: 'MessagesSection', hook: 'useMessages' },
  feed: { component: 'FeedSection', hook: 'useFeed' },
  devices: { component: 'DeviceButtons', hook: 'useDevices' },
  debug: { component: 'DebugCard', hook: 'useDebug' },
}

/** First-party plugins with no React UI, and why. */
const NO_UI: Record<string, string> = {
  generators: 'it makes entities for the game to use; there is nothing of its own for the player to see or press',
}

const SOURCES = import.meta.glob('../../../plugin-*/src/index.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const UIS = import.meta.glob('../../../plugin-*/src/react/index.tsx', { eager: true }) as Record<string, Record<string, unknown>>
const MANIFESTS = import.meta.glob('../../../plugin-*/package.json', { import: 'default', eager: true }) as Record<string, Manifest>

type Manifest = {
  exports: Record<string, unknown>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  devDependencies?: Record<string, string>
}

/** Each first-party plugin: its id, its folder, whether it gives the view a slice, and its React UI's exports if it has one. */
const PLUGINS = Object.entries(SOURCES).map(([path, source]) => {
  const dir = path.replace(/\/src\/index\.ts$/, '')
  const id = /const ID = '([^']+)'/.exec(source)?.[1] ?? /definePlugin[^]*?\bid: '([^']+)'/.exec(source)?.[1]
  return { dir, id: id ?? '', source, hasView: /^\s+view: /m.test(source), ui: UIS[`${dir}/src/react/index.tsx`], manifest: MANIFESTS[`${dir}/package.json`] }
})

describe('the React UI for first-party plugins', () => {
  it('finds every plugin and its id', () => {
    expect(PLUGINS.length).toBeGreaterThanOrEqual(14)
    for (const plugin of PLUGINS) expect(plugin.id, plugin.dir).not.toBe('')
  })

  it('has a default for each plugin with a player view, unless NO_UI says why not', () => {
    const missing = PLUGINS.filter((plugin) => plugin.hasView && !DEFAULTS[plugin.id] && !NO_UI[plugin.id]).map((plugin) => plugin.id)
    expect(missing).toEqual([])
  })

  it('lists each plugin once, and only plugins there are', () => {
    const ids = new Set(PLUGINS.map((plugin) => plugin.id))
    for (const id of [...Object.keys(DEFAULTS), ...Object.keys(NO_UI)]) expect(ids.has(id), id).toBe(true)
    for (const id of Object.keys(NO_UI)) expect(DEFAULTS[id], id).toBeUndefined()
    // A plugin listed with a default draws something, so it has a view to draw it from.
    for (const plugin of PLUGINS.filter((entry) => DEFAULTS[entry.id])) expect(plugin.hasView, plugin.id).toBe(true)
    // One with no UI has no /react.
    for (const plugin of PLUGINS.filter((entry) => NO_UI[entry.id])) expect(plugin.ui, plugin.id).toBeUndefined()
  })

  it('exports from each /react its <id>Ui, the component replaceable by name and the hook a function', () => {
    for (const plugin of PLUGINS.filter((entry) => DEFAULTS[entry.id])) {
      const { component, hook } = DEFAULTS[plugin.id]
      const ui = plugin.ui
      expect(ui, `${plugin.id} has src/react/index.tsx`).toBeDefined()
      const module = ui![`${plugin.id}Ui`] as PluginUi | undefined
      expect(module?.id, `${plugin.id}Ui names its plugin`).toBe(plugin.id)
      const exported = ui![component] as { displayName?: string } | undefined
      expect(typeof exported, `${plugin.id}: ${component}`).toBe('function')
      expect(exported?.displayName, `${plugin.id}: ${component} is overridable`).toBe(component)
      expect(typeof ui![hook], `${plugin.id}: ${hook}`).toBe('function')
    }
  })

  it('draws the panels the plugins open by name, and only those plugins wait to be opened', () => {
    for (const plugin of PLUGINS.filter((entry) => DEFAULTS[entry.id])) {
      const { panel } = DEFAULTS[plugin.id]
      // A plugin that answers for a panel's `with` has its panel drawn by name, and is listed with it.
      expect(Boolean(panel), `${plugin.id}: panel`).toBe(plugin.source.includes('panels: (panel'))
      if (panel) expect(typeof (plugin.ui![`${plugin.id}Ui`] as PluginUi).panels?.[panel]?.component, `${plugin.id}: the ${panel} panel`).toBe('function')
    }
  })

  it('publishes it as the /react subpath, with React and @ifloom/react as optional peers', () => {
    for (const plugin of PLUGINS.filter((entry) => DEFAULTS[entry.id])) {
      const manifest = plugin.manifest
      expect(manifest.exports['./react'], `${plugin.id}: ./react`).toMatchObject({ 'ifloom-source': './src/react/index.tsx' })
      for (const name of ['@ifloom/react', 'react', 'react-dom']) {
        expect(manifest.peerDependencies, `${plugin.id}: ${name}`).toHaveProperty([name])
        expect(manifest.peerDependenciesMeta, `${plugin.id}: ${name}`).toHaveProperty([name, 'optional'], true)
      }
      expect(manifest.devDependencies, `${plugin.id}: @ifloom/react for the workspace`).toHaveProperty(['@ifloom/react'])
    }
  })
})
