import { useEffect, useRef, useSyncExternalStore } from 'react'
import { startAudio, type AudioOptions, type AudioPlayer } from '@ifloom/audio'
import type { Game, Runner } from '@ifloom/engine'
import { useGameIfAny } from './context.tsx'

/** The player each runner has, so a voice line's replay button can find it. */
const players = new Map<Runner, AudioPlayer>()
const listeners = new Set<() => void>()

function changed(): void {
  for (const listener of listeners) listener()
}

/** Whether a game has anything to play. */
export function hasAudio(game: Game): boolean {
  return Object.keys(game.audio?.tracks ?? {}).length > 0
}

/** Start a player for a runner and remember it; the way to stop it forgets it again. */
export function startPlayer(runner: Runner, options?: AudioOptions): () => void {
  const player = startAudio(runner, options)
  players.set(runner, player)
  changed()
  return () => {
    player.stop()
    if (players.get(runner) === player) {
      players.delete(runner)
      changed()
    }
  }
}

/** The player playing this runner's sound, or null when none is. */
export function usePlayer(runner: Runner | undefined): AudioPlayer | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => (runner ? (players.get(runner) ?? null) : null),
  )
}

/**
 * Play the game's sound while the component is mounted, with `@ifloom/audio`.
 * Inside a `GameProvider` it plays that game; outside, pass `runner`. Returns
 * the player once it has started. `mountGame` does this for you.
 */
export function useAudio(options: AudioOptions & { runner?: Runner } = {}): AudioPlayer | null {
  const context = useGameIfAny()
  const runner = options.runner ?? context?.runner
  if (!runner) throw new Error('useAudio needs a runner: use it inside a GameProvider, or pass { runner }.')
  // Options are read once, when the player starts; a new object each render doesn't restart it.
  const latest = useRef(options)
  latest.current = options
  useEffect(() => {
    const { runner: _runner, ...audio } = latest.current
    return startPlayer(runner, audio)
  }, [runner])
  return usePlayer(runner)
}
