/**
 * @ifloom/plugin-devices — a phone, a laptop, a desk drawer: devices with apps
 * the game declares, badges, and opening one without leaving the room.
 *
 * An app is not a place. Opening it does not move the player or pass time;
 * what is done inside it costs what each action says. Locks still apply, so
 * "no phone at work" is a lock on `devices/open`.
 *
 * An app is built from sections, each one a thing the engine already has:
 * prose, actions (the same buttons a room has, with prices and reasons), a list
 * (a collection, or the people the player can call), another plugin's view (a
 * messages channel, a feed), or a panel the game draws itself.
 */
import {
  customPanel,
  customValue,
  defaultRuntime,
  definePlugin,
  holds,
  pluginQuery,
  renderAction,
  renderScene,
  say,
  whyNot,
  type Block,
  type Blocked,
  type Command,
  type Condition,
  type Game,
  type GameState,
  type ActionDef,
  type PluginProblem,
  type Reference,
  type RenderedChoice,
} from '@ifloom/engine'

/** One of the cast's contacts, as `cast/contacts` answers: read by shape, so devices need no cast. */
type Contact = { id: string; name: string; role: string | null; portrait: string; command: Command }

export type DeviceDef = {
  id: string
  name: string
  /** How the UI draws it: `'phone'`, `'laptop'`, or the game's own. */
  frame?: string
  /** Offer it from the sidebar. */
  sidebar?: boolean
  /** A picture behind the home screen. */
  wallpaper?: string
}

/** What fills an app. */
export type Section =
  /** Words, as prose blocks. */
  | { prose: Block[] }
  /** Buttons, the same as a room's. */
  | { actions: ActionDef[] }
  /** A collection's entries, newest first. */
  | { collection: string }
  /** The people the player can call and has met (the cast plugin's `cast/contacts`), with a Call button each. */
  | { contacts: true }
  /** Another plugin's view, for the UI to draw with that plugin's renderer: a channel, a feed. */
  | { plugin: string; with?: Record<string, unknown> }
  /** A panel the game draws itself, with the data its custom panel function returns. */
  | { panel: string }

export type AppDef = {
  id: string
  name: string
  /** A name the UI maps to a picture. */
  icon: string
  /** The device it is on. */
  on: string
  /** Installed: off the home screen until this holds. */
  when?: Condition
  /** On the home screen but greyed out while one holds, with its reason; with `hide`, off the home screen. */
  blocked?: Blocked[]
  /** A count from a value (`messages/unread-texts`), or a dot while a condition holds. */
  badge?: { count: string } | { when: Condition }
  sections: Section[]
}

export type DevicesOptions = {
  devices: DeviceDef[]
  /** Apps built into the game. Packs can add more in `data.devices.apps`. */
  apps?: AppDef[]
}

/** What the plugin keeps in a save: the app open on each device. */
export type DevicesState = { open: Record<string, string | null> }

export type SectionView =
  | { kind: 'prose'; text: string }
  | { kind: 'actions'; actions: RenderedChoice[] }
  | {
      kind: 'list'
      entries: { id: string; title: string; text: string; image: string | null; actions: RenderedChoice[] }[]
    }
  | { kind: 'plugin'; plugin: string; with: Record<string, unknown> }
  | { kind: 'panel'; panel: string; data: unknown }

export type AppView = {
  id: string
  name: string
  icon: string
  /** A count, a dot (`true`), or nothing (`0`). */
  badge: number | boolean
  /** Why it can't be opened now, if it can't. */
  disabled?: string
  command: Command
  /** Filled in for the open app only. */
  sections: SectionView[]
}

export type DeviceView = {
  id: string
  name: string
  frame: string
  sidebar: boolean
  wallpaper: string | null
  /** Every count, plus one for each dot: what the sidebar button shows. */
  badge: number
  /** Installed apps, in order. */
  apps: AppView[]
  open: AppView | null
}

export type DevicesView = { devices: DeviceView[] }

const ID = 'devices'

/**
 * The plugin. Add it to the game's `plugins` with the devices the game has,
 * and the apps on them.
 */
