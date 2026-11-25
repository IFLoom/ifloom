/**
 * Flowing scenes: a scene's body read top to bottom as a flow, which waits at
 * a decision for the player's pick and carries on with what the pick brings,
 * then with the blocks after the decision. A point marks a place a choice
 * can jump back to, so a flow loops only through a pick. A minigame or a
 * panel in the flow is played or used where it stands, and the flow waits
 * until it is done.
 *
 * The save keeps the visit's path, `state.flow`: each pick, jump and wait
 * passed, in order. What the flow shows is worked out from the path and the
 * state each time, so replay, undo and a loaded save draw it the same.
 */
import type { Game } from '../game.ts'
import type { Block, DataScene, FlowChoice } from '../scene.ts'
import type { Condition, GameState } from '../types.ts'
import type { Reference } from '../references.ts'
import type { PluginArgs } from '../plugin.ts'
import type { BlockUi, Ui } from './ui.ts'
import { defineFeature, type FeatureCheckTools, type FeatureContext } from './feature.ts'
import { minigameOf, startMinigame } from './minigames.ts'

/**
 * A step of a visit's path in `state.flow`, kept in the order the steps came.
 *
 * `{ chose }` is a choice at a decision or among the ending choices, `{ point }` a jump a choice made, and
 * `{ minigame }` or `{ panel }` a wait done with.
 */
export type FlowStep = { chose: string } | { point: string } | { minigame: string } | { panel: string }

/** The visit a save keeps for the open scene, with its path so far and the wait the flow stands at. The engine reads the scene's body from content. */
export type FlowState = {
  /** The id of the scene the visit is of. */
  scene: string
  /** The visit's steps in order, the choices made, the points jumped to and the minigames and panels done with. The view replays them to render the visit. */
  path: FlowStep[]
  /** The minigame being played or the panel open where the flow stands, until it's done. Null while the flow waits on neither. */
  waiting: { minigame: string } | { panel: string } | null
}

/** The flows feature's state, effect and reference, as types. */
export type FlowsShape = {
  state: {
    /**
     * The open scene's visit, each choice, jump and wait passed in order, and the wait the flow stands at. It starts
     * again each time a scene is entered.
     *
     * Null while no scene is open, and for a visit with nothing to keep yet.
     */
    flow: FlowState | null
  }
  effects: {
    /**
     * An effect that carries the flow on from a point of the open scene after the choice's `then`, such as
     * `{ point: 'questions' }`, written by `jump()`. It works only as a choice's effect in the scene that has the point.
     *
     * So a flow loops only through a choice. Anywhere else the effect does nothing.
     */
    point: { point: string }
  }
  references: {
    /** A reference to the point a `{ point }` effect jumps to. The checker accepts it only as a choice's effect in the scene that has the point. */
    jump: { jump: string }
  }
}

/** A block the flow reached, with its address in the scene and the ui hints of the sections around it. */
export type FlowContent = {
  /** The block reached. */
  block: Block
  /** The block's address in the scene, its indexes joined by `.` with a choice's id where it's in a `then`. */
  address: string
  /** The ui hints of the sections around the block, the inner over the outer. Left out when there are none. */
  section?: Ui<BlockUi>
}

/**
 * The place a flow stands once it has gone as far as it can without the player. That's a decision with no choice for
 * it yet (`decide`), a minigame or a panel not done with, or the `end`.
 */
export type FlowStop =
  | { at: 'decide'; id: string; choices: readonly FlowChoice[]; address: string }
  | { at: 'minigame'; minigame: string; address: string }
  | { at: 'panel'; panel: string; with: PluginArgs; address: string }
  | { at: 'end' }

