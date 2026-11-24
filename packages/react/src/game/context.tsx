import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import type { CommandRef, GameState, InlineUi, InlineUiArgs, Mods, Result, Runner, RunnerSnapshot, View } from '@ifloom/engine'
import { UiProvider, type UiOptions } from './overrides.tsx'
import { activePlugins, mergedFrom, PluginProviders, type PluginUi } from './plugins.tsx'
import { KeysProvider } from './keys.tsx'
import { useTicking } from './timers.tsx'

/**
 * A component that renders a panel, for a scene's panel, an app's panel section or the `panel` effect. Its `data`
 * prop is the data the game's own panel returned, else the panel's `with`.
 */
export type PanelComponent = ComponentType<{ data: unknown }>

/**
 * The props a UI piece's component gets from `[[ui:name|words|arg|…]]` in prose. The `args` are typed by the name's
 * entry in the engine's `InlineUi`.
 */
export type InlineProps<N extends string = string> = {
  /** The UI piece's name, from `[[ui:name|…]]`. */
  name: N
  /** The UI piece's words, its second part, which the component shows. */
  text: string
  /** The UI piece's parts after its words, typed by the name's entry in `InlineUi`. */
  args: InlineUiArgs<N>
}

/** A component that renders the UI piece named `N` in prose. */
export type InlineComponent<N extends string = string> = ComponentType<InlineProps<N>>

/**
 * A game's or a plugin UI's components for UI pieces in prose, by name. A name the engine's `InlineUi` declares gets its
 * arguments typed, and any other name takes them as text.
 */
export type InlineComponents = { [N in keyof InlineUi]?: InlineComponent<N> } & { [name: string]: ComponentType<InlineProps<never>> | undefined }

/**
 * A component that renders another plugin's view as a section of a device's app, such as a messages channel or a feed.
 * It gets the plugin's slice of the view and the section's `with`.
 */
export type PluginSectionComponent = ComponentType<{ data: unknown; with: Record<string, unknown> }>

/** The game's mods for the mod manager, with the store, the loader's problems and the function that applies a change. */
export type ModsOption = {
  /** The store that keeps the player's mods, `mods(game.id, driver)` from `@ifloom/engine` over the same driver as the saves. */
  store: Mods
  /** The loader's problems, each worded by `describeProblem`. The mod manager shows a problem starting `mod:<id> ` under that mod. */
  problems?: string[]
  /** The function that builds the game again with the mods as they now are, such as `() => location.reload()`. */
  onChange?: () => void
}

/** The running game that `useGame` returns, with the runner, its snapshot, the view and `send`. */
export type GameContextValue = {
  /** The runner the game was mounted with. */
  runner: Runner
  /** The mods option the game was mounted with, for the mods page. It's undefined for a game without mods. */
  mods?: ModsOption
  /** The runner's snapshot, `runner.snapshot()`, with the view, settings, backlog, undo, saves and helpers. */
  snapshot: RunnerSnapshot
  /** The view, the same as `snapshot.view`. */
  view: View
  /**
   * Sends a command and returns the runner's result, so a caller can show a refusal. The command is a core one or a
   * plugin's as its helpers write it, such as `shop.buy('counter', 'food:bun')`.
   */
  send: (command: CommandRef) => Result<GameState>
  /** The game's own panels by name, as `GameProviderProps.panels` gave them. The plugin UIs' panels aren't included. */
  panels: Record<string, PanelComponent>
  /**
   * The components for UI pieces that the plugin UIs and the game add, by name, the game's over the plugins'. The
   * built-in ones aren't included.
   */
  inline: InlineComponents
  /** The components for plugin sections in apps, by plugin id, the plugin UIs' with the game's own over them. */
  sections: Record<string, PluginSectionComponent>
  /** The plugin UIs from the provider's `plugins` whose plugin the game has, in that order. */
  plugins: readonly PluginUi[]
}

const GameContext = createContext<GameContextValue | null>(null)