export function devices(options: DevicesOptions) {
  const deviceIds = new Set(options.devices.map((device) => device.id))

  function apps(game: Game): AppDef[] {
    const byId = new Map<string, AppDef>()
    for (const app of options.apps ?? []) byId.set(app.id, app)
    for (const app of (game.data?.[ID]?.apps ?? []) as AppDef[]) byId.set(app.id, app)
    return [...byId.values()]
  }

  function appById(game: Game, id: string): AppDef | undefined {
    return apps(game).find((app) => app.id === id)
  }

  function refusal(state: GameState, game: Game, app: AppDef | undefined): string | undefined {
    if (!app) return say(game, 'devices/noSuchApp')
    if (!holds(state, app.when, game)) return say(game, 'devices/notInstalled')
    return app.blocked?.find((entry) => holds(state, entry.when, game))?.reason
  }

  /** Is something left off the screen by one of its `blocked` entries that hides? */
  function hides(state: GameState, game: Game, blocked: readonly Blocked[] | undefined): boolean {
    return Boolean(blocked?.some((entry) => entry.hide && holds(state, entry.when, game)))
  }

  function badgeOf(state: GameState, game: Game, app: AppDef): number | boolean {
    if (!app.badge) return 0
    if ('when' in app.badge) return holds(state, app.badge.when, game)
    const value = Number(customValue(game, app.badge.count)?.(state) ?? 0)
    return Number.isFinite(value) ? value : 0
  }

  function sectionView(state: GameState, game: Game, app: AppDef, section: Section, index: number): SectionView {
    if ('prose' in section) {
      const rendered = renderScene({ id: `${app.id}.${index}`, body: section.prose, choices: [] }, state, defaultRuntime(game))
      return { kind: 'prose', text: rendered.body ?? '' }
    }
    if ('actions' in section) {
      return {
        kind: 'actions',
        actions: section.actions.filter((action) => holds(state, action.when, game) && !hides(state, game, action.blocked)).map((action) => renderAction(state, game, action)),
      }
    }
    if ('collection' in section) {
      const words = (key?: string) => (key ? (game.prose?.line(key, state) ?? '') : '')
      return {
        kind: 'list',
        entries: [...(state.collections?.[section.collection] ?? [])].reverse().map((entry) => ({
          id: entry.id,
          title: entry.title ?? '',
          text: words(entry.text),
          image: entry.image ?? null,
          actions: [],
        })),
      }
    }
    if ('contacts' in section) {
      return {
        kind: 'list',
        // The cast's, asked by name: everyone met who can be called. None without the cast.
        entries: ((pluginQuery(game, 'cast/contacts')?.(state) ?? []) as Contact[]).map((contact) => ({
          id: contact.id,
          title: contact.name,
          text: contact.role ?? '',
          image: contact.portrait,
          actions: [renderAction(state, game, { id: `call-${contact.id}`, label: say(game, 'devices/call'), command: contact.command })],
        })),
      }
    }
    if ('plugin' in section) return { kind: 'plugin', plugin: section.plugin, with: section.with ?? {} }
    return { kind: 'panel', panel: section.panel, data: customPanel(game, section.panel)?.(state) ?? null }
  }

  function appView(state: GameState, game: Game, app: AppDef, open: boolean): AppView {
    return {
      id: app.id,
      name: app.name,
      icon: app.icon,
      badge: badgeOf(state, game, app),
      // The same answer opening it gets: the app's own `blocked`, and any lock on `devices/open`.
      disabled: whyNot(state, game, openApp(app.id)),
      command: openApp(app.id),
      sections: open ? app.sections.map((section, index) => sectionView(state, game, app, section, index)) : [],
    }
  }

  return definePlugin<DevicesState>({
    id: ID,
    version: 1,
    // The contacts section lists the cast's characters when the game has the cast.
    cooperates: ['cast'],
    strings: {
      noSuchApp: 'There is no such app.',
      notInstalled: 'That is not installed.',
      noSuchDevice: 'There is no such device.',
      call: 'Call',
    },
    start: () => ({ open: Object.fromEntries(options.devices.map((device) => [device.id, null])) }),
    conditions: {
      /** `{ custom: 'devices/open', with: { app } }`: that app is open; with `device` instead, anything is. */
      open: (_state, args, { slice }) =>
        args.app !== undefined
          ? Object.values(slice.open).includes(String(args.app))
          : Boolean(slice.open[String(args.device)]),
    },
    commands: {
      /** `{ type: 'custom', name: 'devices/open', with: { id } }`: open the app `id`. Free: no time passes. */
      open: {
        whyNot: (state, args, { game }) => refusal(state, game, appById(game, String(args.id ?? ''))),
        run: (_state, args, { slice, set, game }) => {
          const app = appById(game, String(args.id))!
          return set({ ...slice, open: { ...slice.open, [app.on]: app.id } })
        },
      },
      /** `{ type: 'custom', name: 'devices/close', with: { id } }`: the device `id` back to its home screen. */
      close: {
        whyNot: (_state, args, { game }) => (deviceIds.has(String(args.id ?? '')) ? undefined : say(game, 'devices/noSuchDevice')),
        run: (_state, args, { slice, set }) => set({ ...slice, open: { ...slice.open, [String(args.id)]: null } }),
      },
    },
    hooks: {
      // An app that could not be opened now — not installed, blocked, or a lock on
      // the device (no phone at work) — closes, so its buttons are not left live.
      after: (_before, after, { slice, set, game }) => {
        let open = slice.open
        for (const [device, id] of Object.entries(slice.open)) {
          if (id && whyNot(after, game, openApp(id))) open = { ...open, [device]: null }
        }
        return open === slice.open ? after : set({ ...slice, open })
      },
    },
    view: (state, { slice, game }): DevicesView => ({
      devices: options.devices.map((device): DeviceView => {
        const installed = apps(game).filter((app) => app.on === device.id && holds(state, app.when, game) && !hides(state, game, app.blocked))
        const shown = installed.map((app) => appView(state, game, app, false))
        const openId = slice.open[device.id] ?? null
        const openApp = installed.find((app) => app.id === openId)
        return {
          id: device.id,
          name: device.name,
          frame: device.frame ?? device.id,
          sidebar: Boolean(device.sidebar),
          wallpaper: device.wallpaper ?? null,
          badge: shown.reduce((sum, app) => sum + (typeof app.badge === 'number' ? app.badge : app.badge ? 1 : 0), 0),
          apps: shown,
          open: openApp ? appView(state, game, openApp, true) : null,
        }
      }),
    }),
    references: {
      content: (game) =>
        apps(game).map((app) => ({
          list: 'apps',
          id: app.id,
          refs: [
            { when: app.when },
            ...(app.blocked ?? []).map((entry) => ({ when: entry.when })),
            ...(app.badge && 'count' in app.badge ? [{ value: app.badge.count }] : []),
            ...(app.badge && 'when' in app.badge ? [{ when: app.badge.when }] : []),
            ...app.sections.flatMap((section): Reference[] => {
              if ('collection' in section) return [{ collection: section.collection }]
              if ('panel' in section) return [{ panel: section.panel }]
              if ('prose' in section) return [{ blocks: section.prose }]
              if ('actions' in section) {
                return section.actions.map((action) => ({
                  within: `action ${action.id}`,
                  refs: [{ when: action.when }, ...(action.blocked ?? []).map((entry) => ({ when: entry.when })), { command: action.command }],
                }))
              }
              return []
            }),
          ],
        })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const pluginIds = new Set((game.plugins ?? []).map((plugin) => plugin.id))
      for (const app of apps(game)) {
        const say = (what: string) => problems.push({ list: 'apps', id: app.id, what })
        if (!deviceIds.has(app.on)) say(`no device called "${app.on}"`)
        for (const section of app.sections) {
          if ('plugin' in section && !pluginIds.has(section.plugin)) say(`the game has no plugin named "${section.plugin}"`)
        }
      }
      return problems
    },
  })
}

/** A command: open this app. */
export const openApp = (app: string): Command => ({ type: 'custom', name: 'devices/open', with: { id: app } })
/** A command: back to this device's home screen. */
export const closeApp = (device: string): Command => ({ type: 'custom', name: 'devices/close', with: { id: device } })
/** A condition: this app is open. */
export const appOpen = (app: string): Condition => ({ custom: 'devices/open', with: { app } })
