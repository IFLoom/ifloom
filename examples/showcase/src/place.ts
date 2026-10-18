/**
 * A location with the town's defaults: tagged Small Town, its picture at
 * `place/<id>` and its words at `place.<id>`. Each place's file in `story/` uses it.
 */
import type { LocationDef } from '@ifloom/plugin-places'

export const place = (location: Omit<LocationDef, 'art' | 'tag' | 'body'> & { tag?: string }): LocationDef => ({
  tag: 'Small Town',
  art: `place/${location.id}`,
  body: [{ text: `place.${location.id}` }],
  ...location,
})
