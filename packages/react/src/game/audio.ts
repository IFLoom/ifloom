import { useEffect, useRef, useSyncExternalStore } from 'react'
import { startAudio, type AudioOptions, type AudioPlayer } from '@ifloom/audio'
import type { Game, Runner } from '@ifloom/engine'
import { useGameIfAny } from './context.tsx'

/**
 * Who asked for each runner's sound, in the order they asked. One player plays
 * a runner at a time: the first `useAudio`'s if any asked, else the first of
 * the automatic ones (`GameShell`'s and `mountGame`'s), so a game that calls
 * `useAudio` beside them never hears its sound twice.
 */
type Request = { options?: AudioOptions; explicit: boolean }
const requests = new Map<Runner, Request[]>()
/** The player each runner has, and whose request it plays, so a voice line's replay button can find it. */
const players = new Map<Runner, { player: AudioPlayer; request: Request }>()
const listeners = new Set<() => void>()

function changed(): void {
  for (const listener of listeners) listener()
}

/** Whether a game has anything to play. */
export function hasAudio(game: Game): boolean {
  return Object.keys(game.audio?.tracks ?? {}).length > 0
}

/** Start or stop the runner's player so that it plays the request that wins now, and only that one. */
function settle(runner: Runner): void {
  const list = requests.get(runner) ?? []
  if (!list.length) requests.delete(runner)
  const wanted = list.find((request) => request.explicit) ?? list[0]
  const now = players.get(runner)
  if (now?.request === wanted) return
  if (now) {
    now.player()
    players.delete(runner)
  }
  if (wanted) players.set(runner, { player: startAudio(runner, wanted.options), request: wanted })
  changed()
}

/**
 * Ask for a runner's sound; the way to stop takes the request back. `explicit`
 * is a `useAudio`'s, which goes over an automatic one.
 */
export function startPlayer(runner: Runner, options?: AudioOptions, explicit = true): () => void {
  const request: Request = { options, explicit }
  requests.set(runner, [...(requests.get(runner) ?? []), request])
  settle(runner)
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    requests.set(
      runner,
      (requests.get(runner) ?? []).filter((other) => other !== request),
    )
    settle(runner)
  }
}

/** The player playing this runner's sound, or null when none is. */
export function usePlayer(runner: Runner | undefined): AudioPlayer | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => (runner ? (players.get(runner)?.player ?? null) : null),
  )
}

/**
 * Returns the audio player once it has started, and plays the game's sound with `@ifloom/audio` while mounted. Outside
 * a `GameProvider` it throws unless you pass `runner`.
 *
 * `GameShell` and `mountGame` play the game's sound themselves. A `useAudio` beside them takes over from theirs with
 * its options, so the sound never plays twice. It reads the options once, when the player starts.
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
