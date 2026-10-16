import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import type { Applied, Command, Mods, Runner, View } from '@ifloom/engine'
import { UiProvider, type UiOptions } from './overrides.tsx'
import { FeedSection, MessagesSection } from './sections.tsx'
import { KeysProvider } from './keys.tsx'

/** A game's own component for a scene panel or an app's panel section: it gets the data the game's custom panel returned. */
export type PanelComponent = ComponentType<{ data: unknown }>

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
  view: View
  /** Run a command. Returns what `apply` returned, so a caller can show a refusal. */
  send: (command: Command) => Applied
  panels: Record<string, PanelComponent>
  sections: Record<string, PluginSectionComponent>
}

const GameContext = createContext<GameContextValue | null>(null)

export type GameProviderProps = UiOptions & {
  runner: Runner
  /** The game's own panels, by the name its scenes and apps give. */
  panels?: Record<string, PanelComponent>
  /** Renderers for plugin sections in apps, by plugin id, over the built-in ones. */
  sections?: Record<string, PluginSectionComponent>
  /** Mods the player can add, turn off or remove. Leave out for a game without mods. */
  mods?: ModsOption
  children: ReactNode
}

/**
 * Connects the UI to a runner: every component under it reads the view and
 * sends commands through `useGame`. The view is recomputed when the runner's
 * state changes, or what the plugins' views show of the profile does, and only then.
 */
const NONE = {}

export function GameProvider({ runner, panels = NONE, sections = NONE, mods, components, classes, unstyled, viewer, keys, children }: GameProviderProps) {
  // The view follows the runner. It builds one per state, and a new one when what the plugins'
  // views show of the profile changes, and hands the same object to everything that reads it
  // (the backlog, the audio player), so this builds nothing new.
  const view = useSyncExternalStore(
    (listener) => runner.subscribe(() => listener()),
    () => runner.view(),
  )
  const send = useCallback((command: Command) => runner.apply(command), [runner])
  const value = useMemo(
    () => ({ runner, view, send, panels, mods, sections: { messages: MessagesSection, feed: FeedSection, ...sections } }),
    [runner, view, send, panels, sections, mods],
  )
  return (
    <GameContext.Provider value={value}>
      <UiProvider components={components} classes={classes} unstyled={unstyled} viewer={viewer} keys={keys}>
        <KeysProvider>{children}</KeysProvider>
      </UiProvider>
    </GameContext.Provider>
  )
}

/** The game in context, or null outside a `GameProvider`. */
export function useGameIfAny(): GameContextValue | null {
  return useContext(GameContext)
}

/** The runner, the current view and `send`. Only inside a `GameProvider`. */
export function useGame(): GameContextValue {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame is used outside a GameProvider.')
  return value
}
