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
 * A spot in the layout where plugin UIs place their components, in the order of the game's `plugins` list. Each spot
 * is one of these:
 *
 * - `stats`: inside the side column's Stats section, under the stats.
 * - `sidebar`: the side column, after the Stats section.
 * - `room`: the story, after the scene and before the room's actions. Nothing renders here while a minigame runs.
 * - `story`: the end of the story, after the room's actions.
 * - `strip`: the `NoticeStrip`'s row of counts, after the notices.
 */
export type PluginSpot = 'stats' | 'sidebar' | 'room' | 'story' | 'strip'

/** A panel a plugin UI renders by name, which content opens with the `panel` effect. */
export type PluginPanel = {
  /** The component that renders the panel. It gets the panel's `with` as `data`. */
  component: PanelComponent
  /**
   * The panel dialog's title, as a key of the module's words or the UI's, or a function of the panel's `with` and the
   * view. Content's `with.title` replaces it.
   */
  title?: string | ((data: Readonly<Record<string, unknown>>, view: View) => string | undefined)
}

/** A page a plugin UI adds among the pages around the game, as a game's {@link PageDef} does. */
export type PluginPage = {
  /** The label of the page's button on the title screen, as a key of the module's words or the UI's. */
  label: string
  /** The component that renders the page. It renders inside the game, so `useGame()` works in it. */
  component: ComponentType
  /** True to show a button for the page on the title screen. True if left out. */
  showOnTitle?: boolean
}

/**
 * A plugin's React UI, which its `/react` subpath exports (`shopUi`) for a game's `plugins` list. Every field but `id`
 * is optional.
 *
 * It's a plain object, so a game spreads it and leaves out the parts it doesn't want, such as
 * `{ ...achievementsUi, pages: undefined }`.
 */
export type PluginUi = {
  /** The plugin's id, the same as its engine side's. The UI does nothing in a game without that plugin. */
  id: string
  /** The UI's words in English, by key. A game rewords any of them with `ui.<key>` in its strings. */
  words?: Words
  /** The UI's panels by name, which `PanelHost` renders when content opens one. A game's own `panels` of the same name replace them. */
  panels?: Readonly<Record<string, PluginPanel>>
  /** The components the layout places, by spot. A layout of your own places them with `<Plugins at="…" />`, or renders them itself. */
  layout?: Readonly<Partial<Record<PluginSpot, readonly ComponentType[]>>>
  /** The components that render a plugin's section in a device's app, by that plugin's id. The game's own `sections` replace them. */
  sections?: Readonly<Record<string, PluginSectionComponent>>
  /**
   * The UI pieces it renders for `[[ui:name|…]]` in prose, by name. The game's own `inline` replace them, and
   * `checkUiHints` checks their names.
   */
  inline?: InlineComponents
  /** The `ui` hints its components read, each a {@link UiHint}, so `checkUiHints` checks them as it checks the React UI's own. */
  hints?: readonly UiHint[]
  /** The pages it adds among the pages around the game, by id. A game's own page with the same id replaces one. */
  pages?: Readonly<Record<string, PluginPage>>
  /**
   * The plugin UI's component for the settings page, such as a box for codes. Without pages it renders behind a menu
   * button labelled by `label`, a key of the UI's words.
   */
  settings?: { label: string; component: ComponentType }
  /** The built-in components it replaces, by name, as a game's `components` do. The game's own replace these. */
  components?: Components
  /** A component that wraps the game, for state the UI keeps beside the runner, such as codes being entered. */
  provider?: ComponentType<{ children: ReactNode }>
}

/**
 * The type of a plugin's slice of the view, `view.plugins[id]`, by the plugin's id. It's the plugin's entry in the
 * engine's `ViewRegistry`, or `unknown` for a plugin that declares none.
 */
export type PluginViewOf<Id extends string> = Id extends keyof ViewRegistry ? ViewRegistry[Id] : unknown

/**
 * A plugin UI's id and words, declared once with `pluginKit`. Spread it into the {@link PluginUi} and pass it to
 * `usePlugin` in each component, so every component reads the same words and a typed view.
 */
export type PluginKit<Id extends string = string, W extends Words = Words> = {
  /** The plugin's id, the same as its engine side's. */
  readonly id: Id
  /** The UI's words in English, by key. A game rewords any of them with `ui.<key>` in its strings. */
  readonly words: W
}

/**
 * Returns the {@link PluginKit} for a plugin's id and its words, for `usePlugin` and the UI's {@link PluginUi}. The
 * words are empty if left out.
 *
 *   const SHOP = pluginKit('shop', SHOP_WORDS)
 *   export const shopUi: PluginUi = { ...SHOP, panels: { ... } }
 *   // in a component: const { view, words, send } = usePlugin(SHOP)
 */
export function pluginKit<const Id extends string, const W extends Words = Record<never, string>>(id: Id, words?: W): PluginKit<Id, W> {
  return { id, words: words ?? ({} as W) }
}

/** The plugin's view, words and `send` that `usePlugin` returns to a component. */
export type PluginControls<Id extends string, W extends Words> = {
  /** The plugin's slice of the view, `view.plugins[id]`, typed. It's undefined in a game without the plugin. */
  view: PluginViewOf<Id> | undefined
  /** Returns one of the plugin's words or the UI's by key, the game's `ui.<key>` string over the English. */
  words: Say<(keyof W & string) | UiStringKey>
  /**
   * Sends a command and returns the runner's result, so a caller can show a refusal. The command is one a plugin helper
   * writes, `send(shop.buy(vendor, entity))`, or a `RenderedChoice`'s `command` from the view.
   */
  send: (command: CommandRef) => Result<GameState>
}

/**
 * Returns a plugin's view, words and `send` from the running game, for a component of the plugin's UI. It re-renders
 * whenever the view changes.
 *
 * The view is typed by the plugin's `ViewRegistry` entry, and the words are the kit's with the game's `ui.<key>`
 * strings over them.
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

/** Returns the running game's plugin UIs, those whose plugin the game has, in the order of its `plugins` list. */
export function usePluginUis(): readonly PluginUi[] {
  return useGame().plugins
}

/** Each module's `provider`, wrapped round the children, the first outermost. */
export function PluginProviders({ plugins, children }: { plugins: readonly PluginUi[]; children: ReactNode }) {
  return plugins.reduceRight<ReactNode>((inner, ui) => (ui.provider ? <ui.provider>{inner}</ui.provider> : inner), children)
}

/**
 * Renders the components the game's plugin UIs place at one spot of the layout, in `plugins` order. The `room` spot
 * renders nothing while a minigame runs, since the minigame replaces the room.
 *
 * The default layout has one at each {@link PluginSpot}, and a layout of your own puts them where it likes.
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
