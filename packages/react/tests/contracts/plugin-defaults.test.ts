import { describe, expect, it } from 'vitest'
import * as ui from '../../src/index.ts'
import pkg from '../../package.json' with { type: 'json' }

/**
 * Every first-party plugin with something for the player has a default in the
 * React UI: a component a game gets without writing any UI, and a hook that
 * gives the same data and actions with no markup, for a game that draws its
 * own. A plugin "has something for the player" when it puts a slice in the
 * view (a `view` provider). The few that do and still want no UI are listed in
 * NO_UI with the reason.
 *
 * Nothing about a shop or a job board is drawn by itself: content opens them
 * (`openShop`, `openJobs`), so their default is a built-in panel by that
 * name, which `PanelHost` draws. `panel` names it.
 */
const DEFAULTS: Record<string, { component: string; hook: string; panel?: string }> = {
  calendar: { component: 'Clock', hook: 'useClock' },
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
  messages: { component: 'MessagesSection', hook: 'useMessages' },
  feed: { component: 'FeedSection', hook: 'useFeed' },
  devices: { component: 'DeviceButtons', hook: 'useDevices' },
  debug: { component: 'DebugCard', hook: 'useDebug' },
}

/** First-party plugins with no default, and why. */
const NO_UI: Record<string, string> = {
  generators: 'it makes entities for the game to use; there is nothing of its own for the player to see or press',
}

const SOURCES = import.meta.glob('../../../plugin-*/src/index.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Each first-party plugin: its id and whether it gives the view a slice. */
const PLUGINS = Object.entries(SOURCES).map(([path, source]) => {
  const id = /const ID = '([^']+)'/.exec(source)?.[1] ?? /definePlugin[^]*?\bid: '([^']+)'/.exec(source)?.[1]
  return { path, id: id ?? '', hasView: /^\s+view: /m.test(source) }
})

describe('the default UI for first-party plugins', () => {
  it('finds every plugin and its id', () => {
    expect(PLUGINS.length).toBeGreaterThanOrEqual(14)
    for (const plugin of PLUGINS) expect(plugin.id, plugin.path).not.toBe('')
  })

  it('has a default component and hook for each plugin with a player view, unless NO_UI says why not', () => {
    const missing = PLUGINS.filter((plugin) => plugin.hasView && !DEFAULTS[plugin.id] && !NO_UI[plugin.id]).map((plugin) => plugin.id)
    expect(missing).toEqual([])
  })

  it('lists each plugin once, and only plugins there are', () => {
    const ids = new Set(PLUGINS.map((plugin) => plugin.id))
    for (const id of [...Object.keys(DEFAULTS), ...Object.keys(NO_UI)]) expect(ids.has(id), id).toBe(true)
    for (const id of Object.keys(NO_UI)) expect(DEFAULTS[id], id).toBeUndefined()
    // A plugin listed with a default draws something, so it has a view to draw it from.
    for (const plugin of PLUGINS.filter((entry) => DEFAULTS[entry.id])) expect(plugin.hasView, plugin.id).toBe(true)
  })

  it('exports each one, the component replaceable by name and the hook a function', () => {
    const exported = ui as unknown as Record<string, { displayName?: string } | undefined>
    for (const [id, { component, hook }] of Object.entries(DEFAULTS)) {
      expect(typeof exported[component], `${id}: ${component}`).toBe('function')
      expect(exported[component]?.displayName, `${id}: ${component} is overridable`).toBe(component)
      expect(typeof exported[hook], `${id}: ${hook}`).toBe('function')
    }
  })

  it('draws the panels the plugins open by name, and only those plugins wait to be opened', () => {
    const sources = Object.fromEntries(PLUGINS.map((plugin) => [plugin.id, SOURCES[plugin.path]]))
    for (const [id, { panel }] of Object.entries(DEFAULTS)) {
      // A plugin that answers for a panel's `with` has its panel drawn by name, and is listed with it.
      const opens = /panelProblems:/.test(sources[id] ?? '')
      expect(Boolean(panel), `${id}: panel`).toBe(opens)
      if (panel) expect(typeof ui.BUILT_IN_PANELS[panel], `${id}: the ${panel} panel`).toBe('function')
    }
  })

  it('reads each plugin it has a default for as an optional peer, for its types only', () => {
    for (const id of Object.keys(DEFAULTS)) {
      const name = `@ifloom/plugin-${id}`
      expect(pkg.peerDependencies, name).toHaveProperty([name])
      expect(pkg.peerDependenciesMeta, name).toHaveProperty([name, 'optional'], true)
    }
  })
})
