/**
 * The answer to anything that can fail in a way the caller should expect: a
 * save that won't read, a mod for another game, a command the game refuses.
 * `ok` says which it is. On success `value` holds the answer; on failure
 * `reason` says why, in words a player can read. Nothing that returns a
 * `Result` throws for these failures.
 */
export type Result<T> = { ok: true; value: T; reason?: never } | { ok: false; reason: string; value?: never }

/** A success. */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

/** A failure, with why. */
export function fail<T = never>(reason: string): Result<T> {
  return { ok: false, reason }
}
