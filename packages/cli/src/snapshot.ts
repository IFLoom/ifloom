import { applyEffects, inlineChoices, pluginQuery, startingState, view, type Game, type RenderedChoice } from '@ifloom/engine'
import type { Probe } from './module.ts'

/** A choice as the snapshot writes it: `[>]` to press, `[ ]` greyed out with the reason. */
function choiceLine(choice: RenderedChoice): string {
  return `  [${choice.disabled ? ' ' : '>'}] ${choice.label}${choice.disabled ? ` — ${choice.disabled}` : ''}`
}

/**
 * Returns every scene and every location rendered as text in every probe state. It's what `ifloom snapshot` writes.
 *
 * The text comes from the engine's `view`, so it reads as the screen does. Each scene shows its body and its choices,
 * and a choice that a lock or a plugin's guard refuses shows as disabled, with its reason. Locations come from the
 * places plugin's `places/all` query, and a game without it has none. Compared with the last run's file, the diff
 * names the scene and the probe that read differently.
 */
export function snapshot(game: Game, probes: Probe[]): string {
  const out: string[] = []
  for (const scene of [...game.scenes].sort((a, b) => a.id.localeCompare(b.id))) {
    for (const probe of probes) {
      let text: string
      try {
        const shown = view({ ...probe.state, sceneId: scene.id }, game).scene
        text = [shown.body, ...inlineChoices(shown.beats).map(choiceLine), ...shown.choices.map(choiceLine)].join('\n')
      } catch (error) {
        text = `!! threw: ${error instanceof Error ? error.message : String(error)}`
      }
      out.push(`=== ${scene.id} @ ${probe.name}\n${text}`)
    }
  }
  // A location's words are read as often as any scene's, and drift the same way.
  // Places are the places plugin's, listed and stood in by name, so the CLI needs no plugin.
  const places = (pluginQuery(game, 'places/all')?.(probes[0]?.state ?? startingState(game)) as { id: string }[] | undefined) ?? []
  for (const location of [...places].sort((a, b) => a.id.localeCompare(b.id))) {
    for (const probe of probes) {
      // Stood there with no scene open, the room as `view` draws it.
      const state = applyEffects({ ...probe.state, sceneId: null }, game, [{ 'places/move': { location: location.id } }])
      out.push(`=== place:${location.id} @ ${probe.name}\n${view(state, game).scene.body}`)
    }
  }
  return out.join('\n\n') + '\n'
}
