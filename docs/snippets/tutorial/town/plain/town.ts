// src/town.ts
import type { RenderedChoice, View } from '@ifloom/engine'

/** The places plugin's ways out, then a Talk button for each person here, under their name ("Ruth: Talk"). */
export function townButtons(view: View): RenderedChoice[] {
  const exits = view.plugins.places?.exits ?? []
  const people = view.plugins.cast?.present ?? []
  return [...exits, ...people.flatMap((person) => person.actions.map((action) => ({ ...action, label: `${person.name}: ${action.label}` })))]
}
