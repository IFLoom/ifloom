/**
 * Plugin UIs: what a plugin's React UI module brings to the game, and where
 * the layout puts it. A plugin's `/react` subpath exports one, `shopUi` say,
 * and a game lists the ones it wants in `plugins`. Nothing finds them by
 * itself, and a game can draw any plugin itself instead, from
 * `view.plugins.<id>` or the plugin's hooks.
 */
import { Fragment, type ComponentType, type ReactNode } from 'react'
import type { CommandRef, Game, GameState, Result, View, ViewRegistry } from '@ifloom/engine'
import { useGame, type InlineComponents, type PanelComponent, type PluginSectionComponent } from './context.tsx'
import type { Components } from './overrides.tsx'
import type { UiHint } from '../hints.ts'
import { uiSay, type Say, type UiStringKey, type Words } from './words.ts'

/**
 * Where the layout puts what plugin UIs bring, in the order of the game's
 * `plugins` list:
 *
 * - `stats`: inside the side column's Stats section, under the stats.
 * - `sidebar`: the side column, after the Stats section.
 * - `room`: the story, after the scene and before the room's actions. Nothing is drawn here while a minigame runs.
 * - `story`: the end of the story, after the room's actions.
 * - `strip`: the `NoticeStrip`'s row of counts, after the notices.
 */
export type PluginSpot = 'stats' | 'sidebar' | 'room' | 'story' | 'strip'

/** A panel a plugin UI draws by name, for content's `panel` effect. */
export type PluginPanel = {
  /** What it draws, given what the panel was opened with as `data`. */
  component: PanelComponent
  /**
   * The dialog's title: a key of the module's words (or the UI's), or a
   * function of what the panel was opened with and the view. Content's
   * `with.title` goes over it.
   */
  title?: string | ((data: Readonly<Record<string, unknown>>, view: View) => string | undefined)
}

/** A page a plugin UI adds among the pages around the game, as a game's `PageDef` does. */
export type PluginPage = {
  /** The title screen's button for it: a key of the module's words (or the UI's). */
  label: string
  /** What the page shows. It's drawn inside the game, so `useGame()` works in it. */
  component: ComponentType
  /** Whether the title screen offers it. On unless set false. */
  showOnTitle?: boolean
}

/**
 * A plugin's React UI, as its `/react` subpath exports it (`shopUi`), for a
 * game's `plugins` list. Everything in it is optional, and it's a plain
 * object: spread it and leave out what you don't want, such as
 * `{ ...achievementsUi, pages: undefined }`.
 */
export type PluginUi = {
  /** The plugin's id, as its engine side names it. The module does nothing in a game without that plugin. */
  id: string
  /** Its words in English, by key. A game rewords any with `ui.<key>` in its strings. */
  words?: Words
  /** Panels by name, which `PanelHost` draws when content opens one. A game's own `panels` of the same name go over these. */
  panels?: Readonly<Record<string, PluginPanel>>
  /** What the default layout places, by spot. A layout of your own places them with `<Plugins at="…" />`, or draws the components itself. */
  layout?: Readonly<Partial<Record<PluginSpot, readonly ComponentType[]>>>
  /** Renderers for a plugin's section in a device's app, by that plugin's id. The game's own `sections` go over these. */
  sections?: Readonly<Record<string, PluginSectionComponent>>
  /** Inline pieces it draws, for `[[ui:name|…]]` in prose. The game's own `inline` go over these. `checkUiHints` knows their names. */
  inline?: InlineComponents
  /** The `ui` hints its components read, declared as `UI_HINTS` declares the React UI's, so `checkUiHints` checks them. */
  hints?: readonly UiHint[]
  /** Pages it adds among the pages around the game, by id. A game's own page of the same id goes over it. */
  pages?: Readonly<Record<string, PluginPage>>
  /**
   * Something for the settings page, such as a code box: drawn there with
   * pages on, and behind a menu button labelled `label` (a key of its
   * words) without them.
   */
  settings?: { label: string; component: ComponentType }
  /** Built-in components it replaces by name, as a game's `components` do. The game's own go over these. */
  components?: Components
  /** Wraps the game, for state the module keeps beside the runner, such as codes being entered. */
  provider?: ComponentType<{ children: ReactNode }>
}

/**
 * A plugin's slice of the view, by its id: the type its engine side declares
 * in the engine's `ViewRegistry`, or `unknown` for a plugin that declares none.
 */
export type PluginViewOf<Id extends string> = Id extends keyof ViewRegistry ? ViewRegistry[Id] : unknown