/** The callbacks `walkFlow` calls as it walks, for each block reached, each past choice and the moment the path's last step is passed. */
export type FlowVisitor = {
  /** The callback for each block the walk reaches. */
  content?: (reached: FlowContent) => void
  /** The callback for each past choice, where it was made, with its decision's id and section hints. */
  chose?: (choice: FlowChoice, at: { decide?: string; section?: Ui<BlockUi> }) => void
  /**
   * The callback for the moment the walk passes the path's last step. Whatever the walk reaches after it, a choice's
   * `chose` first, is what the last choice, jump or wait brought.
   */
  caughtUp?: () => void
}

/** One list a walk is in: where it stands, where its blocks' addresses start, and `stop`, where it ends short of the list's end (a `cases` shows one block). */
type Frame = { list: readonly Block[]; at: number; prefix: string; section?: Ui<BlockUi>; jump?: string; stop?: number }

/** The kinds of block that change where the flow goes, rather than showing something. */
const isDecide = (block: Block): block is Extract<Block, { decide: string }> => 'decide' in block
const isSection = (block: Block): block is Extract<Block, { blocks: Block[] }> => 'blocks' in block && !('decide' in block)
const isCases = (block: Block): block is Extract<Block, { cases: Block[] }> => 'cases' in block
const isPoint = (block: Block): block is Extract<Block, { point: string }> => 'point' in block
const isMinigame = (block: Block): block is Extract<Block, { minigame: string }> => 'minigame' in block
const isPanel = (block: Block): block is Extract<Block, { panel: string }> => 'panel' in block

/**
 * Walks a scene's body as a flow along `path` and returns where it stops without the player. `holds` answers a
 * block's `when`, and `visit` gets every block reached and each past choice where it was made.
 *
 * @remarks
 * The walk stops at a decision with no choice for it yet, a minigame or panel not done with, or the end. A choice at
 * a decision runs its `then`, then the blocks after the decision. A jump after a choice carries on from its point
 * instead, once the `then` is done, wherever the point is (at the top of the body, in a section or in a choice's
 * `then`). From there the flow reads on to the end of the point's list, then after the section or decision around it.
 * An ending choice followed by a jump carries on from the point too.
 */
export function walkFlow(
  scene: Pick<DataScene, 'body' | 'choices'>,
  path: readonly FlowStep[],
  holds: (condition: Condition | undefined) => boolean,
  visit: FlowVisitor = {},
): FlowStop {
  let step = 0
  let frames: Frame[] = [{ list: scene.body, at: 0, prefix: '' }]
  const caughtUp = () => {
    if (step === path.length) visit.caughtUp?.()
  }
  const goto = (point: string): boolean => {
    const found = framesTo(scene.body, point, '', undefined)
    if (!found) return false
    frames = found
    return true
  }
  /** The jump right after the step just passed, if the path has one there. */
  const jumpNext = (): string | undefined => {
    const next = path[step]
    if (next && 'point' in next) {
      step += 1
      return next.point
    }
    return undefined
  }
  // Each block is reached at most once per step of the path, so a walk can't go round for ever.
  for (let guard = 0; guard < 100_000; guard += 1) {
    const top = frames.at(-1)
    if (!top) {
      // The end: the ending choices are offered, unless one was picked with a jump after it.
      const next = path[step]
      const picked = next && 'chose' in next ? scene.choices.find((choice) => choice.id === next.chose) : undefined
      const after = path[step + 1]
      if (picked && after && 'point' in after) {
        step += 1
        const jump = jumpNext()!
        caughtUp()
        visit.chose?.(picked, {})
        if (goto(jump)) continue
      }
      return { at: 'end' }
    }
    if (top.at >= (top.stop ?? top.list.length)) {
      frames.pop()
      if (top.jump !== undefined && !goto(top.jump)) continue
      continue
    }
    const block = top.list[top.at]
    const address = `${top.prefix}${top.at}`
    top.at += 1
    if (isPoint(block)) continue
    if ('when' in block && block.when !== undefined && !holds(block.when)) continue
    if (isSection(block)) {
      const section = block.ui ? { ...top.section, ...block.ui } : top.section
      frames.push({ list: block.blocks, at: 0, prefix: `${address}.`, ...(section ? { section } : {}) })
      continue
    }
    if (isCases(block)) {
      // The first block that fits, shown in place: its address is its own in the list, so pool picks keep to it.
      const picked = block.cases.findIndex((entry) => entry.when === undefined || holds(entry.when))
      const section = block.ui ? { ...top.section, ...block.ui } : top.section
      if (picked >= 0) frames.push({ list: block.cases, at: picked, stop: picked + 1, prefix: `${address}.`, ...(section ? { section } : {}) })
      continue
    }
    if (isDecide(block)) {
      const next = path[step]
      const choice = next && 'chose' in next ? block.choices.find((entry) => entry.id === next.chose) : undefined
      if (!choice) return { at: 'decide', id: block.decide, choices: block.choices, address }
      step += 1
      const jump = jumpNext()
      // What this pick brought is new from its own `chose` on, when it was the last step.
      caughtUp()
      visit.chose?.(choice, { decide: block.decide, ...(top.section ? { section: top.section } : {}) })
      if (choice.then?.length) {
        frames.push({
          list: choice.then,
          at: 0,
          prefix: `${address}.${choice.id}.`,
          ...(top.section ? { section: top.section } : {}),
          ...(jump ? { jump } : {}),
        })
      } else if (jump !== undefined) goto(jump)
      continue
    }
    if (isMinigame(block) || isPanel(block)) {
      const next = path[step]
      const done = isMinigame(block) ? next && 'minigame' in next && next.minigame === block.minigame : next && 'panel' in next && next.panel === block.panel
      if (!done) {
        return isMinigame(block) ? { at: 'minigame', minigame: block.minigame, address } : { at: 'panel', panel: block.panel, with: { ...block.with }, address }
      }
      step += 1
      caughtUp()
      continue
    }
    visit.content?.({ block, address, ...(top.section ? { section: top.section } : {}) })
  }
  return { at: 'end' }
}

