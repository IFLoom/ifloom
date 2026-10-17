import { storylineOf } from './storylines.ts'
import { holds, type Condition } from './condition.ts'
import type { Game } from './game.ts'
import type { Effect, GameState } from './types.ts'

/**
 * The shapes every storyline's progress is made of. A character's ladder should be
 * data in a content file, not a fresh set of hand-written predicates — there are
 * a lot of characters coming and only one of these modules.
 */

/** A number kept on a storyline: photos sent, heat, which stage of a life. */
export function count(state: GameState, storylineId: string, key: string): number {
  const value = storylineOf(state, storylineId).kv[key]
  return typeof value === 'number' ? value : 0
}

export function counted(storylineId: string, key: string, value: number): Effect {
  return { kind: 'storylineKv', storyline: storylineId, key, to: value }
}

export function bumped(
  state: GameState,
  storylineId: string,
  key: string,
  by = 1,
): Effect {
  return counted(storylineId, key, count(state, storylineId, key) + by)
}

/** The stage a count has reached. One-based count, clamped to the ladder. */
export function stageAt<R>(stages: readonly R[], reached: number): R {
  const n = Math.max(1, reached)
  return stages[Math.min(n, stages.length) - 1]
}

/** The stage a count would reach next, clamped to the ladder. */
export function stageNext<R>(stages: readonly R[], reached: number): R {
  if (reached >= stages.length) return stages[stages.length - 1]
  return stages[reached]
}

/**
 * An ordered run of gates on one storyline — a hello before a coffee before a
 * first dinner.
 * Each stage names the kv key that records it happening and what it asks for on
 * top of the stage before it.
 */
export type Stages = {
  storylineId: string
  /**
   * Where the stages' kv keys live: the storyline's own kv store (the
   * default), or with `game`, the game's kv store.
   */
  scope?: 'storyline' | 'game'
  stages: readonly Stage[]
}

export type Stage = {
  id: string
  /** The kv key set when the stage actually happens. */
  key: string
  /**
   * The scene the stage plays in. Its first viewing dates the stage, which is
   * what the next stage's `after` is measured from.
   */
  scene?: string
  /**
   * Turns that must have passed since the previous stage's scene was
   * first seen. A floor under the stat in `needs`: income can be measured
   * wrong, or change, and a ladder paced on income alone collapses into a
   * fortnight the first time it does. The previous stage must name its scene.
   */
  after?: number
  /** What this stage wants beyond the previous one being done. */
  needs?: Condition
}

/** Whole turns since a scene was first entered, or null if it never has been. */
export function turnsSince(state: GameState, sceneId: string): number | null {
  const turn = state.seenOn?.[sceneId]
  return typeof turn === 'number' ? state.turn - turn : null
}

/** Has enough time passed since the stage before this one? */
function rested(state: GameState, stages: Stages, index: number): boolean {
  const stage = stages.stages[index]
  if (!stage.after) return true
  const previous = stages.stages[index - 1]
  if (!previous?.scene) {
    throw new Error(
      `stage ${stage.id} on ${stages.storylineId} waits ${stage.after} turns on a stage with no scene`,
    )
  }
  const turns = turnsSince(state, previous.scene)
  return turns !== null && turns >= stage.after
}

function happened(state: GameState, stages: Stages, stage: Stage): boolean {
  const store = stages.scope === 'game' ? state.kv : storylineOf(state, stages.storylineId).kv
  return Boolean(store[stage.key])
}

/** Has this stage already happened? */
export function stageDone(state: GameState, stages: Stages, id: string): boolean {
  const stage = stages.stages.find((entry) => entry.id === id)
  return stage ? happened(state, stages, stage) : false
}

/**
 * Can this stage happen now? Every earlier stage has to be done, and every gate
 * up to and including this one has to still hold.
 */
/** Can this stage happen now? `game` resolves custom conditions in `needs`. */
export function stageOpen(state: GameState, stages: Stages, id: string, game?: Game): boolean {
  for (const [index, stage] of stages.stages.entries()) {
    if (stage.needs && !holds(state, stage.needs, game)) return false
    if (!rested(state, stages, index)) return false
    if (stage.id === id) return true
    if (!happened(state, stages, stage)) return false
  }
  return false
}

/** How many stages of the stages are done. */
export function stagesDone(state: GameState, stages: Stages): number {
  let n = 0
  for (const stage of stages.stages) {
    if (!happened(state, stages, stage)) break
    n += 1
  }
  return n
}
