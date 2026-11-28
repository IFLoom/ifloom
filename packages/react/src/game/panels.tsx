import { useMemo } from 'react'
import type { OpenPanel } from '@ifloom/engine'
import { useGame, type PanelComponent } from './context.tsx'
import { PartDialog } from './dialog.tsx'
import { overridable } from './overrides.tsx'
import { StatList } from './sidebar.tsx'
import { mergedFrom, usePluginUis, type PluginPanel, type PluginUi } from './plugins.tsx'
import { uiSay, useWords, type UiStringKey } from './words.ts'

/**
 * The panels the React UI draws by name, for `{ panel }`, for
 * what the engine itself keeps: `stats` (the `StatList`). A plugin UI in
 * `plugins` adds its own, such as the shop's `shop` or the inventory's
 * `inventory`, and a game's own `panels` of the same name go over both.
 */
export const BUILT_IN_PANELS: Readonly<Record<string, PanelComponent>> = {
  stats: () => <StatList />,
}

/** The UI word each built-in panel is titled with. */
const TITLES: Record<string, UiStringKey> = {
  stats: 'stats',
}

/** What draws a panel of one name, and where its dialog's title comes from. */
type PanelEntry = {
  component: PanelComponent
  /** The plugin UI with a panel of this name, whose title the dialog takes even when the game draws the panel itself. */
  plugin?: PluginPanel & { from: PluginUi }
}

/**
 * Every panel by name, in one table: the game's own `panels` over the plugin
 * UIs' (later modules over earlier ones) over `BUILT_IN_PANELS`.
 */
export function panelTable(own: Readonly<Record<string, PanelComponent>>, plugins: readonly PluginUi[]): Record<string, PanelEntry> {
  const fromPlugins = mergedFrom(plugins, (ui) =>
    ui.panels ? Object.fromEntries(Object.entries(ui.panels).map(([name, panel]) => [name, { ...panel, from: ui }])) : undefined,
  )
  const table: Record<string, PanelEntry> = {}
  for (const [name, component] of Object.entries(BUILT_IN_PANELS)) table[name] = { component }
  for (const [name, plugin] of Object.entries(fromPlugins)) table[name] = { component: plugin.component, plugin }
  for (const [name, component] of Object.entries(own)) table[name] = { component, plugin: fromPlugins[name] }
  return table
}

/**
 * The panel of one name, as the game in context draws it: the game's own,
 * else a plugin UI's, else a built-in one. Undefined when nothing draws it.
 * `PanelHost`, a scene that holds a panel and a minigame's slot all find
 * theirs here.
 */
export function usePanel(name: string | undefined): PanelEntry | undefined {
  const { panels } = useGame()
  const plugins = usePluginUis()
  const table = useMemo(() => panelTable(panels, plugins), [panels, plugins])
  return name === undefined ? undefined : table[name]
}

/**
 * The dialog's title: `with.title` if content gave one, else what the plugin
 * UI with a panel of that name says (its word, or its function's answer),
 * even when the game draws the panel itself, else a built-in panel's word,
 * else the panel's name.
 */
function usePanelTitle(open: OpenPanel | null, plugin: PanelEntry['plugin']): string {
  const { runner, view } = useGame()
  const words = useWords()
  if (!open) return ''
  if (typeof open.with.title === 'string') return open.with.title
  if (plugin?.title !== undefined) {
    const title = typeof plugin.title === 'function' ? plugin.title(open.with, view) : uiSay(runner.game, plugin.title, {}, plugin.from.words ?? {})
    if (title !== undefined) return title
  }
  const key = TITLES[open.panel]
  return key ? words(key) : open.panel
}

function PanelHostImpl() {
  const { view, send } = useGame()
  // A panel the open scene holds is drawn in the scene, in place of its choices.
  const open = view.panel?.scene === undefined ? view.panel : null
  const entry = usePanel(open?.panel)
  const title = usePanelTitle(open, entry?.plugin)
  const Panel = entry?.component
  // A name nothing draws shows nothing: the panel closes as the story moves on, or with `closePanel`.
  return (
    <PartDialog open={Boolean(open && Panel)} onClose={() => send({ type: 'closePanel' })} title={title}>
      {open && Panel ? (
        <div data-panel={open.panel}>
          <Panel data={open.with} />
        </div>
      ) : null}
    </PartDialog>
  )
}

/**
 * Renders the open panel, `view.panel`, in a `PartDialog`, and sends `closePanel` when the player closes it. The panel
 * gets its `with` as `data`.
 *
 * It renders the game's own panel of that name, else a plugin UI's, else the built-in `stats`. The
 * default layout has one, and a layout of your own puts it anywhere inside the `GameProvider`.
 */
export const PanelHost = overridable('PanelHost', PanelHostImpl)
