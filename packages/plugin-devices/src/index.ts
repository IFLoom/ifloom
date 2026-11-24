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
 * (the things of a kind you hold, or the people the player can call), another plugin's view (a
 * messages channel, a feed), or a panel the UI draws by name.
 */
import {
  reasonOf,
  actionReferences,
  artSrc,
  amountOf,
  commandOf,
  definePlugin,
  entityDescription,
  entityImage,
  entityName,
  heldBy,
  holds,
  parseRef,
  pluginQuery,
  renderAction,
  stringOf,
  whyNot,
  YOU,
  type Block,
  type Blocked,
  type Command,
  type CommandRef,
  type DefinedPlugin,
  type Condition,
  type Game,
  type GameState,
  type ActionDef,
  type PluginContext,
  type PluginProblem,
  type Reference,
  type SceneBeat,
  type RenderedChoice,
  type Amount,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

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
  /** Words, as a scene's body is written: `{ blocks: [text('…'), { prose: 'bank.balance' }] }`. */
  | { blocks: Block[] }
  /**
   * Buttons, the same as a room's. One with a cost or effects is done as
   * `{ type: 'action', id: 'devices/<id>' }`, so give each an id no other app's action has.
   */
  | { actions: ActionDef[] }
  /**
   * The things of a kind a holder holds, newest first: `{ things: { of: 'photo' } }`
   * for the photos you have. `at` is `'you'` if left out.
   */
  | { things: { of: string; at?: string } }
  /** The people the player can call and has met (the cast plugin's `cast/contacts`), with a Call button each. */
  | { contacts: true }
  /** Another plugin's view, for the UI to draw with that plugin's renderer: a channel, a feed. */
  | { plugin: string; with?: Record<string, unknown> }
  /** A panel the UI draws by name, as one the `panel` effect opens is, with what it is opened with. */
  | { panel: string; with?: Record<string, unknown> }

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
  /**
   * A count, as an `Amount`: a value asked with its arguments
   * (`{ value: 'messages/unread', with: { channel: 'texts' } }`), a stat or a
   * kv key's number. Or a dot while a condition holds (`{ when }`).
   */
  badge?: Amount | { when: Condition }
  sections: Section[]
}

/**
 * What the plugin keeps in a save: each device the player has out, by id,
 * with the app open on it, or null on its home screen. A device not in
 * `shown` is put away. So every UI draws the same thing.
 */
export type DevicesState = { shown: Record<string, string | null> }

export type SectionView =
  /** Words: the section's blocks as beats, drawn as a scene's are, and their words as text, for a UI that draws no beats. */
  | { type: 'prose'; text: string; beats: SceneBeat[] }
  | { type: 'actions'; actions: RenderedChoice[] }
  | {
      type: 'list'
      entries: { id: string; title: string; text: string; image: string | null; actions: RenderedChoice[] }[]
    }
  | { type: 'plugin'; plugin: string; with: Record<string, unknown> }
  | { type: 'panel'; panel: string; with: Record<string, unknown> }

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
  /** Out: on its home screen, or on an app. A UI draws a device that's shown, and none that isn't. */
  shown: boolean
  /** The app open on it while it's shown, or null on its home screen or put away. */
  open: AppView | null
  /** The button that shows it on its home screen, from put away or from an app (the `devices/home` string, `Home`). */
  home: RenderedChoice
  /** The button that puts it away (the `devices/close` string, `Close`), or null while it isn't shown. */
  close: RenderedChoice | null
}

export type DevicesView = { devices: DeviceView[] }

/**
 * What content writes for each of the plugin's calls, its queries' answers
 * and its view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry {
    'devices/open': { app: string } | { device: string }
  }
  interface CommandRegistry {
    'devices/open': { id: string }
    'devices/home': { id: string }
    'devices/close': { id: string }
  }
  interface ViewRegistry {
    devices: DevicesView
  }
}

const ID = 'devices'

/** The game's devices: `data.devices.devices`, from its packs. */
export function devicesOf(game: Game): DeviceDef[] {
  return (game.data?.[ID]?.devices ?? []) as DeviceDef[]
}

/** The game's apps, on every device: `data.devices.apps`, from its packs. */
export function appsOf(game: Game): AppDef[] {
  return (game.data?.[ID]?.apps ?? []) as AppDef[]
}

/**
 * The plugin. Add it to the game's `plugins`, and put the devices and the
 * apps on them in a pack's `data.devices.devices` and `data.devices.apps`, so
 * a mod can add an app or a device.
 */
