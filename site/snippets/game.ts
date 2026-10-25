/**
 * The game every snippet draws: Small Town, the showcase, with its debugger.
 * In a game made with `ifloom new` this is the game's own `src/game.ts`, and
 * each framework's folder imports it as `./game.ts`, as a template does.
 */
import { defineGame } from '@ifloom/cli/game'
import { smallTown } from '@ifloom/showcase/src/game.ts'

export default defineGame({ build: () => smallTown({ withDebug: true }) })
