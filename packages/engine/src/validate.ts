import { collectionById } from './collections.ts'
import { absentPartner, pluginCommand, pluginEffect } from './plugin.ts'
import { customCall, customValue } from './custom.ts'
import { anyOf, bindCurrent, statOwnerProblem } from './entities.ts'
import { statDef, statProblems } from './stats.ts'
import {
  itemById,
  sceneById,
  type Game,
} from './game.ts'
import { sceneContext } from './context.ts'
import { referenced, type Condition } from './condition.ts'
import { isDataScene } from './scene.ts'
import { cueProblems, manifestProblems, markupProblems, placementProblems } from './audio.ts'
import { mediaMarkupProblems, poolManifestProblems, sceneMediaProblems, stageProblems, type MediaStage } from './media.ts'
import { settingConditionProblems, settingProblems } from './settings.ts'
import type { Command, Effect, GameState } from './types.ts'

/**
 * Structural checks over a content pack: every id a piece of content points at
 * has to resolve. Run from a test so a dangling scene id fails at commit time
 * instead of mid-playthrough.
 */
export function validatePack(
  game: Game,
  probes: readonly GameState[] = [],
): string[] {
  const problems: string[] = []
  const say = (where: string, what: string) => problems.push(`${where}: ${what}`)

  const storylineIds = new Set(game.storylines.map((storyline) => storyline.id))
  duplicates(game.items.map((entry) => entry.id)).forEach((id) =>
    say('items', `duplicate id ${id}`),
  )
  duplicates(game.scenes.map((entry) => entry.id)).forEach((id) =>
    say('scenes', `duplicate id ${id}`),
  )
  duplicates(game.storylines.map((entry) => entry.id)).forEach((id) =>
    say('storylines', `duplicate id ${id}`),
  )

  if (game.introScene !== undefined && !sceneById(game, game.introScene)) {
    say('pack', `introScene ${game.introScene} does not exist`)
  }

  for (const item of game.items) {
    for (const effect of item.use?.effects ?? []) {
      checkEffect(game, storylineIds, `item ${item.id}`, effect, say)
    }
  }

  duplicates(game.activities.map((entry) => entry.id)).forEach((id) =>
    say('activities', `duplicate id ${id}`),
  )
  for (const activity of game.activities) {
    const where = `activity ${activity.id}`
    for (const id of Object.keys(activity.cost?.stats ?? {})) {
      if (!statDef(game, id)) say(where, `cost spends stat ${id}, which is not declared`)
    }
    if (Array.isArray(activity.effects)) {
      for (const effect of activity.effects) {
        checkEffect(game, storylineIds, where, effect, say)
      }
    }
  }

  for (const action of game.actions ?? []) {
    checkCommand(game, `game action ${action.id}`, action.command, say)
  }

  for (const stat of game.stats ?? []) {
    if (typeof stat.max === 'object' && !customValue(game, stat.max.value)) {
      say(`stat ${stat.id}`, `max names value ${stat.max.value}, which the game does not declare`)
    }
  }

  for (const { where, what } of statProblems(game)) say(where, what)

  duplicates((game.settings ?? []).map((entry) => entry.id)).forEach((id) =>
    say('settings', `duplicate id ${id}`),
  )
  for (const setting of game.settings ?? []) {
    for (const what of settingProblems(setting)) say(`setting ${setting.id}`, what)
  }
  for (const { where, condition } of conditionsOf(game)) {
    for (const { setting, is } of referenced(condition).settings) {
      for (const what of settingConditionProblems(game, setting, is)) say(where, what)
    }
  }
  for (const id of game.carryOver?.stats ?? []) {
    if (!statDef(game, id)) say('carryOver', `stat ${id} is not declared`)
  }
  if (Array.isArray(game.carryOver?.items)) {
    for (const id of game.carryOver.items) if (!itemById(game, id)) say('carryOver', `item ${id} does not exist`)
  }

  for (const { where, what } of manifestProblems(game)) say(where, what)
  for (const { where, what } of poolManifestProblems(game)) say(where, what)
  for (const scene of game.scenes) {
    if (!isDataScene(scene)) continue
    const where = `scene ${scene.id}`
    for (const what of placementProblems(game, scene.audio ?? {})) say(where, what)
    for (const block of scene.body) {
      if ('media' in block) for (const what of sceneMediaProblems(game, block.media)) say(where, what)
    }
    checkStage(game, where, scene.stage, scene.choices.map((choice) => choice.id), say)
    // The sounds and voices its prose names, line by line.
    const keys = scene.body.flatMap((block) => ('text' in block ? [block.text] : 'variants' in block ? (game.prose?.variants(block.variants) ?? []) : []))
    for (const key of keys) {
      const text = game.prose?.line(key) ?? ''
      for (const what of [...markupProblems(game, text), ...mediaMarkupProblems(game, text)]) say(where, what)
    }
    // Choices' other effects are checked by probes, rendered; their audio is checked here without one.
    for (const choice of scene.choices) {
      for (const effect of choice.effects) {
        if (!customCall(effect) && ((effect as Effect).kind === 'audio' || (effect as Effect).kind === 'sound')) {
          checkEffect(game, storylineIds, `${where} choice ${choice.id}`, effect as Effect, say)
        }
      }
    }
  }

  for (const state of probes) {
    checkProbe(game, storylineIds, state, say)
  }

  return problems
}

