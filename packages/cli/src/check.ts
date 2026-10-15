import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { audioSrc, describeProblem, validatePack, type Game, type Problem } from '@ifloom/engine'

/** What a game module can export: a game, `{ game, problems }`, or a function that returns either. */
type Exported = Game | { game: Game; problems?: unknown[] } | (() => Game | { game: Game; problems?: unknown[] })

/** The game a module exports, as `default` or `game`, with whatever problems its loader reported. */
export function gameFrom(module: Record<string, unknown>): { game: Game; problems: string[] } {
  let found = (module.default ?? module.game) as Exported | undefined
  if (typeof found === 'function') found = found()
  if (!found) throw new Error('The game module exports no game: export it as `default` or `game`.')
  if ('game' in found && typeof found.game === 'object') {
    return { game: found.game, problems: (found.problems ?? []).map(asText) }
  }
  return { game: found as Game, problems: [] }
}

/** A loader problem in the loader's own words; anything else as a string. */
function asText(problem: unknown): string {
  return typeof problem === 'object' && problem !== null && 'what' in problem ? describeProblem(problem as Problem) : String(problem)
}

/**
 * Every track in `game.audio` whose file isn't in `dir`, where the page finds
 * it: `audioSrc(src)`, so `public/audio/…` before a build and `dist/audio/…`
 * after one. Playlists name tracks, so only tracks are looked for.
 */
export function checkAudio(game: Game, dir: string): string[] {
  const out: string[] = []
  for (const [id, track] of Object.entries(game.audio?.tracks ?? {})) {
    if ('playlist' in track) continue
    const file = audioSrc(track.src)
    if (!existsSync(join(dir, file))) out.push(`track ${id}: no file ${join(dir, file)}`)
  }
  return out
}

/**
 * Everything wrong with a game: its loader's problems, then `validatePack`'s,
 * then, given the game's public folder, every sound file that isn't in it.
 */
export function checkGame(module: Record<string, unknown>, publicDir?: string): string[] {
  const { game, problems } = gameFrom(module)
  return [...problems, ...validatePack(game), ...(publicDir === undefined ? [] : checkAudio(game, publicDir))]
}
