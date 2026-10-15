import { applyEffects, defaultRuntime, pluginQuery, renderScene, sceneById, sceneContext, startingState, type Game, type GameState, type Block } from '@ifloom/engine'

/** A place as the snapshot reads it: its id and what is written there. */
type Place = { id: string; body: Block[] }

/** A state to render every scene in, with a name for the snapshot file. */
export type Probe = { name: string; state: GameState }

/**
 * Every scene and every location rendered in every probe state, as text: what
 * the player would read, and a scene's choices with what greys them out. Compared with the file from
 * the last run, a difference is either a bug or a change you meant — and the
 * diff says which scene, in which state, read differently.
 */
export function snapshot(game: Game, probes: Probe[]): string {
  const out: string[] = []
  for (const scene of [...game.scenes].sort((a, b) => a.id.localeCompare(b.id))) {
    for (const probe of probes) {
      const state = { ...probe.state, sceneId: scene.id }
      let text: string
      try {
        // Data scenes come back baked, so one call renders both kinds.
        const shown = sceneById(game, scene.id)!.render(state, sceneContext(state, game))
        const choices = shown.choices
          .filter((choice) => choice.visible !== false)
          .map((choice) => `  [${choice.disabled ? ' ' : '>'}] ${choice.label}${choice.disabled ? ` — ${choice.disabled}` : ''}`)
        text = [shown.body, ...choices].join('\n')
      } catch (error) {
        text = `!! threw: ${error instanceof Error ? error.message : String(error)}`
      }
      out.push(`=== ${scene.id} @ ${probe.name}\n${text}`)
    }
  }
  // A location's words are read as often as any scene's, and drift the same way.
  // Places are the places plugin's, asked for by name, so the CLI needs no plugin.
  const places = (pluginQuery(game, 'places/all')?.(probes[0]?.state ?? startingState(game)) as Place[] | undefined) ?? []
  for (const location of [...places].sort((a, b) => a.id.localeCompare(b.id))) {
    for (const probe of probes) {
      // Stood there, by the places plugin's own effect.
      const state = applyEffects({ ...probe.state, sceneId: null }, game, [{ kind: 'custom', name: 'places/move', with: { value: location.id } }])
      const body = renderScene({ id: location.id, body: location.body, choices: [] }, state, defaultRuntime(game)).body ?? ''
      out.push(`=== place:${location.id} @ ${probe.name}\n${body}`)
    }
  }
  return out.join('\n\n') + '\n'
}