function devicesPlugin(): DefinedPlugin<DevicesState, DevicesView> {
  const apps = appsOf
  const known = (game: Game, id: string) => devicesOf(game).some((device) => device.id === id)

  function appById(game: Game, id: string): AppDef | undefined {
    return apps(game).find((app) => app.id === id)
  }

  function refusal(state: GameState, game: Game, app: AppDef | undefined): string | undefined {
    if (!app) return stringOf(game, 'devices/noSuchApp')
    if (!holds(state, game, app.when)) return stringOf(game, 'devices/notInstalled')
    const blocked = app.blocked?.find((entry) => holds(state, game, entry.when))
    return blocked ? reasonOf(game, blocked.reason) : undefined
  }

  /** Is something left off the screen by one of its `blocked` entries that hides? */
  function hides(state: GameState, game: Game, blocked: readonly Blocked[] | undefined): boolean {
    return Boolean(blocked?.some((entry) => entry.hide && holds(state, game, entry.when)))
  }

  function badgeOf(state: GameState, game: Game, app: AppDef): number | boolean {
    if (app.badge === undefined) return 0
    if (typeof app.badge === 'object' && 'when' in app.badge) return holds(state, game, app.badge.when)
    return amountOf(state, game, app.badge)
  }

  function sectionView(state: GameState, context: PluginContext<DevicesState>, app: AppDef, section: Section, index: number): SectionView {
    const { game } = context
    if ('blocks' in section) {
      const beats = context.beats(section.blocks, `${app.id}.${index}`)
      return { type: 'prose', text: beats.flatMap((beat) => ('text' in beat ? [beat.text] : [])).join('\n\n'), beats }
    }
    if ('actions' in section) {
      return {
        type: 'actions',
        actions: section.actions
          .filter((action) => holds(state, game, action.when) && !hides(state, game, action.blocked))
          .map((action) => renderAction(state, game, action, ID)),
      }
    }
    if ('things' in section) {
      const { of, at = YOU } = section.things
      return {
        type: 'list',
        entries: heldBy(state, game, at)
          .filter(({ ref }) => parseRef(ref)?.kind === of)
          .reverse()
          .map(({ ref }) => {
            const image = entityImage(state, game, ref)
            return {
              id: ref,
              title: entityName(state, game, ref),
              text: entityDescription(state, game, ref) ?? '',
              image: image ? artSrc(image) : null,
              actions: [],
            }
          }),
      }
    }
    if ('contacts' in section) {
      return {
        type: 'list',
        // The cast's, asked by name: everyone met who can be called. None without the cast.
        entries: (pluginQuery(game, 'cast/contacts')?.(state) ?? []).map((contact) => ({
          id: contact.id,
          title: contact.name,
          text: contact.description ?? '',
          image: contact.portrait,
          actions: [renderAction(state, game, { id: `call-${contact.id}`, label: stringOf(game, 'devices/call'), command: contact.command })],
        })),
      }
    }
    if ('plugin' in section) return { type: 'plugin', plugin: section.plugin, with: section.with ?? {} }
    return { type: 'panel', panel: section.panel, with: { ...section.with } }
  }

  function appView(state: GameState, context: PluginContext<DevicesState>, app: AppDef, open: boolean): AppView {
    const { game } = context
    return {
      id: app.id,
      name: app.name,
      icon: app.icon,
      badge: badgeOf(state, game, app),
      // The same answer opening it gets: the app's own `blocked`, and any lock on `devices/open`.
      disabled: whyNot(state, game, openApp(app.id)),
      command: commandOf(openApp(app.id)),
      sections: open ? app.sections.map((section, index) => sectionView(state, context, app, section, index)) : [],
    }
  }

  return definePlugin<DevicesState, DevicesView>({
    id: ID,
    version: 2,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    // The words a player reads in each list of the plugin's content, for a translation's `words` table.
    words: { devices: { name: true }, apps: { name: true, blocked: [{ reason: true }], sections: [{ blocks: 'blocks', actions: ['button'] }] } },
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    // The contacts section lists the cast's characters when the game has the cast.
    cooperates: ['cast'],
    strings: {
      noSuchApp: 'There is no such app.',
      notInstalled: 'That is not installed.',
      noSuchDevice: 'There is no such device.',
      notShown: 'That is put away.',
      call: 'Call',
      // The view's buttons.
      home: 'Home',
      close: 'Close',
    },
    start: () => ({ shown: {} }),
    // Version 1 kept the app open on every device, put away or not: each device starts put away.
    migrations: { 1: () => ({ shown: {} }) },
    conditions: {
      /** `{ 'devices/open': { app } }`: that app is open on a device that's shown; with `device` instead, that device is shown, on any screen. */
      open: (_state, args, { slice }) => (args.app !== undefined ? Object.values(slice.shown).includes(String(args.app)) : String(args.device) in slice.shown),
    },
    commands: {
      /** `{ 'devices/open': { id } }`: open the app `id`, showing its device on it. Free: no time passes. */
      open: {
        whyNot: (state, args, { game }) => refusal(state, game, appById(game, String(args.id ?? ''))),
        run: (_state, args, { slice, set, game }) => {
          const app = appById(game, String(args.id))!
          return set({ shown: { ...slice.shown, [app.on]: app.id } })
        },
      },
      /** `{ 'devices/home': { id } }`: show the device `id` on its home screen, from put away or from an app. */
      home: {
        whyNot: (_state, args, { game }) => (known(game, String(args.id ?? '')) ? undefined : stringOf(game, 'devices/noSuchDevice')),
        run: (_state, args, { slice, set }) => set({ shown: { ...slice.shown, [String(args.id)]: null } }),
      },
      /** `{ 'devices/close': { id } }`: put the device `id` away. */
      close: {
        whyNot: (_state, args, { game, slice }) => {
          const id = String(args.id ?? '')
          if (!known(game, id)) return stringOf(game, 'devices/noSuchDevice')
          return id in slice.shown ? undefined : stringOf(game, 'devices/notShown')
        },
        run: (_state, args, { slice, set }) => {
          const { [String(args.id)]: _away, ...rest } = slice.shown
          return set({ shown: rest })
        },
      },
    },
    // An app's action with a cost or effects is done as `devices/<id>`, from whichever app has it.
    action: (_state, id, { game }) =>
      apps(game)
        .flatMap((app) => app.sections.flatMap((section) => ('actions' in section ? section.actions : [])))
        .find((action) => action.id === id),
    // An app that could not be opened now — not installed, blocked, or a lock on
    // the device (no phone at work) — closes, so its buttons are not left live.
    // An app closed so goes back to its device's home screen; the device stays out.
    onCommand: (_before, after, { slice, set, game }) => {
      let shown = slice.shown
      for (const [device, id] of Object.entries(slice.shown)) {
        if (id && whyNot(after, game, openApp(id))) shown = { ...shown, [device]: null }
      }
      return shown === slice.shown ? after : set({ shown })
    },
    view: (state, context): DevicesView => ({
      devices: devicesOf(context.game).map((device): DeviceView => {
        const { slice, game } = context
        const installed = apps(game).filter((app) => app.on === device.id && holds(state, game, app.when) && !hides(state, game, app.blocked))
        const listed = installed.map((app) => appView(state, context, app, false))
        const out = device.id in slice.shown
        const openId = slice.shown[device.id] ?? null
        const openApp = installed.find((app) => app.id === openId)
        return {
          id: device.id,
          name: device.name,
          frame: device.frame ?? device.id,
          sidebar: Boolean(device.sidebar),
          wallpaper: device.wallpaper ?? null,
          badge: listed.reduce((sum, app) => sum + (typeof app.badge === 'number' ? app.badge : app.badge ? 1 : 0), 0),
          apps: listed,
          shown: out,
          open: out && openApp ? appView(state, context, openApp, true) : null,
          home: renderAction(state, game, { id: `home.${device.id}`, label: stringOf(game, `${ID}/home`), command: homeScreen(device.id) }),
          close: out ? renderAction(state, game, { id: `close.${device.id}`, label: stringOf(game, `${ID}/close`), command: closeApp(device.id) }) : null,
        }
      }),
    }),
    references: {
      content: (game) =>
        apps(game).map((app) => ({
          list: 'apps',
          id: app.id,
          refs: [
            { entry: app.on, plugin: ID, list: 'devices', noun: 'device' },
            { when: app.when },
            ...(app.blocked ?? []).flatMap((entry): Reference[] => [{ when: entry.when }, { reason: entry.reason }]),
            ...(app.badge !== undefined && !(typeof app.badge === 'object' && 'when' in app.badge) ? [{ amount: app.badge }] : []),
            ...(typeof app.badge === 'object' && 'when' in app.badge ? [{ when: app.badge.when }] : []),
            ...app.sections.flatMap((section): Reference[] => {
              if ('things' in section) return [{ kind: section.things.of }, ...(section.things.at !== undefined ? [{ holder: section.things.at }] : [])]
              if ('panel' in section) return [{ openPanel: section.panel, with: section.with ?? {} }]
              if ('blocks' in section) return [{ blocks: section.blocks }]
              if ('actions' in section) return section.actions.map((action) => ({ within: `action ${action.id}`, refs: actionReferences(action) }))
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
        for (const section of app.sections) {
          if ('plugin' in section && !pluginIds.has(section.plugin)) say(`the game has no plugin named "${section.plugin}"`)
        }
      }
      return problems
    },
  })
}

/** A command: open this app. */
const openApp = (app: string): CommandRef => ({ [`${ID}/open`]: { id: app } })
/** A command: show this device on its home screen, from put away or from an app. */
const homeScreen = (device: string): CommandRef => ({ [`${ID}/home`]: { id: device } })
/** A command: put this device away. */
const closeApp = (device: string): CommandRef => ({ [`${ID}/close`]: { id: device } })
/** A condition: this app is open. */
const appOpen = (app: string): Condition => ({ [`${ID}/open`]: { app } })

/**
 * The plugin, with its helpers on it: `devices()` makes the plugin for the
 * game's `plugins`, and content is written with `devices.open('camera')`.
 */
export const devices = Object.assign(devicesPlugin, { open: openApp, home: homeScreen, close: closeApp, appOpen })
