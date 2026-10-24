import type { OpenPanel } from '@ifloom/engine'
import { useGame, type PanelComponent } from './context.tsx'
import { PartDialog } from './dialog.tsx'
import { Inventory } from './inventory.tsx'
import { overridable } from './overrides.tsx'
import { StatList } from './sidebar.tsx'
import { mergedFrom, usePluginUis, type PluginPanel, type PluginUi } from './plugins.tsx'
import { uiSay, useWords, type UiStringKey } from './words.ts'

/**
 * The panels the React UI draws by name, for `{ kind: 'panel', panel }`, for
 * what the engine itself keeps: `stats` (the `StatList`) and `inventory`
 * (the `Inventory`). A plugin UI in `plugins` adds its own, such as the
 * shop's `shop`, and a game's own `panels` of the same name go over both.
 */
export const BUILT_IN_PANELS: Readonly<Record<string, PanelComponent>> = {
  inventory: () => <Inventory title={false} />,
  stats: () => <StatList />,
}

/** The UI word each built-in panel is titled with. */
const TITLES: Record<string, UiStringKey> = {
  inventory: 'inventory',
  stats: 'stats',
}

/** Each plugin UI's panel by name, with the module it came from, later modules over earlier ones. */
function pluginPanels(plugins: readonly PluginUi[]): Record<string, PluginPanel & { from: PluginUi }> {
  return mergedFrom(plugins, (ui) =>
    ui.panels ? Object.fromEntries(Object.entries(ui.panels).map(([name, panel]) => [name, { ...panel, from: ui }])) : undefined,
  )
}

/**
 * The dialog's title: `with.title` if content gave one, else what the plugin
 * UI with a panel of that name says (its word, or its function's answer),
 * even when the game draws the panel itself, else a built-in panel's word,
 * else the panel's name.
 */
function usePanelTitle(open: OpenPanel | null, plugin: (PluginPanel & { from: PluginUi }) | undefined): string {
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
  const { view, panels, send } = useGame()
  const plugins = usePluginUis()
  const open = view.panel
  const fromPlugins = pluginPanels(plugins)
  const own = open ? panels[open.panel] : undefined
  const plugin = open ? fromPlugins[open.panel] : undefined
  const title = usePanelTitle(open, plugin)
  const Panel = open ? (own ?? plugin?.component ?? BUILT_IN_PANELS[open.panel]) : undefined
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
 * Draws the panel content opened (`view.panel`) in a dialog: the game's own
 * `panels` by its name, else a plugin UI's panel of that name, else one of
 * `BUILT_IN_PANELS`, with what it was opened with as `data`. Closing the
 * dialog sends `closePanel`. The default layout has one; a layout of your own
 * puts it anywhere inside the `GameProvider`.
 */
export const PanelHost = overridable('PanelHost', PanelHostImpl)
