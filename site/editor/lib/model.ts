/**
 * What the editor keeps: projects, each one pack and the settings its preview
 * uses. Everything here is plain data, so a project goes into IndexedDB and a
 * pack goes out as JSON without any conversion.
 */
import { SCHEMA, type DataScene, type ItemDef, type Pack, type StatDef } from '@ifloom/engine'

/** A pack as the editor holds it: data scenes only, and the lists it edits always there. */
export type EditorPack = Omit<Pack, 'scenes' | 'stats' | 'items' | 'prose'> & {
  scenes: DataScene[]
  stats: StatDef[]
  items: ItemDef[]
  prose: Record<string, string>
}

/** A variable the project uses. Variables are set by effects and need no declaration, so this is only a note. */
export type Variable = { name: string; note: string }

/** The React UI's presets, as `@ifloom/react/themes/` names them, and its own look. */
export const THEMES = ['default', 'paper', 'terminal', 'studio', 'storybook'] as const
export type ThemeName = (typeof THEMES)[number]

/** The first-party plugins the preview can switch on, with the options each is made with if you don't change them. */
export const PLUGINS = {
  calendar: { label: 'Calendar', options: '{}' },
  places: { label: 'Places', options: '{}' },
  cast: { label: 'Cast', options: '{}' },
  quests: { label: 'Quests', options: '' },
  effects: { label: 'Timed effects', options: '' },
  achievements: { label: 'Achievements', options: '' },
  shop: { label: 'Shop', options: '' },
  jobs: { label: 'Jobs', options: '' },
  generators: { label: 'Generators', options: '' },
  wardrobe: { label: 'Wardrobe', options: '{ "slots": [] }' },
  messages: { label: 'Messages', options: '{ "channels": [] }' },
  feed: { label: 'Feed', options: '{ "feeds": [] }' },
  devices: { label: 'Devices', options: '{ "devices": [] }' },
  debug: { label: 'Debug', options: '' },
} as const satisfies Record<string, { label: string; options: string }>
export type PluginId = keyof typeof PLUGINS
export const PLUGIN_IDS = Object.keys(PLUGINS) as PluginId[]

/** A plugin in the preview: on or off, and the JSON its factory is called with (empty for a plugin that takes none). */
export type PluginSetting = { on: boolean; options: string }

export type PreviewSettings = {
  theme: ThemeName
  plugins: Partial<Record<PluginId, PluginSetting>>
  /** Where the preview starts: a scene id, or null for the intro scene. */
  start: string | null
}

export type Project = {
  id: string
  /** The game's title, shown in the switcher and the preview. */
  title: string
  /** The scene a new game opens on. */
  intro: string | null
  pack: EditorPack
  variables: Variable[]
  preview: PreviewSettings
  /** When it was last changed, in milliseconds. */
  updated: number
}

/** A fresh id for a project. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** A pack id from a title: `The Letter` gives `the-letter`. */
export function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'story'
  )
}

export function emptyPack(id: string): EditorPack {
  return { id, schema: SCHEMA, stats: [], items: [], scenes: [], prose: {} }
}

export function defaultPreview(): PreviewSettings {
  return { theme: 'default', plugins: {}, start: null }
}

/** A new project: one scene with a line of prose, which `checkGame` passes. */
export function newProject(title = 'Untitled story'): Project {
  const pack = emptyPack(slug(title))
  pack.scenes.push(newScene('start'))
  pack.prose.start = 'The story starts here.'
  return { id: newId(), title, intro: 'start', pack, variables: [], preview: defaultPreview(), updated: Date.now() }
}

/** A data scene with its main text block, named by the scene id. */
export function newScene(id: string): DataScene {
  return { id, body: [{ text: id }], choices: [] }
}

export function newStat(id: string): StatDef {
  return { id, label: id.charAt(0).toUpperCase() + id.slice(1) }
}

export function newItem(id: string): ItemDef {
  return { id, name: id.charAt(0).toUpperCase() + id.slice(1), desc: '', kind: 'stuff' }
}

/** A copy of a project under a new id and title. */
export function duplicateProject(project: Project, title = `${project.title} (copy)`): Project {
  return { ...structuredClone(project), id: newId(), title, updated: Date.now() }
}

/**
 * A small sample: a market with a stat, a choice that costs coins and is
 * blocked when you're short, a storylet drawn while you browse, and a walk home.
 */
export function sampleProject(): Project {
  const pack: EditorPack = {
    id: 'market-day',
    schema: SCHEMA,
    stats: [{ id: 'coins', label: 'Coins', start: 5, max: 999, format: '{n}p', spendable: true }],
    items: [{ id: 'bun', name: 'Iced bun', desc: 'Still warm from the bakery stall.', kind: 'stuff' }],
    scenes: [
      {
        id: 'market',
        title: 'The market',
        body: [{ text: 'market' }, { text: 'market/busker', when: { flag: 'heardBusker' } }],
        choices: [
          {
            id: 'buy',
            blocked: [{ when: { stat: 'coins', lt: 3 }, reason: 'You need 3p for a bun.' }],
            effects: [
              { kind: 'stat', key: 'coins', by: -3 },
              { kind: 'item', id: 'bun', by: 1 },
            ],
          },
          { id: 'browse', effects: [{ kind: 'scene', from: 'market', otherwise: 'home' }] },
          { id: 'home', effects: [{ kind: 'scene', id: 'home' }] },
        ],
      },
      {
        id: 'home',
        title: 'Home',
        body: [{ text: 'home' }, { text: 'home/bun', when: { has: 'bun' } }],
        choices: [],
      },
      {
        id: 'market.busker',
        title: 'The busker',
        drawnFrom: ['market'],
        when: { not: { flag: 'heardBusker' } },
        body: [{ text: 'market.busker' }],
        choices: [{ id: 'listen', effects: [{ kind: 'flag', key: 'heardBusker', value: true }, { kind: 'scene', id: 'market' }] }],
      },
    ],
    prose: {
      market: 'Saturday, and the market is busy. The bakery stall has iced buns at 3p each.',
      'market/busker': 'The fiddler is still playing by the fountain.',
      'market#buy': 'Buy an iced bun',
      'market#browse': 'Wander the stalls',
      'market#home': 'Walk home',
      home: 'You let yourself in and put the kettle on.',
      'home/bun': 'The bun goes on a plate. It deserves a plate.',
      'market.busker': 'A woman with a fiddle is playing something quick by the fountain.\n\nBusker: "Any requests?"',
      'market.busker#listen': 'Stay for a tune',
    },
  }
  return {
    id: newId(),
    title: 'Market day',
    intro: 'market',
    pack,
    variables: [{ name: 'heardBusker', note: 'Set once you have listened to the busker.' }],
    preview: defaultPreview(),
    updated: Date.now(),
  }
}