/**
 * The frames a walk has once it has just passed the point `point`, from the
 * body down to the list the point is in: each enclosing list stands after the
 * section or the decision that holds the next, as reading down to the point
 * would leave it. A section's hints carry down as a walk's do. Undefined when
 * the point isn't there.
 */
function framesTo(list: readonly Block[], point: string, prefix: string, section: Ui<BlockUi> | undefined): Frame[] | undefined {
  for (let index = 0; index < list.length; index += 1) {
    const block = list[index]
    const address = `${prefix}${index}`
    const here: Frame = { list, at: index + 1, prefix, ...(section ? { section } : {}) }
    if (isPoint(block) && block.point === point) return [here]
    if (isSection(block)) {
      const inner = framesTo(block.blocks, point, `${address}.`, block.ui ? { ...section, ...block.ui } : section)
      if (inner) return [here, ...inner]
    }
    if (isCases(block)) {
      // A point in a case: the flow reads on to the end of that case only (the checker reports the point).
      const inner = framesTo(block.cases, point, `${address}.`, block.ui ? { ...section, ...block.ui } : section)
      if (inner) return [here, { ...inner[0], stop: inner[0].at }, ...inner.slice(1)]
    }
    if (isDecide(block)) {
      for (const choice of block.choices) {
        const inner = framesTo(choice.then ?? [], point, `${address}.${choice.id}.`, section)
        if (inner) return [here, ...inner]
      }
    }
  }
  return undefined
}

/** Returns every block in a body with its address, sections, cases and choices' `then` included. `top` is true for a block of the body itself. */
export function everyBlock(body: readonly Block[], prefix = ''): { block: Block; address: string; top: boolean }[] {
  return body.flatMap((block, index) => {
    const address = `${prefix}${index}`
    const here = { block, address, top: prefix === '' }
    if (isSection(block)) return [here, ...everyBlock(block.blocks, `${address}.`)]
    if (isCases(block)) return [here, ...everyBlock(block.cases, `${address}.`)]
    if (isDecide(block)) return [here, ...block.choices.flatMap((choice) => everyBlock(choice.then ?? [], `${address}.${choice.id}.`))]
    return [here]
  })
}

