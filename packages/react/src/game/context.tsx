import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import type { Command, GameState, Mods, Result, Runner, View } from '@ifloom/engine'
import type { UnlockCodes } from '@ifloom/plugin-unlocks'
import { UiProvider, type UiOptions } from './overrides.tsx'
import { FeedSection, MessagesSection } from './sections.tsx'
import { KeysProvider } from './keys.tsx'
import { useTicking } from './timers.tsx'

/**
 * A game's own component for a scene panel, an app's panel section or a panel
 * content opens (`{ kind: 'panel' }`): it gets the data the game's custom panel
 * returned, or what the panel was opened with.
 */
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

/**
 * Codes the player can enter, for a game with the unlocks plugin: how to
 * start entering them on the runner (`startUnlocks`), what went wrong opening
 * remembered content, and how to start over with new content.
 */
export type UnlocksOption = {
  /** `startUnlocks` from `@ifloom/plugin-unlocks`. The provider calls it with its runner, and stops it when it goes. */
  start: (runner: Runner) => UnlockCodes
  /** What `unlockedPacks` said it couldn't open, shown under the code box. */
  problems?: string[]
  /** Build the game again with the content a code has just opened: usually `() => location.reload()`. */
  onChange?: () => void
}

export type GameContextValue = {
  runner: Runner
  mods?: ModsOption
  /** The provider's `unlocks`, with the codes started on its runner (null until they are). */
  unlocks?: UnlocksOption & { codes: UnlockCodes | null }
  view: View
  /** Run a command. Returns what `runner.apply` returned, so a caller can show a refusal. */
  send: (command: Command) => Result<GameState>
  panels: Record<string, PanelComponent>
  sections: Record<string, PluginSectionComponent>
}

const GameContext = createContext<GameContextValue | null>(null)

export type GameProviderProps = UiOptions & {
  runner: Runner
  /** The game's own panels, by the name its scenes, apps and `panel` effects give. An open panel's name here goes over a built-in one. */
  panels?: Record<string, PanelComponent>
  /** Renderers for plugin sections in apps, by plugin id, over the built-in ones. */
  sections?: Record<string, PluginSectionComponent>
  /** Mods the player can add, turn off or remove. Leave out for a game without mods. */
  mods?: ModsOption
  /** Codes the player can enter. Leave out for a game without the unlocks plugin. */
  unlocks?: UnlocksOption
  children: ReactNode
}

/**
 * Connects the UI to a runner: every component under it reads the view and
 * sends commands through `useGame`. The view is recomputed when the runner's
 * state changes, or what the plugins' views show of the profile does, and only then.
 */
const NONE = {}

export function GameProvider({
  runner,
  panels = NONE,
  sections = NONE,
  mods,
  unlocks,
  components,
  classes,
  unstyled,
  viewer,
  keys,
  motion,
  children,
}: GameProviderProps) {
  // The view follows the runner. It builds one per state, and a new one when what the plugins'
  // views show of the profile changes, and hands the same object to everything that reads it
  // (the backlog, the audio player), so this builds nothing new.
  const view = useSyncExternalStore(
    (listener) => runner.subscribe(() => listener()),
    () => runner.view(),
  )
  const send = useCallback((command: Command) => runner.apply(command), [runner])
  // The game's clock: a tick while any timer counts down, drawn or not.
  useTicking(runner)
  // Codes start on the runner once it's drawn, and stop when it goes: from then on, every new game and loaded save gets the unlocks the profile remembers.
  const [codes, setCodes] = useState<UnlockCodes | null>(null)
  const start = unlocks?.start
  useEffect(() => {
    if (!start) return
    const started = start(runner)
    setCodes(started)
    return () => {
      started.stop()
      setCodes(null)
    }
  }, [start, runner])
  const unlocking = useMemo(() => (unlocks ? { ...unlocks, codes } : undefined), [unlocks, codes])
  const value = useMemo(
    () => ({ runner, view, send, panels, mods, unlocks: unlocking, sections: { messages: MessagesSection, feed: FeedSection, ...sections } }),
    [runner, view, send, panels, sections, mods, unlocking],
  )
  return (
    <GameContext.Provider value={value}>
      <UiProvider components={components} classes={classes} unstyled={unstyled} viewer={viewer} keys={keys} motion={motion}>
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
