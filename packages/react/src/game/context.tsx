import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import type { CommandRef, GameState, InlineUi, InlineUiArgs, Mods, Result, Runner, RunnerSnapshot, View } from '@ifloom/engine'
import { UiProvider, type UiOptions } from './overrides.tsx'
import { activePlugins, mergedFrom, PluginProviders, type PluginUi } from './plugins.tsx'
import { KeysProvider } from './keys.tsx'
import { useTicking } from './timers.tsx'

/**
 * A game's own component for a scene panel, an app's panel section or a panel
 * content opens (`{ panel }`): it gets the data the game's custom panel
 * returned, or what the panel was opened with.
 */
export type PanelComponent = ComponentType<{ data: unknown }>

/**
 * What an inline piece of the prose gets, from `[[ui:name|words|arg|…]]`: its
 * `name`, the `text` to show and the `args` after the words, typed by what
 * `InlineUi` declares for that name.
 */
export type InlineProps<N extends string = string> = { name: N; text: string; args: InlineUiArgs<N> }

/** A component that draws an inline piece of the prose named `N`. */
export type InlineComponent<N extends string = string> = ComponentType<InlineProps<N>>

/**
 * A game's own inline pieces by name, for `[[ui:name|…]]` in its prose. A
 * name `InlineUi` declares gets its arguments typed; any other name takes them
 * as text.
 */
export type InlineComponents = { [N in keyof InlineUi]?: InlineComponent<N> } & { [name: string]: ComponentType<InlineProps<never>> | undefined }

/** Draws another plugin's view inside an app: a messages channel, a feed. Gets the plugin's slice of the view and the section's `with`. */
export type PluginSectionComponent = ComponentType<{ data: unknown; with: Record<string, unknown> }>

/** The game's mods, for the mod manager: the store, what the loader said about them, and how to start over with a change. */
export type ModsOption = {
  store: Mods
  /** The loader's problems, as `describeProblem` writes them; the ones starting `mod:<id> ` are shown under that mod. */
  problems?: string[]
  /** Build the game again with the mods as they now are — usually `() => location.reload()`. */
  onChange?: () => void
}

export type GameContextValue = {
  runner: Runner
  mods?: ModsOption
  /** Everything the runner gives a UI to draw, as `runner.snapshot()`: the view, settings, backlog, undo, saves and helpers. */
  snapshot: RunnerSnapshot
  /** The view, as `snapshot.view`. */
  view: View
  /**
   * Run a command, a plain one or a plugin's in short as its helpers write it
   * (`shop.buy('counter', 'food:bun')`). Returns what `runner.apply` returned,
   * so a caller can show a refusal.
   */
  send: (command: CommandRef) => Result<GameState>
  panels: Record<string, PanelComponent>
  /** The game's own inline pieces, by name; the built-in ones are in `BUILT_IN_INLINE`. */
  inline: InlineComponents
  sections: Record<string, PluginSectionComponent>
  /** The plugin UIs from the provider's `plugins` whose plugin the game has, in that order. */
  plugins: readonly PluginUi[]
}

const GameContext = createContext<GameContextValue | null>(null)

export type GameProviderProps = UiOptions & {
  runner: Runner
  /**
   * The plugin UIs to draw, each from a plugin's `/react` subpath, such as
   * `shopUi` from `@ifloom/plugin-shop/react`. Their panels, words and the
   * rest apply, and the default layout places what they bring, in this
   * order. One for a plugin the game doesn't have does nothing. Leave a
   * plugin out to draw it yourself.
   */
  plugins?: readonly PluginUi[]
  /** The game's own panels, by the name its scenes, apps and `panel` effects give. An open panel's name here goes over a built-in one. */
  panels?: Record<string, PanelComponent>
  /**
   * The game's own components for `[[ui:name|words|arg|…]]` in its prose, by
   * name. One here goes over a built-in one of the same name (`modal`,
   * `image`); a name nothing draws shows its words.
   */
  inline?: InlineComponents
  /** Renderers for plugin sections in apps, by plugin id, over the plugin UIs' (the messages and feed UIs draw theirs). */
  sections?: Record<string, PluginSectionComponent>
  /** Mods the player can add, turn off or remove. Leave out for a game without mods. */
  mods?: ModsOption
  children: ReactNode
}

/**
 * Connects the UI to a runner: every component under it reads the runner's
 * snapshot (the view, settings, backlog, undo, saves and helpers) and sends
 * commands through `useGame`. It draws again when the runner hands a new
 * snapshot, and only then.
 */
const NONE = {}
const NO_PLUGINS: readonly PluginUi[] = []

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

/** The runner, its snapshot, the current view and `send`. Only inside a `GameProvider`. */
export function useGame(): GameContextValue {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame is used outside a GameProvider.')
  return value
}