/** Returns every choice a scene has, each decision's in order, then its ending choices. */
export function sceneChoices(scene: Pick<DataScene, 'body' | 'choices'>): FlowChoice[] {
  return [...everyBlock(scene.body).flatMap(({ block }) => (isDecide(block) ? block.choices : [])), ...scene.choices]
}

/** Returns true when a body flows, with a decision, a point, a minigame or a panel anywhere in it. */
export function flows(body: readonly Block[]): boolean {
  return everyBlock(body).some(({ block }) => isDecide(block) || isPoint(block) || isMinigame(block) || isPanel(block))
}

/** Returns the point a choice's effects jump to. Undefined when none of them is a jump. */
export function jumpOf(effects: readonly unknown[] | undefined): string | undefined {
  for (const effect of effects ?? []) {
    if (effect && typeof effect === 'object' && 'point' in effect && Object.keys(effect).length === 1) {
      const point = (effect as { point: unknown }).point
      if (typeof point === 'string') return point
    }
  }
  return undefined
}

/** Returns a choice's effects without its jump, which the flow takes rather than the reducer. */
export function withoutJump<T>(effects: readonly T[] | undefined): T[] {
  return (effects ?? []).filter((effect) => !(effect && typeof effect === 'object' && 'point' in effect && Object.keys(effect).length === 1))
}

/** Returns the state with steps added to the visit's path. A visit of another scene is replaced by a new one. */
export function stepped(state: GameState, scene: string, ...steps: FlowStep[]): GameState {
  const flow = state.flow?.scene === scene ? state.flow : { scene, path: [], waiting: null }
  return { ...state, flow: { ...flow, path: [...flow.path, ...steps] } }
}

/** The open scene, if it has a flow that can wait: a minigame or a panel somewhere in it. */
function waitingScene(state: GameState, game: Game): DataScene | undefined {
  const scene = state.sceneId ? game.scenes.find((entry) => entry.id === state.sceneId) : undefined
  return scene && canWait(scene) ? scene : undefined
}

const waits = new WeakMap<DataScene, boolean>()
function canWait(scene: DataScene): boolean {
  let known = waits.get(scene)
  if (known === undefined) {
    known = everyBlock(scene.body).some(({ block }) => isMinigame(block) || isPanel(block))
    waits.set(scene, known)
  }
  return known
}

/**
 * The visit kept in step with the screen: gone when the scene it was of is
 * no longer open, and where the flow stands at a minigame or a panel, that
 * minigame started or panel opened, then passed once it is done.
 */
function keptUp(state: GameState, game: Game, cx: FeatureContext): GameState {
  let next = state
  for (let round = 0; round < 50; round += 1) {
    if (next.flow && next.flow.scene !== next.sceneId) next = { ...next, flow: null }
    const scene = waitingScene(next, game)
    if (!scene) return next
    const at = next
    const stop = walkFlow(scene, at.flow?.path ?? [], (condition) => cx.holds(at, game, condition))
    if (stop.at !== 'minigame' && stop.at !== 'panel') return next
    const waiting = at.flow?.waiting
    const flow: FlowState = at.flow ?? { scene: scene.id, path: [], waiting: null }
    if (stop.at === 'minigame') {
      const started = waiting && 'minigame' in waiting && waiting.minigame === stop.minigame
      // Still being played: the flow waits.
      if (started && at.minigame?.id === stop.minigame) return next
      // Done with, or one the game doesn't have (the checker reports it): the flow carries on past it.
      if (started || !minigameOf(game, stop.minigame)) {
        next = { ...at, flow: { ...flow, path: [...flow.path, { minigame: stop.minigame }], waiting: null } }
        continue
      }
      next = startMinigame({ ...at, flow: { ...flow, waiting: { minigame: stop.minigame } } }, game, stop.minigame, cx)
      continue
    }
    const opened = waiting && 'panel' in waiting && waiting.panel === stop.panel
    if (opened && at.panel?.panel === stop.panel) return next
    if (opened) {
      next = { ...at, flow: { ...flow, path: [...flow.path, { panel: stop.panel }], waiting: null } }
      continue
    }
    next = { ...at, panel: { panel: stop.panel, with: stop.with }, flow: { ...flow, waiting: { panel: stop.panel } } }
    return next
  }
  return next
}

