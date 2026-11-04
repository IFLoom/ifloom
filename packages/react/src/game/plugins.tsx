/**
 * Plugin UIs: what a plugin's React UI module brings to the game, and where
 * the layout puts it. A plugin's `/react` subpath exports one, `shopUi` say,
 * and a game lists the ones it wants in `plugins`. Nothing finds them by
 * itself, and a game can draw any plugin itself instead, from
 * `view.plugins.<id>` or the plugin's hooks.
 */
import { Fragment, type ComponentType, type ReactNode } from 'react'
import type { Game, View } from '@ifloom/engine'
import { useGame, type InlineComponents, type PanelComponent, type PluginSectionComponent } from './context.tsx'
import type { Components } from './overrides.tsx'
import type { Words } from './words.ts'

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
  /** Inline pieces it draws, for `[[ui:name|…]]` in prose. The game's own `inline` go over these. */
  inline?: InlineComponents
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
