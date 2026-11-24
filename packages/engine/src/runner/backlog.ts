/**
 * The backlog: each scene as the player saw it, with the choice made in it.
 * Internal; `createRunner` composes it.
 */
import type { SceneBeat } from '../sceneBody.ts'
import { inlineChoices, pastBeats } from '../screen.ts'
import type { Command, GameState } from '../types.ts'
import type { View } from '../view.ts'

/**
 * Settings for the backlog, the list of scenes the player has seen with the choice made in each. The backlog is off
 * unless `createRunner` is given these or `true`.
 */
export type BacklogOptions = {
  /** The number of entries the backlog keeps, dropping the oldest. 200 if left out. */
  limit?: number
}

/** One scene of the backlog, as the player saw it. The backlog keeps scenes only, never the room or a minigame. */
export type BacklogEntry = {
  /** The turn the scene was shown in. */
  turn: number
  /** The time in the game when the scene was shown, from `view.when`, or null when no plugin gives one. */
  when: string | null
  /** The scene's id. */
  sceneId: string
  /** The scene's title as it was shown. */
  title: string
  /** The scene's beats as the player read them. */
  beats: SceneBeat[]
  /** The label of the choice the player made in the scene, once they made one. A choice at a decision of a flow shows in `beats` instead. */
  chose?: string
}

/** Returns the number of entries the backlog keeps, 0 when it's off. */
export function backlogLimit(options: BacklogOptions | boolean | undefined): number {
  return options === true ? 200 : options ? (options.limit ?? 200) : 0
}

/** A command's before and after, read by `backlogAfter`. */
export type Shown = {
  /** The state before the command. */
  before: GameState
  /** The state after the command. */
  after: GameState
  /** The command that ran. */
  command: Command
  /** The view the command was sent from. */
  from: View
  /** The view of the state it led to. */
  to: () => View
}

/** An entry for a screen, dated by it. */
function entry(screen: View): BacklogEntry {
  return { turn: screen.turn, when: screen.when, sceneId: screen.scene.id!, title: screen.scene.title, beats: pastBeats(screen.scene.beats) }
}

/**
 * Returns the backlog after a command, at most `limit` long. The scene on screen
 * before the command goes in first if it isn't there yet (the opening scene,
 * say), the choice is written on it, then whatever new scene the command
 * opened goes in after. A minigame drawn over a scene is not the scene: it
 * goes in neither before nor after.
 */
export function backlogAfter(backlog: readonly BacklogEntry[], { before, after, command, from, to }: Shown, limit: number): BacklogEntry[] {
  let next = [...backlog]
  // A pick at a decision of a flowing scene is in the scene's own words from then on, as a `chose` beat:
  // the visit's entry grows rather than closing with the choice.
  const flowed = Boolean(
    after.flow && after.flow.scene === from.scene.id && after.flow.path.length > (before.flow?.scene === after.flow.scene ? before.flow.path.length : 0),
  )
  if (from.scene.id && !from.minigame) {
    const last = next.at(-1)
    const showing = last && last.sceneId === from.scene.id && last.chose === undefined
    // A flowing visit's entry is kept as the screen last read it, so what the flow added since (past a minigame, say) is there too.
    if (!showing) next = [...next, entry(from)]
    else if (before.flow?.scene === from.scene.id) next = [...next.slice(0, -1), entry(from)]
    if (command.type === 'choose' && !flowed) {
      const label = [...from.scene.choices, ...inlineChoices(from.scene.beats)].find((choice) => choice.id === command.id)?.label
      if (label) next = [...next.slice(0, -1), { ...next.at(-1)!, chose: label }]
    }
  }
  const shown = to()
  if (shown.scene.id && !shown.minigame && flowed) next = [...next.slice(0, -1), entry(shown)]
  else if (shown.scene.id && !shown.minigame && (shown.scene.id !== from.scene.id || command.type === 'choose')) next = [...next, entry(shown)]
  return next.slice(-limit)
}