/**
 * One plugin's UI, declared once: its id and its words. Spread it into the
 * module's `PluginUi`, and hand it to `usePlugin` in each component, so the
 * words are written in one place and the view comes typed.
 */
export type PluginKit<Id extends string = string, W extends Words = Words> = {
  /** The plugin's id, as its engine side names it. */
  readonly id: Id
  /** Its words in English, by key. A game rewords any with `ui.<key>` in its strings. */
  readonly words: W
}

/**
 * Declare a plugin's UI once, by the plugin's id and its words, for
 * `usePlugin` and the module's `PluginUi`:
 *
 *   const SHOP = pluginKit('shop', SHOP_WORDS)
 *   export const shopUi: PluginUi = { ...SHOP, panels: { ... } }
 *   // in a component: const { view, words, send } = usePlugin(SHOP)
 */
export function pluginKit<const Id extends string, const W extends Words = Record<never, string>>(id: Id, words?: W): PluginKit<Id, W> {
  return { id, words: words ?? ({} as W) }
}

/** What `usePlugin` gives a component: the plugin's view, its words and a way to send its commands. */
export type PluginControls<Id extends string, W extends Words> = {
  /** The plugin's slice of the view, `view.plugins[id]`, typed; undefined in a game without the plugin. */
  view: PluginViewOf<Id> | undefined
  /** Say one of the plugin's words, or the UI's, by key: the game's `ui.<key>` over the English. */
  words: Say<(keyof W & string) | UiStringKey>
  /**
   * Run a command, as the plugin's helpers write it: `send(shop.buy(vendor,
   * entity))`, or a button's `command` from the view. Returns what
   * `runner.apply` returned, so a caller can show a refusal.
   */
  send: (command: CommandRef) => Result<GameState>
}

/**
 * A plugin's view, words and commands, for a component of its UI: what
 * `pluginKit` declared, bound to the game in context. The view is typed by
 * the plugin's `ViewRegistry` entry, the words are its table with the game's
 * rewording over them, and `send` takes the commands its helpers write.
 */
export function usePlugin<Id extends string, W extends Words>(kit: PluginKit<Id, W>): PluginControls<Id, W> {
  const { runner, view, send } = useGame()
  const plugins: Readonly<Record<string, unknown>> = view.plugins
  return {
    view: plugins[kit.id] as PluginViewOf<Id> | undefined,
    words: (key, vars) => uiSay(runner.game, key, vars, kit.words),
    send,
  }
}

/** The modules that apply to a game: those whose plugin it has, in the order given, each id once. */
export function activePlugins(game: Game, plugins: readonly PluginUi[]): readonly PluginUi[] {
  const has = new Set((game.plugins ?? []).map((plugin) => plugin.id))
  const seen = new Set<string>()
  return plugins.filter((ui) => {
    if (!has.has(ui.id) || seen.has(ui.id)) return false
    seen.add(ui.id)
    return true
  })
}

/** Every module's entries of one kind, merged in order, later modules over earlier ones. */
export function mergedFrom<T>(plugins: readonly PluginUi[], pick: (ui: PluginUi) => Readonly<Record<string, T>> | undefined): Record<string, T> {
  return Object.assign({}, ...plugins.map((ui) => pick(ui) ?? {})) as Record<string, T>
}

/** The plugin UIs the game in context has, in the order of its `plugins` list. */
export function usePluginUis(): readonly PluginUi[] {
  return useGame().plugins
}

/** Each module's `provider`, wrapped round the children, the first outermost. */
export function PluginProviders({ plugins, children }: { plugins: readonly PluginUi[]; children: ReactNode }) {
  return plugins.reduceRight<ReactNode>((inner, ui) => (ui.provider ? <ui.provider>{inner}</ui.provider> : inner), children)
}

/**
 * What the game's plugin UIs place at one spot of the layout, in the order of
 * its `plugins` list: nothing for a plugin the game doesn't have. The default
 * layout has one at each `PluginSpot`; a layout of your own puts them where
 * it likes, or draws the plugins' components itself. The `room` spot draws
 * nothing while a minigame runs, since the minigame stands where the room is.
 */
export function Plugins({ at }: { at: PluginSpot }) {
  const { plugins, view } = useGame()
  if (at === 'room' && view.minigame) return null
  return (
    <>
      {plugins.flatMap((ui) =>
        (ui.layout?.[at] ?? []).map((Piece, index) => (
          <Fragment key={`${ui.id}:${index}`}>
            <Piece />
          </Fragment>
        )),
      )}
    </>
  )
}
