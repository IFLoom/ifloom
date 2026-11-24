/**
 * The answer to anything that can fail in a way the caller should expect: a
 * save that won't read, a mod for another game, a command the game refuses.
 * `ok` says which it is. On success `value` holds the answer; on failure
 * `reason` says why, in words a player can read, and `cause` holds the error
 * behind it when one was thrown, such as a save driver's, for a log. Nothing
 * that returns a `Result` throws for these failures.
 */
export type Result<T> = { ok: true; value: T; reason?: never; cause?: never } | { ok: false; reason: string; cause?: unknown; value?: never }

/** A success. */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

/** A failure, with why, and the error behind it if one was thrown. */
export function fail<T = never>(reason: string, cause?: unknown): Result<T> {
  return cause === undefined ? { ok: false, reason } : { ok: false, reason, cause }
}
