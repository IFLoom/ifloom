/**
 * A location with the town's default: the line under its name is Small
 * Town. Each place's file in `story/` writes its place with it, in its
 * `entities`, with the words the room shows in its `body`.
 */
import { location, type PlaceDef } from '@ifloom/plugin-places'

export const place = (def: PlaceDef) => location({ desc: 'Small Town', ...def })
