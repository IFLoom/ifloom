/**
 * The game every snippet renders: Small Town, the showcase, with its debugger.
 * In a game made with `ifloom new` this is the game's own `src/game.ts`, and
 * each framework's folder imports it as `./game.ts`, as a template does.
 *
 * The showcase has no sound and no scene with a picture, so a small pack adds
 * one for the snippets that render them: a knock at the flat's door, with the
 * hall as the scene's picture and Ava's first line voiced.
 */
import { SCHEMA, type Pack } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { smallTown } from '@ifloom/showcase/src/game.ts'

/** The knock at the door, opened by `{ scene: 'flat.knock' }`. */
export const knock: Pack = {
  id: 'mod:docs',
  schema: SCHEMA,
  audio: { tracks: { 'ava.hello': { src: 'voice/ava-hello.ogg', channel: 'voice' } } },
  scenes: [
    {
      id: 'flat.knock',
      title: 'A knock at the door',
      picture: { aspect: '16/9', layers: [{ id: 'hall', src: 'photo/ava.svg' }] },
      body: [{ text: 'Someone knocks, three times, not loud.' }, { text: '@ava: "Hi! You must be the new neighbour." [[voice:ava.hello]]' }],
      choices: [{ id: 'close', label: 'Close the door', effects: [{ scene: null }] }],
    },
  ],
}

export default defineGame({ build: () => smallTown({ withDebug: true, mods: [knock] }) })