/** Is a choice left off the screen once it has been picked: hidden by its own `chose`? */
function hidesOncePicked(scene: string, choice: FlowChoice): boolean {
  const key = `${scene}#${choice.id}`
  return Boolean(choice.blocked?.some((entry) => entry.hide && isChose(entry.when, key)))
}

const isChose = (when: Condition, key: string) => typeof when === 'object' && when !== null && 'chose' in when && (when as { chose: unknown }).chose === key

/** Does a choice leave the scene: an effect that opens another or closes it? */
const leaves = (choice: FlowChoice) => (choice.effects ?? []).some((effect) => typeof effect === 'object' && effect !== null && 'scene' in effect)

/**
 * The blocks nothing in their own flow comes after: the last of a list, through sections and
 * cases, when that list is a pick's `then` (whose follow-on is its decision's, which the other
 * picks reach) or, when `end` is true, the scene's body.
 */
function tailBlocks(body: readonly Block[], end: boolean, into = new Set<Block>()): Set<Block> {
  body.forEach((block, index) => {
    const tail = end && index === body.length - 1
    if (tail) into.add(block)
    if (isSection(block)) tailBlocks(block.blocks, tail, into)
    if (isCases(block)) for (const entry of block.cases) tailBlocks([entry], tail, into)
    if (isDecide(block)) for (const choice of block.choices) tailBlocks(choice.then ?? [], true, into)
  })
  return into
}