/** The props of `GameProvider`, the runner and the plugin UIs with the game's own panels, UI pieces, sections and mods. */
export type GameProviderProps = UiOptions & {
  /** The runner to render and send commands to, such as `browserRunner(game)` or `createRunner(game)`. */
  runner: Runner
  /**
   * The plugin UIs to use, each from a plugin's `/react` subpath, such as `shopUi` from `@ifloom/plugin-shop/react`.
   * The default layout places their components in this order.
   *
   * One for a plugin the game doesn't have does nothing. Leave a plugin out to render it yourself.
   */
  plugins?: readonly PluginUi[]
  /**
   * The game's own panels, by the name its scenes, apps and `panel` effects give. One here replaces a plugin UI's panel
   * of the same name.
   */
  panels?: Record<string, PanelComponent>
  /**
   * The game's own components for `[[ui:name|words|arg|…]]` in its prose, by name. One here replaces a built-in one of
   * the same name, such as `modal` or `image`.
   *
   * A name no component renders shows its words.
   */
  inline?: InlineComponents
  /** The game's components for plugin sections in apps, by plugin id. They replace the plugin UIs', such as the messages and feed UIs'. */
  sections?: Record<string, PluginSectionComponent>
  /** The mods the player can add, turn off or remove. Leave it out for a game without mods. */
  mods?: ModsOption
  /** The UI to render inside the provider. */
  children: ReactNode
}

const NONE = {}
const NO_PLUGINS: readonly PluginUi[] = []

/**
 * Renders its children connected to a runner, so every component under it reads the runner's snapshot and sends
 * commands through `useGame`. It re-renders when the runner has a new snapshot, and only then.
 */
export function GameProvider({
  runner,
  plugins: given = NO_PLUGINS,
  panels = NONE,
  inline = NONE,
  sections = NONE,
  mods,
  components,
  classes,
  unstyled,
  viewer,
  keys,
  motion,
  children,
}: GameProviderProps) {
  // The snapshot follows the runner, which hands the same object until a part of it changes,
  // and builds the view once per state for everything that reads it, so this builds nothing new.
  // The same snapshot on the server, so a test or a static page can draw the game with renderToString.
  const current = () => runner.snapshot()
  const snapshot = useSyncExternalStore((listener) => runner.subscribe(() => listener()), current, current)
  const view = snapshot.view
  const send = useCallback((command: CommandRef) => runner.apply(command), [runner])
  // The game's clock: a tick while any timer counts down, drawn or not.
  useTicking(runner)
  const plugins = useMemo(() => activePlugins(runner.game, given), [runner, given])
  // What the plugin UIs bring, under what the game gives of its own.
  const merged = useMemo(
    () => ({
      sections: { ...mergedFrom(plugins, (ui) => ui.sections), ...sections },
      inline: { ...mergedFrom(plugins, (ui) => ui.inline as Record<string, InlineComponent<never>>), ...inline } as InlineComponents,
      components: plugins.some((ui) => ui.components) ? { ...mergedFrom(plugins, (ui) => ui.components), ...components } : components,
    }),
    [plugins, sections, inline, components],
  )
  const value = useMemo(
    () => ({ runner, snapshot, view, send, panels, inline: merged.inline, mods, sections: merged.sections, plugins }),
    [runner, snapshot, view, send, panels, merged, mods, plugins],
  )
  return (
    <GameContext.Provider value={value}>
      <UiProvider components={merged.components} classes={classes} unstyled={unstyled} viewer={viewer} keys={keys} motion={motion}>
        <KeysProvider>
          <PluginProviders plugins={plugins}>{children}</PluginProviders>
        </KeysProvider>
      </UiProvider>
    </GameContext.Provider>
  )
}

/** The game in context, or null outside a `GameProvider`. */
export function useGameIfAny(): GameContextValue | null {
  return useContext(GameContext)
}

/**
 * Returns the running game, with the runner, its snapshot, the view and `send`. It throws outside a `GameProvider`, and
 * re-renders with each new snapshot.
 */
export function useGame(): GameContextValue {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame is used outside a GameProvider.')
  return value
}