/** Render every scene against one state and check what falls out. */
function checkProbe(
  game: Game,
  storylineIds: Set<string>,
  state: GameState,
  say: (where: string, what: string) => void,
): void {
  const label = `turn ${state.turn}`
  const ctx = sceneContext(state, game)
  for (const listed of game.scenes) {
    const scene = sceneById(game, listed.id)
    if (!scene) continue
    const where = `scene ${scene.id} (${label})`
    let view
    try {
      view = scene.render(state, ctx)
    } catch (error) {
      say(where, `render threw: ${(error as Error).message}`)
      continue
    }
    duplicates(view.choices.map((choice) => choice.id)).forEach((id) =>
      say(where, `duplicate choice id ${id}`),
    )
    for (const what of [...placementProblems(game, view.audio ?? {}), ...markupProblems(game, view.body ?? ''), ...mediaMarkupProblems(game, view.body ?? '')]) say(where, what)
    // A hand-built scene's stage is only known once it renders.
    if (!isDataScene(listed)) checkStage(game, where, view.stage, view.choices.map((choice) => choice.id), say)
    for (const choice of view.choices) {
      for (const effect of choice.effects) {
        checkEffect(game, storylineIds, `${where} choice ${choice.id}`, effect, say)
      }
    }
  }

}

/** What is wrong with a stage: its shape, and the commands its hotspots send. */
function checkStage(
  game: Game,
  where: string,
  stage: MediaStage | undefined,
  choices: readonly string[] | null,
  say: (where: string, what: string) => void,
): void {
  if (!stage) return
  for (const what of stageProblems(game, stage, choices)) say(where, what)
  for (const hotspot of stage.hotspots ?? []) {
    if (hotspot.command) checkCommand(game, `${where} hotspot ${hotspot.id}`, hotspot.command, say)
  }
}

function checkCommand(
  game: Game,
  where: string,
  command: Command,
  say: (where: string, what: string) => void,
): void {
  if (command.type === 'scene' && !sceneById(game, command.id)) {
    say(where, `scene ${command.id} does not exist`)
  }
  if (
    command.type === 'use' &&
    !itemById(game, command.itemId)
  ) {
    say(where, `item ${command.itemId} does not exist`)
  }
  if (command.type === 'custom' && !pluginCommand(game, command.name)) {
    say(where, `no plugin command named ${command.name}`)
  }
}

