/**
 * A location with the town's defaults: the line under its name is Small
 * Town, and its words are at `place.<id>`. Each place's file in `story/`
 * writes its place with it, in its `entities`.
 */
import { location, type PlaceDef } from '@ifloom/plugin-places'

export const place = (def: Omit<PlaceDef, 'body'> & { body?: PlaceDef['body'] }) =>
  location({ desc: 'Small Town', body: [{ text: `place.${def.id}` }], ...def })
