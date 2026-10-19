/**
 * What the editor keeps: projects, each one pack and the settings its preview
 * uses. Everything here is plain data, so a project goes into IndexedDB and a
 * pack goes out as JSON without any conversion.
 */
import { SCHEMA, upgradePack, type DataScene, type EntityDef, type KindDef, type Pack, type StatDef } from '@ifloom/engine'

/** A pack as the editor holds it: data scenes only, and the lists it edits always there. */
export type EditorPack = Omit<Pack, 'scenes' | 'stats' | 'entities' | 'prose'> & {
  scenes: DataScene[]
  stats: StatDef[]
  /** The things the pack declares, entities of any kind: the outline's Things. */
  entities: EntityDef[]
  prose: Record<string, string>
}

/** A key in the kv store the project uses. Keys are set by effects and need no declaration, so this is only a note. */
export type KvKey = { name: string; note: string }

/** The React UI's presets, as `@ifloom/react/themes/` names them, and its own look. */
export const THEMES = ['default', 'paper', 'terminal', 'studio', 'storybook'] as const
export type ThemeName = (typeof THEMES)[number]

/** The first-party plugins the preview can switch on, with the options each is made with if you don't change them. */
export const PLUGINS = {
  calendar: { label: 'Calendar', options: '{}' },
  places: { label: 'Places', options: '{}' },
  cast: { label: 'Cast', options: '{}' },
  quests: { label: 'Quests', options: '' },
  statuses: { label: 'Statuses', options: '' },
  achievements: { label: 'Achievements', options: '' },
  inventory: { label: 'Inventory', options: '' },
  shop: { label: 'Shop', options: '' },
  jobs: { label: 'Jobs', options: '' },
  generators: { label: 'Generators', options: '' },
  wardrobe: { label: 'Wardrobe', options: '' },
  messages: { label: 'Messages', options: '' },
  feed: { label: 'Feed', options: '' },
  devices: { label: 'Devices', options: '' },
  cheats: { label: 'Cheats', options: '' },
  unlocks: { label: 'Unlocks', options: '' },
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
  kv: KvKey[]
  preview: PreviewSettings
  /** When it was last changed, in milliseconds. */
  updated: number
}

/**
 * A project as an older editor kept it, brought up to this one: its pack
 * upgraded to `SCHEMA`, and its notes on variables as notes on kv keys. A
 * pack that can't be upgraded is left as it is, for the problems list to show.
 */
export function upgradeProject(stored: Project & { variables?: KvKey[] }): Project {
  const { variables, ...project } = stored
  const upgraded = project.pack.schema === SCHEMA ? undefined : upgradePack(project.pack)
  const pack = upgraded?.ok ? (upgraded.value as EditorPack) : project.pack
  return {
    ...project,
    kv: project.kv ?? variables ?? [],
    pack: { ...pack, entities: pack.entities ?? [] },
  }
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
  return { id, schema: SCHEMA, stats: [], entities: [], scenes: [], prose: {} }
}

export function defaultPreview(): PreviewSettings {
  return { theme: 'default', plugins: {}, start: null }
}

/** A new project: one scene with a line of prose, which `checkGame` passes. */
export function newProject(title = 'Untitled story'): Project {
  const pack = emptyPack(slug(title))
  pack.scenes.push(newScene('start'))
  pack.prose.start = 'The story starts here.'
  return { id: newId(), title, intro: 'start', pack, kv: [], preview: defaultPreview(), updated: Date.now() }
}

/** A data scene with its main text block, named by the scene id. */
export function newScene(id: string): DataScene {
  return { id, body: [{ text: id }], choices: [] }
}

export function newStat(id: string): StatDef {
  return { id, label: id.charAt(0).toUpperCase() + id.slice(1) }
}

/** The kind a thing is made of when its id doesn't say: `bun` is `item:bun`. */
export const THING_KIND = 'item'

/** A thing's reference, `kind:id`, from what "Add new…" was given: `bun` or `food:bun`. */
export function thingRef(given: string): string {
  return given.includes(':') ? given : `${THING_KIND}:${given}`
}

/** A new thing, from its reference: named after its id, of the kind the reference says. */
export function newThing(ref: string): EntityDef {
  const [of, id] = thingRef(ref).split(':')
  return { id, of, name: id.charAt(0).toUpperCase() + id.slice(1) }
}

/** A kind for the things the editor makes: unlisted, as what you hold is drawn from `view.held`. */
export function newKind(id: string): KindDef {
  const label = id.charAt(0).toUpperCase() + id.slice(1)
  return { id, label, listed: false }
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
    kinds: [{ id: 'item', label: 'Item', plural: 'Items', listed: false }],
    entities: [{ id: 'bun', of: 'item', name: 'Iced bun', desc: 'Still warm from the bakery stall.' }],
    scenes: [
      {
        id: 'market',
        title: 'The market',
        body: [{ text: 'market' }, { text: 'market.fiddler', when: { kv: 'heardBusker' } }],
        choices: [
          {
            id: 'buy',
            blocked: [{ when: { stat: 'coins', lt: 3 }, reason: 'You need 3p for a bun.' }],
            effects: [
              { kind: 'stat', stat: 'coins', by: -3 },
              { kind: 'entity', entity: 'item:bun', by: 1 },
            ],
          },
          { id: 'browse', effects: [{ kind: 'scene', from: 'market', otherwise: 'home' }] },
          { id: 'home', effects: [{ kind: 'scene', scene: 'home' }] },
        ],
      },
      {
        id: 'home',
        title: 'Home',
        body: [{ text: 'home' }, { text: 'home.bun', when: { entity: 'item:bun', at: 'you' } }],
        choices: [],
      },
      {
        id: 'market.busker',
        title: 'The busker',
        drawnFrom: ['market'],
        when: { not: { kv: 'heardBusker' } },
        body: [{ text: 'market.busker' }],
        choices: [
          {
            id: 'listen',
            effects: [
              { kind: 'kv', key: 'heardBusker', to: true },
              { kind: 'scene', scene: 'market' },
            ],
          },
        ],
      },
    ],
    prose: {
      market: 'Saturday, and the market is busy. The bakery stall has iced buns at 3p each.',
      'market.fiddler': 'The fiddler is still playing by the fountain.',
      'market#buy': 'Buy an iced bun',
      'market#browse': 'Wander the stalls',
      'market#home': 'Walk home',
      home: 'You let yourself in and put the kettle on.',
      'home.bun': 'The bun goes on a plate. It deserves a plate.',
      'market.busker': 'A woman with a fiddle is playing something quick by the fountain.\n\nBusker: "Any requests?"',
      'market.busker#listen': 'Stay for a tune',
    },
  }
  return {
    id: newId(),
    title: 'Market day',
    intro: 'market',
    pack,
    kv: [{ name: 'heardBusker', note: 'Set once you have listened to the busker.' }],
    preview: defaultPreview(),
    updated: Date.now(),
  }
}
