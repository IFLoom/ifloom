// src/town.ts
import type { RenderedChoice, View } from '@ifloom/engine'

/** The places plugin's buttons: the ways out of the location the player is at. */
export function townButtons(view: View): RenderedChoice[] {
  return view.plugins.places?.exits ?? []
}