function checkEffect(
  game: Game,
  storylineIds: Set<string>,
  where: string,
  effect: Effect,
  say: (where: string, what: string) => void,
): void {
  switch (effect.kind) {
    case 'custom':
      if (!pluginEffect(game, effect.name) && !absentPartner(game, effect.name)) say(where, `no plugin effect named ${effect.name}`)
      break
    case 'collect':
      if (!collectionById(game, effect.to)) say(where, `collection ${effect.to} is not declared`)
      if (effect.entry.text !== undefined && game.prose?.line(effect.entry.text) === undefined) {
        say(where, `no prose for ${effect.entry.text}`)
      }
      break
    case 'notify':
      if (effect.text !== undefined && game.prose?.line(effect.text) === undefined) say(where, `no prose for ${effect.text}`)
      break
    case 'discard':
      if (!collectionById(game, effect.from)) say(where, `collection ${effect.from} is not declared`)
      break
    case 'scene':
      if ('from' in effect) {
        if (!game.scenes.some((scene) => scene.drawnFrom?.includes(effect.from))) say(where, `no scene is drawn from ${effect.from}`)
        if (effect.otherwise !== undefined && !sceneById(game, effect.otherwise)) say(where, `scene ${effect.otherwise} does not exist`)
      } else if (effect.id !== null && !sceneById(game, effect.id)) {
        say(where, `scene ${effect.id} does not exist`)
      }
      return
    case 'item':
      if (!itemById(game, effect.id)) {
        say(where, `item ${effect.id} does not exist`)
      }
      return
    case 'storylineFlag':
    case 'closeStoryline':
      if (!storylineIds.has(effect.id)) {
        say(where, `storyline ${effect.id} is not declared`)
      }
      return
    case 'stat':
    case 'setStat': {
      const def = statDef(game, effect.key)
      if (!def) say(where, `stat ${effect.key} is not declared`)
      else if (def.derive !== undefined) say(where, `stat ${effect.key} is derived and never written`)
      else {
        const problem = statOwnerProblem(def.of, effect.key, effect.of)
        if (problem) say(where, problem)
      }
      return
    }
    case 'audio':
      for (const what of placementProblems(game, { [effect.channel]: effect.track })) say(where, what)
      return
    case 'sound':
      for (const what of cueProblems(game, effect.track)) say(where, what)
      return
    case 'each':
      // Only the plain effects can be checked here; a custom one is worked out in play.
      for (const inner of bindCurrent(effect.effects, anyOf(effect.of))) {
        if (!customCall(inner)) checkEffect(game, storylineIds, `${where} (each ${effect.of})`, inner as Effect, say)
      }
      return
    default:
      return
  }
}

/** Every condition the game declares as data, with where it is, for checks that walk them all. */
function conditionsOf(game: Game): { where: string; condition: Condition | undefined }[] {
  const out: { where: string; condition: Condition | undefined }[] = [{ where: 'finished', condition: game.finished }]
  for (const trigger of game.triggers ?? []) out.push({ where: `trigger ${trigger.id}`, condition: trigger.when })
  for (const input of game.inputs ?? []) out.push({ where: `input ${input.id}`, condition: input.when })
  for (const action of game.actions ?? []) {
    out.push({ where: `game action ${action.id}`, condition: action.when })
    for (const entry of action.blocked ?? []) out.push({ where: `game action ${action.id}`, condition: entry.when })
  }
  for (const activity of game.activities) {
    for (const entry of activity.requires ?? []) out.push({ where: `activity ${activity.id}`, condition: entry.when })
  }
  for (const scene of game.scenes) {
    if (!isDataScene(scene)) continue
    const where = `scene ${scene.id}`
    for (const block of scene.body) {
      out.push({ where, condition: block.when })
      if ('variants' in block) for (const gate of Object.values(block.gate ?? {})) out.push({ where, condition: gate })
    }
    for (const choice of scene.choices) {
      out.push({ where, condition: choice.when })
      for (const entry of [...(choice.blocked ?? []), ...(choice.labels ?? [])]) out.push({ where, condition: entry.when })
    }
  }
  return out
}

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id)
    seen.add(id)
  }
  return [...dupes]
}