/** Everything wrong with one data scene's flow. */
function checkFlow(scene: DataScene, tools: FeatureCheckTools): void {
  const source = { list: 'scene', id: scene.id }
  const where = `scene ${scene.id}`
  const blocks = everyBlock(scene.body)
  const flowing = flows(scene.body)
  const decisions = new Set<string>()
  const points = new Set<string>()
  // The choice whose then holds each block. jump(id) builds the same object as point(id), so one written in a then
  // reads as a second point there, and the problem says where the jump goes.
  const inThen = new Map<Block, string>()
  for (const { block } of blocks)
    if (isDecide(block)) for (const choice of block.choices) for (const inner of everyBlock(choice.then ?? [])) inThen.set(inner.block, choice.id)
  const pointBlocks = new Map<string, Block>()
  for (const { block, address } of blocks) {
    if (isDecide(block)) {
      if (decisions.has(block.decide)) tools.problem(source, where, `two decisions share the id "${block.decide}"`)
      decisions.add(block.decide)
    }
    if (isPoint(block)) {
      if (points.has(block.point)) {
        const first = pointBlocks.get(block.point)
        const choice = inThen.get(block) ?? (first && inThen.get(first))
        tools.problem(
          source,
          where,
          choice === undefined
            ? `two points share the id "${block.point}"`
            : `two points share the id "${block.point}": the one in choice ${choice}'s then is a point, not a jump. To go back to the point, put jump('${block.point}') in the choice's effects`,
        )
      }
      points.add(block.point)
      if (!pointBlocks.has(block.point)) pointBlocks.set(block.point, block)
    }
    if (isCases(block)) {
      if (!block.cases.length) tools.problem(source, where, `block ${address}: cases lists no blocks, so it shows nothing`)
      const otherwise = block.cases.findIndex((entry) => entry.when === undefined && !isPoint(entry))
      if (otherwise >= 0 && otherwise < block.cases.length - 1)
        tools.problem(source, where, `block ${address}: case ${otherwise + 1} has no when, so the cases after it are never shown`)
      for (const inner of everyBlock(block.cases, `${address}.`))
        if (isPoint(inner.block))
          tools.problem(source, where, `block ${inner.address}: point "${inner.block.point}" is in cases, where it may not be shown; put it outside the cases`)
    }
    if (flowing && 'variants' in block) {
      tools.problem(
        source,
        where,
        `block ${address}: variants aren't drawn in a scene that flows, since a pick would draw again what the player read; use a when`,
      )
    }
  }
  const jumps = (choice: FlowChoice, at: string) => {
    const point = jumpOf(choice.effects)
    if (point !== undefined && !points.has(point)) tools.problem(source, where, `${at}: jumps to point "${point}", which the scene doesn't have`)
  }
  const tails = tailBlocks(scene.body, !scene.choices.length)
  blocks.forEach(({ block, address }, index) => {
    if (!isDecide(block)) return
    const at = `decision ${block.decide}`
    if (!block.choices.length) tools.problem(source, where, `${at} has no choices, so the flow stops there`)
    else if (block.choices.every((choice) => hidesOncePicked(scene.id, choice)))
      tools.problem(source, where, `${at}: every choice hides once picked, so the flow stops once all are taken; add one that moves on`)
    for (const choice of block.choices) {
      jumps(choice, `${at} choice ${choice.id}`)
      if (choice.then?.length && leaves(choice))
        tools.problem(source, where, `${at} choice ${choice.id}: its then is never shown, because the choice leaves the scene`)
    }
    // Nothing after it can be reached when every choice leaves or jumps, unless nothing comes after it
    // in its own flow (the scene's end, or the end of a pick's then), or a point after it, outside its
    // own branches, lets a jump land there.
    const lastThing = tails.has(block)
    const pointAfter = blocks.some((later, at) => at > index && isPoint(later.block) && !later.address.startsWith(`${address}.`))
    if (block.choices.length && !lastThing && !pointAfter && block.choices.every((choice) => leaves(choice) || jumpOf(choice.effects) !== undefined))
      tools.problem(source, where, `${at}: every choice leaves or jumps, so what comes after it is never reached`)
  })
  for (const choice of scene.choices) {
    jumps(choice, `choice ${choice.id}`)
    if ((choice as FlowChoice).then?.length)
      tools.problem(source, where, `choice ${choice.id}: an ending choice's then is never shown; put the choice in a decide`)
  }
}

/** Returns the references a flow's block makes beyond other blocks', the minigame or panel it plays where it stands. Empty for any other block. */
export function flowBlockReferences(block: Block): Reference[] {
  if (isMinigame(block)) return [{ minigame: block.minigame }]
  if (isPanel(block)) return [{ openPanel: block.panel, with: block.with ?? {} }]
  return []
}

/** The flows feature, which keeps each visit's path and starts the minigames and panels a flow waits on. */
export const flowsFeature = defineFeature<FlowsShape>({
  name: 'flows',
  requires: ['scenes', 'minigames'],
  state: {
    flow: {
      start: () => null,
      load: () => null,
      keeps: (value) => value === null || (typeof value === 'object' && Array.isArray((value as FlowState).path)),
    },
  },
  effects: {
    // The choice that has it takes it, as the `choose` command runs: anywhere else it does nothing.
    point: {
      apply: (state) => state,
      references: (effect) => [{ jump: effect.point }],
    },
  },
  check: (game, tools) => {
    for (const scene of game.scenes) checkFlow(scene, tools)
  },
  resolve: () => ({
    jump: (ref) => [`jumps to point "${ref.jump}", but a jump only works as a choice's effect in the scene that has that point`],
  }),
  started: (state, game, cx) => keptUp(state, game, cx),
  // After the minigames' step, so a scene's own minigame starts first, and before the plugins' hooks, so they see what the flow started.
  afterCommand: { at: 'beforePlugins', run: (_before, after, game, cx) => keptUp(after, game, cx) },
})
