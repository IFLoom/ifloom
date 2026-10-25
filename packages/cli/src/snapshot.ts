import { applyEffects, inlineChoices, pluginQuery, startingState, view, type Game, type GameState, type RenderedChoice } from '@ifloom/engine'

/** A state to render every scene in, with a name for the snapshot file. */
export type Probe = { name: string; state: GameState }

/** A choice as the snapshot writes it: `[>]` to press, `[ ]` greyed out with the reason. */
function choiceLine(choice: RenderedChoice): string {
  return `  [${choice.disabled ? ' ' : '>'}] ${choice.label}${choice.disabled ? ` — ${choice.disabled}` : ''}`
}

/**
 * Every scene and every location rendered in every probe state, as text: what
 * the player would read, and a scene's choices with what greys them out. Both
 * come from the engine's `view`, so a snapshot reads as the screen does: a
 * choice a lock or a plugin's guard refuses is greyed out with its reason.
 * Compared with the file from the last run, a difference is either a bug or a
 * change you meant, and the diff says which scene, in which state, read
 * differently.
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
