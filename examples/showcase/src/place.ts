/**
 * A location with the town's defaults: the line under its name is Small
 * Town, and its words are at `place.<id>`. Each place's file in `story/`
 * writes its place with it, in its `entities`.
 */
import { location, type LocationDef } from '@ifloom/plugin-places'

export const place = (def: Omit<LocationDef, 'body'> & { body?: LocationDef['body'] }) =>
  location({ desc: 'Small Town', body: [{ text: `place.${def.id}` }], ...def })
